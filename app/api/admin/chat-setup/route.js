import { NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../lib/admin-auth';
import { hasEncryptionKey } from '../../../../lib/secret-box';

export const dynamic = 'force-dynamic';

// Tells the back office whether the server is ready for chat (secrets present), without revealing them.
export async function GET(request) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const origin = process.env.PUBLIC_BASE_URL || new URL(request.url).origin;
  return NextResponse.json({
    webhook_url: `${origin.replace(/\/$/, '')}/api/channels/meta/webhook`,
    app_secret: !!process.env.META_APP_SECRET,
    verify_token: !!process.env.META_VERIFY_TOKEN,
    encryption_key: hasEncryptionKey(),
    graph_version: process.env.META_GRAPH_VERSION || 'v23.0',
  });
}
