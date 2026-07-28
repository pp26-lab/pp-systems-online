import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const hooks = await query('SELECT * FROM webhooks WHERE shop_id = ? ORDER BY created_at DESC', [shopId]);
  return NextResponse.json(hooks);
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const b = await request.json();
  const secret = b.secret || crypto.randomBytes(16).toString('hex');
  const result = await query(
    'INSERT INTO webhooks (shop_id, name, url, events, secret, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [shopId, b.name || '', b.url, (b.events || []).join(','), secret, b.is_active ? 1 : 0]
  );
  return NextResponse.json({ id: result.insertId, secret }, { status: 201 });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const b = await request.json();
  await query(
    'UPDATE webhooks SET name=?, url=?, events=?, is_active=? WHERE id=? AND shop_id=?',
    [b.name || '', b.url, (b.events || []).join(','), b.is_active ? 1 : 0, b.id, shopId]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { searchParams } = new URL(request.url);
  await query('DELETE FROM webhooks WHERE id = ? AND shop_id = ?', [searchParams.get('id'), shopId]);
  return NextResponse.json({ success: true });
}
