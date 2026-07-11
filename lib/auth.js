import { cookies } from 'next/headers';
import { query, queryOne } from './db';

const SESSION_COOKIE = 'pp_session';

export async function getSession() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await queryOne(
    'SELECT s.*, sh.shop_name FROM sessions s JOIN shops sh ON s.shop_id = sh.id WHERE s.id = ? AND s.expires_at > NOW()',
    [sessionId]
  );
  return session;
}

export async function getShopId() {
  const session = await getSession();
  if (!session) return null;
  return session.shop_id;
}

export async function requireShopId() {
  const shopId = await getShopId();
  if (!shopId) {
    throw new Error('UNAUTHORIZED');
  }
  return shopId;
}

export function createSessionCookie(sessionId, maxAgeDays = 30) {
  return {
    name: SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60,
  };
}

export async function createSession(shopId, licenseKey) {
  const { v4: uuidv4 } = await import('uuid');
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await query(
    'INSERT INTO sessions (id, shop_id, license_key, expires_at) VALUES (?, ?, ?, ?)',
    [sessionId, shopId, licenseKey, expiresAt]
  );

  return sessionId;
}

export async function deleteSession(sessionId) {
  await query('DELETE FROM sessions WHERE id = ?', [sessionId]);
}
