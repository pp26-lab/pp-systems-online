import { query } from '../db';
import { normalizePhone } from './phone';
import { fireWebhooks } from '../webhook';

// Step 7: link each new bill to an order of the same shop by the receiver's phone,
// then find the chat with that customer so step 5 can tell them.
//
// Candidate orders: same shop, not cancelled/completed, created in the last 30 days,
// not already linked to another bill. When a customer has several, the oldest one
// waiting to ship gets the parcel first.

const WINDOW_DAYS = 30;
const PLATFORM_RANK = { whatsapp_web: 0, whatsapp: 1, messenger: 2 };

async function candidateOrders(shopId) {
  const rows = await query(
    `SELECT o.id, o.customer_id, o.customer_name, o.customer_phone, o.status, o.tracking_number, o.shipping_carrier, o.created_at
     FROM orders o
     WHERE o.shop_id = ? AND o.status IN ('pending','shipping') AND o.order_type <> 'walk_in'
       AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       AND NOT EXISTS (SELECT 1 FROM shipping_bills b WHERE b.shop_id = o.shop_id AND b.order_id = o.id)
     ORDER BY o.created_at`,
    [shopId, WINDOW_DAYS]
  );
  return rows.map(o => ({ ...o, phoneNorm: normalizePhone(o.customer_phone), tracking: String(o.tracking_number || '').trim() }));
}

// The shop types carrier names freely ("Anousith", "ອານຸສິດ", ...). An order already set to
// another carrier must not be given this carrier's parcel.
const CARRIER_WORDS = { anousith: [/anousith/i, /ອານຸສິດ/, /อนุสิทธิ์/, /^ans$/i] };
function sameCarrier(orderCarrier, carrier) {
  const name = String(orderCarrier || '').trim();
  if (!name) return true;
  return (CARRIER_WORDS[carrier] || [new RegExp(carrier, 'i')]).some(re => re.test(name));
}

// Best order for a bill: the one the shop already typed this tracking number into;
// otherwise the oldest order for the same phone that has no tracking number yet and
// isn't set to a different carrier.
function pickOrder(orders, bill) {
  const byTracking = orders.findIndex(o => o.tracking && o.tracking === bill.tracking_number);
  if (byTracking !== -1) return byTracking;
  if (!bill.receiver_phone_norm) return -1;
  return orders.findIndex(o => o.phoneNorm === bill.receiver_phone_norm && !o.tracking && sameCarrier(o.shipping_carrier, bill.carrier));
}

// The conversation to notify on: one the customer started (so WhatsApp's reply-only rule
// and Messenger's window are respected), preferring WhatsApp, newest first.
export async function findConversation(shopId, phoneNorm, customerId) {
  if (!phoneNorm && !customerId) return null;
  // Last 8 digits narrow the search; exact comparison happens below after normalizing.
  const tail = phoneNorm ? `%${phoneNorm.slice(-8)}%` : 'no-phone';
  const rows = await query(
    `SELECT c.id, c.platform, c.phone, c.external_user_id, c.customer_id, c.last_inbound_at
     FROM chat_conversations c JOIN chat_channels ch ON ch.id = c.channel_id AND ch.shop_id = c.shop_id
     WHERE c.shop_id = ? AND ch.status = 'active' AND c.last_inbound_at IS NOT NULL
       AND (c.customer_id = ? OR c.phone LIKE ? OR c.external_user_id LIKE ?)`,
    [shopId, customerId || 0, tail, tail]
  );
  const hits = rows.filter(c =>
    (customerId && c.customer_id === customerId) ||
    (phoneNorm && (normalizePhone(c.phone) === phoneNorm || normalizePhone(String(c.external_user_id).split('@')[0]) === phoneNorm))
  );
  hits.sort((a, b) => (PLATFORM_RANK[a.platform] - PLATFORM_RANK[b.platform]) || (new Date(b.last_inbound_at) - new Date(a.last_inbound_at)));
  return hits[0] || null;
}

// Match every bill of this shop still waiting. Returns how many were matched.
export async function matchShop(shopId, carrierLabel = 'Anousith') {
  const bills = await query(
    // no_match bills are retried for 3 days, in case the shop enters the order after shipping.
    `SELECT * FROM shipping_bills WHERE shop_id = ?
       AND (match_status = 'pending' OR (match_status = 'no_match' AND first_seen_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)))
     ORDER BY shipped_at, id`,
    [shopId]
  );
  if (!bills.length) return 0;
  const orders = await candidateOrders(shopId);
  let matched = 0;

  for (const bill of bills) {
    const i = pickOrder(orders, bill);
    if (i === -1) {
      await query("UPDATE shipping_bills SET match_status = 'no_match', notify_status = 'off' WHERE id = ? AND shop_id = ?", [bill.id, shopId]);
      continue;
    }
    const order = orders.splice(i, 1)[0]; // one parcel per order

    const conv = await findConversation(shopId, bill.receiver_phone_norm, order.customer_id);
    await query(
      `UPDATE shipping_bills SET order_id = ?, match_status = 'matched', conversation_id = ?, notify_status = ?
       WHERE id = ? AND shop_id = ? AND match_status IN ('pending','no_match')`,
      [order.id, conv?.id || null, conv ? 'queued' : 'no_chat', bill.id, shopId]
    );
    // Fill the order's shipping details if the shop hasn't, and mark it as shipped.
    await query(
      `UPDATE orders SET
         tracking_number = IF(tracking_number = '' OR tracking_number IS NULL, ?, tracking_number),
         shipping_carrier = IF(shipping_carrier = '' OR shipping_carrier IS NULL, ?, shipping_carrier),
         status = IF(status = 'pending', 'shipping', status)
       WHERE id = ? AND shop_id = ?`,
      [bill.tracking_number, carrierLabel, order.id, shopId]
    );
    if (order.status === 'pending') {
      fireWebhooks(shopId, 'order.status_changed', { order_id: order.id, old_status: 'pending', new_status: 'shipping' });
    }
    matched++;
  }
  return matched;
}
