import crypto from 'crypto';
import { cookies } from 'next/headers';
import { query, queryOne } from './db';

const ADMIN_COOKIE = 'pp_admin';

export async function verifyAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export async function createAdminSession() {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO admin_sessions (id, expires_at) VALUES (?, ?)',
    [sessionId, expiresAt]
  );
  return sessionId;
}

export async function verifyAdminSession() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!sessionId) return false;
  const row = await queryOne(
    'SELECT id FROM admin_sessions WHERE id = ? AND expires_at > NOW()',
    [sessionId]
  );
  return !!row;
}

export function adminCookie(sessionId) {
  return {
    name: ADMIN_COOKIE,
    value: sessionId,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  };
}

export function clearAdminCookie() {
  return { name: ADMIN_COOKIE, value: '', maxAge: 0, path: '/' };
}

export async function deleteAdminSession(sessionId) {
  await query('DELETE FROM admin_sessions WHERE id = ?', [sessionId]);
}
