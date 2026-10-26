import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const currencies = await query('SELECT * FROM currencies WHERE shop_id = ? ORDER BY code', [shopId]);
  const history = await query('SELECT * FROM exchange_rate_history WHERE shop_id = ? ORDER BY recorded_at DESC LIMIT 50', [shopId]);
  return NextResponse.json({ currencies, history });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const rate = Number(body.rate_to_lak);
  if (!body.code || body.code === 'LAK') return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
  if (!Number.isFinite(rate) || rate <= 0) return NextResponse.json({ error: 'Rate must be greater than 0' }, { status: 400 });

  await query('UPDATE currencies SET rate_to_lak = ? WHERE code = ? AND shop_id = ?', [rate, body.code, shopId]);
  await query('INSERT INTO exchange_rate_history (shop_id, from_currency, to_currency, rate) VALUES (?, ?, ?, ?)',
    [shopId, body.code, 'LAK', rate]);

  // Existing products keep the rate they were costed at (products.exchange_rate_used);
  // only products added or re-costed from now on use the new rate.
  return NextResponse.json({ success: true });
}
