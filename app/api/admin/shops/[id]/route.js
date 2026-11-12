import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../lib/db';
import { verifyAdminSession, adminAudit } from '../../../../../lib/admin-auth';
import { FEATURES, FEATURE_KEYS, getShopFeatures } from '../../../../../lib/features';
import { waGateway, gatewayConfigured } from '../../../../../lib/chat/waweb';

export const dynamic = 'force-dynamic';

async function shopOr404(id) {
  return queryOne('SELECT id, license_key, shop_name, created_at FROM shops WHERE id = ?', [id]);
}

// One shop in the back office: features, chat channels (never the tokens), recent audit.
export async function GET(request, { params }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const shop = await shopOr404(params.id);
  if (!shop) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [rows, effective, channels, audit, stats] = await Promise.all([
    query('SELECT feature_key, enabled, expires_at, note, updated_at FROM shop_features WHERE shop_id = ?', [shop.id]),
    getShopFeatures(shop.id),
    query(
      `SELECT ch.id, ch.platform, ch.external_id, ch.account_id, ch.name, ch.label, ch.status, ch.last_error, ch.created_at,
         (SELECT COUNT(*) FROM chat_conversations c WHERE c.channel_id = ch.id) AS conversations,
         (SELECT MAX(m.created_at) FROM chat_messages m WHERE m.channel_id = ch.id AND m.direction = 'in') AS last_inbound
       FROM chat_channels ch WHERE ch.shop_id = ? ORDER BY ch.platform`, [shop.id]
    ),
    query('SELECT action, detail, ip, created_at FROM admin_audit_log WHERE shop_id = ? ORDER BY id DESC LIMIT 30', [shop.id]),
    queryOne(
      `SELECT (SELECT COUNT(*) FROM products WHERE shop_id = ?) AS products,
         (SELECT COUNT(*) FROM orders WHERE shop_id = ?) AS orders,
         (SELECT COUNT(*) FROM customers WHERE shop_id = ?) AS customers,
         (SELECT MAX(created_at) FROM orders WHERE shop_id = ?) AS last_order`,
      [shop.id, shop.id, shop.id, shop.id]
    ),
  ]);
  // For WhatsApp-by-scan, the DB status only changes on a gateway event and can go stale
  // (e.g. the session was lost while nothing fired). Ask the gateway for the LIVE status so
  // the back office shows what is really happening right now, not a remembered value.
  const waChannels = channels.filter(ch => ch.platform === 'whatsapp_web');
  if (waChannels.length) {
    const live = gatewayConfigured() ? 'query' : 'gateway_off';
    await Promise.all(waChannels.map(async ch => {
      if (live !== 'query') { ch.live = live; return; }
      try { ch.live = (await waGateway.status(ch.id))?.status || 'unknown'; }
      catch { ch.live = 'gateway_down'; }
    }));
  }

  const saved = Object.fromEntries(rows.map(r => [r.feature_key, r]));
  const features = FEATURES.map(f => ({
    key: f.key, name: f.name, core: !!f.core, default: !!f.default,
    saved: saved[f.key] || null, active: !!effective[f.key],
  }));
  return NextResponse.json({ shop, features, channels, audit, stats });
}

// Turn one feature on or off (optionally until a date).
export async function PUT(request, { params }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const shop = await shopOr404(params.id);
  if (!shop) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const b = await request.json();
  const f = FEATURES.find(x => x.key === b.feature_key);
  if (!f || !FEATURE_KEYS.includes(b.feature_key)) return NextResponse.json({ error: 'unknown_feature' }, { status: 400 });
  if (f.core) return NextResponse.json({ error: 'core_feature' }, { status: 400 });
  const expires = b.expires_at ? String(b.expires_at).slice(0, 10) : null;
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return NextResponse.json({ error: 'invalid_date' }, { status: 400 });

  await query(
    `INSERT INTO shop_features (shop_id, feature_key, enabled, expires_at, note) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), expires_at = VALUES(expires_at), note = VALUES(note)`,
    [shop.id, f.key, b.enabled ? 1 : 0, expires, String(b.note || '').slice(0, 255)]
  );
  await adminAudit(request, b.enabled ? 'feature.on' : 'feature.off', shop.id, { feature: f.key, expires_at: expires });
  return NextResponse.json({ success: true });
}
