import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../../lib/db';
import { verifyAdminSession, adminAudit } from '../../../../../../lib/admin-auth';
import { seal, hasEncryptionKey } from '../../../../../../lib/secret-box';
import * as meta from '../../../../../../lib/chat/meta';

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
  const token = String(b.token || '').trim();
  if (!token || token.length > 1000) return NextResponse.json({ error: 'token_required' }, { status: 400 });

  let externalId, accountId = '', name;
  try {
    if (b.platform === 'messenger') {
      const page = await meta.messengerPage(token);
      externalId = String(page.id);
      name = page.name;
      if (b.external_id && String(b.external_id) !== externalId) return NextResponse.json({ error: 'page_mismatch' }, { status: 400 });
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
  const r = await query('UPDATE chat_channels SET status = ? WHERE id = ? AND shop_id = ?', [b.status, b.channel_id, params.id]);
  if (!r.affectedRows) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await adminAudit(request, `channel.${b.status}`, Number(params.id), { channel_id: b.channel_id });
  return NextResponse.json({ success: true });
}

// Disconnect. Past conversations and messages of this channel are deleted with it.
export async function DELETE(request, { params }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const channelId = new URL(request.url).searchParams.get('channel_id');
  const ch = await queryOne('SELECT id, platform, external_id FROM chat_channels WHERE id = ? AND shop_id = ?', [channelId, params.id]);
  if (!ch) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await query('DELETE FROM chat_messages WHERE channel_id = ? AND shop_id = ?', [ch.id, params.id]);
  await query('DELETE FROM chat_channels WHERE id = ? AND shop_id = ?', [ch.id, params.id]);
  await adminAudit(request, 'channel.removed', Number(params.id), { platform: ch.platform, external_id: ch.external_id });
  return NextResponse.json({ success: true });
}
