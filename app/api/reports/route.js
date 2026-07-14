import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  const today = new Date().toISOString().split('T')[0];
  const dateFrom = fromDate || today;
  const dateTo = toDate || today;
  const monthStart = dateTo.substring(0, 7) + '-01';

  const statusFilter = "status IN ('completed','shipping')";

  const daySales = await queryOne(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_in_lak), 0) as total
    FROM orders WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? AND ${statusFilter} AND shop_id = ?
  `, [dateFrom, dateTo, shopId]) || { count: 0, total: 0 };

  const monthSales = await queryOne(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_in_lak), 0) as total
    FROM orders WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? AND ${statusFilter} AND shop_id = ?
  `, [monthStart, dateTo, shopId]) || { count: 0, total: 0 };

  const topProducts = await query(`
    SELECT p.name_lo, p.name_th, p.name_en, p.sku,
      SUM(oi.quantity) as total_qty, SUM(oi.total) as total_revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE ${statusFilter} AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ? AND o.shop_id = ?
    GROUP BY p.id ORDER BY total_qty DESC LIMIT 10
  `, [dateFrom, dateTo, shopId]);

  const salesByCurrency = await query(`
    SELECT currency, COUNT(*) as count, SUM(total) as total
    FROM orders WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? AND ${statusFilter} AND shop_id = ?
    GROUP BY currency
  `, [dateFrom, dateTo, shopId]);

  const salesByType = await query(`
    SELECT order_type, COUNT(*) as count, SUM(total_in_lak) as total
    FROM orders WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? AND ${statusFilter} AND shop_id = ?
    GROUP BY order_type
  `, [dateFrom, dateTo, shopId]);

  const dailyData = await query(`
    SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_in_lak) as total
    FROM orders WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? AND ${statusFilter} AND shop_id = ?
    GROUP BY DATE(created_at) ORDER BY date
  `, [dateFrom, dateTo, shopId]);

  const profitReport = await queryOne(`
    SELECT
      COALESCE(SUM(oi.total), 0) as revenue,
      COALESCE(SUM(p.landed_cost_lak * oi.quantity), 0) as cost_of_goods,
      COALESCE(SUM(oi.total - (p.landed_cost_lak * oi.quantity)), 0) as gross_profit,
      COALESCE(SUM(oi.quantity), 0) as items_sold
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE ${statusFilter} AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ? AND o.shop_id = ?
  `, [dateFrom, dateTo, shopId]);

  const pendingOnline = await queryOne(
    "SELECT COUNT(*) as count FROM orders WHERE order_type = 'online' AND status = 'pending' AND shop_id = ?",
    [shopId]
  );

  const topProductsAllTime = await query(`
    SELECT p.name_lo, p.name_th, p.name_en, p.sku,
      SUM(oi.quantity) as total_qty, SUM(oi.total) as total_revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE ${statusFilter} AND o.shop_id = ?
    GROUP BY p.id ORDER BY total_qty DESC LIMIT 10
  `, [shopId]);

  return NextResponse.json({
    dateFrom, dateTo, daySales, monthSales, topProducts, topProductsAllTime, salesByCurrency,
    salesByType, dailyData,
    profitReport: profitReport || { revenue: 0, cost_of_goods: 0, gross_profit: 0, items_sold: 0 },
    pendingOnlineOrders: pendingOnline?.count || 0,
  });
}
