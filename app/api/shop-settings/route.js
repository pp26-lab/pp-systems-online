import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../lib/db';
import { requireShopId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const settings = await queryOne('SELECT * FROM shop_settings WHERE shop_id = ?', [shopId]);
  return NextResponse.json(settings || {
    shop_name: 'My Shop',
    default_order_type: 'walk_in',
    variant_label_1: 'color',
    variant_label_2: 'size',
  });
}

export async function PUT(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await request.json();
  const defaultOrderType = body.default_order_type === 'online' ? 'online' : 'walk_in';
  const variantLabel1 = body.variant_label_1 || 'color';
  const variantLabel2 = body.variant_label_2 || 'size';
  const whatsappTemplate = body.whatsapp_template || '';
  const whatsappCountryCode = (body.whatsapp_country_code || '856').replace(/\D/g, '') || '856';

  const existing = await queryOne('SELECT id FROM shop_settings WHERE shop_id = ?', [shopId]);
  if (existing) {
    await query(
      'UPDATE shop_settings SET shop_name=?, shop_phone=?, shop_address=?, shop_logo=?, receipt_footer=?, default_order_type=?, variant_label_1=?, variant_label_2=?, whatsapp_template=?, whatsapp_country_code=? WHERE shop_id=?',
      [body.shop_name || 'My Shop', body.shop_phone || '', body.shop_address || '', body.shop_logo || '', body.receipt_footer || '', defaultOrderType, variantLabel1, variantLabel2, whatsappTemplate, whatsappCountryCode, shopId]
    );
  } else {
    await query(
      'INSERT INTO shop_settings (shop_id, shop_name, shop_phone, shop_address, shop_logo, receipt_footer, default_order_type, variant_label_1, variant_label_2, whatsapp_template, whatsapp_country_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [shopId, body.shop_name || 'My Shop', body.shop_phone || '', body.shop_address || '', body.shop_logo || '', body.receipt_footer || '', defaultOrderType, variantLabel1, variantLabel2, whatsappTemplate, whatsappCountryCode]
    );
  }

  return NextResponse.json({ success: true });
}
