import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'recent';

  let sql = 'SELECT * FROM customers WHERE shop_id = ?';
  const params = [shopId];
  if (search) {
    sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR facebook_id LIKE ? OR line_id LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }
  if (sort === 'top') sql += ' ORDER BY total_spent DESC';
  else if (sort === 'frequent') sql += ' ORDER BY order_count DESC';
  else sql += ' ORDER BY last_order_at DESC, created_at DESC';
  sql += ' LIMIT 500';

  const customers = await query(sql, params);
  return NextResponse.json(customers);
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  // Orders link customers by phone, so two records with one phone would split their history.
  const phone = String(body.phone || '').trim();
  if (phone) {
    const existing = await queryOne('SELECT id FROM customers WHERE shop_id = ? AND phone = ?', [shopId, phone]);
    if (existing) return NextResponse.json({ error: 'duplicate_phone', id: existing.id }, { status: 409 });
  }
  const result = await query(
    'INSERT INTO customers (shop_id, name, phone, email, facebook_id, line_id, address, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [shopId, body.name || '', body.phone || '', body.email || '', body.facebook_id || '', body.line_id || '', body.address || '', body.note || '']
  );
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const phone = String(body.phone || '').trim();
  if (phone) {
    const existing = await queryOne('SELECT id FROM customers WHERE shop_id = ? AND phone = ? AND id <> ?', [shopId, phone, body.id]);
    if (existing) return NextResponse.json({ error: 'duplicate_phone', id: existing.id }, { status: 409 });
  }
  await query(
    'UPDATE customers SET name=?, phone=?, email=?, facebook_id=?, line_id=?, address=?, note=?, is_blacklisted=? WHERE id=? AND shop_id=?',
    [body.name || '', body.phone || '', body.email || '', body.facebook_id || '', body.line_id || '', body.address || '', body.note || '', body.is_blacklisted ? 1 : 0, body.id, shopId]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  await query('DELETE FROM customers WHERE id = ? AND shop_id = ?', [id, shopId]);
  return NextResponse.json({ success: true });
}
