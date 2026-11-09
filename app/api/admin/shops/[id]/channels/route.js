import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../../lib/db';
import { verifyAdminSession, adminAudit } from '../../../../../../lib/admin-auth';
import { seal, hasEncryptionKey } from '../../../../../../lib/secret-box';
import * as meta from '../../../../../../lib/chat/meta';
import { waGateway, gatewayConfigured } from '../../../../../../lib/chat/waweb';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ID = /^\d{5,30}$/;

// Connect (or reconnect with a new token) a Facebook page or WhatsApp number to a shop.
// The token is checked against Meta first, then stored encrypted. It is never returned.
export async function POST(request, { params }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasEncryptionKey()) return NextResponse.json({ error: 'missing_encryption_key' }, { status: 500 });
  const shop = await queryOne('SELECT id FROM shops WHERE id = ?', [params.id]);
  if (!shop) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const b = await request.json();

  // WhatsApp by scan: create a pending channel and ask the gateway for a QR / pairing code.
  // The real phone number is filled in when the shop owner links it from their phone.
  if (b.platform === 'whatsapp_web') {
    if (!gatewayConfigured()) return NextResponse.json({ error: 'gateway_not_configured' }, { status: 500 });
    const pairingPhone = String(b.pairing_phone || '').replace(/\D/g, '');
    if (pairingPhone && (pairingPhone.length < 8 || pairingPhone.length > 15)) return NextResponse.json({ error: 'bad_phone' }, { status: 400 });
    const pending = `pending-${crypto.randomBytes(8).toString('hex')}`;
    const r = await query(
      "INSERT INTO chat_channels (shop_id, platform, external_id, name, token_enc, status) VALUES (?, 'whatsapp_web', ?, '', ?, 'pending')",
      [shop.id, pending, seal('-')]
    );
    try {
      const session = await waGateway.start(r.insertId, pairingPhone ? { pairingPhone } : {});
      await adminAudit(request, 'channel.pairing_started', shop.id, { platform: 'whatsapp_web', channel_id: r.insertId });
      return NextResponse.json({ success: true, channel_id: r.insertId, session });
    } catch (e) {
      await query('DELETE FROM chat_channels WHERE id = ?', [r.insertId]);
      return NextResponse.json({ error: e.code || 'gateway_unreachable' }, { status: 502 });
    }
  }

  const token = String(b.token || '').trim();
  if (!token || token.length > 1000) return NextResponse.json({ error: 'token_required' }, { status: 400 });

  let externalId, accountId = '', name;
  try {
    if (b.platform === 'messenger') {
      const providedId = String(b.external_id || '').trim();
      if (providedId) {
        // The shop gave the Page ID, so we never read the page from Meta — this avoids needing
        // pages_read_engagement; only pages_messaging + pages_manage_metadata (on the token) remain.
        if (!ID.test(providedId)) return NextResponse.json({ error: 'bad_page_id' }, { status: 400 });
        externalId = providedId;
        name = '';
      } else {
        const page = await meta.messengerPage(token);
        externalId = String(page.id);
        name = page.name;
      }
      await meta.messengerSubscribe(externalId, token);
    } else if (b.platform === 'whatsapp') {
      externalId = String(b.external_id || '').trim();
      accountId = String(b.account_id || '').trim();
      if (!ID.test(externalId) || !ID.test(accountId)) return NextResponse.json({ error: 'ids_required' }, { status: 400 });
      const num = await meta.whatsappNumber(externalId, token);
      name = [num.verified_name, num.display_phone_number].filter(Boolean).join(' ');
      await meta.whatsappSubscribe(accountId, token);
    } else {
      return NextResponse.json({ error: 'unknown_platform' }, { status: 400 });
    }
  } catch (e) {
    const msg = String(e.message || '');
    // The common cause for Messenger: the page token is missing the message/metadata scopes.
    if (b.platform === 'messenger' && (e.code === 100 || e.code === 200 || e.code === 190 || /permission|pages_|token/i.test(msg))) {
      return NextResponse.json({ error: 'page_token_permissions', detail: msg }, { status: 400 });
    }
    return NextResponse.json({ error: 'meta_rejected', detail: e.message }, { status: 400 });
  }

  // A page / number can belong to one shop only — stops one shop reading another's chats.
  const existing = await queryOne('SELECT id, shop_id FROM chat_channels WHERE platform = ? AND external_id = ?', [b.platform, externalId]);
  if (existing && existing.shop_id !== shop.id) return NextResponse.json({ error: 'owned_by_other_shop' }, { status: 409 });

  if (existing) {
    await query("UPDATE chat_channels SET token_enc = ?, account_id = ?, name = ?, status = 'active', last_error = NULL WHERE id = ?",
      [seal(token), accountId, name || '', existing.id]);
  } else {
    await query('INSERT INTO chat_channels (shop_id, platform, external_id, account_id, name, token_enc) VALUES (?, ?, ?, ?, ?, ?)',
      [shop.id, b.platform, externalId, accountId, name || '', seal(token)]);
  }
  await adminAudit(request, existing ? 'channel.token_updated' : 'channel.connected', shop.id, { platform: b.platform, external_id: externalId, name });
  return NextResponse.json({ success: true, name, external_id: externalId });
}

// Pause / resume a channel.
export async function PATCH(request, { params }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json();
  if (!['active', 'disabled'].includes(b.status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  const ch = await queryOne('SELECT id, platform FROM chat_channels WHERE id = ? AND shop_id = ?', [b.channel_id, params.id]);
  if (!ch) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  // A paused scanned number is disconnected (but stays linked), so no message is received and lost.
  if (ch.platform === 'whatsapp_web') {
    try {
      if (b.status === 'disabled') await waGateway.stop(ch.id);
      else await waGateway.start(ch.id);
    } catch (e) {
      return NextResponse.json({ error: e.code || 'gateway_unreachable' }, { status: 502 });
    }
  }
  await query('UPDATE chat_channels SET status = ? WHERE id = ? AND shop_id = ?', [b.status, ch.id, params.id]);
  await adminAudit(request, `channel.${b.status}`, Number(params.id), { channel_id: ch.id });
  return NextResponse.json({ success: true });
}

// Disconnect. Past conversations and messages of this channel are deleted with it.
export async function DELETE(request, { params }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const channelId = new URL(request.url).searchParams.get('channel_id');
  const ch = await queryOne('SELECT id, platform, external_id FROM chat_channels WHERE id = ? AND shop_id = ?', [channelId, params.id]);
  if (!ch) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  // Unlink the scanned device from the shop's WhatsApp too, so nothing keeps listening.
  if (ch.platform === 'whatsapp_web') await waGateway.logout(ch.id).catch(() => {});
  await query('DELETE FROM chat_messages WHERE channel_id = ? AND shop_id = ?', [ch.id, params.id]);
  await query('DELETE FROM chat_channels WHERE id = ? AND shop_id = ?', [ch.id, params.id]);
  await adminAudit(request, 'channel.removed', Number(params.id), { platform: ch.platform, external_id: ch.external_id });
  return NextResponse.json({ success: true });
}
