import crypto from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { proto, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';

// WhatsApp session keys, stored one file per key like Baileys' useMultiFileAuthState,
// but every file is encrypted (AES-256-GCM) with CHANNEL_ENC_KEY. Anyone holding
// these keys could read and send as the shop's number, so they never touch disk in clear.

function encKey() {
  const buf = Buffer.from(process.env.CHANNEL_ENC_KEY || '', 'base64');
  if (buf.length !== 32) throw new Error('CHANNEL_ENC_KEY is missing or not 32 bytes (base64)');
  return buf;
}

export function seal(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const data = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

export function unseal(sealed) {
  const [v, iv, tag, data] = String(sealed).split(':');
  if (v !== 'v1') throw new Error('unknown format');
  const d = crypto.createDecipheriv('aes-256-gcm', encKey(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}

// Serialise writes per file so concurrent key updates can't interleave.
const locks = new Map();
function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => {});
  locks.set(key, tail);
  tail.then(() => { if (locks.get(key) === tail) locks.delete(key); });
  return run;
}

const fixName = f => f.replace(/\//g, '__').replace(/:/g, '-');

export async function readSealedJson(file) {
  try {
    return JSON.parse(unseal(await readFile(file, 'utf8')), BufferJSON.reviver);
  } catch {
    return null;
  }
}

export async function writeSealedJson(file, value) {
  // Write to a temp file then rename, so a crash never leaves a half-written key.
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, seal(JSON.stringify(value, BufferJSON.replacer)), { mode: 0o600 });
  await rename(tmp, file);
}

export async function useEncryptedAuthState(folder) {
  const info = await stat(folder).catch(() => null);
  if (!info) await mkdir(folder, { recursive: true, mode: 0o700 });

  const path = f => join(folder, fixName(f));
  const read = f => withLock(path(f), () => readSealedJson(path(f)));
  const write = (v, f) => withLock(path(f), () => writeSealedJson(path(f), v));
  const remove = f => withLock(path(f), () => unlink(path(f)).catch(() => {}));

  const creds = (await read('creds.json')) || initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const out = {};
          await Promise.all(ids.map(async id => {
            let value = await read(`${type}-${id}.json`);
            if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
            out[id] = value;
          }));
          return out;
        },
        set: async data => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const file = `${category}-${id}.json`;
              tasks.push(value ? write(value, file) : remove(file));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => write(creds, 'creds.json'),
  };
}
