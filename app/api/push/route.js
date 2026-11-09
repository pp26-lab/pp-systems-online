import { NextResponse } from 'next/server';
import { requireShopId } from '../../../lib/auth';
import { publicKey, validSubscription, saveSubscription, removeSubscription } from '../../../lib/push';

export const dynamic = 'force-dynamic';

async function shopOr401() {
  try { return { shopId: await requireShopId() }; } catch { return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }; }
}

// The server's public key, which the browser needs to subscribe.
export async function GET() {
  const g = await shopOr401();
  if (g.response) return g.response;
  const key = await publicKey();
  if (!key) return NextResponse.json({ error: 'server_key_missing' }, { status: 500 });
  return NextResponse.json({ publicKey: key });
}

// Body: { subscription, lang } — this phone wants notifications for the signed-in shop.
export async function POST(request) {
  const g = await shopOr401();
  if (g.response) return g.response;
  const b = await request.json().catch(() => ({}));
  if (!validSubscription(b.subscription)) return NextResponse.json({ error: 'bad_subscription' }, { status: 400 });
  await saveSubscription(g.shopId, b.subscription, {
    lang: ['lo', 'th', 'en'].includes(b.lang) ? b.lang : 'lo',
    userAgent: request.headers.get('user-agent') || '',
  });
  return NextResponse.json({ ok: true });
}

// Body: { endpoint } — stop notifying this phone (turned off, or signing out).
export async function DELETE(request) {
  const g = await shopOr401();
  if (g.response) return g.response;
  const b = await request.json().catch(() => ({}));
  if (b.endpoint) await removeSubscription(g.shopId, String(b.endpoint));
  return NextResponse.json({ ok: true });
}
