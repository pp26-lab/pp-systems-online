import { NextResponse } from 'next/server';
import { requireShopId } from '../auth';
import { getShopFeatures } from '../features';
import { startSweeper } from './inbox';

// Common entry check for the shop-side chat API: logged in and the shop has bought chat.
// Returns { shopId, features } or { response } to send back as-is.
export async function chatGuard() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }; }
  const features = await getShopFeatures(shopId);
  if (!features.chat) return { response: NextResponse.json({ error: 'feature_disabled' }, { status: 403 }) };
  startSweeper();
  return { shopId, features };
}

export const ERROR_STATUS = {
  not_found: 404, channel_disabled: 409, feature_disabled: 403, window_closed: 409, empty: 400,
  unsupported_type: 400, file_too_large: 400, file_content_invalid: 400, file_missing: 410,
};
