import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../lib/db';
import { verifyGatewayEvent, waGateway } from '../../../../../lib/chat/waweb';
import { recordEvent, startSweeper } from '../../../../../lib/chat/inbox';
import { saveMedia, isAllowedMime, cleanMime } from '../../../../../lib/chat/media';

export const dynamic = 'force-dynamic';

const PATH = '/api/channels/wa-web/event';
const ok = () => NextResponse.json({ ok: true });

// Events from the WhatsApp gateway on this same server (never from the internet).
export async function POST(request) {
  // The gateway calls us directly on 127.0.0.1; anything that came through nginx is from outside.
  if (request.headers.get('x-forwarded-for')) return new NextResponse('Forbidden', { status: 403 });
  const raw = await request.text();
  if (raw.length > 30 * 1024 * 1024) return new NextResponse('Too large', { status: 413 });
  if (!verifyGatewayEvent(request, PATH, raw)) return new NextResponse('Invalid signature', { status: 401 });

  let evt;
  try { evt = JSON.parse(raw); } catch { return new NextResponse('Bad JSON', { status: 400 }); }
  const ch = await queryOne("SELECT * FROM chat_channels WHERE id = ? AND platform = 'whatsapp_web'", [evt.channelId]);
  if (!ch) return new NextResponse('Unknown channel', { status: 404 });
  startSweeper();

  if (evt.type === 'connected') {
    const phone = String(evt.phone || '').replace(/\D/g, '');
    if (!phone) return ok();
    // One number belongs to one shop only, and once per shop.
    const other = await queryOne(
      "SELECT id, shop_id FROM chat_channels WHERE platform = 'whatsapp_web' AND external_id = ? AND id <> ?", [phone, ch.id]
    );
    if (other) {
      const reason = other.shop_id === ch.shop_id ? 'duplicate_number' : 'owned_by_other_shop';
      await query("UPDATE chat_channels SET status = 'error', last_error = ? WHERE id = ?", [reason, ch.id]);
      waGateway.logout(ch.id).catch(() => {});
      await query('INSERT INTO admin_audit_log (shop_id, action, detail) VALUES (?, ?, ?)',
        [ch.shop_id, 'channel.rejected', JSON.stringify({ channel_id: ch.id, reason })]).catch(() => {});
      return ok();
    }
    const name = evt.name ? `${evt.name} (+${phone})` : `+${phone}`;
    await query("UPDATE chat_channels SET external_id = ?, name = ?, status = 'active', last_error = NULL WHERE id = ?", [phone, name.slice(0, 255), ch.id]);
    await query('INSERT INTO admin_audit_log (shop_id, action, detail) VALUES (?, ?, ?)',
      [ch.shop_id, 'channel.connected', JSON.stringify({ platform: 'whatsapp_web', channel_id: ch.id, phone })]).catch(() => {});
    return ok();
  }

  if (evt.type === 'logged_out' || evt.type === 'disconnected') {
    await query("UPDATE chat_channels SET status = 'error', last_error = ? WHERE id = ?", [String(evt.reason || evt.type).slice(0, 255), ch.id]);
    return ok();
  }

  if (evt.type === 'message') {
    // Keep the photo/file privately on disk; the queued event only references it.
    let mediaFile = null;
    let mediaMime = null;
    let mediaError = evt.mediaError || null;
    if (evt.media?.base64) {
      try {
        mediaMime = cleanMime(evt.media.mime);
        if (isAllowedMime(mediaMime)) mediaFile = saveMedia(ch.shop_id, Buffer.from(evt.media.base64, 'base64'), mediaMime);
        else { mediaError = `unsupported media type ${mediaMime}`; mediaMime = null; }
      } catch (e) {
        mediaError = e.message;
        mediaMime = null;
      }
    }
    const { media, ...rest } = evt;
    await recordEvent('waweb', JSON.stringify({ ...rest, mediaFile, mediaMime, mediaError }));
    return ok();
  }

  if (evt.type === 'status') {
    await recordEvent('waweb', raw);
    return ok();
  }

  return new NextResponse('Unknown event', { status: 400 });
}
