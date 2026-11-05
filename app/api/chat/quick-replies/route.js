import { NextResponse } from 'next/server';
import { chatGuard } from '../../../../lib/chat/guard';
import { listReplies, createReply, reorderReplies, QuickReplyError, LIMITS } from '../../../../lib/chat/quick-replies';
import { readUploads, errorStatus } from './form';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await chatGuard();
  if (g.response) return g.response;
  return NextResponse.json({ replies: await listReplies(g.shopId), limits: LIMITS });
}

// Multipart: title, text, file (repeat), kind (repeat, "image" | "sticker", same order as file).
export async function POST(request) {
  const g = await chatGuard();
  if (g.response) return g.response;
  try {
    const form = await request.formData();
    const id = await createReply(g.shopId, { title: form.get('title'), text: form.get('text'), uploads: await readUploads(form) });
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof QuickReplyError || e.message === 'file_content_invalid') return NextResponse.json({ error: e.code || e.message }, { status: errorStatus(e.code || e.message) });
    console.error('quick reply create:', e);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}

// JSON: { order: [id, id, ...] }
export async function PATCH(request) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const body = await request.json().catch(() => ({}));
  await reorderReplies(g.shopId, body.order);
  return NextResponse.json({ ok: true });
}
