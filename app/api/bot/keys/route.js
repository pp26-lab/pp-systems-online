import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../lib/db';
import { requireShopId } from '../../../../lib/auth';
import { shopWithFeature } from '../../../../lib/features';
import { generateApiKey } from '../../../../lib/bot-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopId;
  { const g = await shopWithFeature('bot_api'); if (g.response) return g.response; shopId = g.shopId; }
  const keys = await query(
    'SELECT id, name, key_preview, created_at, last_used_at FROM bot_api_keys WHERE shop_id = ? ORDER BY created_at DESC',
    [shopId]
  );
  return NextResponse.json(keys);
}

export async function POST(request) {
  let shopId;
  { const g = await shopWithFeature('bot_api'); if (g.response) return g.response; shopId = g.shopId; }

  const body = await request.json();
  const name = (body.name || '').slice(0, 100);
  const { raw, hash, preview } = generateApiKey();

  const result = await query(
    'INSERT INTO bot_api_keys (shop_id, key_hash, key_preview, name) VALUES (?, ?, ?, ?)',
    [shopId, hash, preview, name]
  );

  return NextResponse.json({
    id: result.insertId,
    name,
    key: raw,
    preview,
    warning: 'Save this key. You will not see it again.',
  }, { status: 201 });
}

export async function DELETE(request) {
  let shopId;
  { const g = await shopWithFeature('bot_api'); if (g.response) return g.response; shopId = g.shopId; }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  await query('DELETE FROM bot_api_keys WHERE id = ? AND shop_id = ?', [id, shopId]);
  return NextResponse.json({ success: true });
}
