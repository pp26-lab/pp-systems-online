import { query, queryOne } from '../db';
import { formatCurrency } from '../currency';
import { hasFeature } from '../features';
import { sendMessage } from '../chat/send';

// Step 5: tell customers their parcel is on its way, through the shop's chat.
// shipping_bills is the queue: queued -> sending -> sent / failed. notified_at is set once
// and checked before every send, so a bill is never announced twice.

const MAX_ATTEMPTS = 3;
const RETRYABLE = new Set(['rate_limited', 'not_connected', 'daily_limit', 'send_failed', 'network']);
const sleep = ms => new Promise(r => setTimeout(r, ms));

export const DEFAULT_TEMPLATE = [
  'ສະບາຍດີ {name}',
  'ຮ້ານ {shop} ໄດ້ສົ່ງພັດສະດຸໃຫ້ທ່ານແລ້ວ ຜ່ານ {carrier} 📦',
  'ເລກພັດສະດຸ: {tracking}',
  'ສາຂາປາຍທາງ: {branch}',
  '{cod}',
  'ຂອບໃຈທີ່ອຸດໜູນຮ້ານເຮົາ 🙏',
].join('\n');

const CARRIER_NAME = { anousith: 'Anousith Express' };

// Only between 08:00 and 20:00 in Laos; nobody wants a shop message at midnight.
function quietHours() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Vientiane', hour: '2-digit', hour12: false }).format(new Date()));
  return h < 8 || h >= 20;
}

export function renderMessage(template, { bill, order, shopName }) {
  const due = Math.max(0, (Number(order?.total) || 0) - (Number(order?.amount_paid) || 0));
  const cod = due > 0 ? `ເກັບເງິນປາຍທາງ: ${formatCurrency(due, order.currency || 'LAK')}` : '';
  const values = {
    name: order?.customer_name || bill.receiver_name || '',
    shop: shopName || '',
    carrier: CARRIER_NAME[bill.carrier] || bill.carrier,
    tracking: bill.tracking_number,
    branch: bill.destination || '-',
    cod,
  };
  return String(template || DEFAULT_TEMPLATE)
    .split('\n')
    .filter(line => !(line.trim() === '{cod}' && !cod)) // nothing to collect: drop that line
    .join('\n')
    .replace(/\{(name|shop|carrier|tracking|branch|cod)\}/g, (_, k) => values[k])
    .trim();
}

async function notifyOne(bill) {
  // Claim it: only one worker may move a bill from queued to sending.
  const claim = await query(
    "UPDATE shipping_bills SET notify_status = 'sending', notify_attempts = notify_attempts + 1 WHERE id = ? AND notify_status = 'queued' AND notified_at IS NULL",
    [bill.id]
  );
  if (!claim.affectedRows) return;

  // Only for errors raised before anything was stored in the chat, so a retry can't duplicate.
  const fail = async (code) => {
    const retry = RETRYABLE.has(code) && bill.notify_attempts + 1 < MAX_ATTEMPTS;
    await query("UPDATE shipping_bills SET notify_status = ?, notify_error = ? WHERE id = ?", [retry ? 'queued' : 'failed', code, bill.id]);
  };

  try {
    const [order, acc, settings] = await Promise.all([
      queryOne('SELECT customer_name, total, amount_paid, currency FROM orders WHERE id = ? AND shop_id = ?', [bill.order_id, bill.shop_id]),
      queryOne('SELECT message_template, auto_notify FROM shipping_accounts WHERE shop_id = ? AND carrier = ?', [bill.shop_id, bill.carrier]),
      queryOne('SELECT shop_name FROM shop_settings WHERE shop_id = ?', [bill.shop_id]),
    ]);
    if (!acc?.auto_notify || !(await hasFeature(bill.shop_id, 'shipping_sync'))) {
      await query("UPDATE shipping_bills SET notify_status = 'off' WHERE id = ?", [bill.id]);
      return;
    }
    const text = renderMessage(acc.message_template, { bill, order, shopName: settings?.shop_name });
    const r = await sendMessage({ shopId: bill.shop_id, conversationId: bill.conversation_id, text });
    if (r.status === 'failed') {
      // The message is already in the chat as "not sent" with a Retry button. Retrying here
      // as well could deliver it twice, so the bill stops and the shop decides from the chat.
      await query("UPDATE shipping_bills SET notify_status = 'failed', notify_error = ?, message_id = ? WHERE id = ?", [String(r.error || 'send_failed').slice(0, 500), r.id, bill.id]);
      return;
    }
    await query(
      "UPDATE shipping_bills SET notify_status = 'sent', notified_at = NOW(), message_id = ?, notify_error = NULL WHERE id = ?",
      [r.id, bill.id]
    );
  } catch (e) {
    await fail(String(e.code || e.message || 'send_failed').slice(0, 500));
  }
}

let running = false;

// Send what's queued, one message at a time with a human-sized gap between them.
export async function notifyQueued() {
  if (running || quietHours()) return;
  running = true;
  try {
    // A notice that has waited 3 days (chat disconnected, etc.) is stale; don't send it late.
    await query(
      "UPDATE shipping_bills SET notify_status = 'failed', notify_error = 'expired' WHERE notify_status = 'queued' AND notified_at IS NULL AND first_seen_at < DATE_SUB(NOW(), INTERVAL 3 DAY)"
    );
    const bills = await query(
      "SELECT * FROM shipping_bills WHERE notify_status = 'queued' AND notified_at IS NULL AND conversation_id IS NOT NULL ORDER BY id LIMIT 20"
    );
    for (let i = 0; i < bills.length; i++) {
      if (i > 0) await sleep(8000 + Math.random() * 7000);
      await notifyOne(bills[i]);
    }
  } finally {
    running = false;
  }
}
