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

const EVENTS = ['order.created', 'order.status_changed', 'product.low_stock'];

function validate(b) {
  let url;
  try { url = new URL(String(b.url || '')); } catch { return 'invalid_url'; }
  if (!['http:', 'https:'].includes(url.protocol)) return 'invalid_url';
  b.events = (Array.isArray(b.events) ? b.events : []).filter(e => EVENTS.includes(e));
  if (!b.events.length) return 'no_events';
  return null;
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const b = await request.json();
  const invalid = validate(b);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
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
  if (Object.keys(b).length === 2 && 'is_active' in b) {
    await query('UPDATE webhooks SET is_active = ? WHERE id = ? AND shop_id = ?', [b.is_active ? 1 : 0, b.id, shopId]);
    return NextResponse.json({ success: true });
  }
  const invalid = validate(b);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
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
