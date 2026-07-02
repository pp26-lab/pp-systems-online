import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { queryOne } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const settings = await queryOne(
    'SELECT shop_name, shop_logo FROM shop_settings WHERE shop_id = ?',
    [session.shop_id]
  );

  return NextResponse.json({
    authenticated: true,
    shop_id: session.shop_id,
    shop_name: settings?.shop_name || session.shop_name,
    shop_logo: settings?.shop_logo || '',
    license_key: session.license_key,
  });
}
