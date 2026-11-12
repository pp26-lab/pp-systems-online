import { NextResponse } from 'next/server';
import { query, queryOne, getPool, shopDay, shopToday } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  await getPool(); // shopDay() needs the detected DB timezone
  // Sales are dated by when they counted (completed_at), not when the order was created.
  const day = shopDay('completed_at');
  const dayO = shopDay('o.completed_at');
  const today = shopToday();
  const dateFrom = fromDate || today;
  const dateTo = toDate || today;
  const monthStart = dateTo.substring(0, 7) + '-01';

  // The shop's rule: a sale counts when it is completed. In store that is at once; an online
  // order counts on the day it is marked delivered (not when created or shipped). Cancelled
  // orders never count. Everything on the dashboard uses this same rule.
  const statusFilter = "status = 'completed'";
  const statusFilterO = "o.status = 'completed'";
  // One sold line in LAK, after the order's discount / coupon. Lines are stored in the order's
  // currency and before the order-level discount, so both are applied here; the sum over an
  // order equals that order's total_in_lak.
  const LINE_LAK = `(oi.total * COALESCE(NULLIF(o.exchange_rate_used, 0), 1)
    * (CASE WHEN o.subtotal > 0 THEN o.total / o.subtotal ELSE 1 END))`;
  // Cost as it was when sold (falls back to today's cost for very old rows).
  const LINE_COST = '(oi.quantity * COALESCE(oi.unit_cost_lak, p.landed_cost_lak, 0))';
  // Best sellers per option (colour / size), not per product: "red M" and "blue L" are different stock.
  const topSql = extra => `
    SELECT oi.product_id, MAX(oi.variant_id) AS variant_id,
      MAX(p.name_lo) AS name_lo, MAX(p.name_th) AS name_th, MAX(p.name_en) AS name_en, MAX(p.sku) AS sku, MAX(p.image_url) AS image_url,
      MAX(COALESCE(oi.item_color, pv.color)) AS variant_color, MAX(COALESCE(oi.item_size, pv.size)) AS variant_size,
      MAX(pv.sku_suffix) AS sku_suffix,
      SUM(oi.quantity) AS total_qty, SUM(${LINE_LAK}) AS total_revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.shop_id = oi.shop_id
    LEFT JOIN products p ON p.id = oi.product_id
    LEFT JOIN product_variants pv ON pv.id = oi.variant_id
    WHERE ${statusFilterO} AND o.shop_id = ? ${extra}
    GROUP BY oi.product_id, COALESCE(oi.variant_id, 0)
    ORDER BY total_qty DESC, total_revenue DESC LIMIT 10`;

  const daySales = await queryOne(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_in_lak), 0) as total
    FROM orders WHERE ${day} >= ? AND ${day} <= ? AND ${statusFilter} AND shop_id = ?
  `, [dateFrom, dateTo, shopId]) || { count: 0, total: 0 };

  const monthSales = await queryOne(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_in_lak), 0) as total
    FROM orders WHERE ${day} >= ? AND ${day} <= ? AND ${statusFilter} AND shop_id = ?
  `, [monthStart, dateTo, shopId]) || { count: 0, total: 0 };

  const topProducts = await query(topSql(`AND ${dayO} >= ? AND ${dayO} <= ?`), [shopId, dateFrom, dateTo]);

  const salesByCurrency = await query(`
    SELECT currency, COUNT(*) as count, SUM(total) as total
    FROM orders WHERE ${day} >= ? AND ${day} <= ? AND ${statusFilter} AND shop_id = ?
    GROUP BY currency
  `, [dateFrom, dateTo, shopId]);

  const salesByType = await query(`
    SELECT order_type, COUNT(*) as count, SUM(total_in_lak) as total
    FROM orders WHERE ${day} >= ? AND ${day} <= ? AND ${statusFilter} AND shop_id = ?
    GROUP BY order_type
  `, [dateFrom, dateTo, shopId]);

  const dailyData = await query(`
    SELECT ${day} as date, COUNT(*) as count, SUM(total_in_lak) as total
    FROM orders WHERE ${day} >= ? AND ${day} <= ? AND ${statusFilter} AND shop_id = ?
    GROUP BY ${day} ORDER BY date
  `, [dateFrom, dateTo, shopId]);

  const profitReport = await queryOne(`
    SELECT
      COALESCE(SUM(${LINE_LAK}), 0) as revenue,
      COALESCE(SUM(${LINE_COST}), 0) as cost_of_goods,
      COALESCE(SUM(${LINE_LAK} - ${LINE_COST}), 0) as gross_profit,
      COALESCE(SUM(oi.quantity), 0) as items_sold
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.shop_id = oi.shop_id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE ${statusFilterO} AND ${dayO} >= ? AND ${dayO} <= ? AND o.shop_id = ?
  `, [dateFrom, dateTo, shopId]);

  const pendingOnline = await queryOne(
    "SELECT COUNT(*) as count FROM orders WHERE order_type = 'online' AND status = 'pending' AND shop_id = ?",
    [shopId]
  );

  // All time: same rule as above (before, cancelled and not-yet-shipped orders were counted too).
  const topProductsAllTime = await query(topSql(''), [shopId]);

  return NextResponse.json({
    dateFrom, dateTo, daySales, monthSales, topProducts, topProductsAllTime, salesByCurrency,
    salesByType, dailyData,
    profitReport: profitReport || { revenue: 0, cost_of_goods: 0, gross_profit: 0, items_sold: 0 },
    pendingOnlineOrders: pendingOnline?.count || 0,
  });
}
