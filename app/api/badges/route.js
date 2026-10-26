import { NextResponse } from 'next/server';
import { queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// Small counters for sidebar badges, polled every 30s.
export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ handoffs: 0, pending_orders: 0 }); }

  const [handoffs, orders] = await Promise.all([
    queryOne("SELECT COUNT(*) as c FROM handoffs WHERE shop_id = ? AND status = 'pending'", [shopId]),
    queryOne("SELECT COUNT(*) as c FROM orders WHERE shop_id = ? AND order_type = 'online' AND status = 'pending'", [shopId]),
  ]);

  return NextResponse.json({
    handoffs: handoffs?.c || 0,
    pending_orders: orders?.c || 0,
  });
}
