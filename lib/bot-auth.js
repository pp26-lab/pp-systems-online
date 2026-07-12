import crypto from 'crypto';
import { query, queryOne } from './db';

export function generateApiKey() {
  const raw = 'ppbot_' + crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const preview = raw.slice(0, 12) + '...' + raw.slice(-4);
  return { raw, hash, preview };
}

function hashKey(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function verifyBotKey(request) {
  const auth = request.headers.get('authorization') || '';
  const xKey = request.headers.get('x-api-key') || '';
  let raw = '';
  if (auth.startsWith('Bearer ')) raw = auth.slice(7).trim();
  else if (xKey) raw = xKey.trim();
  if (!raw) return null;

  const hash = hashKey(raw);
  const key = await queryOne('SELECT id, shop_id FROM bot_api_keys WHERE key_hash = ?', [hash]);
  if (!key) return null;

  await query('UPDATE bot_api_keys SET last_used_at = NOW() WHERE id = ?', [key.id]);
  return { shopId: key.shop_id, keyId: key.id };
}

const attempts = new Map();
export function botRateLimit(shopId, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const record = attempts.get(shopId);
  if (!record || now - record.start > windowMs) {
    attempts.set(shopId, { count: 1, start: now });
    return true;
  }
  record.count++;
  return record.count <= limit;
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Max-Age': '86400',
  };
}
