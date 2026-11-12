import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { chatGuard } from '../../../../lib/chat/guard';
import { chatPlatforms } from '../../../../lib/features';

export const dynamic = 'force-dynamic';

// The customer has written and no reply (other than a failed one) went out after it.
// Uses the (conversation_id, id) index on chat_messages.
const UNANSWERED = `(c.last_inbound_at IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM chat_messages m WHERE m.conversation_id = c.id AND m.direction = 'out'
    AND m.status <> 'failed' AND m.created_at >= c.last_inbound_at))`;

// Conversation list for the inbox. Only platforms the shop has bought are shown.
export async function GET(request) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const { shopId, features } = g;

  const p = new URL(request.url).searchParams;
  const filter = p.get('filter') || 'all';
  const platform = p.get('platform');
  const channelId = parseInt(p.get('channel')) || null;
  const q = (p.get('q') || '').trim();

  // The UI filters by family (Messenger / WhatsApp); WhatsApp covers both the
  // Cloud API and numbers connected by scanning.
  const families = ['messenger', 'whatsapp'].filter(x => features[`chat_${x}`]);
  const platforms = chatPlatforms(features).filter(x => !platform || x === platform || (platform === 'whatsapp' && x === 'whatsapp_web'));
  if (!platforms.length) return NextResponse.json({ conversations: [], counts: {}, platforms: families });

  let sql = `
    SELECT c.id, c.platform, c.name, c.phone, c.avatar_url, c.customer_id, c.status, c.unread_count,
      c.last_message_at, c.last_message_preview, c.last_inbound_at, c.channel_id, COALESCE(NULLIF(ch.label, ''), NULLIF(ch.name, ''), ch.external_id) AS channel_name, cu.name AS customer_name
    FROM chat_conversations c
    JOIN chat_channels ch ON ch.id = c.channel_id
    LEFT JOIN customers cu ON cu.id = c.customer_id AND cu.shop_id = c.shop_id
    WHERE c.shop_id = ? AND c.platform IN (${platforms.map(() => '?').join(',')}) AND c.last_message_at IS NOT NULL`;
  const params = [shopId, ...platforms];
  if (channelId) { sql += ' AND c.channel_id = ?'; params.push(channelId); }
  // all: every chat | unread: has messages nobody opened yet | unanswered: the customer wrote
  // last and the shop hasn't replied since (a failed send doesn't count as a reply).
  if (filter === 'unread') sql += ' AND c.unread_count > 0';
  else if (filter === 'unanswered') sql += ` AND ${UNANSWERED}`;
  if (q) {
    sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR cu.name LIKE ? OR cu.phone LIKE ? OR c.last_message_preview LIKE ?)';
    const s = `%${q}%`;
    params.push(s, s, s, s, s);
  }
  sql += ' ORDER BY c.last_message_at DESC LIMIT 300';

  const [conversations, countRows, channels] = await Promise.all([
    query(sql, params),
    query(
      `SELECT SUM(c.unread_count > 0) AS unread, SUM(${UNANSWERED}) AS unanswered, COUNT(*) AS total
       FROM chat_conversations c WHERE c.shop_id = ? AND c.platform IN (${platforms.map(() => '?').join(',')}) AND c.last_message_at IS NOT NULL`,
      [shopId, ...platforms]
    ),
    // The shop's pages / numbers, so the inbox can say (and filter by) where each chat came in.
    query(
      `SELECT ch.id, ch.platform, COALESCE(NULLIF(ch.label, ''), NULLIF(ch.name, ''), ch.external_id) AS name
       FROM chat_channels ch WHERE ch.shop_id = ? AND ch.platform IN (${platforms.map(() => '?').join(',')}) ORDER BY ch.platform, ch.id`,
      [shopId, ...platforms]
    ),
  ]);
  const cr = countRows[0] || {};
  return NextResponse.json({
    conversations,
    counts: { unread: Number(cr.unread) || 0, unanswered: Number(cr.unanswered) || 0, all: Number(cr.total) || 0 },
    platforms: families,
    channels,
  });
}
