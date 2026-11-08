import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../lib/db';
import { shippingGuard } from '../../../../lib/shipping/guard';
import { mapItems } from '../../../../lib/shipping/anousith';
import { saveBills } from '../../../../lib/shipping/scraper';
import { matchShop } from '../../../../lib/shipping/match';
import { notifyQueued } from '../../../../lib/shipping/notify';

export const dynamic = 'force-dynamic';

const CARRIER = 'anousith';
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ITEMS = 1000;
const MAX_AGE_DAYS = 4; // older parcels are not announced: the customer may already have them

// Bills sent in by the shop's own browser from app.anousith.express (the bookmark on the
// shipping page). The shop is whoever is logged in here; the data is re-validated.
// Body: { account: { id, name, phone }, items: [...itemsV2 rows], confirm_account?: true }
export async function POST(request) {
  const g = await shippingGuard();
  if (g.response) return g.response;
  const shopId = g.shopId;

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  let body;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }

  const ref = String(body?.account?.id ?? '').trim().slice(0, 64);
  if (!ref) return NextResponse.json({ error: 'no_account' }, { status: 400 });
  if (!Array.isArray(body.items) || body.items.length > MAX_ITEMS) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  await query(
    'INSERT IGNORE INTO shipping_accounts (shop_id, carrier, enabled, auto_notify) VALUES (?, ?, 0, 1)',
    [shopId, CARRIER]
  );
  const acc = await queryOne('SELECT id, account_ref FROM shipping_accounts WHERE shop_id = ? AND carrier = ?', [shopId, CARRIER]);

  // A different Anousith account than last time (staff signed in to the wrong one?):
  // ask before mixing its parcels into this shop.
  if (acc.account_ref && acc.account_ref !== ref && body.confirm_account !== true) {
    return NextResponse.json({ error: 'account_mismatch' }, { status: 409 });
  }
  if (acc.account_ref !== ref) await query('UPDATE shipping_accounts SET account_ref = ? WHERE id = ?', [ref, acc.id]);

  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
  const bills = mapItems(body.items).filter(b => !b.createdAt || b.createdAt.getTime() >= cutoff);

  const run = await query('INSERT INTO shipping_scrape_runs (shop_id, carrier) VALUES (?, ?)', [shopId, CARRIER]);
  try {
    const added = await saveBills(shopId, CARRIER, bills);
    const matched = await matchShop(shopId, 'Anousith');
    await query(
      "UPDATE shipping_scrape_runs SET status = 'ok', bills_seen = ?, bills_new = ?, bills_matched = ?, finished_at = NOW() WHERE id = ?",
      [bills.length, added, matched, run.insertId]
    );
    await query('UPDATE shipping_accounts SET last_run_at = NOW(), last_error = NULL WHERE id = ?', [acc.id]);

    // Send the notices now instead of waiting for the next tick (only where the worker is on).
    if (process.env.SHIPPING_WORKER === 'on') notifyQueued().catch(e => console.error('shipping notify:', e.message));

    const queued = await queryOne(
      "SELECT COUNT(*) AS c FROM shipping_bills WHERE shop_id = ? AND notify_status = 'queued' AND notified_at IS NULL",
      [shopId]
    );
    return NextResponse.json({ seen: bills.length, added, matched, queued: queued?.c || 0 });
  } catch (e) {
    await query("UPDATE shipping_scrape_runs SET status = 'failed', error = ?, finished_at = NOW() WHERE id = ?", [String(e.message).slice(0, 500), run.insertId]);
    console.error('shipping import:', e);
    return NextResponse.json({ error: 'import_failed' }, { status: 500 });
  }
}
