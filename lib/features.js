import { query } from './db';

// Every feature a shop can have. `core` features are part of every licence and
// cannot be switched off. Add-ons follow `default` unless the back office has
// saved a row for that shop in shop_features.
export const FEATURES = [
  { key: 'pos', core: true, name: { lo: 'ໜ້າຂາຍ', th: 'หน้าขาย', en: 'Checkout' } },
  { key: 'orders', core: true, name: { lo: 'ອໍເດີ້', th: 'ออเดอร์', en: 'Orders' } },
  { key: 'products', core: true, name: { lo: 'ສິນຄ້າ ແລະ ສະຕ໋ອກ', th: 'สินค้าและสต็อก', en: 'Products and stock' } },
  { key: 'customers', core: true, name: { lo: 'ລູກຄ້າ', th: 'ลูกค้า', en: 'Customers' } },
  { key: 'currencies', core: true, name: { lo: 'ອັດຕາແລກປ່ຽນ', th: 'อัตราแลกเปลี่ยน', en: 'Exchange rates' } },
  { key: 'coupons', default: true, name: { lo: 'ຄູປອງສ່ວນຫຼຸດ', th: 'คูปองส่วนลด', en: 'Coupons' } },
  { key: 'webhooks', default: true, name: { lo: 'ເຊື່ອມຕໍ່ລະບົບອື່ນ', th: 'เชื่อมต่อระบบอื่น', en: 'Integrations (webhooks)' } },
  { key: 'bot_api', default: true, name: { lo: 'ບອດ ແລະ ຂໍ້ຄວາມສົ່ງຕໍ່', th: 'บอทและข้อความส่งต่อ', en: 'Bot API and handoffs' } },
  { key: 'chat_messenger', default: false, name: { lo: 'ແຊັດ Facebook Messenger', th: 'แชท Facebook Messenger', en: 'Facebook Messenger chat' } },
  { key: 'chat_whatsapp', default: false, name: { lo: 'ແຊັດ WhatsApp', th: 'แชท WhatsApp', en: 'WhatsApp chat' } },
  { key: 'shipping_sync', default: false, name: { lo: 'ດຶງບິນຂົນສົ່ງ ແລະ ແຈ້ງລູກຄ້າອັດຕະໂນມັດ', th: 'ดึงบิลขนส่งและแจ้งลูกค้าอัตโนมัติ', en: 'Carrier bills and automatic customer notices' } },
];

export const FEATURE_KEYS = FEATURES.map(f => f.key);
// whatsapp = official Cloud API, whatsapp_web = connected by scanning a QR (linked device).
export const CHAT_FEATURE_FOR = { messenger: 'chat_messenger', whatsapp: 'chat_whatsapp', whatsapp_web: 'chat_whatsapp' };

// Chat platforms this shop may use, as stored in chat_channels.platform.
export function chatPlatforms(features) {
  const out = [];
  if (features.chat_messenger) out.push('messenger');
  if (features.chat_whatsapp) out.push('whatsapp', 'whatsapp_web');
  return out;
}

function today() {
  // Shop calendar (UTC+7); good enough for whole-day expiry checks.
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}

// { key: true/false } for every feature in the catalog.
export async function getShopFeatures(shopId) {
  const rows = await query('SELECT feature_key, enabled, expires_at FROM shop_features WHERE shop_id = ?', [shopId]);
  const saved = Object.fromEntries(rows.map(r => [r.feature_key, r]));
  const d = today();
  const out = {};
  for (const f of FEATURES) {
    if (f.core) { out[f.key] = true; continue; }
    const r = saved[f.key];
    if (!r) { out[f.key] = !!f.default; continue; }
    out[f.key] = !!r.enabled && (!r.expires_at || String(r.expires_at).slice(0, 10) >= d);
  }
  out.chat = out.chat_messenger || out.chat_whatsapp;
  return out;
}

export async function hasFeature(shopId, key) {
  return !!(await getShopFeatures(shopId))[key];
}

export class FeatureError extends Error {
  constructor(key) { super('FEATURE_DISABLED'); this.feature = key; }
}

// Throw unless the shop has the feature. API routes turn this into a 403.
export async function requireFeature(shopId, key) {
  if (!(await hasFeature(shopId, key))) throw new FeatureError(key);
}

// For API routes: logged-in shop that also has `key`. Returns { shopId } or { response }.
export async function shopWithFeature(key) {
  const { requireShopId } = await import('./auth');
  const { NextResponse } = await import('next/server');
  let shopId;
  try { shopId = await requireShopId(); } catch { return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }; }
  if (!(await hasFeature(shopId, key))) return { response: NextResponse.json({ error: 'feature_disabled' }, { status: 403 }) };
  return { shopId };
}
