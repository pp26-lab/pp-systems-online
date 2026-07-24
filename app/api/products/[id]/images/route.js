import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../lib/db';
import { requireShopId } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

const MAX_IMAGES = 5;

export async function GET(request, { params }) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const images = await query(
    'SELECT id, image_url, sort_order FROM product_images WHERE product_id = ? AND shop_id = ? ORDER BY sort_order, id',
    [params.id, shopId]
  );
  return NextResponse.json(images);
}

export async function POST(request, { params }) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  if (!body.image_url) return NextResponse.json({ error: 'image_url required' }, { status: 400 });

  const product = await queryOne('SELECT id FROM products WHERE id = ? AND shop_id = ?', [params.id, shopId]);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const countRow = await queryOne('SELECT COUNT(*) as c FROM product_images WHERE product_id = ? AND shop_id = ?', [params.id, shopId]);
  if (countRow.c >= MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images per product` }, { status: 400 });
  }

  const result = await query(
    'INSERT INTO product_images (shop_id, product_id, image_url, sort_order) VALUES (?, ?, ?, ?)',
    [shopId, params.id, body.image_url, body.sort_order || countRow.c]
  );
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}

export async function DELETE(request, { params }) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get('image_id');
  if (!imageId) return NextResponse.json({ error: 'image_id required' }, { status: 400 });

  await query('DELETE FROM product_images WHERE id = ? AND product_id = ? AND shop_id = ?', [imageId, params.id, shopId]);
  return NextResponse.json({ success: true });
}
