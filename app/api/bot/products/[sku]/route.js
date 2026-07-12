import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../lib/db';
import { verifyBotKey, botRateLimit, corsHeaders } from '../../../../../lib/bot-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request, { params }) {
  const auth = await verifyBotKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders() });
  if (!botRateLimit(auth.shopId)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders() });

  const sku = params.sku;
  const product = await queryOne(
    `SELECT p.id, p.sku, p.name_lo, p.name_th, p.name_en, p.category,
      p.selling_price_lak, p.image_url, p.has_variants,
      COALESCE(SUM(CASE WHEN i.status = 'in_stock' THEN i.quantity ELSE 0 END), 0) as stock
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE p.shop_id = ? AND p.sku = ?
    GROUP BY p.id`,
    [auth.shopId, sku]
  );

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: corsHeaders() });

  if (product.has_variants) {
    product.variants = await query(
      'SELECT id, color, size, sku_suffix, quantity FROM product_variants WHERE product_id = ? AND shop_id = ?',
      [product.id, auth.shopId]
    );
    product.stock = product.variants.reduce((s, v) => s + v.quantity, 0);
  }

  return NextResponse.json(product, { headers: corsHeaders() });
}
