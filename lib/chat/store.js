import { query, queryOne } from '../db';

// Database helpers shared by the webhook processor and the send path.
// Every query is scoped by shop_id.

export function digits(v) {
  return String(v || '').replace(/\D/g, '');
}

// Find exactly one customer of this shop whose phone matches (last 8 digits).
export async function findCustomerByPhone(shopId, phone) {
  const d = digits(phone);
  if (d.length < 8) return null;
  const tail = d.slice(-8);
  const rows = await query('SELECT id, phone FROM customers WHERE shop_id = ? AND phone LIKE ? LIMIT 20', [shopId, `%${d.slice(-4)}%`]);
  const hits = rows.filter(r => digits(r.phone).endsWith(tail));
  return hits.length === 1 ? hits[0].id : null;
}

export async function upsertConversation({ shopId, channel, userId, name = '', phone = '', avatar = null }) {
  await query(
    `INSERT INTO chat_conversations (shop_id, channel_id, platform, external_user_id, name, phone, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = IF(VALUES(name) <> '', VALUES(name), name),
       phone = IF(VALUES(phone) <> '', VALUES(phone), phone),
       avatar_url = COALESCE(VALUES(avatar_url), avatar_url)`,
    [shopId, channel.id, channel.platform, String(userId), name.slice(0, 255), phone.slice(0, 50), avatar]
  );
  const conv = await queryOne('SELECT * FROM chat_conversations WHERE channel_id = ? AND external_user_id = ?', [channel.id, String(userId)]);
  if (conv && !conv.customer_id && conv.phone) {
    const customerId = await findCustomerByPhone(shopId, conv.phone);
    if (customerId) {
      await query('UPDATE chat_conversations SET customer_id = ? WHERE id = ? AND shop_id = ?', [customerId, conv.id, shopId]);
      conv.customer_id = customerId;
    }
  }
  return conv;
}

export function previewOf(m) {
  if (m.text) return m.text.slice(0, 200);
  return { image: '[รูปภาพ]', audio: '[เสียง]', video: '[วิดีโอ]', file: '[ไฟล์]', sticker: '[สติกเกอร์]', location: '[ตำแหน่ง]' }[m.type] || '[ข้อความ]';
}

// Insert a message once (deduplicated by the platform's message id).
// Returns the new row id, or null if this message was already stored.
export async function insertMessage({ shopId, conv, direction, type = 'text', text = null, mediaFile = null, mediaMime = null,
  externalId = null, status, error = null, orderId = null, at = new Date() }) {
  const r = await query(
    `INSERT IGNORE INTO chat_messages (shop_id, conversation_id, channel_id, direction, type, text, media_file, media_mime, external_id, status, error, order_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shopId, conv.id, conv.channel_id, direction, type, text, mediaFile, mediaMime, externalId,
      status || (direction === 'in' ? 'received' : 'sending'), error, orderId, at]
  );
  if (!r.affectedRows) return null;

  const preview = previewOf({ text, type });
  if (direction === 'in') {
    await query(
      `UPDATE chat_conversations SET last_message_at = GREATEST(COALESCE(last_message_at, ?), ?), last_message_preview = ?,
         last_inbound_at = GREATEST(COALESCE(last_inbound_at, ?), ?), unread_count = unread_count + 1, status = 'open'
       WHERE id = ? AND shop_id = ?`,
      [at, at, preview, at, at, conv.id, shopId]
    );
  } else {
    await query(
      'UPDATE chat_conversations SET last_message_at = GREATEST(COALESCE(last_message_at, ?), ?), last_message_preview = ? WHERE id = ? AND shop_id = ?',
      [at, at, preview, conv.id, shopId]
    );
  }
  return r.insertId;
}

const RANK = { sending: 0, failed: 0, sent: 1, delivered: 2, read: 3 };

// Delivery / read receipts only ever move a message forward.
export async function updateOutStatus(channelId, externalId, status, error = null) {
  const row = await queryOne('SELECT id, status FROM chat_messages WHERE channel_id = ? AND external_id = ? AND direction = ?', [channelId, externalId, 'out']);
  if (!row) return;
  if (status === 'failed' || (RANK[status] ?? 0) > (RANK[row.status] ?? 0)) {
    await query('UPDATE chat_messages SET status = ?, error = ? WHERE id = ?', [status, error, row.id]);
  }
}
