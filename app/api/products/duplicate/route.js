import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../lib/db';
import { requireShopId } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const source = await queryOne('SELECT * FROM products WHERE id = ? AND shop_id = ?', [body.id, shopId]);
  if (!source) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const newSku = source.sku + '-copy-' + Date.now().toString(36).slice(-4);
  const result = await query(
    `INSERT INTO products (shop_id, sku, name_lo, name_th, name_en, description, category,
      cost_price, cost_currency, freight_cost, customs_duty, proxy_fee, transfer_fee,
      exchange_rate_used, landed_cost_lak, selling_price_lak, image_url, barcode,
      sale_end_date, has_variants, variant_label_1, variant_label_2, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shopId, newSku, source.name_lo + ' (copy)', source.name_th, source.name_en, source.description, source.category,
      source.cost_price, source.cost_currency, source.freight_cost, source.customs_duty, source.proxy_fee, source.transfer_fee,
      source.exchange_rate_used, source.landed_cost_lak, source.selling_price_lak, source.image_url, source.barcode,
      source.sale_end_date, source.has_variants, source.variant_label_1, source.variant_label_2, 'hidden']
  );

  const newId = result.insertId;

  if (source.has_variants) {
    const variants = await query('SELECT color, size, sku_suffix, quantity FROM product_variants WHERE product_id = ? AND shop_id = ?', [source.id, shopId]);
    for (const v of variants) {
      await query(
        'INSERT INTO product_variants (shop_id, product_id, color, size, sku_suffix, quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [shopId, newId, v.color, v.size, v.sku_suffix, 0]
      );
    }
  }

  const images = await query('SELECT image_url, sort_order FROM product_images WHERE product_id = ? AND shop_id = ?', [source.id, shopId]);
  for (const img of images) {
    await query('INSERT INTO product_images (shop_id, product_id, image_url, sort_order) VALUES (?, ?, ?, ?)', [shopId, newId, img.image_url, img.sort_order]);
  }

  return NextResponse.json({ id: newId, sku: newSku }, { status: 201 });
}
