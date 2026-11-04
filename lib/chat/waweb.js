import crypto from 'crypto';

// Talks to the WhatsApp gateway (gateway/wa-gateway.mjs, pm2 name pp-wa) over
// 127.0.0.1. Both directions are signed with WA_GATEWAY_SECRET.

const BASE = () => (process.env.WA_GATEWAY_URL || `http://127.0.0.1:${process.env.WA_GATEWAY_PORT || 3020}`).replace(/\/$/, '');

export function gatewayConfigured() {
  return (process.env.WA_GATEWAY_SECRET || '').length >= 32;
}

function sign(method, pathname, ts, body) {
  return crypto.createHmac('sha256', process.env.WA_GATEWAY_SECRET || '').update(`${method}\n${pathname}\n${ts}\n${body}`).digest('hex');
}

export class GatewayError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}

async function call(method, pathname, payload, timeout = 20000) {
  if (!gatewayConfigured()) throw new GatewayError('gateway_not_configured', 500);
  const body = payload ? JSON.stringify(payload) : '';
  const ts = Date.now();
  let res;
  try {
    res = await fetch(BASE() + pathname, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-pp-time': String(ts), 'x-pp-signature': sign(method, pathname, ts, body) },
      body: method === 'GET' ? undefined : body,
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw new GatewayError('gateway_unreachable', 502);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new GatewayError(data.error || `gateway_${res.status}`, res.status);
  return data;
}

export const waGateway = {
  health: () => call('GET', '/health', null, 5000),
  status: id => call('GET', `/sessions/${Number(id)}`),
  start: (id, opts = {}) => call('POST', `/sessions/${Number(id)}/start`, opts, 30000),
  stop: id => call('POST', `/sessions/${Number(id)}/stop`, {}),
  logout: id => call('POST', `/sessions/${Number(id)}/logout`, {}),
  // Sending waits for the human-paced queue, so allow time.
  send: (id, payload) => call('POST', `/sessions/${Number(id)}/send`, payload, 180000),
  read: (id, jid, ids) => call('POST', `/sessions/${Number(id)}/read`, { jid, ids }, 15000),
};

// Check an event the gateway posted to the website.
export function verifyGatewayEvent(request, pathname, raw) {
  if (!gatewayConfigured()) return false;
  const ts = Number(request.headers.get('x-pp-time'));
  const sig = String(request.headers.get('x-pp-signature') || '');
  if (!ts || Math.abs(Date.now() - ts) > 60000) return false;
  const expected = sign('POST', pathname, ts, raw);
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
