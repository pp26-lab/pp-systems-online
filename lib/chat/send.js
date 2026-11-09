import { query, queryOne } from '../db';
import { open } from '../secret-box';
import { hasFeature, CHAT_FEATURE_FOR } from '../features';
import * as meta from './meta';
import { saveMedia, readMedia, typeForMime, cleanMime, isAllowedMime } from './media';
import { insertMessage } from './store';
import { waGateway } from './waweb';

const DAY = 24 * 3600 * 1000;

// Platform rules on when a shop may write to a customer:
// - Messenger / WhatsApp Cloud API: free replies within 24 h of the customer's last message.
// - Messenger: up to 7 days with the HUMAN_AGENT tag (needs Meta approval for the app).
// - WhatsApp Cloud API: after 24 h only pre-approved templates (not supported yet).
// - WhatsApp by scan: no time window, but reply-only — the customer must have written
//   first. That is the single most important rule for keeping the number from being banned.
export function windowState(conv, now = Date.now()) {
  if (conv.platform === 'whatsapp_web') return conv.last_inbound_at ? { open: true, closesAt: null } : { open: false, replyOnly: true };
  const last = conv.last_inbound_at ? new Date(conv.last_inbound_at).getTime() : 0;
  const age = last ? now - last : Infinity;
  if (age <= DAY) return { open: true, closesAt: last + DAY };
  if (conv.platform === 'messenger' && age <= 7 * DAY) return { open: false, humanAgent: true, closesAt: last + 7 * DAY };
  return { open: false };
}

export class SendError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

async function load(shopId, conversationId) {
  const conv = await queryOne('SELECT * FROM chat_conversations WHERE id = ? AND shop_id = ?', [conversationId, shopId]);
  if (!conv) throw new SendError('not_found');
  const ch = await queryOne('SELECT * FROM chat_channels WHERE id = ? AND shop_id = ?', [conv.channel_id, shopId]);
  if (!ch || ch.status === 'disabled') throw new SendError('channel_disabled');
  if (!(await hasFeature(shopId, CHAT_FEATURE_FOR[ch.platform]))) throw new SendError('feature_disabled');
  ch.token = open(ch.token_enc);
  return { conv, ch };
}

async function deliver(ch, conv, { text, buffer, mime, filename, tag, sticker }) {
  if (ch.platform === 'whatsapp_web') {
    const payload = { to: conv.external_user_id, text: text || '' };
    if (buffer) payload.media = { base64: buffer.toString('base64'), mime, filename, sticker: !!sticker };
    try {
      return (await waGateway.send(ch.id, payload)).id;
    } catch (e) {
      throw new Error(e.code || e.message);
    }
  }
  if (ch.platform === 'messenger') {
    if (buffer) return meta.messengerSendFile(conv.external_user_id, buffer, mime, filename, ch.token, tag);
    return meta.messengerSendText(conv.external_user_id, text, ch.token, tag);
  }
  if (buffer) return meta.whatsappSendFile(ch.external_id, conv.external_user_id, buffer, mime, filename, text, ch.token);
  return meta.whatsappSendText(ch.external_id, conv.external_user_id, text, ch.token);
}

// Store the platform id on our row once the message is out. Messenger echoes and WhatsApp's
// own-message events can arrive BEFORE this runs and get stored as a second copy carrying the
// same id; the unique key then rejects our update. Keep our row (it has the media, order link
// and the id the chat screen already shows) and drop the copy.
async function recordSent(id, channelId, externalId) {
  if (!externalId) {
    await query("UPDATE chat_messages SET status = 'sent', error = NULL WHERE id = ?", [id]);
    return;
  }
  try {
    await query("UPDATE chat_messages SET status = 'sent', external_id = ?, error = NULL WHERE id = ?", [externalId, id]);
  } catch (e) {
    if (e.code !== 'ER_DUP_ENTRY') throw e;
    const copy = await queryOne('SELECT status FROM chat_messages WHERE channel_id = ? AND external_id = ? AND id <> ?', [channelId, externalId, id]);
    await query('DELETE FROM chat_messages WHERE channel_id = ? AND external_id = ? AND id <> ?', [channelId, externalId, id]);
    // The copy may already know it was delivered / read; don't lose that.
    const status = ['delivered', 'read'].includes(copy?.status) ? copy.status : 'sent';
    await query('UPDATE chat_messages SET status = ?, external_id = ?, error = NULL WHERE id = ?', [status, externalId, id]);
  }
}

async function markResult(id, ch, conv, sending, opts) {
  let externalId;
  try {
    externalId = await deliver(ch, conv, opts);
  } catch (e) {
    await query("UPDATE chat_messages SET status = 'failed', error = ? WHERE id = ?", [String(e.message).slice(0, 1000), id]);
    return { id, status: 'failed', error: e.message };
  }
  // From here the customer HAS the message. Nothing below may mark it failed: a "failed" label
  // invites a retry, and the retry would send it to the customer a second time.
  try {
    await recordSent(id, ch.id, externalId);
  } catch (e) {
    console.error('chat send: could not record sent message', id, e.message);
  }
  // Messenger can't attach a caption to a file, so send the text as a second message.
  if (sending.captionAfter) {
    try {
      await sendMessage({ shopId: conv.shop_id, conversationId: conv.id, text: sending.captionAfter, humanAgent: !!opts.tag, orderId: sending.orderId });
    } catch (e) {
      console.error('chat send: caption after file failed', e.message);
    }
  }
  return { id, status: 'sent' };
}

// Send text and/or one file. The message is stored first (status "sending") so it
// appears in the chat immediately, then updated to sent / failed.
export async function sendMessage({ shopId, conversationId, text = '', file = null, orderId = null, humanAgent = false }) {
  const { conv, ch } = await load(shopId, conversationId);
  const w = windowState(conv);
  let tag;
  if (!w.open) {
    if (w.replyOnly) throw new SendError('not_reply');
    if (w.humanAgent && humanAgent) tag = 'HUMAN_AGENT';
    else throw new SendError('window_closed');
  }
  if (ch.platform === 'whatsapp_web' && ch.status !== 'active') throw new SendError('not_connected');

  text = String(text || '').trim().slice(0, ch.platform === 'messenger' ? 2000 : 4096);
  if (!text && !file) throw new SendError('empty');

  let mediaFile = null;
  let mime = null;
  if (file) {
    mime = cleanMime(file.mime);
    if (!isAllowedMime(mime)) throw new SendError('unsupported_type');
    mediaFile = saveMedia(shopId, file.buffer, mime);
  }

  const captionAfter = file && text && ch.platform === 'messenger' ? text : null;
  const id = await insertMessage({
    shopId, conv, direction: 'out', type: file ? (file.sticker ? 'sticker' : typeForMime(mime)) : 'text',
    text: captionAfter ? null : (text || null), mediaFile, mediaMime: mime, status: 'sending', orderId,
  });
  return markResult(id, ch, conv, { captionAfter, orderId },
    { text, buffer: file?.buffer, mime, filename: file?.name || mediaFile, tag, sticker: !!file?.sticker });
}

// Send a failed message again.
export async function retryMessage(shopId, messageId) {
  const m = await queryOne("SELECT * FROM chat_messages WHERE id = ? AND shop_id = ? AND direction = 'out' AND status = 'failed'", [messageId, shopId]);
  if (!m) throw new SendError('not_found');
  const { conv, ch } = await load(shopId, m.conversation_id);
  const w = windowState(conv);
  if (!w.open && w.replyOnly) throw new SendError('not_reply');
  if (!w.open && !w.humanAgent) throw new SendError('window_closed');
  const tag = w.open ? undefined : 'HUMAN_AGENT';
  await query("UPDATE chat_messages SET status = 'sending', error = NULL WHERE id = ?", [m.id]);
  const buffer = m.media_file ? readMedia(shopId, m.media_file) : null;
  if (m.media_file && !buffer) throw new SendError('file_missing');
  return markResult(m.id, ch, conv, {}, { text: m.text || '', buffer, mime: m.media_mime, filename: m.media_file, tag, sticker: m.type === 'sticker' });
}

// Send a saved reply: its text and each photo/sticker as separate messages, in order.
// On WhatsApp the text rides on the first photo as its caption, so a reply with 5 photos
// is 5 messages, inside the per-contact pace the gateway allows.
export async function sendQuickReply({ shopId, conversationId, text = '', files = [], humanAgent = false }) {
  const { conv } = await load(shopId, conversationId);
  const wa = conv.platform === 'whatsapp' || conv.platform === 'whatsapp_web';
  const steps = [];
  text = String(text || '').trim();
  if (text && wa && files[0] && !files[0].sticker) {
    steps.push({ text, file: files[0] });
    files.slice(1).forEach(f => steps.push({ file: f }));
  } else {
    if (text) steps.push({ text });
    files.forEach(f => steps.push({ file: f }));
  }
  const results = [];
  for (const st of steps) {
    // The first call throws if the chat can't be written to at all; later ones just report failures.
    const r = await sendMessage({ shopId, conversationId, text: st.text || '', file: st.file || null, humanAgent });
    results.push(r);
  }
  return results;
}
