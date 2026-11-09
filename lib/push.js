import crypto from 'crypto';
import webpush from 'web-push';
import { query, queryOne } from './db';
import { seal, open, hasEncryptionKey } from './secret-box';

// Web Push: tell a shop's phones about a new customer message even when the screen is off or
// another app is open. The browser vendor's push service (Google/Apple/Mozilla) delivers it;
// the payload is end-to-end encrypted to the phone, so the push service can't read it.
//
// The VAPID key pair identifies this server to those push services. It is made once, the
// private half stored encrypted in platform_settings, so nothing has to be set up by hand.

const SUBJECT = 'https://ppsystems-shop.com';
let keys = null;

async function vapid() {
  if (keys) return keys;
  const rows = await query("SELECT name, value_enc FROM platform_settings WHERE name IN ('vapid_public', 'vapid_private_enc')");
  const got = Object.fromEntries(rows.map(r => [r.name, r.value_enc]));
  if (got.vapid_public && got.vapid_private_enc) {
    keys = { publicKey: got.vapid_public, privateKey: open(got.vapid_private_enc) };
  } else {
    const k = webpush.generateVAPIDKeys();
    // INSERT IGNORE: if two requests race, the first write wins and both re-read it.
    await query("INSERT IGNORE INTO platform_settings (name, value_enc) VALUES ('vapid_public', ?), ('vapid_private_enc', ?)",
      [k.publicKey, seal(k.privateKey)]);
    keys = null;
    return vapid();
  }
  return keys;
}

export async function publicKey() {
  if (!hasEncryptionKey()) return null;
  return (await vapid()).publicKey;
}

const hashOf = endpoint => crypto.createHash('sha256').update(String(endpoint)).digest('hex');

// Only real push services, so a crafted "subscription" can't make the server call other URLs.
const PUSH_HOSTS = /(^|\.)(googleapis\.com|push\.apple\.com|mozilla\.com|mozaws\.net|notify\.windows\.com|windows\.com)$/i;

export function validSubscription(sub) {
  try {
    const u = new URL(sub?.endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname)
      && typeof sub.keys?.p256dh === 'string' && typeof sub.keys?.auth === 'string'
      && sub.keys.p256dh.length < 200 && sub.keys.auth.length < 100 && String(sub.endpoint).length < 2000;
  } catch {
    return false;
  }
}

export async function saveSubscription(shopId, sub, { lang = 'lo', userAgent = '' } = {}) {
  // Same phone signing in to another shop moves the subscription: one endpoint, one shop.
  await query(
    `INSERT INTO push_subscriptions (shop_id, endpoint_hash, endpoint, p256dh, auth, lang, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE shop_id = VALUES(shop_id), endpoint = VALUES(endpoint), p256dh = VALUES(p256dh),
       auth = VALUES(auth), lang = VALUES(lang), user_agent = VALUES(user_agent), fail_count = 0`,
    [shopId, hashOf(sub.endpoint), sub.endpoint, sub.keys.p256dh, sub.keys.auth, String(lang).slice(0, 5), String(userAgent).slice(0, 255)]
  );
}

export async function removeSubscription(shopId, endpoint) {
  await query('DELETE FROM push_subscriptions WHERE endpoint_hash = ? AND shop_id = ?', [hashOf(endpoint), shopId]);
}

const MEDIA_LABEL = {
  lo: { image: '📷 ຮູບພາບ', sticker: 'ສະຕິກເກີ', audio: '🎤 ສຽງ', video: '🎬 ວິດີໂອ', file: '📎 ໄຟລ໌', location: '📍 ທີ່ຕັ້ງ', other: 'ຂໍ້ຄວາມໃໝ່' },
  th: { image: '📷 รูปภาพ', sticker: 'สติกเกอร์', audio: '🎤 เสียง', video: '🎬 วิดีโอ', file: '📎 ไฟล์', location: '📍 ตำแหน่ง', other: 'ข้อความใหม่' },
  en: { image: '📷 Photo', sticker: 'Sticker', audio: '🎤 Voice', video: '🎬 Video', file: '📎 File', location: '📍 Location', other: 'New message' },
};
const NEW_CHAT = { lo: 'ລູກຄ້າ', th: 'ลูกค้า', en: 'Customer' };
const PLATFORM = { messenger: 'Messenger', whatsapp: 'WhatsApp', whatsapp_web: 'WhatsApp' };

// A new customer message was stored. Fire-and-forget: never slows down or breaks message intake.
export function notifyNewMessage({ shopId, conv, type, text }) {
  sendToShop({ shopId, conv, type, text }).catch(e => console.error('push:', e.message));
}

async function sendToShop({ shopId, conv, type, text }) {
  const subs = await query('SELECT id, endpoint, p256dh, auth, lang, fail_count FROM push_subscriptions WHERE shop_id = ?', [shopId]);
  if (!subs.length) return;
  const k = await vapid();
  webpush.setVapidDetails(SUBJECT, k.publicKey, k.privateKey);

  const c = await queryOne('SELECT name, phone, platform FROM chat_conversations WHERE id = ? AND shop_id = ?', [conv.id, shopId]);
  for (const s of subs) {
    const L = MEDIA_LABEL[s.lang] || MEDIA_LABEL.lo;
    const who = c?.name || c?.phone || NEW_CHAT[s.lang] || NEW_CHAT.lo;
    const body = text ? String(text).slice(0, 180) : (L[type] || L.other);
    const payload = JSON.stringify({
      title: PLATFORM[c?.platform] ? `${who} (${PLATFORM[c.platform]})` : who,
      body,
      url: `/chat?c=${conv.id}`,
      tag: `chat-${conv.id}`, // later messages of the same chat replace the earlier notification
    });
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload,
        { TTL: 3600, urgency: 'high', timeout: 10000 });
      await query('UPDATE push_subscriptions SET last_ok_at = NOW(), fail_count = 0 WHERE id = ?', [s.id]);
    } catch (e) {
      // 404/410: the phone unsubscribed or the browser data was cleared. Forget it.
      if (e.statusCode === 404 || e.statusCode === 410 || s.fail_count >= 20) {
        await query('DELETE FROM push_subscriptions WHERE id = ?', [s.id]);
      } else {
        await query('UPDATE push_subscriptions SET fail_count = fail_count + 1 WHERE id = ?', [s.id]);
      }
    }
  }
}
