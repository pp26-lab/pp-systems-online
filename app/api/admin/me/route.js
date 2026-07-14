import { NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ok = await verifyAdminSession();
  if (!ok) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true });
}
