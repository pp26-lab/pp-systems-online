import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';
import { shopWithFeature } from '../../../lib/features';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  { const g = await shopWithFeature('coupons'); if (g.response) return g.response; shopId = g.shopId; }
  const coupons = await query('SELECT * FROM coupons WHERE shop_id = ? ORDER BY created_at DESC', [shopId]);
  return NextResponse.json(coupons);
}

// Clean and validate a coupon body. Returns { values } or { error, status }.
async function normalize(b, shopId, id = null) {
  const code = String(b.code || '').toUpperCase().replace(/\s+/g, '').slice(0, 50);
  const type = b.discount_type === 'fixed' ? 'fixed' : 'percent';
  const value = parseFloat(b.discount_value) || 0;
  if (!code) return { error: 'code_required', status: 400 };
  if (value <= 0 || (type === 'percent' && value > 100)) return { error: 'invalid_value', status: 400 };

  const dup = await queryOne('SELECT id FROM coupons WHERE shop_id = ? AND code = ? AND id <> ?', [shopId, code, id || 0]);
  if (dup) return { error: 'duplicate_code', status: 409 };

  return {
    values: [
      code, type, value,
      Math.max(0, parseFloat(b.min_purchase) || 0),
      type === 'percent' ? Math.max(0, parseFloat(b.max_discount) || 0) : 0,
      Math.max(0, parseInt(b.usage_limit) || 0),
      b.expires_at ? String(b.expires_at).slice(0, 10) : null,
      b.is_active ? 1 : 0,
      b.note || '',
    ],
  };
}

export async function POST(request) {
  let shopId;
  { const g = await shopWithFeature('coupons'); if (g.response) return g.response; shopId = g.shopId; }
  const n = await normalize(await request.json(), shopId);
  if (n.error) return NextResponse.json({ error: n.error }, { status: n.status });
  const result = await query(
    'INSERT INTO coupons (code, discount_type, discount_value, min_purchase, max_discount, usage_limit, expires_at, is_active, note, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [...n.values, shopId]
  );
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}

export async function PUT(request) {
  let shopId;
  { const g = await shopWithFeature('coupons'); if (g.response) return g.response; shopId = g.shopId; }
  const b = await request.json();
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Quick on/off toggle from the list.
  if (Object.keys(b).length === 2 && 'is_active' in b) {
    await query('UPDATE coupons SET is_active = ? WHERE id = ? AND shop_id = ?', [b.is_active ? 1 : 0, b.id, shopId]);
    return NextResponse.json({ success: true });
  }

  const n = await normalize(b, shopId, b.id);
  if (n.error) return NextResponse.json({ error: n.error }, { status: n.status });
  await query(
    'UPDATE coupons SET code=?, discount_type=?, discount_value=?, min_purchase=?, max_discount=?, usage_limit=?, expires_at=?, is_active=?, note=? WHERE id=? AND shop_id=?',
    [...n.values, b.id, shopId]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  let shopId;
  { const g = await shopWithFeature('coupons'); if (g.response) return g.response; shopId = g.shopId; }
  const { searchParams } = new URL(request.url);
  await query('DELETE FROM coupons WHERE id = ? AND shop_id = ?', [searchParams.get('id'), shopId]);
  return NextResponse.json({ success: true });
}
