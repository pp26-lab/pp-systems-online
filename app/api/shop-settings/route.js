import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const settings = await queryOne('SELECT * FROM shop_settings WHERE shop_id = ?', [shopId]);
  return NextResponse.json(settings || { shop_name: 'My Shop' });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();

  const existing = await queryOne('SELECT id FROM shop_settings WHERE shop_id = ?', [shopId]);
  if (existing) {
    await query(
      'UPDATE shop_settings SET shop_name=?, shop_phone=?, shop_address=?, shop_logo=?, receipt_footer=? WHERE shop_id=?',
      [body.shop_name || 'My Shop', body.shop_phone || '', body.shop_address || '', body.shop_logo || '', body.receipt_footer || '', shopId]
    );
  } else {
    await query(
      'INSERT INTO shop_settings (shop_id, shop_name, shop_phone, shop_address, shop_logo, receipt_footer) VALUES (?, ?, ?, ?, ?, ?)',
      [shopId, body.shop_name || 'My Shop', body.shop_phone || '', body.shop_address || '', body.shop_logo || '', body.receipt_footer || '']
    );
  }

  return NextResponse.json({ success: true });
}
