import { NextResponse } from 'next/server';
import { queryOne } from '../../../../../../lib/db';
import { chatGuard } from '../../../../../../lib/chat/guard';
import { readMedia } from '../../../../../../lib/chat/media';

export const dynamic = 'force-dynamic';

// A quick-reply photo or sticker. Only the shop that owns it can open it.
export async function GET(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const m = await queryOne('SELECT file, mime FROM chat_quick_reply_media WHERE id = ? AND shop_id = ?', [params.id, g.shopId]);
  const buf = m ? readMedia(g.shopId, m.file) : null;
  if (!buf) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': m.mime,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; sandbox",
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
