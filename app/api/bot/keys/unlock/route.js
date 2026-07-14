import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const provided = (body.license_key || '').trim();
  if (!provided) return NextResponse.json({ error: 'License key required' }, { status: 400 });

  if (provided !== session.license_key) {
    return NextResponse.json({ error: 'License key does not match' }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
