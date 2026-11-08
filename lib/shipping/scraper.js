import { query, queryOne } from '../db';
import { open } from '../secret-box';
import { normalizePhone } from './phone';
import * as anousith from './anousith';
import { matchShop } from './match';
import { hasFeature } from '../features';

// Pulls new shipping bills from each shop's carrier account into shipping_bills.
// Matching to orders (step 7) and notifying customers (step 5) work from that table.

const CARRIERS = { anousith };
const MIN_GAP_MS = 55 * 60 * 1000; // at most about once an hour per shop
const sleep = ms => new Promise(r => setTimeout(r, ms));

let running = false;
// Logged-in sessions kept in memory per account, so the shop is not logged in 24 times a
// day. A session is dropped when the API refuses it, and is never written to disk.
const sessions = new Map();

export async function saveBills(shopId, carrier, bills) {
  let added = 0;
  for (const b of bills) {
    const r = await query(
      `INSERT INTO shipping_bills (shop_id, carrier, tracking_number, receiver_name, receiver_phone, receiver_phone_norm,
         destination, cod_amount, carrier_status, shipped_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE carrier_status = VALUES(carrier_status)`,
      [shopId, carrier, b.trackingNumber, b.receiverName, b.receiverPhone, normalizePhone(b.receiverPhone),
        b.destination, b.codAmount, b.status, b.createdAt]
    );
    // MySQL: 1 = inserted, 2 = existing row changed, 0 = existing row unchanged.
    if (r.affectedRows === 1) added++;
  }
  return added;
}

// One shop, one carrier. Never throws; the outcome is written to shipping_scrape_runs.
export async function runAccount(acc) {
  const client = CARRIERS[acc.carrier];
  const run = await query('INSERT INTO shipping_scrape_runs (shop_id, carrier) VALUES (?, ?)', [acc.shop_id, acc.carrier]);
  const runId = run.insertId;
  const finish = (status, fields = {}, error = null) => Promise.all([
    query(
      'UPDATE shipping_scrape_runs SET status = ?, bills_seen = ?, bills_new = ?, bills_matched = ?, error = ?, finished_at = NOW() WHERE id = ?',
      [status, fields.seen || 0, fields.added || 0, fields.matched || 0, error, runId]
    ),
    query('UPDATE shipping_accounts SET last_run_at = NOW(), last_error = ? WHERE id = ?', [error, acc.id]),
  ]);

  if (!client) { await finish('failed', {}, 'unknown_carrier'); return; }
  let creds;
  try {
    creds = JSON.parse(open(acc.login_enc));
  } catch {
    await finish('failed', {}, 'login_missing');
    return;
  }

  // Keyed by the stored login too: if the shop saves a different account, the old session
  // (and the old account's parcels) can never be used for this shop again.
  const sessionKey = `${acc.id}:${acc.login_enc}`;
  try {
    let session = sessions.get(sessionKey);
    let bills;
    try {
      if (!session) throw Object.assign(new Error('no session'), { code: 'auth' });
      bills = await client.fetchRecentItems(session, 2);
    } catch (e) {
      if (e.code !== 'auth') throw e;
      sessions.delete(sessionKey);
      session = await client.login(creds.username, creds.password); // a wrong password throws auth here
      sessions.set(sessionKey, session);
      // The login just worked, so a refusal now is not a password problem: don't turn the shop off.
      bills = await client.fetchRecentItems(session, 2).catch(err => {
        if (err.code === 'auth') err.code = 'api';
        throw err;
      });
    }
    const added = await saveBills(acc.shop_id, acc.carrier, bills);
    const matched = await matchShop(acc.shop_id, acc.carrier === 'anousith' ? 'Anousith' : acc.carrier);
    await finish('ok', { seen: bills.length, added, matched });
  } catch (e) {
    sessions.delete(sessionKey);
    if (e.code === 'auth') {
      // Stop trying with a wrong password so the carrier account doesn't get locked;
      // the shop turns it back on after entering the new password.
      await finish('login_failed', {}, 'login_failed');
      await query('UPDATE shipping_accounts SET enabled = 0 WHERE id = ?', [acc.id]);
      return;
    }
    console.error(`shipping scrape shop ${acc.shop_id} ${acc.carrier}:`, e.code || '', e.message);
    await finish('failed', {}, String(e.code || e.message).slice(0, 500));
  }
}

// Every enabled account that hasn't run in the last hour, one at a time with a short pause
// between shops so the carrier site sees a gentle, steady trickle instead of a burst.
export async function runDue() {
  if (running) return { skipped: 'already_running' };
  running = true;
  try {
    const due = await query(
      `SELECT * FROM shipping_accounts
       WHERE enabled = 1 AND login_enc IS NOT NULL
         AND (last_run_at IS NULL OR last_run_at < DATE_SUB(NOW(), INTERVAL ? SECOND))
       ORDER BY last_run_at IS NULL DESC, last_run_at`,
      [Math.round(MIN_GAP_MS / 1000)]
    );
    for (let i = 0; i < due.length; i++) {
      if (!(await hasFeature(due[i].shop_id, 'shipping_sync'))) continue; // not bought, or licence expired
      if (i > 0) await sleep(3000 + Math.random() * 4000);
      try {
        await runAccount(due[i]);
      } catch (e) {
        console.error(`shipping scrape shop ${due[i].shop_id}:`, e.message); // keep going with the next shop
      }
    }
    return { accounts: due.length };
  } finally {
    running = false;
  }
}

// For a shop's "check now" button later: same rules, one shop.
export async function runShopNow(shopId, carrier = 'anousith') {
  if (!(await hasFeature(shopId, 'shipping_sync'))) return { error: 'feature_disabled' };
  const acc = await queryOne('SELECT * FROM shipping_accounts WHERE shop_id = ? AND carrier = ? AND enabled = 1', [shopId, carrier]);
  if (!acc) return { error: 'not_set_up' };
  await runAccount(acc);
  return queryOne('SELECT status, bills_seen, bills_new, error, finished_at FROM shipping_scrape_runs WHERE shop_id = ? ORDER BY id DESC LIMIT 1', [shopId]);
}
