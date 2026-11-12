import crypto from 'crypto';
import { getPool, queryOne, query, shopToday } from './db';
import { hasFeature } from './features';
import { normalizePhone, phoneDigitsSql } from './shipping/phone';
import { fireWebhooks } from './webhook';

// The one way an order is created - used by the checkout screen, the chat "create order"
// panel and the bot API. Everything happens in one database transaction: either the order,
// its items, the stock decrease, the customer update and the coupon use all happen, or none do.
//
// Rules enforced here (not trusted from the browser):
//  - every product/variant belongs to this shop;
//  - each price is one of the product's real prices (retail / wholesale / member), so a
//    tampered request can't sell at a made-up price; totals are recomputed;
//  - stock is locked while checked, so two sales can't both take the last item; a normal
//    product without enough stock is refused (pre-order products may sell beyond stock);
//  - stock is taken from the oldest in-stock batches first, across batches;
//  - customers are matched by phone however it was written (+856 20..., 020..., 20...).

export class OrderError extends Error {
  constructor(code, detail) { super(code); this.code = code; this.detail = detail; }
}

const MAX_LINES = 200;
const MAX_QTY = 100000;
const PRICE_TOLERANCE_LAK = 1; // currency conversion rounding

const nameOf = p => p.name_lo || p.name_th || p.name_en || p.sku || `#${p.id}`;

function cleanItems(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new OrderError('no_items');
  if (raw.length > MAX_LINES) throw new OrderError('too_many_items');
  return raw.map(i => {
    const productId = Number(i?.product_id);
    const variantId = i?.variant_id == null || i.variant_id === '' ? null : Number(i.variant_id);
    const quantity = Number(i?.quantity);
    const unitPrice = Number(i?.unit_price);
    if (!Number.isInteger(productId) || productId <= 0) throw new OrderError('bad_item');
    if (variantId !== null && (!Number.isInteger(variantId) || variantId <= 0)) throw new OrderError('bad_item');
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QTY) throw new OrderError('bad_quantity');
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new OrderError('bad_price');
    return { productId, variantId, quantity, unitPrice };
  });
}

async function couponDiscountLak(shopId, code, subtotalLak) {
  if (!(await hasFeature(shopId, 'coupons'))) throw new OrderError('coupon_invalid');
  const c = await queryOne('SELECT * FROM coupons WHERE shop_id = ? AND code = ? AND is_active = 1', [shopId, code]);
  if (!c) throw new OrderError('coupon_invalid');
  if (c.expires_at && String(c.expires_at).slice(0, 10) < shopToday()) throw new OrderError('coupon_invalid');
  if (c.usage_limit > 0 && c.times_used >= c.usage_limit) throw new OrderError('coupon_invalid');
  const min = Number(c.min_purchase) || 0;
  if (min > 0 && subtotalLak < min) throw new OrderError('coupon_invalid');
  const value = Number(c.discount_value) || 0;
  const cap = Number(c.max_discount) || 0;
  let d = c.discount_type === 'percent' ? (subtotalLak * value) / 100 : value;
  if (cap > 0 && d > cap) d = cap;
  return Math.min(Math.round(d), subtotalLak);
}

// Customer by phone, however it was typed. Returns the id or null.
async function findCustomerByPhone(conn, shopId, phone) {
  const norm = normalizePhone(phone);
  if (norm.length < 6) return null;
  // Match on digits only: the stored number may contain spaces or dashes ("020 5555 1234").
  const [rows] = await conn.execute(
    `SELECT id, phone FROM customers WHERE shop_id = ? AND ${phoneDigitsSql('phone')} LIKE ? ORDER BY last_order_at DESC, id DESC LIMIT 50`,
    [shopId, `%${norm.slice(-8)}`]
  );
  return rows.find(r => normalizePhone(r.phone) === norm)?.id || null;
}

function newOrderNumber(prefix = 'PP') {
  return prefix + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
}

/**
 * body: { items:[{product_id, variant_id, quantity, unit_price}], currency, discount, coupon_code,
 *         customer_name, customer_phone, customer_address, customer_id?, payment_method, order_type,
 *         delivery_date, shipping_notes, shipping_carrier, amount_paid }
 * opts: { conversationId, prefix } - link the chat this order came from to the customer;
 *       prefix of the order number ('PP' by default, 'BOT' for the bot API).
 */
export async function createOrder(shopId, body, opts = {}) {
  const items = cleanItems(body.items);
  const currency = String(body.currency || 'LAK').toUpperCase().slice(0, 10);
  let rate = 1;
  if (currency !== 'LAK') {
    const r = await queryOne('SELECT rate_to_lak FROM currencies WHERE code = ? AND shop_id = ?', [currency, shopId]);
    if (!r) throw new OrderError('bad_currency');
    rate = Number(r.rate_to_lak) || 1;
  }

  // Products and variants of this shop only.
  const productIds = [...new Set(items.map(i => i.productId))];
  const products = await query(
    `SELECT id, sku, name_lo, name_th, name_en, status, has_variants, selling_price_lak, wholesale_price_lak, member_price_lak, landed_cost_lak
     FROM products WHERE shop_id = ? AND id IN (${productIds.map(() => '?').join(',')})`,
    [shopId, ...productIds]
  );
  const byId = new Map(products.map(p => [p.id, p]));
  const variantIds = [...new Set(items.map(i => i.variantId).filter(Boolean))];
  const variants = variantIds.length
    ? await query(`SELECT id, product_id, color, size FROM product_variants WHERE shop_id = ? AND id IN (${variantIds.map(() => '?').join(',')})`, [shopId, ...variantIds])
    : [];
  const variantById = new Map(variants.map(v => [v.id, v]));

  const lines = items.map(i => {
    const p = byId.get(i.productId);
    if (!p) throw new OrderError('product_not_found', { product_id: i.productId });
    if (i.variantId) {
      const v = variantById.get(i.variantId);
      if (!v || v.product_id !== p.id) throw new OrderError('product_not_found', { product_id: i.productId });
    }
    // The price must be one of this product's real prices (in LAK, converted to the order currency).
    const tiers = [Number(p.selling_price_lak) || 0, Number(p.wholesale_price_lak) || 0, Number(p.member_price_lak) || 0];
    const allowed = tiers.filter((t, k) => k === 0 || t > 0);
    if (!allowed.some(t => Math.abs(i.unitPrice * rate - t) <= PRICE_TOLERANCE_LAK)) {
      throw new OrderError('price_changed', { product_id: p.id, name: nameOf(p) });
    }
    const v = i.variantId ? variantById.get(i.variantId) : null;
    return { ...i, product: p, total: i.unitPrice * i.quantity, color: v?.color || null, size: v?.size || null };
  });

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discount = Math.min(Math.max(0, Number(body.discount) || 0), subtotal);
  const total = Math.max(0, subtotal - discount);
  const totalInLak = total * rate;

  const couponCode = String(body.coupon_code || '').trim().toUpperCase().slice(0, 50);
  let couponLak = 0;
  if (couponCode) couponLak = await couponDiscountLak(shopId, couponCode, subtotal * rate);

  const orderType = ['walk_in', 'online', 'delivery'].includes(body.order_type) ? body.order_type : 'walk_in';
  const online = orderType === 'online';
  const paidNow = online ? Math.max(0, Math.min(Number(body.amount_paid) || 0, total)) : total;
  const name = String(body.customer_name || '').trim().slice(0, 255);
  const phone = String(body.customer_phone || '').trim().slice(0, 100);
  const address = online ? String(body.customer_address || '').trim().slice(0, 2000) : '';

  const pool = await getPool();
  const conn = await pool.getConnection();
  let orderId;
  let orderNumber;
  try {
    await conn.beginTransaction();

    // 1. Lock and check stock for every line (same product twice in a cart is added up).
    const need = new Map();
    for (const l of lines) {
      const key = l.variantId ? `v${l.variantId}` : `p${l.productId}`;
      const cur = need.get(key) || { line: l, qty: 0 };
      cur.qty += l.quantity;
      need.set(key, cur);
    }
    const plan = []; // what to take from where
    const shortages = [];
    for (const [key, { line, qty }] of need) {
      const preorder = line.product.status === 'pre_order';
      if (line.variantId) {
        const [[row]] = await conn.execute('SELECT quantity FROM product_variants WHERE id = ? AND shop_id = ? FOR UPDATE', [line.variantId, shopId]);
        const have = Math.max(0, Number(row?.quantity) || 0);
        if (have < qty && !preorder) shortages.push({ product_id: line.productId, variant_id: line.variantId, name: nameOf(line.product), available: have, wanted: qty });
        plan.push({ key, line, take: [{ variant: line.variantId, qty: Math.min(have, qty) }] });
      } else {
        const [rows] = await conn.execute(
          "SELECT id, quantity FROM inventory WHERE product_id = ? AND shop_id = ? AND status = 'in_stock' AND quantity > 0 ORDER BY id FOR UPDATE",
          [line.productId, shopId]
        );
        const have = rows.reduce((s, r) => s + Number(r.quantity), 0);
        if (have < qty && !preorder) shortages.push({ product_id: line.productId, variant_id: null, name: nameOf(line.product), available: have, wanted: qty });
        let left = Math.min(have, qty);
        const take = [];
        for (const r of rows) {
          if (left <= 0) break;
          const t = Math.min(left, Number(r.quantity));
          take.push({ inventory: r.id, qty: t });
          left -= t;
        }
        plan.push({ key, line, take });
      }
    }
    if (shortages.length) throw new OrderError('out_of_stock', shortages);

    // 2. Customer: the one the chat is linked to, else by phone, else a new one.
    let customerId = null;
    if (body.customer_id) {
      const [[c]] = await conn.execute('SELECT id FROM customers WHERE id = ? AND shop_id = ?', [Number(body.customer_id), shopId]);
      customerId = c?.id || null;
    }
    if (!customerId && phone) customerId = await findCustomerByPhone(conn, shopId, phone);
    if (customerId) {
      await conn.execute(
        `UPDATE customers SET name = COALESCE(NULLIF(?, ''), name), phone = COALESCE(NULLIF(phone, ''), ?),
           address = COALESCE(NULLIF(?, ''), address), total_spent = total_spent + ?, order_count = order_count + 1, last_order_at = NOW()
         WHERE id = ? AND shop_id = ?`,
        [name, phone, address, totalInLak, customerId, shopId]
      );
    } else if (phone || (opts.conversationId && name)) {
      const [r] = await conn.execute(
        'INSERT INTO customers (shop_id, name, phone, address, total_spent, order_count, last_order_at) VALUES (?, ?, ?, ?, ?, 1, NOW())',
        [shopId, name, phone, address, totalInLak]
      );
      customerId = r.insertId;
    }

    // 3. The order (retry the number in the rare case two sales get the same one).
    for (let attempt = 0; ; attempt++) {
      orderNumber = newOrderNumber(opts.prefix);
      try {
        const [r] = await conn.execute(
          `INSERT INTO orders (shop_id, customer_id, order_number, customer_name, customer_phone, customer_address,
             subtotal, discount, tax, total, currency, exchange_rate_used, total_in_lak,
             payment_method, order_type, delivery_date, shipping_notes, shipping_carrier, amount_paid, status, coupon_code, coupon_discount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [shopId, customerId, orderNumber, name, phone, address,
            subtotal, discount, total, currency, rate, totalInLak,
            String(body.payment_method || 'cash').slice(0, 50), orderType,
            online && body.delivery_date ? String(body.delivery_date).slice(0, 10) : null,
            online ? String(body.shipping_notes || '').slice(0, 2000) : '',
            online ? String(body.shipping_carrier || '').trim().slice(0, 100) : '',
            paidNow, online ? 'pending' : 'completed', couponCode, couponLak]
        );
        orderId = r.insertId;
        break;
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY' || attempt >= 3) throw e;
      }
    }

    // 4. Items, stock out, stock history.
    for (const l of lines) {
      await conn.execute(
        `INSERT INTO order_items (shop_id, order_id, product_id, variant_id, quantity, unit_price, currency, total, item_color, item_size, unit_cost_lak)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [shopId, orderId, l.productId, l.variantId, l.quantity, l.unitPrice, currency, l.total, l.color, l.size, Number(l.product.landed_cost_lak) || 0]
      );
    }
    for (const { line, take } of plan) {
      let taken = 0;
      for (const t of take) {
        if (t.qty <= 0) continue;
        if (t.variant) await conn.execute('UPDATE product_variants SET quantity = quantity - ? WHERE id = ? AND shop_id = ?', [t.qty, t.variant, shopId]);
        else await conn.execute('UPDATE inventory SET quantity = quantity - ? WHERE id = ? AND shop_id = ?', [t.qty, t.inventory, shopId]);
        taken += t.qty;
      }
      const wanted = need.get(line.variantId ? `v${line.variantId}` : `p${line.productId}`).qty;
      await conn.execute(
        `INSERT INTO stock_movements (shop_id, product_id, variant_id, quantity_change, reason, note, reference_type, reference_id)
         VALUES (?, ?, ?, ?, 'sale', ?, 'order', ?)`,
        [shopId, line.productId, line.variantId, -taken, taken < wanted ? `pre-order: ${wanted - taken} not in stock yet` : '', orderId]
      );
    }

    // 5. Coupon use, and the chat this sale came from now knows its customer.
    if (couponCode) await conn.execute('UPDATE coupons SET times_used = times_used + 1 WHERE code = ? AND shop_id = ?', [couponCode, shopId]);
    if (opts.conversationId && customerId) {
      await conn.execute(
        'UPDATE chat_conversations SET customer_id = COALESCE(customer_id, ?) WHERE id = ? AND shop_id = ?',
        [customerId, Number(opts.conversationId), shopId]
      );
    }

    await conn.commit();
  } catch (e) {
    try { await conn.rollback(); } catch { /* connection already broken */ }
    throw e;
  } finally {
    conn.release();
  }

  fireWebhooks(shopId, 'order.created', { order_id: orderId, order_number: orderNumber, total, currency, customer_phone: phone });

  const order = await queryOne('SELECT * FROM orders WHERE id = ? AND shop_id = ?', [orderId, shopId]);
  order.items = await query(
    `SELECT oi.*, p.name_lo, p.name_th, p.name_en, p.sku, COALESCE(oi.item_color, pv.color) AS variant_color, COALESCE(oi.item_size, pv.size) AS variant_size
     FROM order_items oi JOIN products p ON p.id = oi.product_id LEFT JOIN product_variants pv ON pv.id = oi.variant_id
     WHERE oi.order_id = ? AND oi.shop_id = ? ORDER BY oi.id`,
    [orderId, shopId]
  );
  return order;
}
