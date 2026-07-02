import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { initDatabase, query, queryOne, ensureShopData } from '../../../../lib/db';
import { createSession, createSessionCookie } from '../../../../lib/auth';

export async function POST(request) {
  const body = await request.json();
  const licenseKey = body.license_key?.trim();

  if (!licenseKey) {
    return NextResponse.json({ error: 'License key required' }, { status: 400 });
  }

  const licenseUrl = process.env.LICENSE_SERVER_URL || 'http://118.27.147.48:4000';

  try {
    const res = await fetch(`${licenseUrl}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: licenseKey }),
    });

    const data = await res.json();

    if (!res.ok) {
      const messages = {
        'Invalid license key': 'License key ບໍ່ຖືກຕ້ອງ',
        'License is suspended': 'License ຖືກລະງັບ',
        'License is expired': 'License ໝົດອາຍຸ',
        'License is revoked': 'License ຖືກຍົກເລີກ',
      };
      return NextResponse.json(
        { error: messages[data.error] || data.error || 'Invalid license' },
        { status: 401 }
      );
    }

    await initDatabase();

    let shop = await queryOne('SELECT * FROM shops WHERE license_key = ?', [licenseKey]);
    if (!shop) {
      await query('INSERT INTO shops (license_key, shop_name) VALUES (?, ?)', [
        licenseKey,
        data.customer_name || 'My Shop',
      ]);
      shop = await queryOne('SELECT * FROM shops WHERE license_key = ?', [licenseKey]);
    }

    await ensureShopData(shop.id);

    const sessionId = await createSession(shop.id, licenseKey);

    const cookieStore = cookies();
    cookieStore.set(createSessionCookie(sessionId));

    return NextResponse.json({
      success: true,
      shop_name: shop.shop_name,
      customer_name: data.customer_name,
      plan: data.plan,
      expires_at: data.expires_at,
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'ບໍ່ສາມາດເຊື່ອມຕໍ່ License Server ໄດ້' },
      { status: 503 }
    );
  }
}
