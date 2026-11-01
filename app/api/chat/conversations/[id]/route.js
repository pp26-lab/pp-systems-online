import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../lib/db';
import { open } from '../../../../../lib/secret-box';
import { chatGuard } from '../../../../../lib/chat/guard';
import { windowState } from '../../../../../lib/chat/send';
import { whatsappMarkRead } from '../../../../../lib/chat/meta';

export const dynamic = 'force-dynamic';

async function load(shopId, id) {
  return queryOne(
    `SELECT c.*, ch.name AS channel_name FROM chat_conversations c JOIN chat_channels ch ON ch.id = c.channel_id
     WHERE c.id = ? AND c.shop_id = ?`, [id, shopId]
  );
}

// Messages of one conversation. ?before=<id> pages back through older history.
export async function GET(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const conv = await load(g.shopId, params.id);
  if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const before = parseInt(new URL(request.url).searchParams.get('before')) || 0;
  const rows = await query(
    `SELECT id, direction, type, text, media_file IS NOT NULL AS has_media, media_mime, status, error, order_id, created_at
     FROM chat_messages WHERE conversation_id = ? AND shop_id = ? ${before ? 'AND id < ?' : ''}
     ORDER BY id DESC LIMIT 80`,
    before ? [conv.id, g.shopId, before] : [conv.id, g.shopId]
  );

  // Opening the chat clears the unread badge and, on WhatsApp, shows the customer blue ticks.
  if (!before && conv.unread_count > 0) {
    await query('UPDATE chat_conversations SET unread_count = 0 WHERE id = ? AND shop_id = ?', [conv.id, g.shopId]);
    if (conv.platform === 'whatsapp') {
      const lastIn = await queryOne("SELECT external_id FROM chat_messages WHERE conversation_id = ? AND direction = 'in' ORDER BY id DESC LIMIT 1", [conv.id]);
      const ch = await queryOne('SELECT external_id, token_enc FROM chat_channels WHERE id = ? AND shop_id = ?', [conv.channel_id, g.shopId]);
      if (lastIn?.external_id && ch) whatsappMarkRead(ch.external_id, lastIn.external_id, open(ch.token_enc));
    }
  }

  const { external_user_id, ...safe } = conv;
  return NextResponse.json({
    conversation: { ...safe, unread_count: 0, window: windowState(conv) },
    messages: rows.reverse().map(m => ({ ...m, has_media: !!m.has_media })),
    hasMore: rows.length === 80,
  });
}

// Mark done / reopen, link to a customer, rename.
export async function PATCH(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const conv = await load(g.shopId, params.id);
  if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const b = await request.json();
  const sets = [];
  const vals = [];
  if (b.status !== undefined) {
    if (!['open', 'done'].includes(b.status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    sets.push('status = ?'); vals.push(b.status);
  }
  if (b.customer_id !== undefined) {
    if (b.customer_id === null) { sets.push('customer_id = NULL'); }
    else {
      const cu = await queryOne('SELECT id FROM customers WHERE id = ? AND shop_id = ?', [b.customer_id, g.shopId]);
      if (!cu) return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });
      sets.push('customer_id = ?'); vals.push(cu.id);
    }
  }
  if (b.name !== undefined) { sets.push('name = ?'); vals.push(String(b.name).slice(0, 255)); }
  if (!sets.length) return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });

  await query(`UPDATE chat_conversations SET ${sets.join(', ')} WHERE id = ? AND shop_id = ?`, [...vals, conv.id, g.shopId]);
  return NextResponse.json({ success: true });
}
