import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../lib/db';
import { seal, open, hasEncryptionKey } from '../../../../lib/secret-box';
import { shippingGuard } from '../../../../lib/shipping/guard';
import { login } from '../../../../lib/shipping/anousith';

export const dynamic = 'force-dynamic';

const CARRIER = 'anousith';

// Login checks against Anousith, per shop: at most 5 in 10 minutes, so this form can't be
// used to hammer their login or lock the shop's own account.
const attempts = new Map();
function allowAttempt(shopId) {
  const now = Date.now();
  const list = (attempts.get(shopId) || []).filter(t => now - t < 10 * 60 * 1000);
  if (list.length >= 5) return false;
  list.push(now);
  attempts.set(shopId, list);
  return true;
}

// Body: { username?, password?, enabled?, message_template? }
// The password is checked with Anousith before it is stored, then kept only encrypted.
export async function PUT(request) {
  const g = await shippingGuard();
  if (g.response) return g.response;
  const shopId = g.shopId;
  if (!hasEncryptionKey()) return NextResponse.json({ error: 'server_key_missing' }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const acc = await queryOne('SELECT * FROM shipping_accounts WHERE shop_id = ? AND carrier = ?', [shopId, CARRIER]);
  let current = null;
  if (acc?.login_enc) { try { current = JSON.parse(open(acc.login_enc)); } catch { current = null; } }

  const username = body.username !== undefined ? String(body.username).replace(/\D/g, '').slice(0, 15) : (current?.username || '');
  const password = body.password ? String(body.password).slice(0, 200) : '';
  let loginEnc = acc?.login_enc || null;
  let warning = null;

  if (password || (username && username !== current?.username)) {
    if (!username || username.length < 7) return NextResponse.json({ error: 'username_invalid' }, { status: 400 });
    if (!password) return NextResponse.json({ error: 'password_required' }, { status: 400 });
    if (!allowAttempt(shopId)) return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
    try {
      await login(username, password);
    } catch (e) {
      if (e.code === 'auth') return NextResponse.json({ error: 'login_failed' }, { status: 400 });
      warning = e.code || 'unverified'; // Anousith unreachable or refusing this server: saved but not verified
    }
    loginEnc = seal(JSON.stringify({ username, password }));
  }

  let enabled = body.enabled !== undefined ? !!body.enabled : !!acc?.enabled;
  // Saving a new password (for example after a failed login stopped syncing) turns it back on.
  if (password && body.enabled === undefined) enabled = true;
  if (enabled && !loginEnc) return NextResponse.json({ error: 'login_required' }, { status: 400 });

  const template = body.message_template !== undefined
    ? (String(body.message_template).trim().slice(0, 1000) || null)
    : (acc?.message_template ?? null);

  const autoNotify = body.auto_notify !== undefined ? !!body.auto_notify : (acc ? !!acc.auto_notify : true);

  const loginChanged = loginEnc !== (acc?.login_enc || null);
  await query(
    `INSERT INTO shipping_accounts (shop_id, carrier, login_enc, enabled, auto_notify, message_template)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE login_enc = VALUES(login_enc), enabled = VALUES(enabled), auto_notify = VALUES(auto_notify),
       message_template = VALUES(message_template)`,
    [shopId, CARRIER, loginEnc, enabled ? 1 : 0, autoNotify ? 1 : 0, template]
  );
  if (loginChanged) await query('UPDATE shipping_accounts SET last_error = NULL WHERE shop_id = ? AND carrier = ?', [shopId, CARRIER]);
  return NextResponse.json({ ok: true, warning });
}

// Disconnect: forget the login entirely.
export async function DELETE() {
  const g = await shippingGuard();
  if (g.response) return g.response;
  await query("UPDATE shipping_accounts SET login_enc = NULL, enabled = 0, account_ref = '' WHERE shop_id = ? AND carrier = ?", [g.shopId, CARRIER]);
  return NextResponse.json({ ok: true });
}
