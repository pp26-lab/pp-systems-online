import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../lib/db';
import { verifyBotKey, botRateLimit, corsHeaders } from '../../../../lib/bot-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request) {
  const auth = await verifyBotKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders() });
  if (!botRateLimit(auth.shopId, 30)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders() });

  const shopId = auth.shopId;
  const body = await request.json();

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400, headers: corsHeaders() });
  }

  const orderNumber = 'BOT' + Date.now().toString(36).toUpperCase();
  const currency = body.currency || 'LAK';
  let exchangeRate = 1;
  if (currency !== 'LAK') {
    const rate = await queryOne('SELECT rate_to_lak FROM currencies WHERE code = ? AND shop_id = ?', [currency, shopId]);
    exchangeRate = rate?.rate_to_lak || 1;
  }

  const resolvedItems = [];
  let subtotal = 0;
  for (const item of body.items) {
    let product;
    if (item.sku) {
      product = await queryOne('SELECT id, selling_price_lak FROM products WHERE sku = ? AND shop_id = ?', [item.sku, shopId]);
    } else if (item.product_id) {
      product = await queryOne('SELECT id, selling_price_lak FROM products WHERE id = ? AND shop_id = ?', [item.product_id, shopId]);
    }
    if (!product) {
      return NextResponse.json({ error: `Product not found: ${item.sku || item.product_id}` }, { status: 404, headers: corsHeaders() });
    }
    const qty = parseInt(item.quantity) || 1;
    const unitPrice = product.selling_price_lak;
    const itemTotal = unitPrice * qty;
    subtotal += itemTotal;
    resolvedItems.push({
      product_id: product.id,
      variant_id: item.variant_id || null,
      quantity: qty,
      unit_price: currency === 'LAK' ? unitPrice : unitPrice / exchangeRate,
      total: currency === 'LAK' ? itemTotal : itemTotal / exchangeRate,
    });
  }

  const total = currency === 'LAK' ? subtotal : subtotal / exchangeRate;
  const totalInLak = subtotal;

  const orderResult = await query(
    `INSERT INTO orders (shop_id, order_number, customer_name, customer_phone, customer_address,
      subtotal, discount, tax, total, currency, exchange_rate_used, total_in_lak,
      payment_method, order_type, delivery_date, shipping_notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shopId, orderNumber, body.customer_name || '', body.customer_phone || '',
      body.customer_address || '', currency === 'LAK' ? subtotal : subtotal / exchangeRate, 0, 0, total,
      currency, exchangeRate, totalInLak,
      body.payment_method || 'transfer', 'online',
      body.delivery_date || null, body.shipping_notes || '', 'pending']
  );

  const orderId = orderResult.insertId;

  for (const item of resolvedItems) {
    await query(
      'INSERT INTO order_items (shop_id, order_id, product_id, variant_id, quantity, unit_price, currency, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [shopId, orderId, item.product_id, item.variant_id, item.quantity, item.unit_price, currency, item.total]
    );
    if (item.variant_id) {
      await query('UPDATE product_variants SET quantity = quantity - ? WHERE id = ? AND quantity >= ? AND shop_id = ?', [item.quantity, item.variant_id, item.quantity, shopId]);
    } else {
      await query("UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND status = 'in_stock' AND quantity >= ? AND shop_id = ?", [item.quantity, item.product_id, item.quantity, shopId]);
    }
  }

  return NextResponse.json({
    order_number: orderNumber,
    id: orderId,
    total,
    currency,
    status: 'pending',
  }, { status: 201, headers: corsHeaders() });
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
