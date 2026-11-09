import { NextResponse } from 'next/server';
import { queryOne } from '../../../../lib/db';
import { createOrder, OrderError } from '../../../../lib/orders';
import { verifyBotKey, botRateLimit, corsHeaders } from '../../../../lib/bot-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// An order placed by a bot. Products are found by SKU or id and priced at the shop's retail
// price; the shared sale core (lib/orders.js) does the stock lock/check and the rest.
export async function POST(request) {
  const auth = await verifyBotKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders() });
  if (!botRateLimit(auth.shopId, 30)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders() });

  const shopId = auth.shopId;
  const body = await request.json().catch(() => null);
  if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400, headers: corsHeaders() });
  }

  const currency = String(body.currency || 'LAK').toUpperCase();
  let rate = 1;
  if (currency !== 'LAK') {
    const r = await queryOne('SELECT rate_to_lak FROM currencies WHERE code = ? AND shop_id = ?', [currency, shopId]);
    if (!r) return NextResponse.json({ error: 'Unknown currency' }, { status: 400, headers: corsHeaders() });
    rate = Number(r.rate_to_lak) || 1;
  }

  const items = [];
  for (const item of body.items) {
    let product = null;
    if (item.sku) product = await queryOne('SELECT id, selling_price_lak FROM products WHERE sku = ? AND shop_id = ?', [String(item.sku), shopId]);
    else if (item.product_id) product = await queryOne('SELECT id, selling_price_lak FROM products WHERE id = ? AND shop_id = ?', [Number(item.product_id), shopId]);
    if (!product) return NextResponse.json({ error: `Product not found: ${item.sku || item.product_id}` }, { status: 404, headers: corsHeaders() });
    items.push({
      product_id: product.id,
      variant_id: item.variant_id || null,
      quantity: parseInt(item.quantity, 10) || 1,
      unit_price: (Number(product.selling_price_lak) || 0) / rate,
    });
  }

  try {
    const order = await createOrder(shopId, {
      items, currency,
      customer_name: body.customer_name, customer_phone: body.customer_phone, customer_address: body.customer_address,
      payment_method: body.payment_method || 'transfer', order_type: 'online',
      delivery_date: body.delivery_date, shipping_notes: body.shipping_notes, amount_paid: 0,
    }, { prefix: 'BOT' });
    return NextResponse.json({ order_number: order.order_number, id: order.id, total: Number(order.total), currency, status: order.status }, { status: 201, headers: corsHeaders() });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.code, detail: e.detail || null }, { status: e.code === 'out_of_stock' ? 409 : 400, headers: corsHeaders() });
    console.error('bot order:', e);
    return NextResponse.json({ error: 'save_failed' }, { status: 500, headers: corsHeaders() });
  }
}

export async function GET(request) {
  const auth = await verifyBotKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders() });
  if (!botRateLimit(auth.shopId)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders() });

  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get('order_number');
  if (!orderNumber) return NextResponse.json({ error: 'order_number required' }, { status: 400, headers: corsHeaders() });

  const order = await queryOne(
    'SELECT id, order_number, customer_name, customer_phone, total, currency, status, order_type, created_at FROM orders WHERE order_number = ? AND shop_id = ?',
    [orderNumber, auth.shopId]
  );
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404, headers: corsHeaders() });
  return NextResponse.json(order, { headers: corsHeaders() });
}
