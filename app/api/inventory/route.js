import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';
import { logStockMovement } from '../../../lib/stock-log';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const inventory = await query(`
    SELECT i.*, p.sku, p.name_lo, p.name_th, p.name_en, p.category, p.selling_price_lak, p.image_url
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
  await logStockMovement({
    shopId, productId: body.product_id, change: +body.quantity,
    reason: 'stock_in', note: body.notes || `Status: ${body.status || 'in_stock'}, Batch: ${body.batch_number || ''}`,
    referenceType: 'inventory', referenceId: result.insertId,
  });

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const before = await queryOne('SELECT product_id, quantity FROM inventory WHERE id = ? AND shop_id = ?', [body.id, shopId]);
  await query(
    'UPDATE inventory SET quantity=?, status=?, batch_number=?, expected_arrival=?, notes=? WHERE id=? AND shop_id=?',
    [body.quantity, body.status, body.batch_number || '', body.expected_arrival || null, body.notes || '', body.id, shopId]
  );
  if (before && before.quantity !== body.quantity) {
    await logStockMovement({
      shopId, productId: before.product_id,
      change: body.quantity - before.quantity, reason: 'adjustment',
      note: body.notes || 'Manual inventory edit',
      referenceType: 'inventory', referenceId: body.id,
    });
  }

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
