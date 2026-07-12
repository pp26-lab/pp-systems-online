import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { verifyBotKey, botRateLimit, corsHeaders } from '../../../../lib/bot-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request) {
  const auth = await verifyBotKey(request);
  if (!auth) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders() });
  }
  if (!botRateLimit(auth.shopId)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders() });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || searchParams.get('q');
  const category = searchParams.get('category');

  let sql = `
    SELECT p.id, p.sku, p.name_lo, p.name_th, p.name_en, p.category,
      p.selling_price_lak, p.image_url, p.has_variants,
      COALESCE(SUM(CASE WHEN i.status = 'in_stock' THEN i.quantity ELSE 0 END), 0) as stock
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE p.shop_id = ?
  `;
  const params = [auth.shopId];

  if (category) { sql += ' AND p.category = ?'; params.push(category); }
  if (search) {
    sql += ' AND (p.name_en LIKE ? OR p.name_th LIKE ? OR p.name_lo LIKE ? OR p.sku LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  sql += ' GROUP BY p.id ORDER BY p.name_en';

  const products = await query(sql, params);
  for (const p of products) {
    if (p.has_variants) {
      p.variants = await query(
        'SELECT id, color, size, sku_suffix, quantity FROM product_variants WHERE product_id = ? AND shop_id = ?',
        [p.id, auth.shopId]
      );
      p.stock = p.variants.reduce((s, v) => s + v.quantity, 0);
    }
  }

  return NextResponse.json({ products, count: products.length }, { headers: corsHeaders() });
}
