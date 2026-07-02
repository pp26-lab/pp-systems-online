import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'products';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let data;

  switch (type) {
    case 'products':
      data = await query(`
        SELECT p.*, COALESCE(SUM(CASE WHEN i.status='in_stock' THEN i.quantity ELSE 0 END),0) as stock
        FROM products p LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.shop_id = ? GROUP BY p.id
      `, [shopId]);
      break;

    case 'orders': {
      let sql = "SELECT * FROM orders WHERE status = 'completed' AND shop_id = ?";
      const params = [shopId];
      if (from) { sql += ' AND DATE(created_at) >= ?'; params.push(from); }
      if (to) { sql += ' AND DATE(created_at) <= ?'; params.push(to); }
      sql += ' ORDER BY created_at DESC';
      data = await query(sql, params);
      for (const order of data) {
        order.items = await query(`
          SELECT oi.*, p.sku, p.name_en FROM order_items oi
          JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?
        `, [order.id]);
      }
      break;
    }

    case 'inventory':
      data = await query(`
        SELECT i.*, p.sku, p.name_en, p.category
        FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.shop_id = ?
      `, [shopId]);
      break;

    default:
      data = [];
  }

  return NextResponse.json({
    export_type: type,
    exported_at: new Date().toISOString(),
    count: data.length,
    data,
  });
}
