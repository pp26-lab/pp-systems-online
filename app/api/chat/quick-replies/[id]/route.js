import { NextResponse } from 'next/server';
import { chatGuard } from '../../../../../lib/chat/guard';
import { updateReply, deleteReply, QuickReplyError } from '../../../../../lib/chat/quick-replies';
import { readUploads, errorStatus } from '../form';

export const dynamic = 'force-dynamic';

function fail(e, what) {
  const code = e.code || e.message;
  if (e instanceof QuickReplyError || code === 'file_content_invalid') return NextResponse.json({ error: code }, { status: errorStatus(code) });
  console.error(`quick reply ${what}:`, e);
  return NextResponse.json({ error: 'save_failed' }, { status: 500 });
}

// Multipart: title, text, keep (JSON array of media ids to keep, in order), file/kind for new ones.
export async function PUT(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  try {
    const form = await request.formData();
    let keep = [];
    try { keep = JSON.parse(String(form.get('keep') || '[]')); } catch { keep = []; }
    await updateReply(g.shopId, Number(params.id), {
      title: form.get('title'), text: form.get('text'), keep: Array.isArray(keep) ? keep : [], uploads: await readUploads(form),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e, 'update');
  }
}

export async function DELETE(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  try {
    await deleteReply(g.shopId, Number(params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e, 'delete');
  }
}
