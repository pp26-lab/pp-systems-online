'use client';
import { useState, useEffect, useMemo } from 'react';
import { unitPrice, nextStep, isSmall, qtyByProduct } from '../../lib/pricing';
import { Modal, Button, Icon, SearchInput, inputCls } from '../ui';
import { formatCurrency } from '../../lib/currency';
import { orderErrorText, RELOAD_PRODUCTS } from '../../lib/order-messages';

// "Create order" from a chat: the same real sale as the checkout screen (stock checked and
// taken, customer saved, order listed), started from what the chat already knows about the
// customer. Online order in LAK; the rest is collected on delivery.

const COPY = {
  lo: {
    title: 'ສ້າງອໍເດີ້ຈາກແຊັດ', products: 'ສິນຄ້າ', search: 'ຄົ້ນຫາສິນຄ້າ ຫຼື SKU', bought: 'ເຄີຍຊື້', all: 'ສິນຄ້າທັງໝົດ',
    left: n => `ເຫຼືອ ${n}`, unit: 'ຊິ້ນ', more: (n, u, total, all) => `ຊື້ເພີ່ມ ${n} ${u} (ຄົບ ${all} ${u}) ລາຄາລວມ ${total}`, preorder: 'ພຣີອໍເດີ້', soldOut: 'ໝົດ', noMatch: 'ບໍ່ພົບສິນຄ້າ', empty: 'ກົດສິນຄ້າເພື່ອເພີ່ມໃສ່ອໍເດີ້',
    customer: 'ລູກຄ້າ ແລະ ການຈັດສົ່ງ', name: 'ຊື່ ແລະ ນາມສະກຸນ', phone: 'ເບີໂທ', address: 'ທີ່ຢູ່ຈັດສົ່ງ', carrier: 'ຂົນສົ່ງ', notes: 'ໝາຍເຫດ',
    tip: 'ເຄັດລັບ: ແຕະຂໍ້ຄວາມຂອງລູກຄ້າໃນແຊັດ ແລ້ວເລືອກ ຊື່ / ເບີໂທ / ທີ່ຢູ່ ລະບົບຈະຈື່ໄວ້ໃຊ້ຄັ້ງຕໍ່ໄປ',
    payment: 'ການຊຳລະ', discount: 'ສ່ວນຫຼຸດ', paid: 'ຮັບເງິນແລ້ວ (ໂອນ/ມັດຈຳ)', method: 'ຊ່ອງທາງ', transfer: 'ໂອນ', cash: 'ເງິນສົດ',
    subtotal: 'ລວມສິນຄ້າ', total: 'ຍອດລວມ', cod: 'ເກັບປາຍທາງ (COD)', payCod: 'ເກັບເງິນປາຍທາງ', payFull: 'ຈ່າຍເຕັມແລ້ວ', fullPaid: 'ຈ່າຍເຕັມແລ້ວ ບໍ່ເກັບປາຍທາງ',
    sendSummary: 'ສົ່ງສະຫຼຸບອໍເດີ້ໃຫ້ລູກຄ້າໃນແຊັດນີ້', summaryNote: 'ແກ້ຂໍ້ຄວາມໄດ້ກ່ອນສົ່ງ',
    cancel: 'ຍົກເລີກ', confirm: total => `ຢືນຢັນການຂາຍ ${total}`, saving: 'ກຳລັງບັນທຶກ…', loading: 'ກຳລັງໂຫຼດ…',
    needName: 'ໃສ່ຊື່ລູກຄ້າ', needPhone: 'ໃສ່ເບີໂທລູກຄ້າ', needAddress: 'ໃສ່ທີ່ຢູ່ຈັດສົ່ງ', needItems: 'ເພີ່ມສິນຄ້າຢ່າງໜ້ອຍ 1 ລາຍການ',
    remove: 'ເອົາອອກ', pickOption: 'ເລືອກແບບ',
    sum: {
      head: (shop) => `ສະຫຼຸບອໍເດີ້ {order}${shop ? ` ຈາກ ${shop}` : ''}`, total: 'ລວມ', paid: 'ຈ່າຍແລ້ວ', cod: 'ເກັບປາຍທາງ',
      name: 'ຊື່', phone: 'ເບີໂທ', address: 'ທີ່ຢູ່', carrier: 'ຂົນສົ່ງ', thanks: 'ຂອບໃຈທີ່ອຸດໜູນ 🙏',
    },
  },
  th: {
    title: 'สร้างออเดอร์จากแชท', products: 'สินค้า', search: 'ค้นหาสินค้าหรือ SKU', bought: 'เคยซื้อ', all: 'สินค้าทั้งหมด',
    left: n => `เหลือ ${n}`, unit: 'ชิ้น', more: (n, u, total, all) => `ซื้อเพิ่ม ${n} ${u} (ครบ ${all} ${u}) ราคารวม ${total}`, preorder: 'พรีออเดอร์', soldOut: 'หมด', noMatch: 'ไม่พบสินค้า', empty: 'กดสินค้าเพื่อเพิ่มในออเดอร์',
    customer: 'ลูกค้าและการจัดส่ง', name: 'ชื่อและนามสกุล', phone: 'เบอร์โทร', address: 'ที่อยู่จัดส่ง', carrier: 'ขนส่ง', notes: 'หมายเหตุ',
    tip: 'เคล็ดลับ: แตะข้อความของลูกค้าในแชท แล้วเลือก ชื่อ / เบอร์โทร / ที่อยู่ ระบบจะจำไว้ใช้ครั้งต่อไป',
    payment: 'การชำระ', discount: 'ส่วนลด', paid: 'รับเงินแล้ว (โอน/มัดจำ)', method: 'ช่องทาง', transfer: 'โอน', cash: 'เงินสด',
    subtotal: 'รวมสินค้า', total: 'ยอดรวม', cod: 'เก็บปลายทาง (COD)', payCod: 'เก็บเงินปลายทาง', payFull: 'จ่ายเต็มแล้ว', fullPaid: 'จ่ายเต็มแล้ว ไม่เก็บปลายทาง',
    sendSummary: 'ส่งสรุปออเดอร์ให้ลูกค้าในแชทนี้', summaryNote: 'แก้ข้อความได้ก่อนส่ง',
    cancel: 'ยกเลิก', confirm: total => `ยืนยันการขาย ${total}`, saving: 'กำลังบันทึก…', loading: 'กำลังโหลด…',
    needName: 'ใส่ชื่อลูกค้า', needPhone: 'ใส่เบอร์โทรลูกค้า', needAddress: 'ใส่ที่อยู่จัดส่ง', needItems: 'เพิ่มสินค้าอย่างน้อย 1 รายการ',
    remove: 'เอาออก', pickOption: 'เลือกแบบ',
    sum: {
      head: (shop) => `สรุปออเดอร์ {order}${shop ? ` จาก ${shop}` : ''}`, total: 'รวม', paid: 'จ่ายแล้ว', cod: 'เก็บปลายทาง',
      name: 'ชื่อ', phone: 'เบอร์โทร', address: 'ที่อยู่', carrier: 'ขนส่ง', thanks: 'ขอบคุณที่อุดหนุน 🙏',
    },
  },
  en: {
    title: 'Create order from chat', products: 'Products', search: 'Search product or SKU', bought: 'Bought before', all: 'All products',
    left: n => `${n} left`, unit: 'pc', more: (n, u, total, all) => `Buy ${n} more ${u} (${all} in all) for ${total} in total`, preorder: 'Pre-order', soldOut: 'Sold out', noMatch: 'No products found', empty: 'Tap a product to add it',
    customer: 'Customer and delivery', name: 'Full name', phone: 'Phone', address: 'Delivery address', carrier: 'Carrier', notes: 'Notes',
    tip: 'Tip: tap a customer message in the chat and choose Name / Phone / Address. It is remembered for next time.',
    payment: 'Payment', discount: 'Discount', paid: 'Already paid (transfer/deposit)', method: 'Method', transfer: 'Transfer', cash: 'Cash',
    subtotal: 'Items', total: 'Total', cod: 'Cash on delivery', payCod: 'Collect on delivery', payFull: 'Paid in full', fullPaid: 'Paid in full, nothing to collect',
    sendSummary: 'Send the order summary to the customer in this chat', summaryNote: 'You can edit it before sending',
    cancel: 'Cancel', confirm: total => `Confirm sale ${total}`, saving: 'Saving…', loading: 'Loading…',
    needName: "Enter the customer's name", needPhone: "Enter the customer's phone", needAddress: 'Enter the delivery address', needItems: 'Add at least 1 product',
    remove: 'Remove', pickOption: 'Choose option',
    sum: {
      head: (shop) => `Order summary {order}${shop ? ` from ${shop}` : ''}`, total: 'Total', paid: 'Paid', cod: 'Collect on delivery',
      name: 'Name', phone: 'Phone', address: 'Address', carrier: 'Carrier', thanks: 'Thank you for your order 🙏',
    },
  },
};

const money = v => formatCurrency(v, 'LAK');

function nameOf(p, lang) {
  if (lang === 'th') return p.name_th || p.name_lo || p.name_en || p.sku;
  if (lang === 'en') return p.name_en || p.name_lo || p.name_th || p.sku;
  return p.name_lo || p.name_th || p.name_en || p.sku;
}

export default function ChatOrderPanel({ convId, lang = 'lo', onClose, onDone }) {
  const c = COPY[lang] || COPY.en;
  const [prefill, setPrefill] = useState(null);
  const [products, setProducts] = useState(null);
  const [search, setSearch] = useState('');
  const [picker, setPicker] = useState(null); // product whose options are shown
  const [cart, setCart] = useState([]);
  const [cust, setCust] = useState({ name: '', phone: '', address: '', carrier: '', notes: '' });
  const [discount, setDiscount] = useState('');
  const [paid, setPaid] = useState('');
  const [payFull, setPayFull] = useState(false); // customer already paid everything: no COD on the order or the bill
  const [method, setMethod] = useState('transfer');
  const [send, setSend] = useState(true);
  const [summary, setSummary] = useState('');
  const [summaryEdited, setSummaryEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadProducts = () => fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d.filter(p => p.status !== 'hidden') : [])).catch(() => setProducts([]));

  useEffect(() => {
    loadProducts();
    fetch(`/api/chat/conversations/${convId}/order`).then(r => r.json()).then(d => {
      setPrefill(d);
      const cu = d.customer || {};
      const last = d.last_order || {};
      setCust({
        name: cu.name || last.customer_name || d.chat?.name || '',
        phone: cu.phone || last.customer_phone || d.chat?.phone || '',
        address: cu.address || last.customer_address || '',
        carrier: last.shipping_carrier || '',
        notes: '',
      });
    }).catch(() => setPrefill({}));
  }, [convId]);

  const tier = prefill?.customer?.customer_type || 'retail';
  const stockOf = p => Number(p.stock_in_stock) || 0;

  const visible = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    if (q) {
      return products.filter(p => [p.name_lo, p.name_th, p.name_en, p.sku].some(v => v && String(v).toLowerCase().includes(q))).slice(0, 40);
    }
    const boughtIds = prefill?.bought_product_ids || [];
    const bought = boughtIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    const rest = products.filter(p => !boughtIds.includes(p.id));
    return [...bought, ...rest].slice(0, 40);
  }, [products, search, prefill]);
  const boughtSet = new Set(prefill?.bought_product_ids || []);

  function add(p, v) {
    const key = v ? `v${v.id}` : `p${p.id}`;
    const preorder = p.status === 'pre_order';
    const max = preorder ? Infinity : v ? Number(v.quantity) || 0 : stockOf(p);
    setCart(prev => {
      const hit = prev.find(i => i.key === key);
      if (hit) return prev.map(i => (i.key === key ? { ...i, quantity: Math.min(i.quantity + 1, i.max) } : i));
      if (max <= 0) return prev;
      return [...prev, {
        key, product_id: p.id, variant_id: v?.id || null, max,
        name: nameOf(p, lang), option: v ? [v.color, v.size].filter(Boolean).join(' / ') : '',
        // What the price depends on; the price itself is worked out from the whole cart below.
        pricing: {
          selling_price_lak: p.selling_price_lak, wholesale_price_lak: p.wholesale_price_lak, member_price_lak: p.member_price_lak,
          product_type: p.product_type, price_tiers: p.price_tiers,
        },
        unitLabel: p.unit_label || '', quantity: 1,
      }];
    });
    setPicker(null);
    setError('');
  }

  function pick(p) {
    if (p.has_variants && p.variants?.length) setPicker(picker?.id === p.id ? null : p);
    else add(p, null);
  }

  const setQty = (key, q) => setCart(prev => (q <= 0 ? prev.filter(i => i.key !== key) : prev.map(i => (i.key === key ? { ...i, quantity: Math.min(q, i.max) } : i))));

  // Small items: the price per unit follows the product's whole quantity in the cart.
  const qtyOf = qtyByProduct(cart);
  const priced = cart.map(i => ({ ...i, unit: unitPrice(i.pricing, qtyOf[i.product_id], tier), next: nextStep(i.pricing, qtyOf[i.product_id]), totalQty: qtyOf[i.product_id] }));
  const subtotal = priced.reduce((s, i) => s + i.unit * i.quantity, 0);
  const disc = Math.min(Math.max(0, Number(discount) || 0), subtotal);
  const total = subtotal - disc;
  const paidNum = payFull ? total : Math.min(Math.max(0, Number(paid) || 0), total);
  const cod = total - paidNum;

  // The summary follows the order until the staff edits it by hand.
  const autoSummary = useMemo(() => {
    const s = c.sum;
    const lines = [s.head(prefill?.shop_name)];
    for (const i of priced) lines.push(`- ${i.name}${i.option ? ` (${i.option})` : ''} x${i.quantity}${isSmall(i.pricing) && i.unitLabel ? ` ${i.unitLabel}` : ''} = ${money(i.unit * i.quantity)}`);
    lines.push(`${s.total}: ${money(total)}`);
    if (paidNum > 0) lines.push(`${s.paid}: ${money(paidNum)}`);
    if (cod > 0) lines.push(`${s.cod}: ${money(cod)}`);
    if (cust.name) lines.push(`${s.name}: ${cust.name}`);
    if (cust.phone) lines.push(`${s.phone}: ${cust.phone}`);
    if (cust.address) lines.push(`${s.address}: ${cust.address}`);
    if (cust.carrier) lines.push(`${s.carrier}: ${cust.carrier}`);
    lines.push(s.thanks);
    return lines.join('\n');
  }, [priced, total, paidNum, cod, cust, prefill, c]);
  useEffect(() => { if (!summaryEdited) setSummary(autoSummary); }, [autoSummary, summaryEdited]);

  async function confirm() {
    if (saving) return;
    const missing = !cart.length ? c.needItems : !cust.name.trim() ? c.needName : !cust.phone.trim() ? c.needPhone : !cust.address.trim() ? c.needAddress : '';
    if (missing) { setError(missing); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/chat/conversations/${convId}/order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: priced.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity, unit_price: i.unit })),
          discount: disc, amount_paid: paidNum, payment_method: method,
          customer_name: cust.name.trim(), customer_phone: cust.phone.trim(), customer_address: cust.address.trim(),
          shipping_carrier: cust.carrier.trim(), shipping_notes: cust.notes.trim(),
          send_summary: send, summary_text: summary,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(orderErrorText(lang, d.error, d.detail));
        if (RELOAD_PRODUCTS.has(d.error)) loadProducts();
        return;
      }
      onDone?.(d);
    } catch {
      setError(orderErrorText(lang, 'other'));
    } finally {
      setSaving(false);
    }
  }

  const field = (key, label, props = {}) => (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
      {props.multiline
        ? <textarea rows={2} value={cust[key]} onChange={e => setCust({ ...cust, [key]: e.target.value })} className={`${inputCls} border-line resize-y`} />
        : <input value={cust[key]} onChange={e => setCust({ ...cust, [key]: e.target.value })} list={props.list} inputMode={props.inputMode}
            className={`${inputCls} border-line`} />}
    </label>
  );

  return (
    <Modal open onClose={onClose} title={c.title} size="xl"
      footer={<>
        <Button tone="ghost" onClick={onClose}>{c.cancel}</Button>
        <Button onClick={confirm} disabled={saving || !prefill}>{saving ? c.saving : c.confirm(money(total))}</Button>
      </>}>
      {!prefill || !products ? <p className="text-sm text-slate-500">{c.loading}</p> : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Products and cart */}
          <section className="min-w-0">
            <h3 className="font-bold text-ink mb-2">{c.products}</h3>
            <SearchInput value={search} onChange={setSearch} placeholder={c.search} />
            <ul className="mt-2 max-h-64 overflow-y-auto divide-y divide-line border border-line rounded-lg">
              {visible.length === 0 && <li className="p-3 text-sm text-slate-500">{c.noMatch}</li>}
              {visible.map(p => {
                const stock = stockOf(p);
                const pre = p.status === 'pre_order';
                const out = !pre && stock <= 0;
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => !out && pick(p)} disabled={out}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-canvas disabled:opacity-50">
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="w-10 h-10 rounded-md object-cover bg-canvas shrink-0" />
                        : <span className="w-10 h-10 rounded-md bg-canvas shrink-0" />}
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-ink truncate">{nameOf(p, lang)}</span>
                        <span className="block text-xs text-slate-500">
                          {money(unitPrice(p, 1, tier))}{isSmall(p) && `/${p.unit_label || c.unit}`}
                          <span className={`ml-2 ${out ? 'text-danger' : pre ? 'text-primary' : 'text-slate-400'}`}>{out ? c.soldOut : pre ? c.preorder : c.left(stock)}</span>
                          {boughtSet.has(p.id) && !search && <span className="ml-2 text-[#8A4B00]">{c.bought}</span>}
                        </span>
                      </span>
                      <Icon name="plus" className="w-4 h-4 text-primary shrink-0" strokeWidth={2.2} />
                    </button>
                    {picker?.id === p.id && (
                      <div className="px-3 pb-3 flex flex-wrap gap-1.5" aria-label={c.pickOption}>
                        {p.variants.map(v => {
                          const vOut = !pre && (Number(v.quantity) || 0) <= 0;
                          return (
                            <button key={v.id} type="button" disabled={vOut} onClick={() => add(p, v)}
                              className="px-2.5 py-1 rounded-full border border-line text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-40">
                              {[v.color, v.size].filter(Boolean).join(' / ') || '-'} <span className="text-slate-400 num">({vOut ? c.soldOut : v.quantity})</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-4">
              {cart.length === 0 ? <p className="text-sm text-slate-500">{c.empty}</p> : (
                <ul className="space-y-2">
                  {priced.map(i => (
                    <li key={i.key} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-ink truncate">{i.name}</span>
                        <span className="block text-xs text-slate-500">
                          {i.option && <span className="mr-1.5">{i.option}</span>}
                          <span className="num">{money(i.unit)}</span>{isSmall(i.pricing) && `/${i.unitLabel || c.unit}`}
                        </span>
                        {i.next && <span className="block text-xs font-semibold text-primary">{c.more(i.next.min_qty - i.totalQty, i.unitLabel || c.unit, money(i.next.price), i.next.min_qty)}</span>}
                      </span>
                      <span className="flex items-center border border-line rounded-lg">
                        <button type="button" onClick={() => setQty(i.key, i.quantity - 1)} className="w-9 h-9 lg:w-8 lg:h-8 text-lg" aria-label="-">−</button>
                        <input type="number" min="1" inputMode="numeric" aria-label="Qty" value={i.quantity}
                          onChange={e => { const n = parseInt(e.target.value); if (n > 0) setQty(i.key, n); }} onFocus={e => e.target.select()}
                          className="w-11 text-center num font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                        <button type="button" onClick={() => setQty(i.key, i.quantity + 1)} disabled={i.quantity >= i.max} className="w-9 h-9 lg:w-8 lg:h-8 text-lg disabled:opacity-30" aria-label="+">+</button>
                      </span>
                      <span className="w-24 text-right num font-semibold">{money(i.unit * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Customer, delivery, payment, summary */}
          <section className="min-w-0 space-y-3">
            <h3 className="font-bold text-ink">{c.customer}</h3>
            {(!cust.phone || !cust.address) && <p className="text-xs text-slate-500 bg-canvas rounded-lg px-3 py-2">{c.tip}</p>}
            <div className="grid sm:grid-cols-2 gap-3">
              {field('name', c.name)}
              {field('phone', c.phone, { inputMode: 'tel' })}
            </div>
            {field('address', c.address, { multiline: true })}
            <div className="grid sm:grid-cols-2 gap-3">
              {field('carrier', c.carrier, { list: 'chat-order-carriers' })}
              {field('notes', c.notes)}
            </div>
            <datalist id="chat-order-carriers">{(prefill.carriers || []).map(x => <option key={x} value={x} />)}</datalist>

            <h3 className="font-bold text-ink pt-2">{c.payment}</h3>
            {/* Collect on delivery (with an optional deposit) or already paid in full. */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-canvas" role="radiogroup" aria-label={c.payment}>
              {[[false, c.payCod], [true, c.payFull]].map(([v, l]) => (
                <button key={l} type="button" role="radio" aria-checked={payFull === v} onClick={() => setPayFull(v)}
                  className={`min-h-11 lg:min-h-10 rounded-lg text-sm font-bold transition-colors ${payFull === v
                    ? (v ? 'bg-[#0B7A53] text-white shadow-sm' : 'bg-white text-[#8A4B00] shadow-sm') : 'text-slate-500 hover:text-ink'}`}>{l}</button>
              ))}
            </div>
            <div className={`grid ${payFull ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1">{c.discount}</span>
                <input type="number" min="0" inputMode="numeric" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" className={`${inputCls} border-line num`} />
              </label>
              {!payFull && (
                <label className="block">
                  <span className="block text-xs font-semibold text-slate-600 mb-1">{c.paid}</span>
                  <input type="number" min="0" inputMode="numeric" value={paid} onChange={e => setPaid(e.target.value)} placeholder="0" className={`${inputCls} border-line num`} />
                </label>
              )}
            </div>
            <div className="flex gap-2 text-sm" role="radiogroup" aria-label={c.method}>
              {[['transfer', c.transfer], ['cash', c.cash]].map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={method === v} onClick={() => setMethod(v)}
                  className={`px-3 min-h-9 rounded-lg border font-semibold ${method === v ? 'border-primary bg-gold-soft text-primary-dark' : 'border-line text-slate-600'}`}>{l}</button>
              ))}
            </div>
            <dl className="rounded-lg bg-canvas px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-slate-600">{c.subtotal}</dt><dd className="num">{money(subtotal)}</dd></div>
              {disc > 0 && <div className="flex justify-between"><dt className="text-slate-600">{c.discount}</dt><dd className="num">−{money(disc)}</dd></div>}
              <div className="flex justify-between font-bold text-ink"><dt>{c.total}</dt><dd className="num">{money(total)}</dd></div>
              {payFull || cod <= 0
                ? <div className="flex justify-between font-bold text-[#0B7A53]"><dt>{c.fullPaid}</dt><dd className="num">✓</dd></div>
                : <div className="flex justify-between font-bold text-[#8A4B00]"><dt>{c.cod}</dt><dd className="num">{money(cod)}</dd></div>}
            </dl>

            <label className="flex items-start gap-2 text-sm text-ink pt-1">
              <input type="checkbox" checked={send} onChange={e => setSend(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#0B63E5]" />
              <span>{c.sendSummary} <span className="text-xs text-slate-500">({c.summaryNote})</span></span>
            </label>
            {send && (
              <textarea rows={6} value={summary} onChange={e => { setSummary(e.target.value); setSummaryEdited(true); }}
                className={`${inputCls} border-line resize-y text-sm`} />
            )}
            {error && <p role="alert" className="rounded-lg bg-red-50 text-danger px-3 py-2 text-sm font-semibold">{error}</p>}
          </section>
        </div>
      )}
    </Modal>
  );
}
