import { query, queryOne } from '../db';
import { saveMedia, readMedia, removeMedia, cleanMime } from './media';

// Saved replies: a short name, a message, and up to 5 photos or stickers.
// Everything is scoped by shop_id; files live in the shop's private chat-media folder.

export const LIMITS = { replies: 200, media: 5, title: 60, text: 2000, bytes: 5 * 1024 * 1024 };
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class QuickReplyError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export async function listReplies(shopId) {
  const replies = await query(
    'SELECT id, title, text, sort_order, use_count, updated_at FROM chat_quick_replies WHERE shop_id = ? ORDER BY sort_order, id',
    [shopId]
  );
  const media = await query(
    'SELECT id, reply_id, kind, mime FROM chat_quick_reply_media WHERE shop_id = ? ORDER BY reply_id, sort_order, id',
    [shopId]
  );
  const byReply = new Map();
  for (const m of media) {
    if (!byReply.has(m.reply_id)) byReply.set(m.reply_id, []);
    byReply.get(m.reply_id).push({ id: m.id, kind: m.kind, mime: m.mime });
  }
  return replies.map(r => ({ ...r, media: byReply.get(r.id) || [] }));
}

export async function getReply(shopId, id) {
  const r = await queryOne('SELECT * FROM chat_quick_replies WHERE id = ? AND shop_id = ?', [id, shopId]);
  if (!r) return null;
  r.media = await query(
    'SELECT * FROM chat_quick_reply_media WHERE reply_id = ? AND shop_id = ? ORDER BY sort_order, id',
    [r.id, shopId]
  );
  return r;
}

// The stored files of a reply, ready to send.
export function loadReplyFiles(shopId, reply) {
  return reply.media.map(m => {
    const buffer = readMedia(shopId, m.file);
    return buffer ? { buffer, mime: m.mime, name: m.file, sticker: m.kind === 'sticker' } : null;
  }).filter(Boolean);
}

function cleanFields(title, text) {
  title = String(title || '').trim().slice(0, LIMITS.title);
  text = String(text || '').trim().slice(0, LIMITS.text);
  if (!title) throw new QuickReplyError('title_required');
  return { title, text };
}

// uploads: [{ buffer, mime, kind }]
function checkUploads(uploads) {
  for (const u of uploads) {
    const m = cleanMime(u.mime);
    if (!IMAGE_MIME.includes(m)) throw new QuickReplyError('unsupported_type');
    if (!u.buffer?.length || u.buffer.length > LIMITS.bytes) throw new QuickReplyError('file_too_large');
  }
}

async function addMedia(shopId, replyId, uploads, startAt) {
  let order = startAt;
  for (const u of uploads) {
    const mime = cleanMime(u.mime);
    const file = saveMedia(shopId, u.buffer, mime); // checks the file really is that image type
    await query(
      'INSERT INTO chat_quick_reply_media (shop_id, reply_id, kind, file, mime, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [shopId, replyId, u.kind === 'sticker' ? 'sticker' : 'image', file, mime, order++]
    );
  }
}

export async function createReply(shopId, { title, text, uploads = [] }) {
  const f = cleanFields(title, text);
  if (!f.text && !uploads.length) throw new QuickReplyError('empty');
  if (uploads.length > LIMITS.media) throw new QuickReplyError('too_many_media');
  checkUploads(uploads);
  const count = await queryOne('SELECT COUNT(*) AS c FROM chat_quick_replies WHERE shop_id = ?', [shopId]);
  if (count.c >= LIMITS.replies) throw new QuickReplyError('too_many_replies');
  const last = await queryOne('SELECT COALESCE(MAX(sort_order), 0) AS m FROM chat_quick_replies WHERE shop_id = ?', [shopId]);
  const r = await query('INSERT INTO chat_quick_replies (shop_id, title, text, sort_order) VALUES (?, ?, ?, ?)', [shopId, f.title, f.text, last.m + 1]);
  await addMedia(shopId, r.insertId, uploads, 0);
  return r.insertId;
}

// keep: ids of existing media to keep, in the order wanted. New uploads go after them.
export async function updateReply(shopId, id, { title, text, keep = [], uploads = [] }) {
  const reply = await getReply(shopId, id);
  if (!reply) throw new QuickReplyError('not_found');
  const f = cleanFields(title, text);
  const keepIds = keep.map(Number).filter(k => reply.media.some(m => m.id === k));
  if (!f.text && !keepIds.length && !uploads.length) throw new QuickReplyError('empty');
  if (keepIds.length + uploads.length > LIMITS.media) throw new QuickReplyError('too_many_media');
  checkUploads(uploads);

  await query('UPDATE chat_quick_replies SET title = ?, text = ? WHERE id = ? AND shop_id = ?', [f.title, f.text, id, shopId]);
  for (const m of reply.media) {
    if (!keepIds.includes(m.id)) {
      await query('DELETE FROM chat_quick_reply_media WHERE id = ? AND shop_id = ?', [m.id, shopId]);
      removeMedia(shopId, m.file);
    }
  }
  for (let i = 0; i < keepIds.length; i++) {
    await query('UPDATE chat_quick_reply_media SET sort_order = ? WHERE id = ? AND shop_id = ?', [i, keepIds[i], shopId]);
  }
  await addMedia(shopId, id, uploads, keepIds.length);
}

export async function deleteReply(shopId, id) {
  const reply = await getReply(shopId, id);
  if (!reply) throw new QuickReplyError('not_found');
  await query('DELETE FROM chat_quick_replies WHERE id = ? AND shop_id = ?', [id, shopId]);
  for (const m of reply.media) removeMedia(shopId, m.file);
}

// ids: reply ids in the order the shop wants them listed.
export async function reorderReplies(shopId, ids) {
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger).slice(0, LIMITS.replies);
  for (let i = 0; i < list.length; i++) {
    await query('UPDATE chat_quick_replies SET sort_order = ? WHERE id = ? AND shop_id = ?', [i + 1, list[i], shopId]);
  }
}

export async function countUse(shopId, id) {
  await query('UPDATE chat_quick_replies SET use_count = use_count + 1 WHERE id = ? AND shop_id = ?', [id, shopId]);
}
