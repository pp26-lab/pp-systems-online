import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let sql = 'SELECT * FROM handoffs WHERE shop_id = ?';
  const params = [shopId];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY received_at DESC LIMIT 200';

  const handoffs = await query(sql, params);
  return NextResponse.json(handoffs);
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates = [];
  const values = [];
  if (body.status) {
    updates.push('status = ?'); values.push(body.status);
    if (body.status === 'resolved') { updates.push('resolved_at = NOW()'); }
  }
  if (body.admin_notes !== undefined) { updates.push('admin_notes = ?'); values.push(body.admin_notes); }
  if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  values.push(body.id, shopId);
  await query(`UPDATE handoffs SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`, values);

  const updated = await queryOne('SELECT * FROM handoffs WHERE id = ? AND shop_id = ?', [body.id, shopId]);
  return NextResponse.json(updated);
}

export async function DELETE(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  await query('DELETE FROM handoffs WHERE id = ? AND shop_id = ?', [id, shopId]);
  return NextResponse.json({ success: true });
}
