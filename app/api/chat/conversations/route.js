import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { chatGuard } from '../../../../lib/chat/guard';

export const dynamic = 'force-dynamic';

// Conversation list for the inbox. Only platforms the shop has bought are shown.
export async function GET(request) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const { shopId, features } = g;

  const p = new URL(request.url).searchParams;
  const filter = p.get('filter') || 'open';
  const platform = p.get('platform');
  const q = (p.get('q') || '').trim();

  const platforms = ['messenger', 'whatsapp'].filter(x => features[`chat_${x}`] && (!platform || platform === x));
  if (!platforms.length) return NextResponse.json({ conversations: [], counts: {} });

  let sql = `
    SELECT c.id, c.platform, c.name, c.phone, c.avatar_url, c.customer_id, c.status, c.unread_count,
      c.last_message_at, c.last_message_preview, c.last_inbound_at, ch.name AS channel_name, cu.name AS customer_name
    FROM chat_conversations c
    JOIN chat_channels ch ON ch.id = c.channel_id
    LEFT JOIN customers cu ON cu.id = c.customer_id AND cu.shop_id = c.shop_id
    WHERE c.shop_id = ? AND c.platform IN (${platforms.map(() => '?').join(',')}) AND c.last_message_at IS NOT NULL`;
  const params = [shopId, ...platforms];
  if (filter === 'unread') sql += ' AND c.unread_count > 0';
  else if (filter === 'open') sql += " AND c.status = 'open'";
  else if (filter === 'done') sql += " AND c.status = 'done'";
  if (q) {
    sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR cu.name LIKE ? OR cu.phone LIKE ? OR c.last_message_preview LIKE ?)';
    const s = `%${q}%`;
    params.push(s, s, s, s, s);
  }
  sql += ' ORDER BY c.last_message_at DESC LIMIT 300';

  const [conversations, countRows] = await Promise.all([
    query(sql, params),
    query(
      `SELECT SUM(unread_count > 0) AS unread, SUM(status = 'open') AS open, SUM(status = 'done') AS done, COUNT(*) AS total
       FROM chat_conversations WHERE shop_id = ? AND platform IN (${platforms.map(() => '?').join(',')}) AND last_message_at IS NOT NULL`,
      [shopId, ...platforms]
    ),
  ]);
  const cr = countRows[0] || {};
  return NextResponse.json({
    conversations,
    counts: { unread: Number(cr.unread) || 0, open: Number(cr.open) || 0, done: Number(cr.done) || 0, all: Number(cr.total) || 0 },
    platforms,
  });
}
