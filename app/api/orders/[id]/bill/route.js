import { NextResponse } from 'next/server';
import { requireShopId } from '../../../../../lib/auth';
import { query, queryOne } from '../../../../../lib/db';
import { saveMedia, readMedia, removeMedia, cleanMime, MAX_MEDIA_BYTES } from '../../../../../lib/chat/media';

export const dynamic = 'force-dynamic';

// The carrier's bill / parcel photo of one order. It carries the customer's name, phone and
// address, so it is stored privately (not in the public uploads folder) and only the shop
// that owns the order can see or change it.

const PHOTO = ['image/jpeg', 'image/png', 'image/webp'];

async function guard(params) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }; }
  const order = await queryOne('SELECT id, shipping_bill_file FROM orders WHERE id = ? AND shop_id = ?', [params.id, shopId]);
  if (!order) return { response: NextResponse.json({ error: 'not_found' }, { status: 404 }) };
  return { shopId, order };
}

export async function GET(request, { params }) {
  const g = await guard(params);
  if (g.response) return g.response;
  const buf = g.order.shipping_bill_file ? readMedia(g.shopId, g.order.shipping_bill_file) : null;
  if (!buf) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const ext = g.order.shipping_bill_file.split('.').pop();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return new NextResponse(buf, {
    headers: {
      'Content-Type': mime,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; sandbox",
      'Cache-Control': 'private, max-age=86400',
    },
  });
}

export async function POST(request, { params }) {
  const g = await guard(params);
  if (g.response) return g.response;
  const file = (await request.formData()).get('file');
  if (!file || typeof file !== 'object' || !file.size) return NextResponse.json({ error: 'empty' }, { status: 400 });
  if (file.size > MAX_MEDIA_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
  const mime = cleanMime(file.type);
  if (!PHOTO.includes(mime)) return NextResponse.json({ error: 'unsupported_type' }, { status: 400 });
  let name;
  try {
    name = saveMedia(g.shopId, Buffer.from(await file.arrayBuffer()), mime);
  } catch (e) {
    return NextResponse.json({ error: e.message || 'save_failed' }, { status: 400 });
  }
  await query('UPDATE orders SET shipping_bill_file = ? WHERE id = ? AND shop_id = ?', [name, g.order.id, g.shopId]);
  if (g.order.shipping_bill_file) removeMedia(g.shopId, g.order.shipping_bill_file);
  return NextResponse.json({ shipping_bill_file: name });
}

export async function DELETE(request, { params }) {
  const g = await guard(params);
  if (g.response) return g.response;
  await query('UPDATE orders SET shipping_bill_file = NULL WHERE id = ? AND shop_id = ?', [g.order.id, g.shopId]);
  if (g.order.shipping_bill_file) removeMedia(g.shopId, g.order.shipping_bill_file);
  return NextResponse.json({ success: true });
}
