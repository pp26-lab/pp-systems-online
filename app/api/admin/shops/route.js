import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { verifyAdminSession } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const shops = await query(`
    SELECT s.id, s.license_key, s.shop_name, s.created_at,
      (SELECT COUNT(*) FROM bot_api_keys WHERE shop_id = s.id) as key_count,
      (SELECT COUNT(*) FROM orders WHERE shop_id = s.id) as order_count,
      (SELECT COUNT(*) FROM products WHERE shop_id = s.id) as product_count
    FROM shops s ORDER BY s.created_at DESC
  `);
  return NextResponse.json(shops);
}
