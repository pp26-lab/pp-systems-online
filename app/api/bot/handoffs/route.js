import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../lib/db';
import { verifyBotKey, botRateLimit, corsHeaders } from '../../../../lib/bot-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request) {
  const auth = await verifyBotKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders() });
  if (!botRateLimit(auth.shopId)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders() });

  const body = await request.json();

  if (!body.facebook_user_id || !body.message) {
    return NextResponse.json({ error: 'facebook_user_id and message required' }, { status: 400, headers: corsHeaders() });
  }

  const source = body.source || 'facebook_messenger';
  const receivedAt = body.received_at ? new Date(body.received_at) : new Date();
  const customerName = body.customer_name || '';

  const existing = await queryOne(
    "SELECT id, message FROM handoffs WHERE shop_id = ? AND facebook_user_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
    [auth.shopId, body.facebook_user_id]
  );

  if (existing) {
    const combined = existing.message + '\n---\n' + body.message;
    await query(
      'UPDATE handoffs SET message = ?, received_at = ? WHERE id = ?',
      [combined, receivedAt, existing.id]
    );
    const updated = await queryOne('SELECT * FROM handoffs WHERE id = ?', [existing.id]);
    return NextResponse.json({ success: true, data: updated }, { headers: corsHeaders() });
  }

  const result = await query(
    'INSERT INTO handoffs (shop_id, facebook_user_id, customer_name, message, source, received_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [auth.shopId, body.facebook_user_id, customerName, body.message, source, receivedAt, 'pending']
  );

  const handoff = await queryOne('SELECT * FROM handoffs WHERE id = ?', [result.insertId]);
  return NextResponse.json({ success: true, data: handoff }, { status: 201, headers: corsHeaders() });
}

export async function GET(request) {
  const auth = await verifyBotKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders() });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';

  const handoffs = await query(
    'SELECT * FROM handoffs WHERE shop_id = ? AND status = ? ORDER BY received_at DESC LIMIT 100',
    [auth.shopId, status]
  );
  return NextResponse.json(handoffs, { headers: corsHeaders() });
}
