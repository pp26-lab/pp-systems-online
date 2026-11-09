// Read-only diagnostics for the chat inbox. Run on the server:
//   node scripts/chat-debug.js
// Prints the newest Messenger messages as stored, and the raw webhook deliveries they came
// from (structure only: ids, types, flags — no tokens, no message text, no media URLs).

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

for (const f of ['.env.local', '.env']) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// Long ids: keep the start and the end, so a suffix like "#1" stays visible.
const short = (v, n = 24) => (v == null ? null : String(v).length > n ? `${String(v).slice(0, n - 8)}…${String(v).slice(-6)}` : String(v));

(async () => {
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  const [channels] = await db.query("SELECT id, shop_id, external_id, status FROM chat_channels WHERE platform = 'messenger'");
  console.log('\n== Messenger channels ==');
  console.table(channels);

  const [msgs] = await db.query(
    `SELECT m.id, m.channel_id AS ch, m.direction AS dir, m.type, m.external_id, m.media_file IS NOT NULL AS media, m.created_at
     FROM chat_messages m JOIN chat_channels c ON c.id = m.channel_id
     WHERE c.platform = 'messenger' ORDER BY m.id DESC LIMIT 10`
  );
  console.log('\n== Newest Messenger messages (external_id = Facebook message id) ==');
  console.table(msgs.map(r => ({ ...r, external_id: short(r.external_id, 40) })));

  const [events] = await db.query(
    "SELECT id, status, attempts, created_at, payload FROM chat_inbox_events WHERE source = 'meta' ORDER BY id DESC LIMIT 8"
  );
  console.log('\n== Newest webhook deliveries from Facebook (structure only) ==');
  for (const e of events) {
    let p = {};
    try { p = JSON.parse(e.payload); } catch { /* unreadable */ }
    console.log(`\n#${e.id}  status=${e.status} attempts=${e.attempts} at=${e.created_at instanceof Date ? e.created_at.toISOString() : e.created_at}  object=${p.object}`);
    for (const entry of p.entry || []) {
      const lists = { messaging: entry.messaging || [], standby: entry.standby || [], changes: entry.changes || [] };
      console.log(`  entry page=${entry.id} messaging=${lists.messaging.length} standby=${lists.standby.length} changes=${lists.changes.length}`);
      for (const ev of [...lists.messaging, ...lists.standby]) {
        const m = ev.message || {};
        console.log('   ', JSON.stringify({
          keys: Object.keys(ev).filter(k => !['sender', 'recipient', 'timestamp'].includes(k)),
          ts: ev.timestamp,
          mid: short(m.mid, 40),
          is_echo: !!m.is_echo,
          app_id: m.app_id || null,
          sticker_id: m.sticker_id || null,
          attachments: (m.attachments || []).map(a => ({ type: a.type, sticker_id: a.payload?.sticker_id || null })),
          has_text: !!m.text,
          reaction: ev.reaction ? ev.reaction.action : null,
        }));
      }
    }
  }
  await db.end();
})().catch(e => { console.error('debug failed:', e.message); process.exit(1); });
