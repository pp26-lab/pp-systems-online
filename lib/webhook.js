import crypto from 'crypto';
import { query } from './db';
import { hasFeature } from './features';

export async function fireWebhooks(shopId, event, data) {
  try {
    if (!(await hasFeature(shopId, 'webhooks'))) return;
    const hooks = await query(
      "SELECT * FROM webhooks WHERE shop_id = ? AND is_active = 1 AND FIND_IN_SET(?, events)",
      [shopId, event]
    );
    for (const hook of hooks) {
      fireHook(hook, event, data).catch(e => console.error('Webhook error:', e.message));
    }
  } catch (e) {
    console.error('Webhook query error:', e.message);
  }
}

async function fireHook(hook, event, data) {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  const headers = { 'Content-Type': 'application/json', 'x-webhook-event': event };
  if (hook.secret) {
    const sig = crypto.createHmac('sha256', hook.secret).update(payload).digest('hex');
    headers['x-webhook-signature'] = sig;
  }
  try {
    // A slow receiver must not hold the request open forever.
    const res = await fetch(hook.url, { method: 'POST', headers, body: payload, signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      await query('UPDATE webhooks SET last_fired_at = NOW(), fail_count = 0 WHERE id = ?', [hook.id]);
    } else {
      await query('UPDATE webhooks SET fail_count = fail_count + 1 WHERE id = ?', [hook.id]);
    }
  } catch (e) {
    await query('UPDATE webhooks SET fail_count = fail_count + 1 WHERE id = ?', [hook.id]);
  }
}
