import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const date = searchParams.get('date');
  const orderType = searchParams.get('order_type');

  let sql = 'SELECT * FROM orders WHERE shop_id = ?';
  const params = [shopId];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (date) { sql += ' AND DATE(created_at) = ?'; params.push(date); }
  if (orderType) { sql += ' AND order_type = ?'; params.push(orderType); }

  sql += ' ORDER BY created_at DESC';

  const orders = await query(sql, params);

  for (const order of orders) {
    order.items = await query(`
      SELECT oi.*, p.name_lo, p.name_th, p.name_en, p.sku, p.image_url,
        pv.color as variant_color, pv.size as variant_size
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE oi.order_id = ?
    `, [order.id]);
  }

  return NextResponse.json(orders);
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const orderNumber = 'PP' + Date.now().toString(36).toUpperCase();

  let exchangeRate = 1;
  if (body.currency !== 'LAK') {
    const rate = await queryOne('SELECT rate_to_lak FROM currencies WHERE code = ? AND shop_id = ?', [body.currency, shopId]);
    exchangeRate = rate?.rate_to_lak || 1;
  }

  const totalInLak = body.currency === 'LAK' ? body.total : body.total * exchangeRate;
  const orderType = body.order_type || 'walk_in';
  const initialStatus = orderType === 'online' ? 'pending' : 'completed';

  const orderResult = await query(
    `INSERT INTO orders (shop_id, order_number, customer_name, customer_phone, customer_address,
      subtotal, discount, tax, total, currency, exchange_rate_used, total_in_lak,
      payment_method, order_type, delivery_date, shipping_notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shopId, orderNumber, body.customer_name || '', body.customer_phone || '',
      body.customer_address || '',
      body.subtotal, body.discount || 0, body.tax || 0, body.total,
      body.currency || 'LAK', exchangeRate, totalInLak,
      body.payment_method || 'cash', orderType,
      body.delivery_date || null, body.shipping_notes || '', initialStatus]
  );

  const orderId = orderResult.insertId;

  for (const item of body.items) {
    await query(
      'INSERT INTO order_items (shop_id, order_id, product_id, variant_id, quantity, unit_price, currency, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [shopId, orderId, item.product_id, item.variant_id || null, item.quantity, item.unit_price, body.currency || 'LAK', item.total]
    );
    if (item.variant_id) {
      await query('UPDATE product_variants SET quantity = quantity - ? WHERE id = ? AND quantity >= ? AND shop_id = ?', [item.quantity, item.variant_id, item.quantity, shopId]);
    } else {
      await query("UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND status = 'in_stock' AND quantity >= ? AND shop_id = ?", [item.quantity, item.product_id, item.quantity, shopId]);
    }
  }

  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  order.items = await query(`
    SELECT oi.*, p.name_lo, p.name_th, p.name_en, p.sku
    FROM order_items oi JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `, [orderId]);

  return NextResponse.json(order, { status: 201 });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  if (body.status) {
    await query('UPDATE orders SET status = ? WHERE id = ? AND shop_id = ?', [body.status, body.id, shopId]);
  }
  return NextResponse.json({ success: true });
}
