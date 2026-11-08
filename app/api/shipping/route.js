import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { open } from '../../../lib/secret-box';
import { shippingGuard } from '../../../lib/shipping/guard';
import { renderMessage, DEFAULT_TEMPLATE } from '../../../lib/shipping/notify';
import { normalizePhone } from '../../../lib/shipping/phone';
import { BROWSER_QUERY } from '../../../lib/shipping/anousith';

export const dynamic = 'force-dynamic';

const CARRIER = 'anousith';

// Everything the shipping page shows: the shop's Anousith connection (never the password),
// recent runs, and the last 14 days of bills with what happened to each.
export async function GET() {
  const g = await shippingGuard();
  if (g.response) return g.response;
  const shopId = g.shopId;

  const [acc, settings, runs, bills] = await Promise.all([
    queryOne('SELECT login_enc, enabled, auto_notify, account_ref, last_run_at, last_error, message_template FROM shipping_accounts WHERE shop_id = ? AND carrier = ?', [shopId, CARRIER]),
    queryOne('SELECT shop_name FROM shop_settings WHERE shop_id = ?', [shopId]),
    query('SELECT status, bills_seen, bills_new, bills_matched, error, started_at, finished_at FROM shipping_scrape_runs WHERE shop_id = ? ORDER BY id DESC LIMIT 5', [shopId]),
    query(
      `SELECT b.id, b.carrier, b.tracking_number, b.receiver_name, b.receiver_phone, b.destination, b.carrier_status, b.shipped_at, b.first_seen_at,
              b.match_status, b.notify_status, b.notify_error, b.notified_at, b.order_id,
              o.order_number, o.customer_name, o.customer_phone, o.total, o.amount_paid, o.currency
       FROM shipping_bills b LEFT JOIN orders o ON o.id = b.order_id AND o.shop_id = b.shop_id
       WHERE b.shop_id = ? AND b.first_seen_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       ORDER BY b.id DESC LIMIT 300`,
      [shopId]
    ),
  ]);

  let username = '';
  if (acc?.login_enc) {
    try { username = JSON.parse(open(acc.login_enc)).username || ''; } catch { username = ''; }
  }

  // Bills the shop has to tell the customer about by hand get a ready-made WhatsApp link.
  const out = bills.map(b => {
    const todo = b.match_status === 'matched' && !b.notified_at && ['no_chat', 'failed'].includes(b.notify_status);
    const row = {
      id: b.id, tracking_number: b.tracking_number, receiver_name: b.receiver_name, receiver_phone: b.receiver_phone,
      destination: b.destination, carrier_status: b.carrier_status, shipped_at: b.shipped_at, first_seen_at: b.first_seen_at,
      match_status: b.match_status, notify_status: b.notify_status, notify_error: b.notify_error, notified_at: b.notified_at,
      order_number: b.order_number || null, customer_name: b.customer_name || null, todo,
    };
    if (todo) {
      const order = { customer_name: b.customer_name, total: b.total, amount_paid: b.amount_paid, currency: b.currency };
      const text = renderMessage(acc?.message_template, { bill: b, order, shopName: settings?.shop_name });
      // Anousith delivers inside Laos, so the number is always +856 (normalizePhone also fixes "55551234").
      const local = normalizePhone(b.customer_phone || b.receiver_phone);
      const num = local ? `856${local}` : '';
      row.wa_link = num ? `https://wa.me/${num}?text=${encodeURIComponent(text)}` : null;
    }
    return row;
  });

  return NextResponse.json({
    account: acc ? {
      connected: !!acc.login_enc, linked: !!acc.account_ref, username, enabled: !!acc.enabled, auto_notify: !!acc.auto_notify, last_run_at: acc.last_run_at, last_error: acc.last_error,
      message_template: acc.message_template || '',
    } : null,
    shop_name: settings?.shop_name || '',
    // Server-side checking only where the carrier has allowed this server (see scheduler.js).
    server_checks: process.env.SHIPPING_SCRAPE === 'on',
    browser_query: BROWSER_QUERY,
    default_template: DEFAULT_TEMPLATE,
    runs,
    bills: out,
  });
}
