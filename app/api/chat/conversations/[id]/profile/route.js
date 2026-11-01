import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../../lib/db';
import { chatGuard } from '../../../../../../lib/chat/guard';
import { digits } from '../../../../../../lib/chat/store';

export const dynamic = 'force-dynamic';

// Everything the side panel shows about the person in this chat:
// the linked customer, their order history, products they bought, and open orders.
export async function GET(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const conv = await queryOne('SELECT id, customer_id, phone, name FROM chat_conversations WHERE id = ? AND shop_id = ?', [params.id, g.shopId]);
  if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Suggest customers with the same phone when the chat isn't linked yet.
  if (!conv.customer_id) {
    let suggestions = [];
    const d = digits(conv.phone);
    if (d.length >= 8) {
      const rows = await query('SELECT id, name, phone, total_spent, order_count FROM customers WHERE shop_id = ? AND phone LIKE ? LIMIT 20', [g.shopId, `%${d.slice(-4)}%`]);
      suggestions = rows.filter(r => digits(r.phone).endsWith(d.slice(-8)));
    }
    return NextResponse.json({ customer: null, suggestions });
  }

  const customer = await queryOne('SELECT * FROM customers WHERE id = ? AND shop_id = ?', [conv.customer_id, g.shopId]);
  if (!customer) return NextResponse.json({ customer: null, suggestions: [] });

  const [orders, products, otherChats] = await Promise.all([
    query(
      `SELECT id, order_number, total, currency, total_in_lak, status, order_type, created_at, payment_slip_url
       FROM orders WHERE customer_id = ? AND shop_id = ? ORDER BY created_at DESC LIMIT 20`,
      [customer.id, g.shopId]
    ),
    query(
      `SELECT p.id, p.name_lo, p.name_th, p.name_en, p.sku, p.image_url, p.selling_price_lak,
         SUM(oi.quantity) AS qty, MAX(o.created_at) AS last_bought
       FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id
       WHERE o.customer_id = ? AND o.shop_id = ? AND o.status <> 'cancelled'
       GROUP BY p.id ORDER BY last_bought DESC LIMIT 12`,
      [customer.id, g.shopId]
    ),
    query("SELECT id, platform FROM chat_conversations WHERE customer_id = ? AND shop_id = ? AND id <> ?", [customer.id, g.shopId, conv.id]),
  ]);

  return NextResponse.json({ customer, orders, products, otherChats });
}
