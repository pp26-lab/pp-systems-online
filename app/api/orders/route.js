import { NextResponse } from 'next/server';
import { query, queryOne, getPool, shopDay } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';
import { logStockMovement } from '../../../lib/stock-log';
import { fireWebhooks } from '../../../lib/webhook';
import { createOrder, OrderError } from '../../../lib/orders';

export const dynamic = 'force-dynamic';

// Accepts "YYYY-MM-DD HH:MM:SS" (UTC) or any ISO string.
function parseUtc(v) {
  if (!v) return null;
  const s = String(v).trim();
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const orderType = searchParams.get('order_type');

  let sql = 'SELECT * FROM orders WHERE shop_id = ?';
  const params = [shopId];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  await getPool(); // shopDay() needs the detected DB timezone
  if (date) { sql += ` AND ${shopDay('created_at')} = ?`; params.push(date); }
  // from/to are UTC instants; passing Date objects lets mysql2 convert them to the DB's timezone.
  const fromDate = parseUtc(from);
  const toDate = parseUtc(to);
  if (fromDate) { sql += ' AND created_at >= ?'; params.push(fromDate); }
  if (toDate) { sql += ' AND created_at <= ?'; params.push(toDate); }
  if (orderType) { sql += ' AND order_type = ?'; params.push(orderType); }

  sql += ' ORDER BY created_at DESC';

  const orders = await query(sql, params);

  for (const order of orders) {
    order.items = await query(`
      SELECT oi.*, p.name_lo, p.name_th, p.name_en, p.sku, p.image_url,
        COALESCE(oi.item_color, pv.color) as variant_color, COALESCE(oi.item_size, pv.size) as variant_size
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE oi.order_id = ?
    `, [order.id]);
  }

  return NextResponse.json(orders);
}

// A sale from the checkout screen. All the rules (shop ownership, real prices, stock
// lock and check, batches, customer by phone, one transaction) live in lib/orders.js.
export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  try {
    const order = await createOrder(shopId, body);
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.code, detail: e.detail || null }, { status: e.code === 'out_of_stock' ? 409 : 400 });
    console.error('create order:', e);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();

  const editable = ['tracking_number', 'shipping_carrier', 'internal_notes', 'payment_slip_url', 'amount_paid'];
  if (editable.some(f => body[f] !== undefined)) {
    const fields = [], vals = [];
    for (const f of editable) {
      if (body[f] !== undefined) { fields.push(`${f} = ?`); vals.push(body[f]); }
    }
    vals.push(body.id, shopId);
    await query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`, vals);
    if (!body.status) return NextResponse.json({ success: true });
  }

  if (!body.status) return NextResponse.json({ success: true });

  if (!['pending', 'shipping', 'completed', 'cancelled'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const current = await queryOne('SELECT status, customer_id, total_in_lak, coupon_code FROM orders WHERE id = ? AND shop_id = ?', [body.id, shopId]);
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Stock was already returned when the order was cancelled; reopening it would leave stock wrong.
  if (current.status === 'cancelled' && body.status !== 'cancelled') {
    return NextResponse.json({ error: 'A cancelled order cannot be reopened' }, { status: 400 });
  }

  if (body.status === 'cancelled' && current.status !== 'cancelled') {
    // Claim the cancel first: only one request can move the order to cancelled, so two taps
    // (or two devices) can never return the stock twice.
    const claim = await query("UPDATE orders SET status = 'cancelled' WHERE id = ? AND shop_id = ? AND status <> 'cancelled'", [body.id, shopId]);
    if (!claim.affectedRows) return NextResponse.json({ success: true });

    if (current.customer_id) {
      await query(
        'UPDATE customers SET total_spent = GREATEST(0, total_spent - ?), order_count = GREATEST(0, order_count - 1) WHERE id = ? AND shop_id = ?',
        [Number(current.total_in_lak) || 0, current.customer_id, shopId]
      );
    }
    if (current.coupon_code) {
      await query('UPDATE coupons SET times_used = GREATEST(0, times_used - 1) WHERE code = ? AND shop_id = ?', [current.coupon_code, shopId]);
    }
    // Give back exactly what the sale took out of stock, as recorded at the time. A pre-order
    // line sold with no stock took nothing, so nothing goes back. Old orders without that record
    // fall back to the ordered quantities.
    let lines = await query(
      `SELECT product_id, variant_id, -SUM(quantity_change) AS quantity FROM stock_movements
       WHERE shop_id = ? AND reference_type = 'order' AND reference_id = ? AND reason = 'sale'
       GROUP BY product_id, variant_id`,
      [shopId, body.id]
    );
    if (!lines.length) lines = await query('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ? AND shop_id = ?', [body.id, shopId]);
    for (const item of lines) {
      const qty = Math.max(0, Number(item.quantity) || 0);
      if (!qty) continue;
      if (item.variant_id) {
        await query('UPDATE product_variants SET quantity = quantity + ? WHERE id = ? AND shop_id = ?', [qty, item.variant_id, shopId]);
      } else {
        const r = await query("UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND status = 'in_stock' AND shop_id = ? ORDER BY id LIMIT 1", [qty, item.product_id, shopId]);
        // No in-stock batch left (e.g. it was deleted): put the returned items in a new one.
        if (!r.affectedRows) {
          await query("INSERT INTO inventory (shop_id, product_id, quantity, status, notes) VALUES (?, ?, ?, 'in_stock', ?)", [shopId, item.product_id, qty, `cancel ${body.id}`]);
        }
      }
      await logStockMovement({
        shopId, productId: item.product_id, variantId: item.variant_id,
        change: +qty, reason: 'cancel',
        referenceType: 'order', referenceId: body.id,
      });
    }
  } else {
    // A cancelled order stays cancelled even if a status change from another screen arrives late.
    await query("UPDATE orders SET status = ? WHERE id = ? AND shop_id = ? AND status <> 'cancelled'", [body.status, body.id, shopId]);
  }
  fireWebhooks(shopId, 'order.status_changed', { order_id: body.id, old_status: current.status, new_status: body.status });
  return NextResponse.json({ success: true });
}
