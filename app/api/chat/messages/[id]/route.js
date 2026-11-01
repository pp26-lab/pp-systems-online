import { NextResponse } from 'next/server';
import { queryOne } from '../../../../../lib/db';
import { chatGuard, ERROR_STATUS } from '../../../../../lib/chat/guard';
import { retryMessage, SendError } from '../../../../../lib/chat/send';
import { readMedia } from '../../../../../lib/chat/media';

export const dynamic = 'force-dynamic';

// The photo/file of a message. Only the owning shop can open it.
export async function GET(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const m = await queryOne('SELECT media_file, media_mime FROM chat_messages WHERE id = ? AND shop_id = ?', [params.id, g.shopId]);
  const buf = m?.media_file ? readMedia(g.shopId, m.media_file) : null;
  if (!buf) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const download = new URL(request.url).searchParams.get('download') === '1';
  return new NextResponse(buf, {
    headers: {
      'Content-Type': m.media_mime || 'application/octet-stream',
      'Content-Disposition': `${download || !String(m.media_mime).startsWith('image/') ? 'attachment' : 'inline'}; filename="${m.media_file}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; media-src 'self'; sandbox",
      'Cache-Control': 'private, max-age=86400',
    },
  });
}

// Retry a message that failed to send.
export async function POST(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  try {
    const result = await retryMessage(g.shopId, params.id);
    return NextResponse.json(result, { status: result.status === 'failed' ? 502 : 200 });
  } catch (e) {
    const code = e instanceof SendError ? e.code : 'retry_failed';
    return NextResponse.json({ error: code }, { status: ERROR_STATUS[code] || 500 });
  }
}
