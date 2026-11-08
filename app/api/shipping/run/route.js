import { NextResponse } from 'next/server';
import { queryOne } from '../../../../lib/db';
import { shippingGuard } from '../../../../lib/shipping/guard';
import { runShopNow } from '../../../../lib/shipping/scraper';

export const dynamic = 'force-dynamic';

// "Check now": at most once every 10 minutes per shop, to keep the load on Anousith light.
export async function POST() {
  const g = await shippingGuard();
  if (g.response) return g.response;
  const last = await queryOne(
    'SELECT id FROM shipping_scrape_runs WHERE shop_id = ? AND started_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE) ORDER BY id DESC LIMIT 1',
    [g.shopId]
  );
  if (last) return NextResponse.json({ error: 'too_soon' }, { status: 429 });
  const r = await runShopNow(g.shopId);
  if (r?.error) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r || {});
}
