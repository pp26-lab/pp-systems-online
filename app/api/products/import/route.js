import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../lib/db';
import { requireShopId } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const parse = (line) => {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else { cur += c; }
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { result.push(cur); cur = ''; }
        else cur += c;
      }
    }
    result.push(cur);
    return result;
  };
  const headers = parse(lines[0]);
  return lines.slice(1).map(l => {
    const cols = parse(l);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = cols[i] ?? ''; });
    return obj;
  });
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const text = await file.text();
  const rows = parseCsv(text);

  let inserted = 0, updated = 0, errors = [];
  for (const row of rows) {
    try {
      if (!row.sku) continue;
      const num = (v) => parseFloat(v) || 0;
      const rate = await queryOne('SELECT rate_to_lak FROM currencies WHERE code = ? AND shop_id = ?', [row.cost_currency || 'THB', shopId]);
      const exchangeRate = rate?.rate_to_lak || 1;
      const totalForeignCost = num(row.cost_price) + num(row.freight_cost) + num(row.customs_duty) + num(row.proxy_fee) + num(row.transfer_fee);
      const landedCostLak = totalForeignCost * exchangeRate;

      const existing = await queryOne('SELECT id FROM products WHERE sku = ? AND shop_id = ? AND deleted_at IS NULL', [row.sku, shopId]);
      if (existing) {
        await query(
          `UPDATE products SET name_lo=?, name_th=?, name_en=?, category=?, cost_price=?, cost_currency=?,
            freight_cost=?, customs_duty=?, proxy_fee=?, transfer_fee=?, exchange_rate_used=?, landed_cost_lak=?,
            selling_price_lak=?, barcode=?, sale_end_date=?, status=? WHERE id=? AND shop_id=?`,
          [row.name_lo || '', row.name_th || '', row.name_en || '', row.category || '',
            num(row.cost_price), row.cost_currency || 'THB',
            num(row.freight_cost), num(row.customs_duty), num(row.proxy_fee), num(row.transfer_fee),
            exchangeRate, landedCostLak, num(row.selling_price_lak),
            row.barcode || '', row.sale_end_date || null, row.status || 'active',
            existing.id, shopId]
        );
        updated++;
      } else {
        await query(
          `INSERT INTO products (shop_id, sku, name_lo, name_th, name_en, category, cost_price, cost_currency,
            freight_cost, customs_duty, proxy_fee, transfer_fee, exchange_rate_used, landed_cost_lak,
            selling_price_lak, barcode, sale_end_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [shopId, row.sku, row.name_lo || '', row.name_th || '', row.name_en || '', row.category || '',
            num(row.cost_price), row.cost_currency || 'THB',
            num(row.freight_cost), num(row.customs_duty), num(row.proxy_fee), num(row.transfer_fee),
            exchangeRate, landedCostLak, num(row.selling_price_lak),
            row.barcode || '', row.sale_end_date || null, row.status || 'active']
        );
        inserted++;
      }
    } catch (e) {
      errors.push({ sku: row.sku, error: e.message });
    }
  }

  return NextResponse.json({ inserted, updated, errors });
}
