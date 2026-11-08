import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { shippingGuard } from '../../../../../lib/shipping/guard';

export const dynamic = 'force-dynamic';

// Body: { action: "done" } — the shop told the customer itself (WhatsApp link, phone call).
export async function PATCH(request, { params }) {
  const g = await shippingGuard();
  if (g.response) return g.response;
  const body = await request.json().catch(() => ({}));
  if (body.action !== 'done') return NextResponse.json({ error: 'bad_action' }, { status: 400 });
  const r = await query(
    "UPDATE shipping_bills SET notify_status = 'sent', notified_at = NOW(), notify_error = 'manual' WHERE id = ? AND shop_id = ? AND notified_at IS NULL AND notify_status IN ('no_chat','failed')",
    [Number(params.id), g.shopId]
  );
  return NextResponse.json({ ok: r.affectedRows > 0 });
}
