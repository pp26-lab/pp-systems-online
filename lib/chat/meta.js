import crypto from 'crypto';
import { safeEqual } from '../secret-box';
import { metaConfig } from '../platform-config';

// Thin client for Meta's Graph API (Facebook Messenger + WhatsApp Cloud API).
// One Meta app ("PP Systems") serves every shop; each shop's page / phone number
// has its own access token, stored encrypted in chat_channels. The app-level secrets
// (app secret, verify token) live in platform_settings, set once in the back office.

export class GraphError extends Error {
  constructor(message, code, status) { super(message); this.code = code; this.status = status; }
}

async function graph(path, { method = 'GET', token, json, form, timeout = 15000 } = {}) {
  const { graphVersion } = await metaConfig();
  const base = `https://graph.facebook.com/${graphVersion}`;
  const headers = { Authorization: `Bearer ${token}` };
  let body;
  if (json) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;
  const res = await fetch(path.startsWith('http') ? path : `${base}${path}`, {
    method, headers, body, signal: AbortSignal.timeout(timeout),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error || {};
    throw new GraphError(e.error_user_msg || e.message || `Graph API ${res.status}`, e.code, res.status);
  }
  return data;
}

// --- Webhook security ---------------------------------------------------------

// Meta signs every webhook body with the app secret (X-Hub-Signature-256).
export async function verifySignature(rawBody, header) {
  const { appSecret } = await metaConfig();
  if (!appSecret || !header) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return safeEqual(expected, header);
}

export async function verifyToken(token) {
  const { verifyToken: expected } = await metaConfig();
  return !!expected && safeEqual(token, expected);
}

// --- Messenger ----------------------------------------------------------------

// The page id is all we need to connect and subscribe; the name is nice-to-have. Reading the
// name needs pages_read_engagement, which the Messenger "generate token" flow doesn't grant,
// so fall back to the id alone rather than failing the whole connect over a label.
// A page's public name, read with that page's own token. Empty when Meta refuses.
export async function messengerPageName(pageId, token) {
  try { return (await graph(`/${pageId}?fields=name`, { token, timeout: 8000 })).name || ''; } catch { return ''; }
}

export async function messengerPage(token) {
  try {
    return await graph('/me?fields=id,name', { token });
  } catch (e) {
    if (e.code === 100 || /permission|pages_read_engagement/i.test(String(e.message))) {
      const p = await graph('/me?fields=id', { token });
      return { id: p.id, name: '' };
    }
    throw e;
  }
}

export async function messengerSubscribe(pageId, token) {
  const fields = 'messages,message_echoes,message_deliveries,message_reads,messaging_postbacks';
  return graph(`/${pageId}/subscribed_apps?subscribed_fields=${fields}`, { method: 'POST', token });
}

function profileFrom(p) {
  return { name: p.name || [p.first_name, p.last_name].filter(Boolean).join(' '), avatar: p.profile_pic || null };
}

export async function messengerProfile(psid, token) {
  try {
    const p = await graph(`/${psid}?fields=first_name,last_name,name,profile_pic`, { token, timeout: 8000 });
    return profileFrom(p);
  } catch (e) {
    // `name` needs "Business Asset User Profile Access"; when the token can't read it, Graph
    // fails the whole request. Retry without `name` - first/last name and the photo use lower
    // access and often still come back.
    console.warn('messengerProfile failed for psid', psid, '-', e.code ?? '', e.message || e);
    try {
      const p = await graph(`/${psid}?fields=first_name,last_name,profile_pic`, { token, timeout: 8000 });
      return profileFrom(p);
    } catch (e2) {
      // Still nothing: the chat works without the name. A non-admin/tester user needs the
      // feature at Advanced Access (app review) before any name/photo is returned.
      console.warn('messengerProfile fallback failed for psid', psid, '-', e2.code ?? '', e2.message || e2);
      return {};
    }
  }
}

function messengerBase(psid, tag) {
  return tag
    ? { recipient: { id: psid }, messaging_type: 'MESSAGE_TAG', tag }
    : { recipient: { id: psid }, messaging_type: 'RESPONSE' };
}

export async function messengerSendText(psid, text, token, tag) {
  const r = await graph('/me/messages', { method: 'POST', token, json: { ...messengerBase(psid, tag), message: { text } } });
  return r.message_id;
}

// Upload the file in the same request, so no public URL is ever needed.
export async function messengerSendFile(psid, buffer, mime, filename, token, tag) {
  const type = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'file';
  const base = messengerBase(psid, tag);
  const form = new FormData();
  form.append('recipient', JSON.stringify(base.recipient));
  form.append('messaging_type', base.messaging_type);
  if (base.tag) form.append('tag', base.tag);
  form.append('message', JSON.stringify({ attachment: { type, payload: { is_reusable: false } } }));
  form.append('filedata', new Blob([buffer], { type: mime }), filename);
  const r = await graph('/me/messages', { method: 'POST', token, form, timeout: 60000 });
  return r.message_id;
}

// --- WhatsApp -----------------------------------------------------------------

export async function whatsappNumber(phoneNumberId, token) {
  return graph(`/${phoneNumberId}?fields=id,display_phone_number,verified_name`, { token });
}

export async function whatsappSubscribe(wabaId, token) {
  return graph(`/${wabaId}/subscribed_apps`, { method: 'POST', token });
}

export async function whatsappSendText(phoneNumberId, to, text, token) {
  const r = await graph(`/${phoneNumberId}/messages`, {
    method: 'POST', token,
    json: { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text, preview_url: false } },
  });
  return r.messages?.[0]?.id;
}

export async function whatsappSendFile(phoneNumberId, to, buffer, mime, filename, caption, token) {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mime);
  form.append('file', new Blob([buffer], { type: mime }), filename);
  const up = await graph(`/${phoneNumberId}/media`, { method: 'POST', token, form, timeout: 60000 });
  const type = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'document';
  const media = { id: up.id };
  if (caption && type !== 'audio') media.caption = caption;
  if (type === 'document') media.filename = filename;
  const r = await graph(`/${phoneNumberId}/messages`, {
    method: 'POST', token,
    json: { messaging_product: 'whatsapp', recipient_type: 'individual', to, type, [type]: media },
  });
  return r.messages?.[0]?.id;
}

export async function whatsappMarkRead(phoneNumberId, messageId, token) {
  return graph(`/${phoneNumberId}/messages`, {
    method: 'POST', token, json: { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
  }).catch(() => null);
}

// WhatsApp media arrives as an id; resolve it to a short-lived URL, then download with the token.
export async function whatsappDownload(mediaId, token) {
  const meta = await graph(`/${mediaId}`, { token });
  const res = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Media download failed (${res.status})`);
  return { buffer: Buffer.from(await res.arrayBuffer()), mime: meta.mime_type || res.headers.get('content-type') || '' };
}

// Messenger attachments arrive as a public CDN URL that expires after a while.
export async function downloadUrl(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Media download failed (${res.status})`);
  return { buffer: Buffer.from(await res.arrayBuffer()), mime: (res.headers.get('content-type') || '').split(';')[0] };
}
