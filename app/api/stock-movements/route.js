import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id');

  let sql = `
    SELECT sm.*, p.sku, p.name_lo, p.name_th, p.name_en,
      pv.color as variant_color, pv.size as variant_size
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    LEFT JOIN product_variants pv ON sm.variant_id = pv.id
    WHERE sm.shop_id = ?
  `;
  const params = [shopId];
  if (productId) { sql += ' AND sm.product_id = ?'; params.push(productId); }
  sql += ' ORDER BY sm.created_at DESC LIMIT 500';

  const rows = await query(sql, params);
  return NextResponse.json(rows);
}
