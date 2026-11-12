import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../lib/db';
import { requireShopId } from '../../../../lib/auth';
import { getShopFeatures, chatPlatforms } from '../../../../lib/features';
import { windowState } from '../../../../lib/chat/send';
import { digits } from '../../../../lib/chat/store';

export const dynamic = 'force-dynamic';

// Chats that belong to the customer of an order, so the order page can message them.
export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const features = await getShopFeatures(shopId);
  if (!features.chat) return NextResponse.json({ enabled: false, conversations: [] });

  const orderId = new URL(request.url).searchParams.get('order_id');
  const o = await queryOne('SELECT id, customer_id, customer_phone FROM orders WHERE id = ? AND shop_id = ?', [orderId, shopId]);
  if (!o) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const platforms = chatPlatforms(features);
  let rows = [];
  if (o.customer_id) {
    rows = await query(
      `SELECT c.id, c.platform, c.name, c.last_inbound_at, COALESCE(NULLIF(ch.label, ''), NULLIF(ch.name, ''), ch.external_id) AS channel_name FROM chat_conversations c JOIN chat_channels ch ON ch.id = c.channel_id
       WHERE c.shop_id = ? AND c.customer_id = ? AND c.platform IN (${platforms.map(() => '?').join(',')})`,
      [shopId, o.customer_id, ...platforms]
    );
  }
  // Fall back to a WhatsApp chat with the same phone number.
  const d = digits(o.customer_phone);
  if (!rows.length && d.length >= 8 && platforms.includes('whatsapp')) {
    const cands = await query(`SELECT c.id, c.platform, c.name, c.phone, c.last_inbound_at, COALESCE(NULLIF(ch.label, ''), NULLIF(ch.name, ''), ch.external_id) AS channel_name FROM chat_conversations c JOIN chat_channels ch ON ch.id = c.channel_id WHERE c.shop_id = ? AND c.platform IN ('whatsapp','whatsapp_web') AND c.phone LIKE ?`, [shopId, `%${d.slice(-4)}`]);
    rows = cands.filter(c => digits(c.phone).endsWith(d.slice(-8)));
  }
  return NextResponse.json({
    enabled: true,
    conversations: rows.map(r => ({ id: r.id, platform: r.platform, name: r.name, channel_name: r.channel_name, window: windowState(r) })),
  });
}
