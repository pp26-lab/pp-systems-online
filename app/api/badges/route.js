import { NextResponse } from 'next/server';
import { queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';
import { getShopFeatures } from '../../../lib/features';

export const dynamic = 'force-dynamic';

// Small counters for sidebar badges, polled every 30s.
export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ handoffs: 0, pending_orders: 0, chat_unread: 0 }); }

  const features = await getShopFeatures(shopId);
  const platforms = ['messenger', 'whatsapp'].filter(p => features[`chat_${p}`]);

  const [handoffs, orders, chat] = await Promise.all([
    queryOne("SELECT COUNT(*) as c FROM handoffs WHERE shop_id = ? AND status = 'pending'", [shopId]),
    queryOne("SELECT COUNT(*) as c FROM orders WHERE shop_id = ? AND order_type = 'online' AND status = 'pending'", [shopId]),
    platforms.length
      ? queryOne(`SELECT COUNT(*) as c FROM chat_conversations WHERE shop_id = ? AND unread_count > 0 AND platform IN (${platforms.map(() => '?').join(',')})`, [shopId, ...platforms])
      : null,
  ]);

  return NextResponse.json({
    handoffs: handoffs?.c || 0,
    pending_orders: orders?.c || 0,
    chat_unread: chat?.c || 0,
  });
}
