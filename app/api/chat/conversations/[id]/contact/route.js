import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../../lib/db';
import { chatGuard } from '../../../../../../lib/chat/guard';
import { normalizePhone, phoneInText, phoneDigitsSql } from '../../../../../../lib/shipping/phone';

export const dynamic = 'force-dynamic';

const FIELDS = { name: 'name', phone: 'phone', address: 'address' };

// Body: { field: 'name'|'phone'|'address', message_id } or { field, value }.
// Saves what the customer wrote onto the customer record linked to this chat, creating or
// linking the customer when the chat doesn't have one yet, so the next order fills it in.
export async function POST(request, { params }) {
  const g = await chatGuard();
  if (g.response) return g.response;
  const shopId = g.shopId;
  const conv = await queryOne('SELECT id, customer_id, name, phone FROM chat_conversations WHERE id = ? AND shop_id = ?', [params.id, shopId]);
  if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const b = await request.json().catch(() => ({}));
  const field = FIELDS[b.field];
  if (!field) return NextResponse.json({ error: 'bad_field' }, { status: 400 });

  let value = typeof b.value === 'string' ? b.value : null;
  if (value === null && b.message_id) {
    // Only a message the customer sent in THIS chat of THIS shop.
    const m = await queryOne(
      "SELECT text FROM chat_messages WHERE id = ? AND conversation_id = ? AND shop_id = ? AND direction = 'in'",
      [Number(b.message_id), conv.id, shopId]
    );
    if (!m?.text) return NextResponse.json({ error: 'message_not_found' }, { status: 404 });
    value = m.text;
  }
  value = String(value || '').trim();
  if (field === 'phone') {
    const found = phoneInText(value);
    if (!found) return NextResponse.json({ error: 'no_phone_in_message' }, { status: 400 });
    value = found;
  }
  if (!value) return NextResponse.json({ error: 'empty' }, { status: 400 });
  value = value.slice(0, field === 'address' ? 1000 : field === 'name' ? 255 : 100);

  let customerId = conv.customer_id;
  if (customerId) {
    const own = await queryOne('SELECT id FROM customers WHERE id = ? AND shop_id = ?', [customerId, shopId]);
    if (!own) customerId = null;
  }
  // Not linked yet: a phone may belong to an existing customer - link that one instead of a duplicate.
  if (!customerId && field === 'phone') {
    const norm = normalizePhone(value);
    const rows = await query(`SELECT id, phone FROM customers WHERE shop_id = ? AND ${phoneDigitsSql('phone')} LIKE ? LIMIT 50`, [shopId, `%${norm.slice(-8)}`]);
    customerId = rows.find(r => normalizePhone(r.phone) === norm)?.id || null;
  }
  if (!customerId) {
    const r = await query('INSERT INTO customers (shop_id, name, phone, address) VALUES (?, ?, ?, ?)', [
      shopId,
      field === 'name' ? value : (conv.name || '').slice(0, 255),
      field === 'phone' ? value : '',
      field === 'address' ? value : '',
    ]);
    customerId = r.insertId;
  } else {
    await query(`UPDATE customers SET ${field} = ? WHERE id = ? AND shop_id = ?`, [value, customerId, shopId]);
  }
  await query('UPDATE chat_conversations SET customer_id = ? WHERE id = ? AND shop_id = ?', [customerId, conv.id, shopId]);

  const customer = await queryOne('SELECT id, name, phone, address FROM customers WHERE id = ? AND shop_id = ?', [customerId, shopId]);
  return NextResponse.json({ ok: true, field, value, customer });
}
