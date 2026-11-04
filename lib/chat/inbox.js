import { query, queryOne } from '../db';
import { open } from '../secret-box';
import * as meta from './meta';
import { saveMedia, isAllowedMime, typeForMime, cleanMime } from './media';
import { upsertConversation, insertMessage, updateOutStatus } from './store';

// Webhook deliveries are written to chat_inbox_events first and processed here.
// If the server restarts mid-way, pending rows are picked up again by the sweeper,
// and every message is deduplicated by its platform id, so nothing is lost or doubled.

const MAX_ATTEMPTS = 5;
const state = globalThis.__ppChatInbox || (globalThis.__ppChatInbox = { running: false, timer: null });

export async function recordEvent(source, rawBody) {
  const r = await query('INSERT INTO chat_inbox_events (source, payload) VALUES (?, ?)', [source, rawBody]);
  processPending().catch(e => console.error('chat inbox:', e.message));
  return r.insertId;
}

export function startSweeper() {
  if (state.timer) return;
  state.timer = setInterval(() => processPending().catch(e => console.error('chat inbox:', e.message)), 15000);
  state.timer.unref?.();
}

export async function processPending() {
  if (state.running) return;
  state.running = true;
  try {
    for (;;) {
      const rows = await query(
        "SELECT id, source, payload, attempts FROM chat_inbox_events WHERE status IN ('pending','failed') AND attempts < ? ORDER BY id LIMIT 20",
        [MAX_ATTEMPTS]
      );
      if (!rows.length) break;
      for (const ev of rows) {
        // Claim the row so a second server process can't handle it at the same time.
        const claim = await query('UPDATE chat_inbox_events SET attempts = attempts + 1 WHERE id = ? AND attempts = ?', [ev.id, ev.attempts]);
        if (!claim.affectedRows) continue;
        try {
          const payload = JSON.parse(ev.payload);
          const handled = ev.source === 'waweb' ? await handleWaWeb(payload) : await handleMeta(payload);
          await query('UPDATE chat_inbox_events SET status = ?, last_error = NULL WHERE id = ?', [handled ? 'done' : 'ignored', ev.id]);
        } catch (e) {
          await query("UPDATE chat_inbox_events SET status = 'failed', last_error = ? WHERE id = ?", [String(e.message).slice(0, 2000), ev.id]);
        }
      }
    }
    // Keep the table small: processed events are only useful for a few days.
    await query("DELETE FROM chat_inbox_events WHERE status IN ('done','ignored') AND created_at < NOW() - INTERVAL 7 DAY");
  } finally {
    state.running = false;
  }
}

async function channelFor(platform, externalId) {
  const ch = await queryOne("SELECT * FROM chat_channels WHERE platform = ? AND external_id = ? AND status <> 'disabled'", [platform, String(externalId)]);
  if (!ch) return null;
  ch.token = open(ch.token_enc);
  return ch;
}

async function storeMedia(shopId, fetcher) {
  try {
    const { buffer, mime } = await fetcher();
    const m = cleanMime(mime);
    if (!isAllowedMime(m)) return { error: `unsupported media type ${m}` };
    return { file: saveMedia(shopId, buffer, m), mime: m };
  } catch (e) {
    return { error: e.message };
  }
}

// Returns true when at least one entry belonged to a connected channel.
async function handleMeta(payload) {
  if (payload.object === 'page') return handleMessenger(payload);
  if (payload.object === 'whatsapp_business_account') return handleWhatsApp(payload);
  return false;
}

// ---------------------------------------------------------------- Messenger

async function handleMessenger(payload) {
  let handled = false;
  for (const entry of payload.entry || []) {
    const ch = await channelFor('messenger', entry.id);
    if (!ch) continue;
    handled = true;
    for (const ev of entry.messaging || []) {
      const at = new Date(ev.timestamp || Date.now());
      if (ev.delivery) {
        for (const mid of ev.delivery.mids || []) await updateOutStatus(ch.id, mid, 'delivered');
        continue;
      }
      if (ev.read) {
        const userId = ev.sender?.id;
        await query(
          `UPDATE chat_messages m JOIN chat_conversations c ON c.id = m.conversation_id
           SET m.status = 'read'
           WHERE c.channel_id = ? AND c.external_user_id = ? AND m.direction = 'out' AND m.status IN ('sent','delivered') AND m.created_at <= ?`,
          [ch.id, String(userId), new Date(ev.read.watermark || Date.now())]
        );
        continue;
      }

      const msg = ev.message || (ev.postback ? { mid: `pb-${ev.timestamp}-${ev.sender?.id}`, text: ev.postback.title } : null);
      if (!msg) continue;
      const echo = !!msg.is_echo;
      const userId = echo ? ev.recipient?.id : ev.sender?.id;
      if (!userId) continue;

      // Fetch the name/photo only the first time we meet this person.
      const existing = await queryOne('SELECT id, name FROM chat_conversations WHERE channel_id = ? AND external_user_id = ?', [ch.id, String(userId)]);
      const profile = !existing?.name ? await meta.messengerProfile(userId, ch.token) : {};
      const conv = await upsertConversation({ shopId: ch.shop_id, channel: ch, userId, name: profile.name || '', avatar: profile.avatar || null });

      // Replies typed in the Facebook app arrive as echoes; ones we sent are already stored.
      const direction = echo ? 'out' : 'in';
      const status = echo ? 'sent' : 'received';
      const attachments = msg.attachments || [];
      if (!attachments.length) {
        await insertMessage({ shopId: ch.shop_id, conv, direction, type: 'text', text: msg.text || '', externalId: msg.mid, status, at });
        continue;
      }
      for (let i = 0; i < attachments.length; i++) {
        const a = attachments[i];
        const externalId = i === 0 ? msg.mid : `${msg.mid}#${i}`;
        const dup = await queryOne('SELECT id FROM chat_messages WHERE channel_id = ? AND external_id = ?', [ch.id, externalId]);
        if (dup) continue;
        const text = i === 0 ? (msg.text || null) : null;
        if (a.type === 'location' || a.type === 'fallback' || !a.payload?.url) {
          await insertMessage({ shopId: ch.shop_id, conv, direction, type: a.type === 'location' ? 'location' : 'text',
            text: text || a.title || a.payload?.url || '', externalId, status, at });
          continue;
        }
        const media = await storeMedia(ch.shop_id, () => meta.downloadUrl(a.payload.url));
        const type = a.payload?.sticker_id ? 'sticker' : media.mime ? typeForMime(media.mime) : (a.type === 'image' ? 'image' : 'file');
        await insertMessage({ shopId: ch.shop_id, conv, direction, type, text, mediaFile: media.file || null, mediaMime: media.mime || null,
          externalId, status, error: media.error || null, at });
      }
    }
  }
  return handled;
}

// ---------------------------------------------------------------- WhatsApp (scanned / linked device)

// Events from gateway/wa-gateway.mjs. Media was already saved by the event route.
async function handleWaWeb(p) {
  const ch = await queryOne("SELECT * FROM chat_channels WHERE id = ? AND platform = 'whatsapp_web' AND status <> 'disabled'", [p.channelId]);
  if (!ch) return false;

  if (p.type === 'status') {
    await updateOutStatus(ch.id, p.id, p.status);
    return true;
  }
  if (p.type !== 'message' || !p.contact || !p.id) return false;

  const conv = await upsertConversation({
    shopId: ch.shop_id, channel: ch, userId: p.contact,
    name: p.direction === 'in' ? (p.name || '') : '',
    phone: p.phone ? `+${p.phone}` : '',
  });
  await insertMessage({
    shopId: ch.shop_id, conv, direction: p.direction === 'out' ? 'out' : 'in',
    type: p.msgType || 'text', text: p.text ?? null, mediaFile: p.mediaFile || null, mediaMime: p.mediaMime || null,
    externalId: p.id, status: p.direction === 'out' ? 'sent' : 'received', error: p.mediaError || null,
    at: new Date(Number(p.ts) || Date.now()),
  });
  return true;
}

// ---------------------------------------------------------------- WhatsApp (Cloud API)

const WA_STATUS = { sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed' };

async function handleWhatsApp(payload) {
  let handled = false;
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneId = value.metadata?.phone_number_id;
      if (!phoneId) continue;
      const ch = await channelFor('whatsapp', phoneId);
      if (!ch) continue;
      handled = true;

      for (const s of value.statuses || []) {
        const err = s.errors?.[0] ? `${s.errors[0].code} ${s.errors[0].title || ''} ${s.errors[0].error_data?.details || ''}`.trim() : null;
        if (WA_STATUS[s.status]) await updateOutStatus(ch.id, s.id, WA_STATUS[s.status], err);
      }

      const names = Object.fromEntries((value.contacts || []).map(c => [c.wa_id, c.profile?.name || '']));
      for (const m of value.messages || []) {
        const at = new Date(Number(m.timestamp) * 1000 || Date.now());
        const conv = await upsertConversation({ shopId: ch.shop_id, channel: ch, userId: m.from, name: names[m.from] || '', phone: `+${m.from}` });
        const dup = await queryOne('SELECT id FROM chat_messages WHERE channel_id = ? AND external_id = ?', [ch.id, m.id]);
        if (dup) continue;

        const base = { shopId: ch.shop_id, conv, direction: 'in', externalId: m.id, at };
        const mediaObj = m.image || m.document || m.audio || m.video || m.sticker;
        if (mediaObj?.id) {
          const media = await storeMedia(ch.shop_id, () => meta.whatsappDownload(mediaObj.id, ch.token));
          const type = m.type === 'sticker' ? 'sticker' : media.mime ? typeForMime(media.mime) : 'file';
          await insertMessage({ ...base, type, text: mediaObj.caption || mediaObj.filename || null,
            mediaFile: media.file || null, mediaMime: media.mime || null, error: media.error || null });
          continue;
        }
        let text;
        switch (m.type) {
          case 'text': text = m.text?.body; break;
          case 'button': text = m.button?.text; break;
          case 'interactive': text = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title; break;
          case 'location': text = [m.location?.name, m.location?.address, `${m.location?.latitude},${m.location?.longitude}`].filter(Boolean).join('\n'); break;
          case 'reaction': text = m.reaction?.emoji ? `${m.reaction.emoji}` : null; break;
          case 'contacts': text = (m.contacts || []).map(c => `${c.name?.formatted_name || ''} ${(c.phones || []).map(p => p.phone).join(', ')}`).join('\n'); break;
          default: text = `[${m.type}]`;
        }
        if (text == null) continue;
        await insertMessage({ ...base, type: m.type === 'location' ? 'location' : 'text', text });
      }
    }
  }
  return handled;
}
