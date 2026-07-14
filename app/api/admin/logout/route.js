import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteAdminSession, clearAdminCookie } from '../../../../lib/admin-auth';

export async function POST() {
  const sessionId = cookies().get('pp_admin')?.value;
  if (sessionId) await deleteAdminSession(sessionId);
  cookies().set(clearAdminCookie());
  return NextResponse.json({ success: true });
}
