import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../lib/db';
import { requireShopId } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const customer = await queryOne('SELECT * FROM customers WHERE id = ? AND shop_id = ?', [params.id, shopId]);
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const orders = await query(
    'SELECT id, order_number, total, currency, status, order_type, created_at FROM orders WHERE customer_id = ? AND shop_id = ? ORDER BY created_at DESC LIMIT 100',
    [params.id, shopId]
  );

  return NextResponse.json({ ...customer, orders });
}
