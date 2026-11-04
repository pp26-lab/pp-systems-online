import { NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../lib/admin-auth';
import { hasEncryptionKey } from '../../../../lib/secret-box';
import { waGateway, gatewayConfigured } from '../../../../lib/chat/waweb';

export const dynamic = 'force-dynamic';

// Tells the back office whether the server is ready for chat (secrets present), without revealing them.
export async function GET(request) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // The webhook lives on the shops' site, never on the back-office host.
  const reqOrigin = new URL(request.url).origin;
  const onAdminHost = process.env.ADMIN_HOST && new URL(request.url).hostname === process.env.ADMIN_HOST.toLowerCase();
  const origin = process.env.PUBLIC_BASE_URL || (onAdminHost ? 'https://ppsystems-shop.com' : reqOrigin);
  // Is the WhatsApp-by-scan gateway (pm2 pp-wa) configured and running?
  let gateway = gatewayConfigured() ? 'down' : 'not_configured';
  if (gateway === 'down') {
    try { await waGateway.health(); gateway = 'up'; } catch { /* stays down */ }
  }
  return NextResponse.json({
    webhook_url: `${origin.replace(/\/$/, '')}/api/channels/meta/webhook`,
    app_secret: !!process.env.META_APP_SECRET,
    verify_token: !!process.env.META_VERIFY_TOKEN,
    encryption_key: hasEncryptionKey(),
    graph_version: process.env.META_GRAPH_VERSION || 'v23.0',
    wa_gateway: gateway,
  });
}
