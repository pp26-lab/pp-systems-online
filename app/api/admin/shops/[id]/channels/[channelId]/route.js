import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../../../lib/db';
import { verifyAdminSession, adminAudit } from '../../../../../../../lib/admin-auth';
import { waGateway } from '../../../../../../../lib/chat/waweb';

export const dynamic = 'force-dynamic';

async function channel(params) {
  return queryOne(
    "SELECT id, shop_id, platform, external_id, name, status, last_error FROM chat_channels WHERE id = ? AND shop_id = ? AND platform = 'whatsapp_web'",
    [params.channelId, params.id]
  );
}

// Live pairing state of a scanned WhatsApp number: QR image or pairing code, then "connected".
export async function GET(request, { params }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ch = await channel(params);
  if (!ch) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let session = null;
  try { session = await waGateway.status(ch.id); } catch (e) { session = { status: 'unreachable', lastError: e.code }; }
  return NextResponse.json({ channel: ch, session });
}

// Scan again (new QR or pairing code) after the number was logged out or the code expired.
export async function POST(request, { params }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ch = await channel(params);
  if (!ch) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  if (b.action !== 'rescan') return NextResponse.json({ error: 'unknown_action' }, { status: 400 });

  const pairingPhone = String(b.pairing_phone || '').replace(/\D/g, '');
  if (pairingPhone && (pairingPhone.length < 8 || pairingPhone.length > 15)) return NextResponse.json({ error: 'bad_phone' }, { status: 400 });
  try {
    const session = await waGateway.start(ch.id, { fresh: true, ...(pairingPhone ? { pairingPhone } : {}) });
    await query("UPDATE chat_channels SET status = 'pending', last_error = NULL WHERE id = ?", [ch.id]);
    await adminAudit(request, 'channel.rescan', ch.shop_id, { channel_id: ch.id, method: pairingPhone ? 'code' : 'qr' });
    return NextResponse.json({ success: true, session });
  } catch (e) {
    return NextResponse.json({ error: e.code || 'gateway_unreachable' }, { status: 502 });
  }
}
