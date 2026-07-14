import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { verifyAdminSession } from '../../../../lib/admin-auth';
import { generateApiKey } from '../../../../lib/bot-auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shop_id');

  let sql = `
    SELECT k.id, k.shop_id, k.name, k.key_preview, k.created_at, k.last_used_at,
      s.shop_name, s.license_key
    FROM bot_api_keys k
    JOIN shops s ON k.shop_id = s.id
  `;
  const params = [];
  if (shopId) { sql += ' WHERE k.shop_id = ?'; params.push(shopId); }
  sql += ' ORDER BY k.created_at DESC';

  const keys = await query(sql, params);
  return NextResponse.json(keys);
}

export async function POST(request) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.shop_id) return NextResponse.json({ error: 'shop_id required' }, { status: 400 });

  const { raw, hash, preview } = generateApiKey();
  const result = await query(
    'INSERT INTO bot_api_keys (shop_id, key_hash, key_preview, name) VALUES (?, ?, ?, ?)',
    [body.shop_id, hash, preview, (body.name || '').slice(0, 100)]
  );

  return NextResponse.json({
    id: result.insertId,
    key: raw,
    preview,
    warning: 'Save this key. You will not see it again.',
  }, { status: 201 });
}

export async function DELETE(request) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  await query('DELETE FROM bot_api_keys WHERE id = ?', [id]);
  return NextResponse.json({ success: true });
}
