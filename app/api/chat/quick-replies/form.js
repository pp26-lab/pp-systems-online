import { LIMITS, QuickReplyError } from '../../../../lib/chat/quick-replies';

// Files from a multipart form, paired with their "kind" field by position.
export async function readUploads(form) {
  const files = form.getAll('file').filter(f => f && typeof f === 'object' && f.size > 0);
  const kinds = form.getAll('kind');
  if (files.length > LIMITS.media) throw new QuickReplyError('too_many_media');
  const out = [];
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > LIMITS.bytes) throw new QuickReplyError('file_too_large');
    out.push({ buffer: Buffer.from(await files[i].arrayBuffer()), mime: files[i].type, kind: kinds[i] === 'sticker' ? 'sticker' : 'image' });
  }
  return out;
}

export function errorStatus(code) {
  return code === 'not_found' ? 404 : code === 'too_many_replies' ? 409 : 400;
}
