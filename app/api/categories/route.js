import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const cats = await query('SELECT * FROM categories WHERE shop_id = ? ORDER BY parent_id, sort_order, name', [shopId]);
  return NextResponse.json(cats);
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const b = await request.json();
  if (!b.name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const result = await query(
    'INSERT INTO categories (shop_id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)',
    [shopId, b.name, b.parent_id || null, b.sort_order || 0]
  );
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const b = await request.json();
  await query(
    'UPDATE categories SET name=?, parent_id=?, sort_order=? WHERE id=? AND shop_id=?',
    [b.name, b.parent_id || null, b.sort_order || 0, b.id, shopId]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { searchParams } = new URL(request.url);
  await query('DELETE FROM categories WHERE id = ? AND shop_id = ?', [searchParams.get('id'), shopId]);
  return NextResponse.json({ success: true });
}
