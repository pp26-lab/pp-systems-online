import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Chat media (customer photos, payment slips) is private: it is stored outside the
// public uploads folder and only served to the shop that owns it, after login.

export const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

const EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
  'application/pdf': '.pdf',
  'audio/ogg': '.ogg', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'audio/aac': '.aac', 'audio/amr': '.amr',
  'video/mp4': '.mp4', 'video/3gpp': '.3gp',
};

// First bytes of each file type, so a renamed script can't pass as a photo.
const MAGIC = {
  'image/jpeg': b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': b => b.slice(0, 4).toString('hex') === '89504e47',
  'image/gif': b => b.slice(0, 3).toString('ascii') === 'GIF',
  'image/webp': b => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': b => b.slice(0, 4).toString('ascii') === '%PDF',
};

export function cleanMime(mime) {
  return String(mime || '').split(';')[0].trim().toLowerCase();
}

export function isAllowedMime(mime) {
  return !!EXT[cleanMime(mime)];
}

export function typeForMime(mime) {
  const m = cleanMime(mime);
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('audio/')) return 'audio';
  if (m.startsWith('video/')) return 'video';
  return 'file';
}

function root() {
  return path.join(process.cwd(), 'data', 'chat-media');
}

// Validate and write a file. Returns the stored file name (relative to the shop folder).
export function saveMedia(shopId, buffer, mime) {
  const m = cleanMime(mime);
  if (!EXT[m]) throw new Error('unsupported_type');
  if (!buffer?.length || buffer.length > MAX_MEDIA_BYTES) throw new Error('file_too_large');
  if (MAGIC[m] && !MAGIC[m](buffer)) throw new Error('file_content_invalid');
  const dir = path.join(root(), String(Number(shopId)));
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXT[m]}`;
  fs.writeFileSync(path.join(dir, name), buffer);
  return name;
}

export function readMedia(shopId, name) {
  const safe = path.basename(String(name || ''));
  if (!safe || safe !== name) return null;
  const file = path.join(root(), String(Number(shopId)), safe);
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}
