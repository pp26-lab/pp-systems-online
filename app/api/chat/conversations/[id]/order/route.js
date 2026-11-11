import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../../lib/db';
import { chatGuard } from '../../../../../../lib/chat/guard';
import { createOrder, OrderError } from '../../../../../../lib/orders';
import { sendMessage, SendError } from '../../../../../../lib/chat/send';

export const dynamic = 'force-dynamic';

async function conversation(shopId, id) {
  return queryOne('SELECT id, customer_id, name, phone, platform FROM chat_conversations WHERE id = ? AND shop_id = ?', [id, shopId]);
}

// What the "create order" panel starts with: the customer linked to this chat (with the
// address/phone the staff saved from messages), the carrier and address of their last order,
// products they bought before, and the shop's carrier list.
export async function GET(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const conv = await conversation(g.shopId, params.id);
  if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const customer = conv.customer_id
    ? await queryOne('SELECT id, name, phone, address, customer_type FROM customers WHERE id = ? AND shop_id = ?', [conv.customer_id, g.shopId])
    : null;
  const [lastOrder, bought, settings] = await Promise.all([
    customer
      ? queryOne(
        "SELECT customer_name, customer_phone, customer_address, shipping_carrier FROM orders WHERE customer_id = ? AND shop_id = ? AND order_type = 'online' ORDER BY id DESC LIMIT 1",
        [customer.id, g.shopId])
      : null,
    customer
      ? query(
        `SELECT oi.product_id, SUM(oi.quantity) AS qty, MAX(o.id) AS last
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.customer_id = ? AND o.shop_id = ? AND o.status <> 'cancelled'
         GROUP BY oi.product_id ORDER BY last DESC LIMIT 8`,
        [customer.id, g.shopId])
      : [],
    queryOne('SELECT shipping_carriers, shop_name FROM shop_settings WHERE shop_id = ?', [g.shopId]),
  ]);

  return NextResponse.json({
    chat: { name: conv.name || '', phone: conv.phone || '', platform: conv.platform },
    customer,
    last_order: lastOrder,
    bought_product_ids: bought.map(r => r.product_id),
    carriers: String(settings?.shipping_carriers || '').split('\n').map(s => s.trim()).filter(Boolean),
    shop_name: settings?.shop_name || '',
  });
}

// Create a real online order from the chat (same rules as the checkout screen: stock is
// checked and taken, the customer saved), then optionally send the order summary to the
// customer in this chat. A summary that can't be sent never undoes the order.
// Body: the order fields (see lib/orders.js) + { send_summary: bool, summary_text: string }.
export async function POST(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const conv = await conversation(g.shopId, params.id);
  if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  let order;
  try {
    order = await createOrder(g.shopId, {
      ...body,
      order_type: 'online',
      currency: 'LAK',
      customer_id: conv.customer_id || null,
    }, { conversationId: conv.id });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.code, detail: e.detail || null }, { status: e.code === 'out_of_stock' ? 409 : 400 });
    console.error('chat order:', e);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  let summary = null;
  // The panel writes "{order}" where the order number goes; it only exists now.
  const text = String(body.summary_text || '').replace(/\{order\}/g, order.order_number).trim().slice(0, 2000);
  if (body.send_summary && text) {
    try {
      summary = await sendMessage({ shopId: g.shopId, conversationId: conv.id, text, orderId: order.id, humanAgent: true });
    } catch (e) {
      summary = { status: 'failed', error: e instanceof SendError ? e.code : (e.code || e.message) };
    }
  }
  return NextResponse.json({ order, summary }, { status: 201 });
}
