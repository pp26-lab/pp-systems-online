import { NextResponse } from 'next/server';
import { verifySignature, verifyToken } from '../../../../../lib/chat/meta';
import { recordEvent, startSweeper } from '../../../../../lib/chat/inbox';

export const dynamic = 'force-dynamic';

const MAX_BODY = 2 * 1024 * 1024;

// Meta calls this once when the webhook is set up in the app dashboard.
export async function GET(request) {
  const p = new URL(request.url).searchParams;
  if (p.get('hub.mode') === 'subscribe' && await verifyToken(p.get('hub.verify_token'))) {
    return new NextResponse(p.get('hub.challenge') || '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// Messenger and WhatsApp events for every shop arrive here.
export async function POST(request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return new NextResponse('Too large', { status: 413 });
  if (!(await verifySignature(raw, request.headers.get('x-hub-signature-256')))) {
    console.warn('chat webhook: bad signature');
    return new NextResponse('Invalid signature', { status: 401 });
  }
  startSweeper();
  // Store first, answer Meta quickly; processing happens right after in the background.
  await recordEvent('meta', raw);
  return new NextResponse('EVENT_RECEIVED', { status: 200 });
}
