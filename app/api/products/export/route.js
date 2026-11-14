import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { requireShopId } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const products = await query('SELECT * FROM products WHERE shop_id = ? AND deleted_at IS NULL ORDER BY id', [shopId]);
  const headers = ['sku','name_lo','name_th','name_en','category','cost_price','cost_currency','freight_cost','customs_duty','proxy_fee','transfer_fee','selling_price_lak','barcode','sale_end_date','status'];
  const rows = [headers.join(',')];
  for (const p of products) {
    rows.push(headers.map(h => csvEscape(p[h])).join(','));
  }
  const csv = '﻿' + rows.join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
