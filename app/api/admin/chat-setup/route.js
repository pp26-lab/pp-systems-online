import { NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../lib/admin-auth';
import { hasEncryptionKey } from '../../../../lib/secret-box';
import { waGateway, gatewayConfigured } from '../../../../lib/chat/waweb';
import { configStatus } from '../../../../lib/platform-config';

export const dynamic = 'force-dynamic';

// Tells the back office whether the server is ready for chat (secrets present), without revealing them.
export async function GET(request) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cfg = await configStatus();
  // The webhook lives on the shops' site, never on the back-office host.
  const reqOrigin = new URL(request.url).origin;
  const onAdminHost = process.env.ADMIN_HOST && new URL(request.url).hostname === process.env.ADMIN_HOST.toLowerCase();
  const origin = (cfg.public_base_url || (onAdminHost ? 'https://ppsystems-shop.com' : reqOrigin)).replace(/\/$/, '');

  // Is the WhatsApp-by-scan gateway (pm2 pp-wa) configured and running?
  let gateway = gatewayConfigured() ? 'down' : 'not_configured';
  if (gateway === 'down') {
    try { await waGateway.health(); gateway = 'up'; } catch { /* stays down */ }
  }
  return NextResponse.json({
    webhook_url: `${origin}/api/channels/meta/webhook`,
    public_base_url: cfg.public_base_url,
    // true when present (saved in the back office or set in the server env).
    app_secret: cfg.app_secret !== 'missing',
    verify_token: cfg.verify_token !== 'missing',
    app_secret_source: cfg.app_secret,   // 'saved' | 'env' | 'missing'
    verify_token_source: cfg.verify_token,
    encryption_key: hasEncryptionKey(),
    graph_version: cfg.graph_version,
    wa_gateway: gateway,
  });
}
