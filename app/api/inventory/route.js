import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const inventory = await query(`
    SELECT i.*, p.sku, p.name_lo, p.name_th, p.name_en, p.category, p.selling_price_lak
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    WHERE i.shop_id = ?
    ORDER BY i.status, p.name_en
  `, [shopId]);

  return NextResponse.json(inventory);
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const result = await query(
    'INSERT INTO inventory (shop_id, product_id, quantity, status, batch_number, expected_arrival, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [shopId, body.product_id, body.quantity, body.status || 'in_stock', body.batch_number || '', body.expected_arrival || null, body.notes || '']
  );

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  await query(
    'UPDATE inventory SET quantity=?, status=?, batch_number=?, expected_arrival=?, notes=? WHERE id=? AND shop_id=?',
    [body.quantity, body.status, body.batch_number || '', body.expected_arrival || null, body.notes || '', body.id, shopId]
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  await query('DELETE FROM inventory WHERE id = ? AND shop_id = ?', [id, shopId]);
  return NextResponse.json({ success: true });
}
