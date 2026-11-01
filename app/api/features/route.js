import { NextResponse } from 'next/server';
import { requireShopId } from '../../../lib/auth';
import { getShopFeatures } from '../../../lib/features';

export const dynamic = 'force-dynamic';

// Which features the logged-in shop has, so the UI can hide what it hasn't bought.
export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  return NextResponse.json(await getShopFeatures(shopId));
}
