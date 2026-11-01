import { query, queryOne } from '../db';
import { open } from '../secret-box';
import { hasFeature, CHAT_FEATURE_FOR } from '../features';
import * as meta from './meta';
import { saveMedia, readMedia, typeForMime, cleanMime, isAllowedMime } from './media';
import { insertMessage } from './store';

const DAY = 24 * 3600 * 1000;

// Platform rules on when a shop may write to a customer:
// - Both: free replies within 24 h of the customer's last message.
// - Messenger: up to 7 days with the HUMAN_AGENT tag (needs Meta approval for the app).
// - WhatsApp: after 24 h only pre-approved templates (not supported yet).
export function windowState(conv, now = Date.now()) {
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

async function deliver(ch, conv, { text, buffer, mime, filename, tag }) {
  if (ch.platform === 'messenger') {
    if (buffer) return meta.messengerSendFile(conv.external_user_id, buffer, mime, filename, ch.token, tag);
    return meta.messengerSendText(conv.external_user_id, text, ch.token, tag);
  }
  if (buffer) return meta.whatsappSendFile(ch.external_id, conv.external_user_id, buffer, mime, filename, text, ch.token);
  return meta.whatsappSendText(ch.external_id, conv.external_user_id, text, ch.token);
}

async function markResult(id, ch, conv, sending, opts) {
  try {
    const externalId = await deliver(ch, conv, opts);
    await query("UPDATE chat_messages SET status = 'sent', external_id = ?, error = NULL WHERE id = ?", [externalId || null, id]);
    // Messenger can't attach a caption to a file, so send the text as a second message.
    if (sending.captionAfter) {
      await sendMessage({ shopId: conv.shop_id, conversationId: conv.id, text: sending.captionAfter, humanAgent: !!opts.tag, orderId: sending.orderId });
    }
    return { id, status: 'sent' };
  } catch (e) {
    await query("UPDATE chat_messages SET status = 'failed', error = ? WHERE id = ?", [String(e.message).slice(0, 1000), id]);
    return { id, status: 'failed', error: e.message };
  }
}

// Send text and/or one file. The message is stored first (status "sending") so it
// appears in the chat immediately, then updated to sent / failed.
export async function sendMessage({ shopId, conversationId, text = '', file = null, orderId = null, humanAgent = false }) {
  const { conv, ch } = await load(shopId, conversationId);
  const w = windowState(conv);
  let tag;
  if (!w.open) {
    if (w.humanAgent && humanAgent) tag = 'HUMAN_AGENT';
    else throw new SendError('window_closed');
  }

  text = String(text || '').trim().slice(0, ch.platform === 'whatsapp' ? 4096 : 2000);
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
    shopId, conv, direction: 'out', type: file ? typeForMime(mime) : 'text',
    text: captionAfter ? null : (text || null), mediaFile, mediaMime: mime, status: 'sending', orderId,
  });
  return markResult(id, ch, conv, { captionAfter, orderId },
    { text, buffer: file?.buffer, mime, filename: file?.name || mediaFile, tag });
}

// Send a failed message again.
export async function retryMessage(shopId, messageId) {
  const m = await queryOne("SELECT * FROM chat_messages WHERE id = ? AND shop_id = ? AND direction = 'out' AND status = 'failed'", [messageId, shopId]);
  if (!m) throw new SendError('not_found');
  const { conv, ch } = await load(shopId, m.conversation_id);
  const w = windowState(conv);
  if (!w.open && !w.humanAgent) throw new SendError('window_closed');
  const tag = w.open ? undefined : 'HUMAN_AGENT';
  await query("UPDATE chat_messages SET status = 'sending', error = NULL WHERE id = ?", [m.id]);
  const buffer = m.media_file ? readMedia(shopId, m.media_file) : null;
  if (m.media_file && !buffer) throw new SendError('file_missing');
  return markResult(m.id, ch, conv, {}, { text: m.text || '', buffer, mime: m.media_mime, filename: m.media_file, tag });
}
