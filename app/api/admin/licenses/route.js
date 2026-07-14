import { NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

async function forward(method, path, body) {
  const url = process.env.LICENSE_SERVER_URL || 'http://127.0.0.1:4000';
  const key = process.env.LICENSE_ADMIN_KEY || '';
  const res = await fetch(`${url}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { status, data } = await forward('GET', '/admin/licenses');
  return NextResponse.json(data, { status });
}

export async function POST(request) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { status, data } = await forward('POST', '/admin/licenses', body);
  return NextResponse.json(data, { status });
}

export async function PUT(request) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { id, ...updates } = body;
  const { status, data } = await forward('PUT', `/admin/licenses/${id}`, updates);
  return NextResponse.json(data, { status });
}

export async function DELETE(request) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const { status, data } = await forward('DELETE', `/admin/licenses/${id}`);
  return NextResponse.json(data, { status });
}
