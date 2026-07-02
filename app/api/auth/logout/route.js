import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, deleteSession } from '../../../../lib/auth';

export async function POST() {
  const session = await getSession();
  if (session) {
    await deleteSession(session.id);
  }

  const cookieStore = cookies();
  cookieStore.delete('pp_session');

  return NextResponse.json({ success: true });
}
