import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { queryOne } from '../../../../../../lib/db';
import { formatCurrency } from '../../../../../../lib/currency';
import { chatGuard, ERROR_STATUS } from '../../../../../../lib/chat/guard';
import { sendMessage, sendQuickReply, SendError } from '../../../../../../lib/chat/send';
import { getReply, loadReplyFiles, countUse } from '../../../../../../lib/chat/quick-replies';
import { MAX_MEDIA_BYTES } from '../../../../../../lib/chat/media';

export const dynamic = 'force-dynamic';

const UPLOAD_MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

// Product photos already live in the public uploads folder; read them from disk.
function productPhoto(url) {
  const m = /^\/api\/uploads\/([^/?#]+)$/.exec(String(url || ''));
  if (!m) return null;
  const name = path.basename(m[1]);
  const file = path.join(process.cwd(), 'uploads', name);
  const mime = UPLOAD_MIME[path.extname(name).toLowerCase()];
  if (!mime || !fs.existsSync(file)) return null;
  return { buffer: fs.readFileSync(file), mime, name };
}

// Body: multipart form with text, file, order_id, product_id.
// Everything sent from here is typed or picked by a staff member, so once the free 24-hour
// window has closed Messenger gets the HUMAN_AGENT tag automatically (allowed up to 7 days).
// Automated messages (shipping notices) never go through here and never get that tag.
export async function POST(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;

  const form = await request.formData();

  // A saved reply: send its text and photos/stickers as they are stored.
  const quickId = parseInt(form.get('quick_reply_id')) || null;
  if (quickId) {
    const reply = await getReply(g.shopId, quickId);
    if (!reply) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    try {
      const results = await sendQuickReply({
        shopId: g.shopId, conversationId: params.id, text: reply.text, files: loadReplyFiles(g.shopId, reply), humanAgent: true,
      });
      await countUse(g.shopId, quickId);
      const failed = results.some(x => x.status === 'failed');
      return NextResponse.json({ results }, { status: failed ? 502 : 200 });
    } catch (e) {
      const code = e.code || e.message;
      if (e instanceof SendError || ERROR_STATUS[code]) return NextResponse.json({ error: code }, { status: ERROR_STATUS[code] || 400 });
      console.error('chat quick reply send:', e);
      return NextResponse.json({ error: 'send_failed' }, { status: 500 });
    }
  }
  let text = String(form.get('text') || '');
  let file = null;
  const upload = form.get('file');
  if (upload && typeof upload === 'object' && upload.size > 0) {
    if (upload.size > MAX_MEDIA_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
    file = { buffer: Buffer.from(await upload.arrayBuffer()), mime: upload.type, name: path.basename(upload.name || 'file') };
  }

  let orderId = parseInt(form.get('order_id')) || null;
  if (orderId) {
    const o = await queryOne('SELECT id FROM orders WHERE id = ? AND shop_id = ?', [orderId, g.shopId]);
    if (!o) return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  }

  const productId = parseInt(form.get('product_id')) || null;
  if (productId) {
    const p = await queryOne('SELECT * FROM products WHERE id = ? AND shop_id = ?', [productId, g.shopId]);
    if (!p) return NextResponse.json({ error: 'product_not_found' }, { status: 404 });
    const name = p.name_lo || p.name_th || p.name_en || p.sku;
    if (!text) text = `${name}\n${formatCurrency(p.selling_price_lak, 'LAK')}`;
    if (!file) file = productPhoto(p.image_url);
  }

  try {
    const result = await sendMessage({
      shopId: g.shopId, conversationId: params.id, text, file, orderId, humanAgent: true,
    });
    return NextResponse.json(result, { status: result.status === 'failed' ? 502 : 200 });
  } catch (e) {
    if (e instanceof SendError || ERROR_STATUS[e.message]) {
      const code = e.code || e.message;
      return NextResponse.json({ error: code }, { status: ERROR_STATUS[code] || 400 });
    }
    console.error('chat send:', e);
    return NextResponse.json({ error: 'send_failed' }, { status: 500 });
  }
}
