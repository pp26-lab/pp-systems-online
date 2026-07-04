import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { initDatabase, query, queryOne, ensureShopData } from '../../../../lib/db';
import { createSession, createSessionCookie } from '../../../../lib/auth';

const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now - record.start > WINDOW_MS) {
    attempts.set(ip, { count: 1, start: now });
    return true;
  }
  record.count++;
  return record.count <= MAX_ATTEMPTS;
}

export async function POST(request) {
  const h = headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  const body = await request.json();
  const licenseKey = body.license_key?.trim();

  if (!licenseKey || licenseKey.length > 100) {
    return NextResponse.json({ error: 'License key required' }, { status: 400 });
  }

  const licenseUrl = process.env.LICENSE_SERVER_URL || 'http://118.27.147.48:4000';

  try {
    const machineId = 'web-' + Buffer.from(licenseKey).toString('base64').substring(0, 16);

    const res = await fetch(`${licenseUrl}/api/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        machine_id: machineId,
        machine_name: 'PP Systems Online Web',
      }),
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
