import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../lib/db';
import { chatGuard } from '../../../../lib/chat/guard';

export const dynamic = 'force-dynamic';

// Use a photo the customer sent in chat as the payment slip of one of their orders.
export async function POST(request) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const { message_id, order_id } = await request.json();

  const m = await queryOne(
    "SELECT id, conversation_id, media_mime FROM chat_messages WHERE id = ? AND shop_id = ? AND direction = 'in' AND media_file IS NOT NULL",
    [message_id, g.shopId]
  );
  if (!m || !String(m.media_mime).startsWith('image/')) return NextResponse.json({ error: 'not_an_image' }, { status: 400 });
  const o = await queryOne('SELECT id, payment_slip_url FROM orders WHERE id = ? AND shop_id = ?', [order_id, g.shopId]);
  if (!o) return NextResponse.json({ error: 'order_not_found' }, { status: 404 });

  // Warn if the same photo is already the slip of another order (possible reused slip).
  const url = `/api/chat/messages/${m.id}`;
  const reused = await queryOne('SELECT order_number FROM orders WHERE shop_id = ? AND payment_slip_url = ? AND id <> ?', [g.shopId, url, o.id]);
  if (reused) return NextResponse.json({ error: 'slip_already_used', order_number: reused.order_number }, { status: 409 });

  await query('UPDATE orders SET payment_slip_url = ? WHERE id = ? AND shop_id = ?', [url, o.id, g.shopId]);
  await query('UPDATE chat_messages SET order_id = ? WHERE id = ? AND shop_id = ?', [o.id, m.id, g.shopId]);
  return NextResponse.json({ success: true, payment_slip_url: url });
}
