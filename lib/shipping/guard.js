import { NextResponse } from 'next/server';
import { requireShopId } from '../auth';
import { hasFeature } from '../features';

// Shop-side shipping API: logged in, and the shop has bought the shipping feature.
export async function shippingGuard() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }; }
  if (!(await hasFeature(shopId, 'shipping_sync'))) return { response: NextResponse.json({ error: 'feature_disabled' }, { status: 403 }) };
  return { shopId };
}
