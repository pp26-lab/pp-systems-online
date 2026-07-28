import { NextResponse } from 'next/server';
import { queryOne, query } from '../../../../lib/db';
import { requireShopId } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { code, subtotal } = await request.json();
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

  const coupon = await queryOne(
    'SELECT * FROM coupons WHERE shop_id = ? AND code = ? AND is_active = 1',
    [shopId, code.toUpperCase().trim()]
  );

  if (!coupon) return NextResponse.json({ error: 'Invalid coupon' }, { status: 404 });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Coupon expired' }, { status: 400 });
  }
  if (coupon.usage_limit > 0 && coupon.times_used >= coupon.usage_limit) {
    return NextResponse.json({ error: 'Coupon fully used' }, { status: 400 });
  }
  if (coupon.min_purchase > 0 && subtotal < coupon.min_purchase) {
    return NextResponse.json({ error: `Minimum purchase ${coupon.min_purchase}` }, { status: 400 });
  }

  let discount = coupon.discount_type === 'percent'
    ? (subtotal * coupon.discount_value) / 100
    : coupon.discount_value;
  if (coupon.max_discount > 0 && discount > coupon.max_discount) discount = coupon.max_discount;

  return NextResponse.json({ valid: true, discount, coupon });
}
