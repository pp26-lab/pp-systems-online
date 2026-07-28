import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const coupons = await query('SELECT * FROM coupons WHERE shop_id = ? ORDER BY created_at DESC', [shopId]);
  return NextResponse.json(coupons);
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const b = await request.json();
  try {
    const result = await query(
      'INSERT INTO coupons (shop_id, code, discount_type, discount_value, min_purchase, max_discount, usage_limit, expires_at, is_active, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [shopId, (b.code || '').toUpperCase().trim(), b.discount_type || 'percent',
        parseFloat(b.discount_value) || 0, parseFloat(b.min_purchase) || 0,
        parseFloat(b.max_discount) || 0, parseInt(b.usage_limit) || 0,
        b.expires_at || null, b.is_active ? 1 : 0, b.note || '']
    );
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const b = await request.json();
  await query(
    'UPDATE coupons SET code=?, discount_type=?, discount_value=?, min_purchase=?, max_discount=?, usage_limit=?, expires_at=?, is_active=?, note=? WHERE id=? AND shop_id=?',
    [(b.code || '').toUpperCase().trim(), b.discount_type || 'percent',
      parseFloat(b.discount_value) || 0, parseFloat(b.min_purchase) || 0,
      parseFloat(b.max_discount) || 0, parseInt(b.usage_limit) || 0,
      b.expires_at || null, b.is_active ? 1 : 0, b.note || '', b.id, shopId]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { searchParams } = new URL(request.url);
  await query('DELETE FROM coupons WHERE id = ? AND shop_id = ?', [searchParams.get('id'), shopId]);
  return NextResponse.json({ success: true });
}
