import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id');
  const reason = searchParams.get('reason');
  const q = (searchParams.get('q') || '').trim();
  const before = parseInt(searchParams.get('before')) || 0; // id of the last row already shown
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit')) || 50));

  // Filters shared by the rows and the per-reason counts.
  let where = 'sm.shop_id = ?';
  const base = [shopId];
  if (productId) { where += ' AND sm.product_id = ?'; base.push(productId); }
  if (q) {
    where += ' AND (p.name_lo LIKE ? OR p.name_th LIKE ? OR p.name_en LIKE ? OR p.sku LIKE ? OR sm.note LIKE ?)';
    const s = `%${q}%`;
    base.push(s, s, s, s, s);
  }
  const from = `FROM stock_movements sm
    LEFT JOIN products p ON sm.product_id = p.id AND p.shop_id = sm.shop_id
    LEFT JOIN product_variants pv ON sm.variant_id = pv.id`;

  // Newest first, 50 at a time: the next page is everything older than the last row shown.
  let sql = `SELECT sm.*, p.sku, p.name_lo, p.name_th, p.name_en, pv.color as variant_color, pv.size as variant_size ${from} WHERE ${where}`;
  const params = [...base];
  if (reason) { sql += ' AND sm.reason = ?'; params.push(reason); }
  if (before) { sql += ' AND sm.id < ?'; params.push(before); }
  sql += ` ORDER BY sm.id DESC LIMIT ${limit + 1}`;
  const rows = await query(sql, params);

  // Counts for the reason tabs cover the whole history (with the search applied), not just
  // what has been loaded; only sent with the first page.
  const counts = before ? null : Object.fromEntries(
    (await query(`SELECT sm.reason, COUNT(*) AS n ${from} WHERE ${where} GROUP BY sm.reason`, base)).map(r => [r.reason, Number(r.n)])
  );
  return NextResponse.json({ rows: rows.slice(0, limit), hasMore: rows.length > limit, counts });
}
