import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminPassword, createAdminSession, adminCookie } from '../../../../lib/admin-auth';
import { initDatabase } from '../../../../lib/db';

const attempts = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now - record.start > 15 * 60 * 1000) {
    attempts.set(ip, { count: 1, start: now });
    return true;
  }
  record.count++;
  return record.count <= 5;
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(ip)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  const { password } = await request.json();
  if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });

  const ok = await verifyAdminPassword(password);
  if (!ok) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

  await initDatabase();
  const sessionId = await createAdminSession();
  cookies().set(adminCookie(sessionId));
  return NextResponse.json({ success: true });
}
