import crypto from 'crypto';

// AES-256-GCM encryption for access tokens stored in the database.
// The key lives only in the server environment (CHANNEL_ENC_KEY, 32 bytes base64),
// so a leaked database dump alone does not reveal any shop's tokens.

function key() {
  const raw = process.env.CHANNEL_ENC_KEY || '';
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error('CHANNEL_ENC_KEY is missing or not 32 bytes (base64)');
  return buf;
}

export function hasEncryptionKey() {
  try { key(); return true; } catch { return false; }
}

export function seal(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

export function open(sealed) {
  const [v, iv, tag, data] = String(sealed || '').split(':');
  if (v !== 'v1') throw new Error('Unknown token format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}

// Constant-time string comparison for secrets and signatures.
export function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
