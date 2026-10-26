import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';
import { logStockMovement } from '../../../lib/stock-log';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id');
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const variants = await query('SELECT * FROM product_variants WHERE product_id = ? AND shop_id = ? ORDER BY color, size', [productId, shopId]);
  return NextResponse.json(variants);
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const product = await queryOne('SELECT id FROM products WHERE id = ? AND shop_id = ?', [body.product_id, shopId]);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const quantity = Math.max(0, parseInt(body.quantity) || 0);
  const result = await query(
    'INSERT INTO product_variants (shop_id, product_id, color, size, sku_suffix, quantity) VALUES (?, ?, ?, ?, ?, ?)',
    [shopId, body.product_id, body.color || '', body.size || '', body.sku_suffix || '', quantity]
  );
  await query('UPDATE products SET has_variants = 1 WHERE id = ? AND shop_id = ?', [body.product_id, shopId]);
  if (quantity > 0) {
    await logStockMovement({
      shopId, productId: body.product_id, variantId: result.insertId,
      change: quantity, reason: 'initial', note: 'New option',
      referenceType: 'variant', referenceId: result.insertId,
    });
  }
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const before = await queryOne('SELECT product_id, quantity FROM product_variants WHERE id = ? AND shop_id = ?', [body.id, shopId]);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const quantity = Math.max(0, parseInt(body.quantity) || 0);
  await query(
    'UPDATE product_variants SET color = ?, size = ?, sku_suffix = ?, quantity = ? WHERE id = ? AND shop_id = ?',
    [body.color || '', body.size || '', body.sku_suffix || '', quantity, body.id, shopId]
  );
  if (before.quantity !== quantity) {
    await logStockMovement({
      shopId, productId: before.product_id, variantId: body.id,
      change: quantity - before.quantity, reason: body.reason || 'adjustment', note: body.note || '',
      referenceType: 'variant', referenceId: body.id,
    });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const productId = searchParams.get('product_id');

  await query('DELETE FROM product_variants WHERE id = ? AND shop_id = ?', [id, shopId]);

  if (productId) {
    const remaining = await queryOne('SELECT COUNT(*) as c FROM product_variants WHERE product_id = ? AND shop_id = ?', [productId, shopId]);
    if (remaining.c === 0) {
      await query('UPDATE products SET has_variants = 0 WHERE id = ? AND shop_id = ?', [productId, shopId]);
    }
  }

  return NextResponse.json({ success: true });
}
