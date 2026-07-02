import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

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
    WHERE p.shop_id = ?
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

  sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

  const products = await query(sql, params);

  for (const p of products) {
    if (p.has_variants) {
      p.variants = await query(
        'SELECT * FROM product_variants WHERE product_id = ? AND shop_id = ? ORDER BY color, size',
        [p.id, shopId]
      );
      p.variant_total_qty = p.variants.reduce((s, v) => s + v.quantity, 0);
    }
  }

  return NextResponse.json(products);
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();

  const rate = await queryOne('SELECT rate_to_lak FROM currencies WHERE code = ? AND shop_id = ?', [body.cost_currency || 'THB', shopId]);
  const exchangeRate = rate?.rate_to_lak || 1;
  const totalForeignCost = (body.cost_price || 0) + (body.freight_cost || 0) + (body.customs_duty || 0) + (body.proxy_fee || 0) + (body.transfer_fee || 0);
  const landedCostLak = totalForeignCost * exchangeRate;

  const result = await query(
    `INSERT INTO products (shop_id, sku, name_lo, name_th, name_en, description, category, cost_price, cost_currency,
      freight_cost, customs_duty, proxy_fee, transfer_fee, exchange_rate_used, landed_cost_lak, selling_price_lak, image_url, barcode, sale_end_date, has_variants)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shopId, body.sku, body.name_lo || '', body.name_th || '', body.name_en || '',
      body.description || '', body.category || '',
      body.cost_price || 0, body.cost_currency || 'THB',
      body.freight_cost || 0, body.customs_duty || 0,
      body.proxy_fee || 0, body.transfer_fee || 0,
      exchangeRate, landedCostLak, body.selling_price_lak || 0,
      body.image_url || '', body.barcode || '',
      body.sale_end_date || null, body.has_variants || 0]
  );

  const productId = result?.insertId;

  if (body.initial_stock && productId) {
    await query(
      'INSERT INTO inventory (shop_id, product_id, quantity, status) VALUES (?, ?, ?, ?)',
      [shopId, productId, body.initial_stock, 'in_stock']
    );
  }

  return NextResponse.json({ id: productId }, { status: 201 });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();

  const existing = await queryOne('SELECT cost_currency, exchange_rate_used FROM products WHERE id = ? AND shop_id = ?', [body.id, shopId]);
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
      exchange_rate_used=?, landed_cost_lak=?, selling_price_lak=?, image_url=?, barcode=?, sale_end_date=?, has_variants=?
    WHERE id=? AND shop_id=?`,
    [body.sku, body.name_lo || '', body.name_th || '', body.name_en || '',
      body.description || '', body.category || '',
      body.cost_price || 0, body.cost_currency || 'THB',
      body.freight_cost || 0, body.customs_duty || 0,
      body.proxy_fee || 0, body.transfer_fee || 0,
      exchangeRate, landedCostLak, body.selling_price_lak || 0,
      body.image_url || '', body.barcode || '',
      body.sale_end_date || null, body.has_variants || 0, body.id, shopId]
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  await query('DELETE FROM products WHERE id = ? AND shop_id = ?', [id, shopId]);
  return NextResponse.json({ success: true });
}
