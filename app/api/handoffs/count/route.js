import { NextResponse } from 'next/server';
import { queryOne } from '../../../../lib/db';
import { requireShopId } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ pending: 0 }); }
  const row = await queryOne("SELECT COUNT(*) as pending FROM handoffs WHERE shop_id = ? AND status = 'pending'", [shopId]);
  return NextResponse.json({ pending: row?.pending || 0 });
}
