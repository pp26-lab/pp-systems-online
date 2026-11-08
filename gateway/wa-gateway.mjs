// PP Systems WhatsApp gateway (pm2 name: pp-wa).
//
// Each shop number is a "linked device" session — the same mechanism WhatsApp Web
// uses when you scan its QR code. Runs as its own process, separate from the website,
// so a WhatsApp problem can never take the shop system down, and website deploys
// don't disconnect anyone's WhatsApp.
//
// Security
//  - Listens on 127.0.0.1 only; every request and event is HMAC-signed (WA_GATEWAY_SECRET).
//  - Session keys are encrypted on disk (CHANNEL_ENC_KEY). The gateway has no database
//    access: it only knows channel ids; the website maps channels to shops.
//
// Number health (built in, not optional — these protect every shop's number)
//  - Reply-only: sends only to contacts who have messaged this number first.
//  - Human pacing: one message at a time, "typing…" shown for a realistic time first.
//  - Per-minute, per-contact and daily limits. There is no broadcast / bulk endpoint.
//  - Never re-pairs by itself; a logged-out number waits for a fresh scan.
//  - Not "online" around the clock: online while replying, offline when idle.

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import QRCode from 'qrcode';
import makeWASocket, {
  Browsers, DisconnectReason, fetchLatestWaWebVersion, makeCacheableSignalKeyStore, downloadMediaMessage,
  normalizeMessageContent, getContentType, jidNormalizedUser, jidDecode, isPnUser, isLidUser,
  isJidGroup, isJidBroadcast, isJidStatusBroadcast, isJidNewsletter,
} from '@whiskeysockets/baileys';
import { useEncryptedAuthState, readSealedJson, writeSealedJson } from './auth-state.mjs';

// ------------------------------------------------------------------ config

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m || process.env[m[1]] !== undefined) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}
loadEnv();

const PORT = Number(process.env.WA_GATEWAY_PORT || 3020);
const SECRET = process.env.WA_GATEWAY_SECRET || '';
const APP_URL = (process.env.APP_INTERNAL_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const EVENT_PATH = '/api/channels/wa-web/event';
const DATA = path.join(process.cwd(), 'data');
const SESS_DIR = path.join(DATA, 'wa-sessions');
const OUTBOX = path.join(DATA, 'wa-outbox');
const DAILY_CAP = Number(process.env.WA_DAILY_CAP || 600);
const PER_MINUTE = Number(process.env.WA_PER_MINUTE || 15);
const PER_CONTACT_MINUTE = 6;
const MAX_MEDIA = 16 * 1024 * 1024;

const logger = pino({ level: process.env.WA_LOG_LEVEL || 'warn' });
const log = (...a) => console.log(new Date().toISOString(), '[pp-wa]', ...a);

if (SECRET.length < 32) { console.error('WA_GATEWAY_SECRET must be set (32+ characters).'); process.exit(1); }
if (Buffer.from(process.env.CHANNEL_ENC_KEY || '', 'base64').length !== 32) {
  console.error('CHANNEL_ENC_KEY must be set (32 bytes, base64).'); process.exit(1);
}
fs.mkdirSync(SESS_DIR, { recursive: true, mode: 0o700 });
fs.mkdirSync(OUTBOX, { recursive: true, mode: 0o700 });

// ------------------------------------------------------------------ signing

function sign(method, pathname, ts, body) {
  return crypto.createHmac('sha256', SECRET).update(`${method}\n${pathname}\n${ts}\n${body}`).digest('hex');
}

function verify(req, pathname, body) {
  const ts = Number(req.headers['x-pp-time']);
  const sig = String(req.headers['x-pp-signature'] || '');
  if (!ts || Math.abs(Date.now() - ts) > 60000) return false;
  const expected = sign(req.method, pathname, ts, body);
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// ------------------------------------------------------------------ events to the website

// Events are written to disk first and delivered in order. If the website is
// restarting (e.g. during a deploy), they wait here instead of being lost.
let flushing = false;

function emit(evt) {
  const file = path.join(OUTBOX, `${Date.now()}-${String(process.hrtime.bigint()).slice(-6)}-${crypto.randomBytes(3).toString('hex')}.json`);
  fs.writeFileSync(file, JSON.stringify(evt), { mode: 0o600 });
  flushOutbox();
}

async function postEvent(body) {
  const ts = Date.now();
  try {
    const res = await fetch(APP_URL + EVENT_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pp-time': String(ts), 'x-pp-signature': sign('POST', EVENT_PATH, ts, body) },
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) return 'done';
    // The website understood but rejected it (unknown channel etc.) — retrying won't help.
    if ([400, 404, 410, 413, 422].includes(res.status)) return 'drop';
    return 'retry';
  } catch {
    return 'retry';
  }
}

async function flushOutbox() {
  if (flushing) return;
  flushing = true;
  try {
    const files = fs.readdirSync(OUTBOX).filter(f => f.endsWith('.json')).sort();
    for (const f of files) {
      const p = path.join(OUTBOX, f);
      const result = await postEvent(fs.readFileSync(p, 'utf8'));
      if (result === 'retry') break; // keep order; try again shortly
      if (result === 'drop') log('event dropped by website:', f);
      fs.unlinkSync(p);
    }
  } catch (e) {
    log('outbox error:', e.message);
  } finally {
    flushing = false;
  }
}
setInterval(flushOutbox, 3000).unref();

// ------------------------------------------------------------------ helpers

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const digits = v => String(v || '').replace(/\D/g, '');
const toNum = t => (t && typeof t === 'object' && typeof t.toNumber === 'function' ? t.toNumber() : Number(t) || 0);

function shopDay() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}

class GwError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

// Small bounded map (oldest entries evicted).
function lru(max) {
  const m = new Map();
  return {
    get: k => m.get(k),
    has: k => m.has(k),
    set: (k, v) => { m.delete(k); m.set(k, v); if (m.size > max) m.delete(m.keys().next().value); },
  };
}

let waVersion = null;
let waVersionAt = 0;
async function currentWaVersion() {
  // Present the same WhatsApp Web version a browser would load today.
  if (waVersion && Date.now() - waVersionAt < 6 * 3600000) return waVersion;
  try {
    const r = await fetchLatestWaWebVersion({});
    if (r?.version) { waVersion = r.version; waVersionAt = Date.now(); }
  } catch { /* keep the library default */ }
  return waVersion || undefined;
}

// ------------------------------------------------------------------ sessions

const sessions = new Map(); // channel id -> session state

function blank(id) {
  return {
    id, sock: null, status: 'stopped', qrDataUrl: null, pairingCode: null, pairingPhone: null,
    phone: null, name: null, lastError: null, retries: 0, stopping: false, reconnectTimer: null,
    queue: Promise.resolve(), lastSendAt: 0, minute: [], perContact: new Map(), day: shopDay(), sentToday: 0,
    sentIds: lru(500), msgCache: lru(500), inKeys: lru(2000), known: new Set(), knownDirty: false, idleTimer: null,
  };
}

const sessionDir = id => path.join(SESS_DIR, String(Number(id)));
const knownFile = id => path.join(sessionDir(id), 'known-contacts.enc');

function view(s) {
  return { id: s.id, status: s.status, phone: s.phone, name: s.name, qr: s.qrDataUrl, pairingCode: s.pairingCode, lastError: s.lastError };
}

function wipe(id) {
  fs.rmSync(sessionDir(id), { recursive: true, force: true });
}

async function loadKnown(s) {
  const list = await readSealedJson(knownFile(s.id));
  s.known = new Set(Array.isArray(list) ? list : []);
}

async function saveKnownSoon(s) {
  if (s.knownDirty) return;
  s.knownDirty = true;
  setTimeout(async () => {
    s.knownDirty = false;
    try { await writeSealedJson(knownFile(s.id), [...s.known]); } catch (e) { log(`known save ${s.id}:`, e.message); }
  }, 2000);
}

// Is this device linked to a WhatsApp account? Baileys sets creds.registered only for the
// pairing-code flow; a QR-scanned device leaves it false forever. Both flows set creds.me
// on success, so that is the real sign. (Checking only `registered` made every QR-linked
// number count as "never linked": deleted at restart, and not reconnected after a drop.)
function isLinked(creds) {
  return !!(creds && (creds.registered || creds.me?.id));
}

async function startSession(id, { pairingPhone, fresh } = {}) {
  id = String(Number(id));
  if (!Number(id)) throw new GwError('bad_id');
  let s = sessions.get(id);
  if (fresh) {
    if (s) await stopSession(s, false);
    wipe(id);
    s = null;
  }
  if (s && ['connected', 'starting', 'qr', 'pairing', 'reconnecting'].includes(s.status)) return s;
  s = s || blank(id);
  sessions.set(id, s);
  Object.assign(s, { stopping: false, status: 'starting', lastError: null, qrDataUrl: null, pairingCode: null, retries: 0 });
  s.pairingPhone = pairingPhone ? digits(pairingPhone) : null;
  await loadKnown(s);
  await connect(s);
  return s;
}

async function connect(s) {
  clearTimeout(s.reconnectTimer);
  const { state, saveCreds } = await useEncryptedAuthState(sessionDir(s.id));
  const sock = makeWASocket({
    version: await currentWaVersion(),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    browser: Browsers.ubuntu('Chrome'),
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    generateHighQualityLinkPreview: false,
    shouldIgnoreJid: jid => isJidGroup(jid) || isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid),
    getMessage: async key => s.msgCache.get(key.id),
  });
  s.sock = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', u => onConnection(s, sock, u).catch(e => log(`conn ${s.id}:`, e.message)));
  sock.ev.on('messages.upsert', m => onMessages(s, m).catch(e => log(`msg ${s.id}:`, e.message)));
  sock.ev.on('messages.update', u => onUpdates(s, u));
}

async function onConnection(s, sock, { connection, lastDisconnect, qr }) {
  if (sock !== s.sock) return; // an old socket we already replaced

  if (qr) {
    if (s.pairingPhone) {
      if (!s.pairingCode) {
        try {
          const code = await sock.requestPairingCode(s.pairingPhone);
          s.pairingCode = String(code).match(/.{1,4}/g)?.join('-') || code;
          s.status = 'pairing';
        } catch (e) {
          s.lastError = `pairing_failed: ${e.message}`;
        }
      }
    } else {
      s.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      s.status = 'qr';
    }
  }

  if (connection === 'open') {
    const me = sock.user || {};
    const pn = isPnUser(jidNormalizedUser(me.id)) ? jidNormalizedUser(me.id) : null;
    Object.assign(s, { status: 'connected', retries: 0, lastError: null, qrDataUrl: null, pairingCode: null, pairingPhone: null });
    s.phone = pn ? jidDecode(pn).user : digits(me.id);
    s.name = me.name || me.verifiedName || '';
    log(`session ${s.id} connected`);
    emit({ type: 'connected', channelId: s.id, phone: s.phone, name: s.name });
    return;
  }

  if (connection !== 'close') return;
  s.sock = null;
  const code = lastDisconnect?.error?.output?.statusCode;
  if (s.stopping) { s.status = 'stopped'; return; }

  const registered = isLinked(sock.authState?.creds);
  const fatal = {
    [DisconnectReason.loggedOut]: 'logged_out',        // unlinked from the phone, or WhatsApp logged it out
    [DisconnectReason.forbidden]: 'forbidden',         // number restricted by WhatsApp
    [DisconnectReason.multideviceMismatch]: 'mismatch',
    [DisconnectReason.connectionReplaced]: 'replaced', // the same session opened somewhere else
  }[code];

  if (fatal) {
    s.status = 'logged_out';
    s.lastError = fatal;
    if (fatal !== 'replaced') wipe(s.id);
    log(`session ${s.id} ended: ${fatal}`);
    emit({ type: 'logged_out', channelId: s.id, reason: fatal });
    return;
  }

  if (code === DisconnectReason.restartRequired) { // normal right after pairing
    await connect(s);
    return;
  }

  if (!registered) {
    // QR / pairing code expired without being used. Don't keep generating codes on our own.
    s.status = 'expired';
    s.qrDataUrl = null;
    s.pairingCode = null;
    return;
  }

  // Temporary network problem: reconnect with growing, jittered delays, and never give up
  // on a linked number (it used to stop after 8 tries and stay dead until a restart).
  // After a few failed tries the website is told, so the shop sees it isn't connected;
  // the "connected" event puts it back to active when the link returns.
  s.retries += 1;
  s.status = 'reconnecting';
  s.lastError = `disconnected (${code || 'unknown'})`;
  if (s.retries === 4) emit({ type: 'disconnected', channelId: s.id, reason: s.lastError });
  const wait = (s.retries > 8 ? 300000 : Math.min(120000, 2000 * 2 ** (s.retries - 1))) + rand(0, 3000);
  s.reconnectTimer = setTimeout(() => connect(s).catch(e => log(`reconnect ${s.id}:`, e.message)), wait);
}

async function stopSession(s, logout) {
  s.stopping = true;
  clearTimeout(s.reconnectTimer);
  clearTimeout(s.idleTimer);
  try {
    if (logout && s.sock) await s.sock.logout();
    else s.sock?.end(undefined);
  } catch { /* already closed */ }
  s.sock = null;
  s.status = 'stopped';
}

// ------------------------------------------------------------------ incoming

// Who the message is with, as a phone-number JID when WhatsApp lets us know it.
async function contactOf(s, key) {
  let jid = key.remoteJid;
  if (isLidUser(jid)) {
    if (key.remoteJidAlt && isPnUser(key.remoteJidAlt)) jid = key.remoteJidAlt;
    else {
      try {
        const pn = await s.sock?.signalRepository?.lidMapping?.getPNForLID(jid);
        if (pn) jid = pn;
      } catch { /* keep the LID */ }
    }
  }
  jid = jidNormalizedUser(jid);
  return { jid, phone: isPnUser(jid) ? jidDecode(jid).user : '' };
}

const MEDIA = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', documentMessage: 'file', stickerMessage: 'sticker' };

async function onMessages(s, { messages }) {
  for (const msg of messages || []) {
    const key = msg.key || {};
    if (!msg.message || !key.remoteJid || !key.id) continue;
    if (isJidGroup(key.remoteJid) || isJidBroadcast(key.remoteJid) || isJidStatusBroadcast(key.remoteJid) || isJidNewsletter(key.remoteJid)) continue;
    if (key.fromMe && s.sentIds.has(key.id)) continue; // sent through us; already stored by the website

    const ts = toNum(msg.messageTimestamp) * 1000 || Date.now();
    if (Date.now() - ts > 3 * 86400000) continue; // ignore old history

    const content = normalizeMessageContent(msg.message);
    const kind = getContentType(content);
    if (!kind || ['protocolMessage', 'senderKeyDistributionMessage', 'messageContextInfo', 'pollUpdateMessage', 'keepInChatMessage'].includes(kind)) continue;
    const body = content[kind] || {};

    const { jid, phone } = await contactOf(s, key);
    const evt = {
      type: 'message', channelId: s.id, id: key.id, direction: key.fromMe ? 'out' : 'in',
      contact: jid, phone, name: key.fromMe ? '' : (msg.pushName || ''), ts, msgType: 'text', text: null,
    };

    if (!key.fromMe) {
      s.inKeys.set(key.id, { remoteJid: key.remoteJid, id: key.id, fromMe: false, participant: key.participant });
      for (const k of [jid, jidNormalizedUser(key.remoteJid)]) {
        if (!s.known.has(k)) { s.known.add(k); saveKnownSoon(s); }
      }
    }

    if (MEDIA[kind]) {
      evt.msgType = MEDIA[kind];
      evt.text = body.caption || (kind === 'documentMessage' ? body.fileName || null : null);
      try {
        const size = toNum(body.fileLength);
        if (size > MAX_MEDIA) throw new Error('file_too_large');
        const buf = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: s.sock?.updateMediaMessage });
        if (buf.length > MAX_MEDIA) throw new Error('file_too_large');
        evt.media = { base64: buf.toString('base64'), mime: body.mimetype || 'application/octet-stream' };
      } catch (e) {
        evt.mediaError = e.message;
      }
    } else if (kind === 'conversation') {
      evt.text = content.conversation;
    } else if (kind === 'extendedTextMessage') {
      evt.text = body.text;
    } else if (kind === 'locationMessage' || kind === 'liveLocationMessage') {
      evt.msgType = 'location';
      evt.text = [body.name, body.address, `${body.degreesLatitude},${body.degreesLongitude}`].filter(Boolean).join('\n');
    } else if (kind === 'contactMessage') {
      evt.text = body.displayName || '[contact]';
    } else if (kind === 'reactionMessage') {
      if (!body.text) continue;
      evt.text = body.text;
    } else if (kind === 'buttonsResponseMessage') {
      evt.text = body.selectedDisplayText;
    } else if (kind === 'listResponseMessage') {
      evt.text = body.title;
    } else {
      evt.text = `[${kind.replace(/Message$/, '')}]`;
    }
    emit(evt);
  }
}

const STATUS = { 2: 'sent', 3: 'delivered', 4: 'read', 5: 'read' };

function onUpdates(s, updates) {
  for (const { key, update } of updates || []) {
    if (!key?.fromMe || update?.status == null || !STATUS[update.status]) continue;
    emit({ type: 'status', channelId: s.id, id: key.id, status: STATUS[update.status] });
  }
}

// ------------------------------------------------------------------ outgoing

function checkLimits(s, jid) {
  const now = Date.now();
  if (s.day !== shopDay()) { s.day = shopDay(); s.sentToday = 0; }
  if (s.sentToday >= DAILY_CAP) throw new GwError('daily_limit', 429);
  s.minute = s.minute.filter(t => now - t < 60000);
  if (s.minute.length >= PER_MINUTE) throw new GwError('rate_limited', 429);
  const pc = (s.perContact.get(jid) || []).filter(t => now - t < 60000);
  if (pc.length >= PER_CONTACT_MINUTE) throw new GwError('rate_limited', 429);
}

function countSend(s, jid) {
  const now = Date.now();
  s.sentToday += 1;
  s.minute.push(now);
  s.perContact.set(jid, [...(s.perContact.get(jid) || []).filter(t => now - t < 60000), now]);
  if (s.perContact.size > 2000) s.perContact.clear();
}

// Online while working, offline again after a quiet minute — like a person with the app open.
async function goOnline(s) {
  clearTimeout(s.idleTimer);
  try { await s.sock?.sendPresenceUpdate('available'); } catch { /* not fatal */ }
  s.idleTimer = setTimeout(() => { s.sock?.sendPresenceUpdate('unavailable').catch(() => {}); }, rand(45000, 90000));
}

async function typeLikeAPerson(s, jid, text, hasMedia) {
  const gap = rand(1500, 3500) - (Date.now() - s.lastSendAt);
  if (gap > 0) await sleep(gap);
  await goOnline(s);
  try { await s.sock.sendPresenceUpdate('composing', jid); } catch { /* not fatal */ }
  const len = (text || '').length;
  const typing = hasMedia && !len ? rand(1200, 2500) : Math.min(8000, Math.max(1400, len * rand(45, 75)));
  await sleep(typing);
  try { await s.sock.sendPresenceUpdate('paused', jid); } catch { /* not fatal */ }
}

function mediaContent(media, caption) {
  const buffer = Buffer.from(media.base64 || '', 'base64');
  if (!buffer.length || buffer.length > MAX_MEDIA) throw new GwError('file_too_large');
  const mimetype = String(media.mime || 'application/octet-stream').split(';')[0];
  // A saved sticker goes out as a real WhatsApp sticker (WhatsApp needs WebP for that).
  if (media.sticker && mimetype === 'image/webp') return { sticker: buffer, mimetype };
  if (mimetype.startsWith('image/')) return { image: buffer, mimetype, caption: caption || undefined };
  if (mimetype.startsWith('video/')) return { video: buffer, mimetype, caption: caption || undefined };
  if (mimetype.startsWith('audio/')) return { audio: buffer, mimetype };
  return { document: buffer, mimetype, fileName: media.filename || 'file', caption: caption || undefined };
}

function sendMessage(s, { to, text, media }) {
  if (s.status !== 'connected' || !s.sock) throw new GwError('not_connected', 409);
  const jid = jidNormalizedUser(String(to || ''));
  if (!jid || isJidGroup(jid)) throw new GwError('bad_recipient');
  // The rule that matters most: only reply to people who wrote to this number first.
  if (!s.known.has(jid)) throw new GwError('not_reply', 403);
  text = String(text || '').slice(0, 4096);
  if (!text && !media) throw new GwError('empty');
  checkLimits(s, jid);
  countSend(s, jid); // reserve the slot now so queued messages count too

  const task = async () => {
    if (!s.sock) throw new GwError('not_connected', 409);
    await typeLikeAPerson(s, jid, text, !!media);
    const content = media ? mediaContent(media, text) : { text };
    const sent = await s.sock.sendMessage(jid, content);
    s.lastSendAt = Date.now();
    s.sentIds.set(sent.key.id, Date.now());
    s.msgCache.set(sent.key.id, sent.message);
    return sent.key.id;
  };
  const run = s.queue.then(task);
  s.queue = run.catch(() => {});
  return run;
}

async function markRead(s, jid, ids) {
  if (!s.sock || !Array.isArray(ids) || !ids.length) return;
  const keys = ids.slice(-20).map(id => s.inKeys.get(id) || { remoteJid: jid, id, fromMe: false });
  await goOnline(s);
  await s.sock.readMessages(keys);
}

// ------------------------------------------------------------------ http api

function readBody(req, limit = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new GwError('too_large', 413)); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const raw = await readBody(req);
    if (!verify(req, url.pathname, raw)) return reply(res, 401, { error: 'unauthorized' });
    const body = raw ? JSON.parse(raw) : {};
    const parts = url.pathname.split('/').filter(Boolean); // sessions/:id/:action

    if (req.method === 'GET' && url.pathname === '/health') {
      return reply(res, 200, { ok: true, sessions: [...sessions.values()].map(s => ({ id: s.id, status: s.status, phone: s.phone })) });
    }
    if (parts[0] !== 'sessions' || !parts[1]) return reply(res, 404, { error: 'not_found' });
    const id = String(Number(parts[1]));
    const action = parts[2] || '';

    if (req.method === 'GET' && !action) {
      const s = sessions.get(id);
      return reply(res, 200, s ? view(s) : { id, status: 'stopped' });
    }
    if (req.method !== 'POST') return reply(res, 405, { error: 'method' });

    if (action === 'start') {
      const s = await startSession(id, { pairingPhone: body.pairingPhone, fresh: !!body.fresh });
      // Give WhatsApp a moment to hand out the first QR / pairing code.
      for (let i = 0; i < 20 && ['starting'].includes(s.status); i++) await sleep(250);
      return reply(res, 200, view(s));
    }
    const s = sessions.get(id);
    if (action === 'logout') {
      if (s) await stopSession(s, true);
      wipe(id);
      sessions.delete(id);
      return reply(res, 200, { ok: true });
    }
    if (action === 'stop') {
      if (s) await stopSession(s, false);
      return reply(res, 200, { ok: true });
    }
    if (!s) {
      // A linked number that isn't running (it failed to start at boot): start it now so the
      // shop doesn't have to rescan; this message fails, the retry after a moment works.
      if (await savedSession(id) === 'yes') startSession(id).catch(e => log(`restart ${id}:`, e.message));
      return reply(res, 409, { error: 'not_connected' });
    }    if (action === 'send') return reply(res, 200, { id: await sendMessage(s, body) });
    if (action === 'read') { await markRead(s, body.jid, body.ids); return reply(res, 200, { ok: true }); }
    return reply(res, 404, { error: 'not_found' });
  } catch (e) {
    if (e instanceof GwError) return reply(res, e.status, { error: e.code });
    log('request error:', e.message);
    return reply(res, 500, { error: 'gateway_error', detail: e.message });
  }
});

// ------------------------------------------------------------------ boot / shutdown

// Is there a linked (registered) session saved for this channel?
// 'yes' | 'no' (nothing usable: abandoned pairing) | 'unreadable' (file there, can't decrypt)
async function savedSession(id) {
  const file = path.join(sessionDir(id), 'creds.json');
  if (!fs.existsSync(file)) return 'no';
  const creds = await readSealedJson(file);
  if (!creds) return 'unreadable';
  return isLinked(creds) ? 'yes' : 'no';
}

async function boot() {
  for (const dir of fs.readdirSync(SESS_DIR)) {
    if (!/^\d+$/.test(dir)) continue;
    const saved = await savedSession(dir);
    // Never delete a session we merely failed to read (wrong key in the environment, disk
    // hiccup): that would force the shop to scan again for nothing. Only abandoned pairings go.
    if (saved === 'unreadable') { log(`boot ${dir}: session file unreadable, kept (check CHANNEL_ENC_KEY)`); continue; }
    if (saved === 'no') { wipe(dir); continue; }
    // Stagger reconnects so many numbers don't all reconnect in the same second.
    await sleep(rand(800, 2500));
    startSession(dir).catch(e => log(`boot ${dir}:`, e.message));
  }
}

server.listen(PORT, '127.0.0.1', () => {
  log(`listening on 127.0.0.1:${PORT}`);
  boot().catch(e => log('boot error:', e.message));
  flushOutbox();
});

async function shutdown() {
  log('shutting down');
  for (const s of sessions.values()) await stopSession(s, false);
  server.close();
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', e => log('unhandled:', e?.message || e));
