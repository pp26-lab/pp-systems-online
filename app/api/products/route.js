import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';
import { PRODUCT_TYPES, cleanSteps } from '../../../lib/pricing';
import { logStockMovement } from '../../../lib/stock-log';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  let sql = `
    SELECT p.*,
      COALESCE(SUM(CASE WHEN i.status = 'in_stock' THEN i.quantity ELSE 0 END), 0) as stock_in_stock,
      COALESCE(SUM(CASE WHEN i.status = 'in_transit' THEN i.quantity ELSE 0 END), 0) as stock_in_transit,
      COALESCE(SUM(CASE WHEN i.status = 'pre_order' THEN i.quantity ELSE 0 END), 0) as stock_pre_order,
      COALESCE(SUM(CASE WHEN i.status = 'ready_to_ship' THEN i.quantity ELSE 0 END), 0) as stock_ready_to_ship
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE p.shop_id = ? AND p.deleted_at IS NULL
  `;
  const params = [shopId];

  if (category) {
    sql += ' AND p.category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (p.name_en LIKE ? OR p.name_th LIKE ? OR p.name_lo LIKE ? OR p.sku LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  sql += ' GROUP BY p.id ORDER BY p.created_at DESC, p.id DESC';

  const products = await query(sql, params);

  // All options of these products in one query (was one query per product).
  const withVariants = products.filter(p => p.has_variants).map(p => p.id);
  if (withVariants.length) {
    const rows = await query(
      `SELECT * FROM product_variants WHERE shop_id = ? AND product_id IN (${withVariants.map(() => '?').join(',')}) ORDER BY color, size`,
      [shopId, ...withVariants]
    );
    const byProduct = new Map();
    for (const v of rows) {
      if (!byProduct.has(v.product_id)) byProduct.set(v.product_id, []);
      byProduct.get(v.product_id).push(v);
    }
    for (const p of products) {
      if (!p.has_variants) continue;
      p.variants = byProduct.get(p.id) || [];
      p.variant_total_qty = p.variants.reduce((s, v) => s + v.quantity, 0);
      p.stock_in_stock = p.variant_total_qty;
    }
  }

  return NextResponse.json(products);
}

// Product type, counting unit and quantity price steps (only kept for small-item products).
async function savePricingKind(body, id, shopId) {
  const type = PRODUCT_TYPES.includes(body.product_type) ? body.product_type : 'standard';
  const unit = String(body.unit_label || '').trim().slice(0, 50);
  const steps = type === 'small' ? cleanSteps(body.price_tiers) : [];
  await query('UPDATE products SET product_type = ?, unit_label = ?, price_tiers = ? WHERE id = ? AND shop_id = ?',
    [type, unit, steps.length ? JSON.stringify(steps) : null, id, shopId]);
}

// Delete uploaded photo files of a deleted product, unless another product still uses the same
// file (a copied product shares its photo). Only this shop's own uploads are touched.
async function removeUnusedUploads(shopId, urls, productId) {
  for (const url of new Set(urls.filter(Boolean))) {
    const m = /^\/api\/uploads\/([^/?#]+)$/.exec(String(url));
    if (!m) continue;
    const name = path.basename(m[1]);
    if (!name.startsWith(`${Number(shopId)}-`)) continue;
    const still = await queryOne(
      `SELECT (SELECT COUNT(*) FROM products WHERE shop_id = ? AND id <> ? AND image_url = ?)
            + (SELECT COUNT(*) FROM product_images WHERE shop_id = ? AND product_id <> ? AND image_url = ?) AS n`,
      [shopId, productId, url, shopId, productId, url]
    );
    if (Number(still?.n) > 0) continue;
    try { fs.unlinkSync(path.join(process.cwd(), 'uploads', name)); } catch { /* already gone */ }
  }
}

// SKU is unique per shop; blank SKUs would collide, so generate one.
async function normalizeProduct(body, shopId, id = null) {
  body.sku = String(body.sku || '').trim() || 'P' + Date.now().toString(36).toUpperCase();
  body.sale_end_date = body.sale_end_date ? String(body.sale_end_date).slice(0, 10) : null;
  const dup = await queryOne(
    'SELECT id FROM products WHERE shop_id = ? AND sku = ? AND id <> ? AND deleted_at IS NULL',
    [shopId, body.sku, id || 0]
  );
  return dup ? NextResponse.json({ error: 'duplicate_sku' }, { status: 409 }) : null;
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const invalid = await normalizeProduct(body, shopId);
  if (invalid) return invalid;

  const rate = await queryOne('SELECT rate_to_lak FROM currencies WHERE code = ? AND shop_id = ?', [body.cost_currency || 'THB', shopId]);
  const exchangeRate = rate?.rate_to_lak || 1;
  const totalForeignCost = (body.cost_price || 0) + (body.freight_cost || 0) + (body.customs_duty || 0) + (body.proxy_fee || 0) + (body.transfer_fee || 0);
  const landedCostLak = totalForeignCost * exchangeRate;

  const result = await query(
    `INSERT INTO products (shop_id, sku, name_lo, name_th, name_en, description, category, cost_price, cost_currency,
      freight_cost, customs_duty, proxy_fee, transfer_fee, exchange_rate_used, landed_cost_lak, selling_price_lak, image_url, barcode, sale_end_date, has_variants, variant_label_1, variant_label_2, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shopId, body.sku, body.name_lo || '', body.name_th || '', body.name_en || '',
      body.description || '', body.category || '',
      body.cost_price || 0, body.cost_currency || 'THB',
      body.freight_cost || 0, body.customs_duty || 0,
      body.proxy_fee || 0, body.transfer_fee || 0,
      exchangeRate, landedCostLak, body.selling_price_lak || 0,
      body.image_url || '', body.barcode || '',
      body.sale_end_date || null, body.has_variants || 0,
      body.variant_label_1 || 'color', body.variant_label_2 || 'size',
      body.status || 'active']
  );

  const productId = result?.insertId;

  if (body.initial_stock && productId) {
    await query(
      'INSERT INTO inventory (shop_id, product_id, quantity, status) VALUES (?, ?, ?, ?)',
      [shopId, productId, body.initial_stock, 'in_stock']
    );
    await logStockMovement({
      shopId, productId, change: +body.initial_stock, reason: 'initial',
      note: 'Initial stock on product creation',
    });
  }

  if (body.wholesale_price_lak !== undefined || body.member_price_lak !== undefined || body.category_id !== undefined) {
    await query(
      'UPDATE products SET wholesale_price_lak = ?, member_price_lak = ?, category_id = ? WHERE id = ? AND shop_id = ?',
      [parseFloat(body.wholesale_price_lak) || 0, parseFloat(body.member_price_lak) || 0, body.category_id || null, productId, shopId]
    );
  }

  await savePricingKind(body, productId, shopId);
  return NextResponse.json({ id: productId }, { status: 201 });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const invalid = await normalizeProduct(body, shopId, body.id);
  if (invalid) return invalid;

  const existing = await queryOne('SELECT cost_currency, exchange_rate_used FROM products WHERE id = ? AND shop_id = ? AND deleted_at IS NULL', [body.id, shopId]);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let exchangeRate;
  if (existing && existing.cost_currency === (body.cost_currency || 'THB')) {
    exchangeRate = existing.exchange_rate_used;
  } else {
    const rate = await queryOne('SELECT rate_to_lak FROM currencies WHERE code = ? AND shop_id = ?', [body.cost_currency || 'THB', shopId]);
    exchangeRate = rate?.rate_to_lak || 1;
  }
  const totalForeignCost = (body.cost_price || 0) + (body.freight_cost || 0) + (body.customs_duty || 0) + (body.proxy_fee || 0) + (body.transfer_fee || 0);
  const landedCostLak = totalForeignCost * exchangeRate;

  await query(
    `UPDATE products SET sku=?, name_lo=?, name_th=?, name_en=?, description=?, category=?,
      cost_price=?, cost_currency=?, freight_cost=?, customs_duty=?, proxy_fee=?, transfer_fee=?,
      exchange_rate_used=?, landed_cost_lak=?, selling_price_lak=?, image_url=?, barcode=?, sale_end_date=?, has_variants=?,
      variant_label_1=?, variant_label_2=?, status=?
    WHERE id=? AND shop_id=?`,
    [body.sku, body.name_lo || '', body.name_th || '', body.name_en || '',
      body.description || '', body.category || '',
      body.cost_price || 0, body.cost_currency || 'THB',
      body.freight_cost || 0, body.customs_duty || 0,
      body.proxy_fee || 0, body.transfer_fee || 0,
      exchangeRate, landedCostLak, body.selling_price_lak || 0,
      body.image_url || '', body.barcode || '',
      body.sale_end_date || null, body.has_variants || 0,
      body.variant_label_1 || 'color', body.variant_label_2 || 'size',
      body.status || 'active',
      body.id, shopId]
  );

  await query(
    'UPDATE products SET wholesale_price_lak = ?, member_price_lak = ?, category_id = ? WHERE id = ? AND shop_id = ?',
    [parseFloat(body.wholesale_price_lak) || 0, parseFloat(body.member_price_lak) || 0, body.category_id || null, body.id, shopId]
  );
  await savePricingKind(body, body.id, shopId);

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const product = await queryOne('SELECT id, image_url FROM products WHERE id = ? AND shop_id = ? AND deleted_at IS NULL', [id, shopId]);
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Photos and stock go for good: they are only needed while the product is on sale.
  const images = await query('SELECT image_url FROM product_images WHERE product_id = ? AND shop_id = ?', [product.id, shopId]);
  await query('DELETE FROM product_images WHERE product_id = ? AND shop_id = ?', [product.id, shopId]);
  await query('DELETE FROM inventory WHERE product_id = ? AND shop_id = ?', [product.id, shopId]);
  await removeUnusedUploads(shopId, [product.image_url, ...images.map(r => r.image_url)], product.id);

  // A product with sales or stock history stays in the database (past orders, profit and the
  // stock log still name it) but disappears from every list and can't be sold. One without
  // any history is removed completely.
  const used = await queryOne(
    `SELECT (SELECT COUNT(*) FROM order_items WHERE product_id = ? AND shop_id = ?)
          + (SELECT COUNT(*) FROM stock_movements WHERE product_id = ? AND shop_id = ?) AS n`,
    [product.id, shopId, product.id, shopId]
  );
  if (Number(used?.n) > 0) {
    await query("UPDATE products SET deleted_at = NOW(), del_key = id, status = 'hidden', image_url = '' WHERE id = ? AND shop_id = ?", [product.id, shopId]);
    await query('UPDATE product_variants SET quantity = 0 WHERE product_id = ? AND shop_id = ?', [product.id, shopId]);
    return NextResponse.json({ success: true });
  }
  await query('DELETE FROM products WHERE id = ? AND shop_id = ?', [product.id, shopId]);
  return NextResponse.json({ success: true });
}
