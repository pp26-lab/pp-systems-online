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

  await query('UPDATE currencies SET rate_to_lak = ? WHERE code = ? AND shop_id = ?',
    [body.rate_to_lak, body.code, shopId]);

  await query('INSERT INTO exchange_rate_history (shop_id, from_currency, to_currency, rate) VALUES (?, ?, ?, ?)',
    [shopId, body.code, 'LAK', body.rate_to_lak]);

  const products = await query('SELECT * FROM products WHERE cost_currency = ? AND shop_id = ?', [body.code, shopId]);

  for (const p of products) {
    const totalCost = p.cost_price + p.freight_cost + p.customs_duty + p.proxy_fee + p.transfer_fee;
    const newLandedCost = totalCost * body.rate_to_lak;
    await query('UPDATE products SET landed_cost_lak = ? WHERE id = ? AND shop_id = ?', [newLandedCost, p.id, shopId]);
  }

  return NextResponse.json({ success: true });
}
