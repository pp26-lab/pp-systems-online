import { NextResponse } from 'next/server';
import { queryOne, query, shopToday } from '../../../../lib/db';
import { requireShopId } from '../../../../lib/auth';
import { shopWithFeature } from '../../../../lib/features';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let shopId;
  { const g = await shopWithFeature('coupons'); if (g.response) return g.response; shopId = g.shopId; }

  const { code, subtotal } = await request.json();
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

  const coupon = await queryOne(
    'SELECT * FROM coupons WHERE shop_id = ? AND code = ? AND is_active = 1',
    [shopId, code.toUpperCase().trim()]
  );

  if (!coupon) return NextResponse.json({ error: 'Invalid coupon' }, { status: 404 });
  // The expiry date is inclusive: a coupon ending on the 31st still works all day on the 31st.
  if (coupon.expires_at && String(coupon.expires_at).slice(0, 10) < shopToday()) {
    return NextResponse.json({ error: 'Coupon expired' }, { status: 400 });
  }
  if (coupon.usage_limit > 0 && coupon.times_used >= coupon.usage_limit) {
    return NextResponse.json({ error: 'Coupon fully used' }, { status: 400 });
  }
  // DECIMAL columns come back as strings, so convert before doing any maths.
  const sub = Number(subtotal) || 0;
  const value = Number(coupon.discount_value) || 0;
  const minPurchase = Number(coupon.min_purchase) || 0;
  const cap = Number(coupon.max_discount) || 0;
  if (minPurchase > 0 && sub < minPurchase) {
    return NextResponse.json({ error: `Minimum purchase ${minPurchase}`, min_purchase: minPurchase }, { status: 400 });
  }

  let discount = coupon.discount_type === 'percent' ? (sub * value) / 100 : value;
  if (cap > 0 && discount > cap) discount = cap;
  discount = Math.min(Math.round(discount), sub);

  return NextResponse.json({ valid: true, discount, coupon });
}
