'use client';
import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';
import { formatCurrency, localToday } from '../../lib/currency';
import { printReceipt, printShippingLabel } from '../../lib/receipt';
import { Icon, IconButton, Button, Segmented, Modal, Field, SearchInput, Chip, Pill, EmptyState, inputCls } from '../../components/ui';

const COPY = {
  lo: {
    search: 'ຄົ້ນຫາ ຫຼື ຍິງບາໂຄ້ດ ແລ້ວກົດ Enter', all: 'ທັງໝົດ', cart: 'ກະຕ່າ', clear: 'ລ້າງກະຕ່າ',
    retail: 'ລາຄາປົກກະຕິ', wholesale: 'ລາຄາສົ່ງ', member: 'ລາຄາສະມາຊິກ',
    emptyCart: 'ກະຕ່າຍັງວ່າງ', emptyCartText: 'ກົດທີ່ສິນຄ້າ ຫຼື ຍິງບາໂຄ້ດເພື່ອເພີ່ມ',
    noMatch: 'ບໍ່ພົບສິນຄ້າ', noMatchText: 'ລອງຄຳອື່ນ ຫຼື ເລືອກໝວດ "ທັງໝົດ"',
    out: 'ໝົດ', left: n => `ເຫຼືອ ${n}`, options: n => `${n} ຕົວເລືອກ`, preorder: 'ສັ່ງຈອງ',
    subtotal: 'ລວມຍ່ອຍ', discount: 'ສ່ວນຫຼຸດ', total: 'ຍອດລວມ', charge: 'ຊຳລະເງິນ',
    checkout: 'ຊຳລະເງິນ', who: 'ລູກຄ້າ', pay: 'ການຊຳລະ', received: 'ຮັບເງິນມາ', exact: 'ພໍດີ',
    change: 'ເງິນທອນ', short: 'ຍັງຂາດ', coupon: 'ລະຫັດຄູປອງ', apply: 'ໃຊ້', couponOk: d => `ຫຼຸດ ${d}`,
    complete: 'ຢືນຢັນການຂາຍ', saving: 'ກຳລັງບັນທຶກ…', failed: 'ບັນທຶກບໍ່ສຳເລັດ ກວດສອບອິນເຕີເນັດແລ້ວລອງໃໝ່',
    done: 'ຂາຍສຳເລັດ', printReceipt: 'ພິມໃບບິນ', printLabel: 'ພິມໃບປະໜ້າ', newSale: 'ເລີ່ມການຂາຍໃໝ່',
    rate: (c, r) => `1 ${c} = ${r}`, inCurrency: c => `ຍອດເປັນ ${c}`, view: 'ເບິ່ງກະຕ່າ', pick: 'ເລືອກຕົວເລືອກ',
    online: 'ສົ່ງອອນລາຍ', walkin: 'ໜ້າຮ້ານ', optional: 'ບໍ່ບັງຄັບ',
    carrier: 'ຂົນສົ່ງ', carrierPick: 'ເລືອກ ຫຼື ພິມຊື່ຂົນສົ່ງ', carrierNone: 'ຍັງບໍ່ໄດ້ຕັ້ງຂົນສົ່ງ (ຕັ້ງໄດ້ໃນໜ້າຕັ້ງຄ່າ)',
    paidNow: 'ຈ່າຍມາແລ້ວ (ມັດຈຳ)', cod: 'ເກັບປາຍທາງ (COD)', paidFull: 'ຊຳລະຄົບແລ້ວ', existing: 'ຊື້ແລ້ວ',
  },
  th: {
    search: 'ค้นหา หรือยิงบาร์โค้ดแล้วกด Enter', all: 'ทั้งหมด', cart: 'ตะกร้า', clear: 'ล้างตะกร้า',
    retail: 'ราคาปกติ', wholesale: 'ราคาส่ง', member: 'ราคาสมาชิก',
    emptyCart: 'ตะกร้ายังว่าง', emptyCartText: 'แตะที่สินค้าหรือยิงบาร์โค้ดเพื่อเพิ่ม',
    noMatch: 'ไม่พบสินค้า', noMatchText: 'ลองคำอื่น หรือเลือกหมวด "ทั้งหมด"',
    out: 'หมด', left: n => `เหลือ ${n}`, options: n => `${n} ตัวเลือก`, preorder: 'พรีออเดอร์',
    subtotal: 'รวมย่อย', discount: 'ส่วนลด', total: 'ยอดรวม', charge: 'ชำระเงิน',
    checkout: 'ชำระเงิน', who: 'ลูกค้า', pay: 'การชำระเงิน', received: 'รับเงินมา', exact: 'พอดี',
    change: 'เงินทอน', short: 'ยังขาด', coupon: 'โค้ดคูปอง', apply: 'ใช้', couponOk: d => `ลด ${d}`,
    complete: 'ยืนยันการขาย', saving: 'กำลังบันทึก…', failed: 'บันทึกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
    done: 'ขายสำเร็จ', printReceipt: 'พิมพ์ใบเสร็จ', printLabel: 'พิมพ์ใบปะหน้า', newSale: 'เริ่มการขายใหม่',
    rate: (c, r) => `1 ${c} = ${r}`, inCurrency: c => `ยอดเป็น ${c}`, view: 'ดูตะกร้า', pick: 'เลือกตัวเลือก',
    online: 'ส่งออนไลน์', walkin: 'หน้าร้าน', optional: 'ไม่บังคับ',
    carrier: 'ขนส่ง', carrierPick: 'เลือกหรือพิมพ์ชื่อขนส่ง', carrierNone: 'ยังไม่ได้ตั้งขนส่ง (ตั้งได้ในหน้าตั้งค่า)',
    paidNow: 'จ่ายมาแล้ว (มัดจำ)', cod: 'เก็บปลายทาง (COD)', paidFull: 'ชำระครบแล้ว', existing: 'ซื้อแล้ว',
  },
  en: {
    search: 'Search or scan a barcode, then press Enter', all: 'All', cart: 'Cart', clear: 'Clear cart',
    retail: 'Retail', wholesale: 'Wholesale', member: 'Member',
    emptyCart: 'Cart is empty', emptyCartText: 'Tap a product or scan a barcode to add it',
    noMatch: 'No products found', noMatchText: 'Try another word or choose "All"',
    out: 'Sold out', left: n => `${n} left`, options: n => `${n} options`, preorder: 'Pre-order',
    subtotal: 'Subtotal', discount: 'Discount', total: 'Total', charge: 'Charge',
    checkout: 'Checkout', who: 'Customer', pay: 'Payment', received: 'Cash received', exact: 'Exact',
    change: 'Change', short: 'Still owed', coupon: 'Coupon code', apply: 'Apply', couponOk: d => `${d} off`,
    complete: 'Complete sale', saving: 'Saving…', failed: "The sale wasn't saved. Check your connection and try again.",
    done: 'Sale complete', printReceipt: 'Print receipt', printLabel: 'Print shipping label', newSale: 'New sale',
    rate: (c, r) => `1 ${c} = ${r}`, inCurrency: c => `Total in ${c}`, view: 'View cart', pick: 'Choose an option',
    online: 'Online delivery', walkin: 'In store', optional: 'optional',
    carrier: 'Carrier', carrierPick: 'Pick or type a carrier', carrierNone: 'No carriers set yet (add them in Settings)',
    paidNow: 'Paid now (deposit)', cod: 'Collect on delivery (COD)', paidFull: 'Paid in full', existing: 'orders',
  },
};

const STEPS = { LAK: [10000, 50000, 100000], THB: [100, 500, 1000], USD: [10, 50, 100], CNY: [10, 50, 100] };

function sellable(p, today) {
  const okStatus = !p.status || p.status === 'active' || p.status === 'pre_order';
  const end = p.sale_end_date ? String(p.sale_end_date).slice(0, 10) : '';
  return okStatus && (!end || end >= today);
}

export default function POSPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const searchRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [shop, setShop] = useState({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [customerType, setCustomerType] = useState('retail');
  const [discount, setDiscount] = useState(0);
  const [variantPicker, setVariantPicker] = useState(null);
  const [mobileCart, setMobileCart] = useState(false);

  const [checkout, setCheckout] = useState(false);
  const [orderType, setOrderType] = useState('walk_in');
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [custMatches, setCustMatches] = useState([]);
  const [pickedPhone, setPickedPhone] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [carrier, setCarrier] = useState('');
  const [currency, setCurrency] = useState('LAK');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [received, setReceived] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponError, setCouponError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [lastSale, setLastSale] = useState(null);

  useEffect(() => {
    loadProducts();
    fetch('/api/currencies').then(r => r.json()).then(d => setCurrencies(d.currencies || [])).catch(() => {});
    fetch('/api/shop-settings').then(r => r.json()).then(d => {
      setShop(d);
      if (d.default_order_type) setOrderType(d.default_order_type);
    }).catch(() => {});
    if (window.matchMedia('(min-width: 1024px)').matches) searchRef.current?.focus();
  }, []);

  async function loadProducts() {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      const today = localToday();
      setProducts(Array.isArray(data) ? data.filter(p => sellable(p, today)) : []);
    } catch {} finally { setLoaded(true); }
  }

  function nameOf(p) {
    if (lang === 'lo') return p.name_lo || p.name_en || p.name_th;
    if (lang === 'th') return p.name_th || p.name_en || p.name_lo;
    return p.name_en || p.name_lo || p.name_th;
  }

  const categories = useMemo(() => {
    const counts = {};
    for (const p of products) if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return [p.name_lo, p.name_th, p.name_en, p.sku, p.barcode].some(v => v && String(v).toLowerCase().includes(q));
    });
  }, [products, search, category]);

  const qtyInCart = useMemo(() => {
    const m = {};
    for (const i of cart) m[i.product_id] = (m[i.product_id] || 0) + i.quantity;
    return m;
  }, [cart]);

  function stockOf(p) {
    return Number(p.stock_in_stock) || 0;
  }

  function priceOf(prices, type = customerType) {
    if (type === 'wholesale' && prices.wholesale > 0) return prices.wholesale;
    if (type === 'member' && prices.member > 0) return prices.member;
    return prices.retail;
  }

  function addToCart(product, variant) {
    const key = variant ? `${product.id}-v${variant.id}` : `${product.id}`;
    const preorder = product.status === 'pre_order';
    const max = preorder ? Infinity : variant ? Number(variant.quantity) || 0 : stockOf(product);
    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => (i.key === key ? { ...i, quantity: Math.min(i.quantity + 1, i.max) } : i));
      }
      if (max <= 0) return prev;
      return [...prev, {
        key,
        product_id: product.id,
        variant_id: variant?.id || null,
        name: nameOf(product),
        variant: variant ? [variant.color, variant.size].filter(Boolean).join(' / ') : '',
        sku: product.sku + (variant?.sku_suffix || ''),
        prices: {
          retail: Number(product.selling_price_lak) || 0,
          wholesale: Number(product.wholesale_price_lak) || 0,
          member: Number(product.member_price_lak) || 0,
        },
        quantity: 1,
        max,
      }];
    });
    setVariantPicker(null);
  }

  function pickProduct(p) {
    if (p.has_variants && p.variants?.length) setVariantPicker(p);
    else addToCart(p, null);
  }

  function setQty(key, qty) {
    setCart(prev => (qty <= 0 ? prev.filter(i => i.key !== key) : prev.map(i => (i.key === key ? { ...i, quantity: Math.min(qty, i.max) } : i))));
  }

  // Enter in the search box: exact SKU / barcode adds straight to the cart (works with USB barcode scanners).
  function onSearchKey(e) {
    if (e.key !== 'Enter') return;
    const q = search.trim().toLowerCase();
    if (!q) return;
    for (const p of products) {
      for (const v of p.variants || []) {
        if ((p.sku + (v.sku_suffix || '')).toLowerCase() === q) {
          addToCart(p, v);
          setSearch('');
          return;
        }
      }
    }
    const exact = products.find(p => String(p.sku || '').toLowerCase() === q || String(p.barcode || '').toLowerCase() === q);
    const target = exact || (visible.length === 1 ? visible[0] : null);
    if (target) {
      pickProduct(target);
      setSearch('');
    }
  }

  const lines = cart.map(i => ({ ...i, unit: priceOf(i.prices) }));
  const subtotal = lines.reduce((s, i) => s + i.unit * i.quantity, 0);
  const couponOff = coupon ? coupon.discount : 0;
  const total = Math.max(0, subtotal - (Number(discount) || 0) - couponOff);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  // A coupon validated against an old cart total is no longer trustworthy.
  useEffect(() => { setCoupon(null); setCouponError(''); }, [subtotal]);

  // While typing a phone, suggest existing customers so the rest fills in automatically.
  useEffect(() => {
    const phone = customer.phone.replace(/\D/g, '');
    if (!checkout || phone.length < 5 || phone === pickedPhone) { setCustMatches([]); return; }
    const id = setTimeout(async () => {
      try {
        const data = await fetch(`/api/customers?search=${encodeURIComponent(phone)}`).then(r => r.json());
        setCustMatches((Array.isArray(data) ? data : [])
          .filter(x => String(x.phone || '').replace(/\D/g, '').includes(phone)).slice(0, 5));
      } catch { setCustMatches([]); }
    }, 300);
    return () => clearTimeout(id);
  }, [customer.phone, checkout, pickedPhone]);

  function pickCustomer(x) {
    setCustomer({ name: x.name || '', phone: x.phone || customer.phone, address: x.address || '' });
    setPickedPhone(String(x.phone || customer.phone).replace(/\D/g, ''));
    setCustMatches([]);
  }

  const currencyOptions = useMemo(() => {
    const codes = currencies.map(x => x.code);
    const list = ['LAK', ...codes.filter(x => x !== 'LAK')];
    return list.map(code => ({ value: code, label: code }));
  }, [currencies]);
  const rate = currency === 'LAK' ? 1 : Number(currencies.find(x => x.code === currency)?.rate_to_lak) || 1;
  const due = total / rate;
  const receivedNum = parseFloat(received) || 0;
  const changeDue = receivedNum - due;
  // Online orders: whatever is not paid now is collected on delivery (COD).
  const codDue = Math.max(0, due - receivedNum);
  const carriers = useMemo(
    () => String(shop.shipping_carriers || '').split('\n').map(s => s.trim()).filter(Boolean),
    [shop.shipping_carriers]
  );

  const quickAmounts = useMemo(() => {
    if (!(due > 0)) return [];
    const exact = Math.round(due * 100) / 100;
    const ups = (STEPS[currency] || STEPS.USD).map(step => Math.ceil(due / step) * step);
    return [...new Set([exact, ...ups])].filter(v => v >= due).slice(0, 4);
  }, [due, currency]);

  async function applyCoupon() {
    setCouponError('');
    if (!couponCode.trim()) return;
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      const data = await res.json();
      if (res.ok && data.valid) setCoupon({ code: couponCode.trim().toUpperCase(), discount: Number(data.discount) || 0 });
      else { setCoupon(null); setCouponError(data.error || 'Invalid'); }
    } catch {
      setCouponError(c.failed);
    }
  }

  function openCheckout() {
    setSaveError('');
    setReceived('');
    setMobileCart(false);
    setCheckout(true);
  }

  async function completeSale() {
    if (saving || cart.length === 0) return;
    setSaving(true);
    setSaveError('');
    const conv = v => (currency === 'LAK' ? v : v / rate);
    const body = {
      customer_name: customer.name.trim(),
      customer_phone: customer.phone.trim(),
      customer_address: orderType === 'online' ? customer.address.trim() : '',
      coupon_code: coupon?.code || '',
      coupon_discount: couponOff,
      subtotal: conv(subtotal),
      discount: conv((Number(discount) || 0) + couponOff),
      tax: 0,
      total: conv(total),
      currency,
      payment_method: paymentMethod,
      order_type: orderType,
      delivery_date: orderType === 'online' ? deliveryDate || null : null,
      shipping_notes: orderType === 'online' ? shippingNotes : '',
      shipping_carrier: orderType === 'online' ? carrier.trim() : '',
      // In the order currency. Server caps at total and forces full payment for walk-in.
      amount_paid: orderType === 'online' ? receivedNum : conv(total),
      items: lines.map(i => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
        unit_price: conv(i.unit),
        total: conv(i.unit * i.quantity),
      })),
    };
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('save failed');
      const order = await res.json();
      order.items = (order.items || []).map((oi, idx) => ({ ...oi, name: lines[idx]?.name, variant_color: lines[idx]?.variant }));
      setLastSale({ order, received: orderType === 'walk_in' && paymentMethod === 'cash' && receivedNum > 0 ? receivedNum : null });
      setCheckout(false);
      setCart([]);
      setDiscount(0);
      setCustomer({ name: '', phone: '', address: '' });
      setCustMatches([]);
      setPickedPhone('');
      setDeliveryDate('');
      setShippingNotes('');
      setCarrier('');
      setCouponCode('');
      setCoupon(null);
      setReceived('');
      loadProducts();
    } catch {
      setSaveError(c.failed);
    } finally {
      setSaving(false);
    }
  }

  function newSale() {
    setLastSale(null);
    setCurrency('LAK');
    if (window.matchMedia('(min-width: 1024px)').matches) setTimeout(() => searchRef.current?.focus(), 50);
  }

  const ticket = (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 pt-5 pb-4 border-b border-line space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink text-lg">
            {c.cart} {itemCount > 0 && <span className="text-slate-400 font-semibold num">({itemCount})</span>}
          </h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-sm text-slate-500 hover:text-danger">{c.clear}</button>
          )}
        </div>
        <Segmented size="sm" value={customerType} onChange={setCustomerType}
          options={[{ value: 'retail', label: c.retail }, { value: 'wholesale', label: c.wholesale }, { value: 'member', label: c.member }]} />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {lines.length === 0 ? (
          <EmptyState icon="ticket" title={c.emptyCart} text={c.emptyCartText} />
        ) : (
          <ul className="divide-y divide-line">
            {lines.map(i => (
              <li key={i.key} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink text-[0.92rem] leading-snug">{i.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {i.variant && <span>{i.variant} </span>}
                      <span className="num">{formatCurrency(i.unit, 'LAK')}</span>
                    </p>
                  </div>
                  <p className="font-bold text-ink num text-[0.92rem] shrink-0">{formatCurrency(i.unit * i.quantity, 'LAK')}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-lg border border-line">
                    <button onClick={() => setQty(i.key, i.quantity - 1)} aria-label="−1" className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-canvas rounded-l-lg">
                      <Icon name="minus" className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <span className="w-9 text-center text-sm font-bold num">{i.quantity}</span>
                    <button onClick={() => setQty(i.key, i.quantity + 1)} disabled={i.quantity >= i.max} aria-label="+1"
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-canvas rounded-r-lg disabled:opacity-30">
                      <Icon name="plus" className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                  <IconButton icon="trash" label={t('delete', lang)} tone="danger" onClick={() => setQty(i.key, 0)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line px-5 py-3.5 space-y-2 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>{c.subtotal}</span>
          <span className="num font-semibold text-ink">{formatCurrency(subtotal, 'LAK')}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <span>{c.discount}</span>
          <input aria-label={c.discount} type="number" min="0" inputMode="numeric" value={discount || ''} placeholder="0"
            onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-36 px-3 py-1.5 border rounded-lg text-right num" />
        </div>
      </div>

      <div className="bg-ink text-white px-5 py-4 flex items-end justify-between gap-3">
        <span className="text-sm text-slate-400 pb-1">{c.total}</span>
        <span className="text-[1.9rem] leading-none font-extrabold text-gold num tracking-tight">{formatCurrency(total, 'LAK')}</span>
      </div>
      <div className="p-4 bg-ink">
        <Button tone="gold" size="lg" className="w-full" onClick={openCheckout} disabled={cart.length === 0}>
          {c.charge}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="-m-4 lg:-m-6 lg:h-[calc(100%+3rem)] flex">
      <section className="flex-1 min-w-0 flex flex-col p-4 lg:p-6 pb-[calc(10rem+env(safe-area-inset-bottom))] lg:pb-6">
        <SearchInput inputRef={searchRef} value={search} onChange={setSearch} onKeyDown={onSearchKey} placeholder={c.search} />

        {categories.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            <Chip active={!category} onClick={() => setCategory('')} count={products.length}>{c.all}</Chip>
            {categories.map(([name, count]) => (
              <Chip key={name} active={category === name} onClick={() => setCategory(name)} count={count}>{name}</Chip>
            ))}
          </div>
        )}

        <div className="mt-4 flex-1 lg:overflow-y-auto min-h-0">
          {!loaded ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3" aria-busy="true">
              {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-[3/4] rounded-xl bg-white animate-pulse" />)}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon="search" title={c.noMatch} text={c.noMatchText} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {visible.map(p => {
                const stock = stockOf(p);
                const preorder = p.status === 'pre_order';
                const soldOut = !preorder && stock <= 0;
                const inCart = qtyInCart[p.id] || 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => !soldOut && pickProduct(p)}
                    disabled={soldOut}
                    className={`group text-left bg-white rounded-xl border overflow-hidden transition-colors ${
                      inCart ? 'border-gold ring-1 ring-gold' : 'border-line hover:border-slate-300'
                    } ${soldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="relative aspect-[4/5] bg-canvas">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" loading="lazy" className="w-full h-full object-cover"
                          onError={e => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Icon name="image" className="w-9 h-9" strokeWidth={1.3} />
                        </div>
                      )}
                      {inCart > 0 && (
                        <span className="absolute top-2 left-2 min-w-7 h-7 px-2 rounded-full bg-gold text-ink text-sm font-extrabold flex items-center justify-center num shadow-sm">
                          {inCart}
                        </span>
                      )}
                      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                        {preorder && <Pill tone="gold">{c.preorder}</Pill>}
                        {p.has_variants && p.variants?.length > 0 && <Pill tone="navy">{c.options(p.variants.length)}</Pill>}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[0.88rem] font-semibold text-ink leading-snug line-clamp-2 min-h-[2.5em]">{nameOf(p)}</p>
                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="font-extrabold text-primary num">{formatCurrency(priceOf({
                          retail: Number(p.selling_price_lak) || 0,
                          wholesale: Number(p.wholesale_price_lak) || 0,
                          member: Number(p.member_price_lak) || 0,
                        }), 'LAK')}</span>
                        {!preorder && (
                          <span className={`text-xs num shrink-0 ${soldOut ? 'text-danger font-semibold' : stock <= 5 ? 'text-warning font-semibold' : 'text-slate-400'}`}>
                            {soldOut ? c.out : c.left(stock)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <aside className="hidden lg:flex w-[390px] shrink-0 bg-white border-l border-line flex-col no-print">{ticket}</aside>

      {/* Phones and tablets: cart lives in a bottom bar that opens a sheet. */}
      <div className="lg:hidden fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 bg-ink text-white px-4 py-3 flex items-center gap-3 no-print shadow-[0_-6px_16px_-8px_rgba(14,26,51,.35)]">
        <button onClick={() => setMobileCart(true)} className="flex-1 text-left min-w-0">
          <span className="block text-xs text-slate-400">{c.view} <span className="num">({itemCount})</span></span>
          <span className="block text-xl font-extrabold text-gold num truncate">{formatCurrency(total, 'LAK')}</span>
        </button>
        <Button tone="gold" onClick={openCheckout} disabled={cart.length === 0}>{c.charge}</Button>
      </div>
      {mobileCart && (
        <div className="lg:hidden fixed inset-0 z-40 no-print">
          <div className="absolute inset-0 bg-ink/55" onClick={() => setMobileCart(false)} aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 top-16 bg-white rounded-t-2xl overflow-hidden">
            <IconButton icon="close" label="Close" onClick={() => setMobileCart(false)} className="absolute top-4 right-3 z-10" />
            {ticket}
          </div>
        </div>
      )}

      <Modal open={!!variantPicker} onClose={() => setVariantPicker(null)} title={variantPicker ? nameOf(variantPicker) : ''} description={c.pick}>
        {variantPicker && (() => {
          const label1 = variantPicker.variant_label_1 || t('color', lang);
          const label2 = variantPicker.variant_label_2 || t('size', lang);
          const groups = {};
          for (const v of variantPicker.variants || []) (groups[v.color || '-'] ||= []).push(v);
          return (
            <div className="space-y-5">
              {Object.entries(groups).map(([color, vs]) => (
                <div key={color}>
                  <p className="text-sm text-slate-500 mb-2">{label1}: <span className="font-semibold text-ink">{color}</span></p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {vs.map(v => {
                      const none = variantPicker.status !== 'pre_order' && (Number(v.quantity) || 0) <= 0;
                      return (
                        <button key={v.id} disabled={none} onClick={() => addToCart(variantPicker, v)}
                          aria-label={`${label2} ${v.size || '-'}`}
                          className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                            none ? 'border-line bg-canvas opacity-50 cursor-not-allowed' : 'border-line hover:border-gold hover:bg-gold-soft'
                          }`}>
                          <span className="block font-bold text-ink">{v.size || '-'}</span>
                          <span className={`block text-xs mt-0.5 num ${none ? 'text-danger' : 'text-slate-500'}`}>
                            {none ? c.out : c.left(v.quantity)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Modal>

      <Modal open={checkout} onClose={() => !saving && setCheckout(false)} title={c.checkout} size="xl"
        footer={
          <div className="w-full flex flex-col-reverse sm:flex-row sm:items-center gap-3">
            {saveError ? <p role="alert" className="text-sm text-danger flex-1">{saveError}</p> : <span className="flex-1" />}
            <Button tone="ghost" onClick={() => setCheckout(false)} disabled={saving}>{t('cancel', lang)}</Button>
            <Button tone="gold" size="lg" onClick={completeSale} disabled={saving || cart.length === 0}>
              {saving ? c.saving : <>{c.complete}<span className="num font-extrabold">{formatCurrency(due, currency)}</span></>}
            </Button>
          </div>
        }>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-bold text-ink">{c.who}</h3>
            <Segmented value={orderType} onChange={setOrderType}
              options={[{ value: 'walk_in', label: c.walkin }, { value: 'online', label: c.online }]} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('customer_name', lang)}>
                <input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className={inputCls} />
              </Field>
              <Field label={t('customer_phone', lang)}>
                <div className="relative">
                  <input type="tel" inputMode="tel" value={customer.phone}
                    onChange={e => { setCustomer({ ...customer, phone: e.target.value }); setPickedPhone(''); }}
                    className={`${inputCls} num`} autoComplete="off" />
                  {custMatches.length > 0 && customer.phone.replace(/\D/g, '') !== pickedPhone && (
                    <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-line rounded-xl shadow-lg overflow-hidden">
                      {custMatches.map(x => (
                        <li key={x.id}>
                          <button type="button" onClick={() => pickCustomer(x)}
                            className="w-full text-left px-3 py-2 hover:bg-canvas flex items-center justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block font-semibold text-ink truncate">{x.name || x.phone}</span>
                              <span className="block text-xs text-slate-500 num">{x.phone}, {c.existing} {x.order_count || 0}</span>
                            </span>
                            <Icon name="user" className="w-4 h-4 text-gold-dark shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Field>
            </div>
            {orderType === 'online' && (
              <>
                <Field label={t('customer_address', lang)}>
                  <textarea rows={2} value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('delivery_date', lang)}>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label={t('shipping_notes', lang)}>
                    <input value={shippingNotes} onChange={e => setShippingNotes(e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <Field label={c.carrier}>
                  <input list="pos-carriers" value={carrier} onChange={e => setCarrier(e.target.value)}
                    placeholder={c.carrierPick} className={inputCls} />
                  <datalist id="pos-carriers">
                    {carriers.map(x => <option key={x} value={x} />)}
                  </datalist>
                  {carriers.length === 0 && <span className="mt-1 block text-xs text-slate-400">{c.carrierNone}</span>}
                </Field>
              </>
            )}
            <div>
              <Field label={c.coupon}>
                <div className="flex gap-2">
                  <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCoupon(null); setCouponError(''); }}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()} className={`${inputCls} uppercase`} />
                  <Button tone="ghost" onClick={applyCoupon} disabled={!couponCode.trim()}>{c.apply}</Button>
                </div>
              </Field>
              {coupon && <p className="mt-1.5 text-sm text-success font-semibold">{c.couponOk(formatCurrency(coupon.discount, 'LAK'))}</p>}
              {couponError && <p className="mt-1.5 text-sm text-danger">{couponError}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-ink">{c.pay}</h3>
            <Segmented value={currency} onChange={v => { setCurrency(v); setReceived(''); }} options={currencyOptions} />
            <Segmented value={paymentMethod} onChange={setPaymentMethod}
              options={[{ value: 'cash', label: t('cash', lang) }, { value: 'transfer', label: t('transfer', lang) }]} />

            <div className="rounded-xl bg-ink text-white p-5">
              <div className="flex items-end justify-between gap-3">
                <span className="text-sm text-slate-400">{currency === 'LAK' ? c.total : c.inCurrency(currency)}</span>
                <span className="text-3xl font-extrabold text-gold num leading-none">{formatCurrency(due, currency)}</span>
              </div>
              {currency !== 'LAK' && (
                <p className="mt-2 text-right text-xs text-slate-400 num">
                  {formatCurrency(total, 'LAK')} ({c.rate(currency, formatCurrency(rate, 'LAK'))})
                </p>
              )}
              {(subtotal !== total) && (
                <p className="mt-1 text-right text-xs text-slate-400 num">
                  {c.subtotal} {formatCurrency(subtotal, 'LAK')} − {formatCurrency(subtotal - total, 'LAK')}
                </p>
              )}
            </div>

            {orderType === 'online' ? (
              <div>
                {/* Deposit paid now; the rest is collected on delivery. */}
                <Field label={c.paidNow}>
                  <input type="number" min="0" inputMode="decimal" value={received} onChange={e => setReceived(e.target.value)}
                    placeholder="0" className={`${inputCls} text-right text-xl font-bold num`} />
                </Field>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setReceived(String(Math.round(due * 100) / 100))}
                    className="px-3 py-1.5 rounded-lg border border-line text-sm font-semibold text-ink hover:border-gold hover:bg-gold-soft num">
                    {c.paidFull}
                  </button>
                  <button type="button" onClick={() => setReceived('')}
                    className="px-3 py-1.5 rounded-lg border border-line text-sm font-semibold text-ink hover:border-gold hover:bg-gold-soft">
                    COD
                  </button>
                </div>
                <div className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ${codDue > 0 ? 'bg-gold-soft text-[#0950C2]' : 'bg-[#E3F5EC] text-[#0B6B49]'}`}>
                  <span className="font-semibold">{codDue > 0 ? c.cod : c.paidFull}</span>
                  {codDue > 0 && <span className="text-xl font-extrabold num">{formatCurrency(codDue, currency)}</span>}
                </div>
              </div>
            ) : paymentMethod === 'cash' ? (
              <div>
                <Field label={c.received}>
                  <input type="number" min="0" inputMode="decimal" value={received} onChange={e => setReceived(e.target.value)}
                    placeholder="0" className={`${inputCls} text-right text-xl font-bold num`} />
                </Field>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickAmounts.map((v, i) => (
                    <button key={v} type="button" onClick={() => setReceived(String(v))}
                      className="px-3 py-1.5 rounded-lg border border-line text-sm font-semibold text-ink hover:border-gold hover:bg-gold-soft num">
                      {i === 0 ? `${c.exact} ` : ''}{formatCurrency(v, currency)}
                    </button>
                  ))}
                </div>
                {received !== '' && (
                  <div className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ${changeDue >= 0 ? 'bg-[#E3F5EC] text-[#0B6B49]' : 'bg-red-50 text-danger'}`}>
                    <span className="font-semibold">{changeDue >= 0 ? c.change : c.short}</span>
                    <span className="text-xl font-extrabold num">{formatCurrency(Math.abs(changeDue), currency)}</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal open={!!lastSale} onClose={newSale} size="sm">
        {lastSale && (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#E3F5EC] text-success flex items-center justify-center">
              <Icon name="check" className="w-7 h-7" strokeWidth={2.4} />
            </div>
            <p className="mt-4 text-lg font-bold text-ink">{c.done}</p>
            <p className="text-sm text-slate-500 num">{lastSale.order.order_number}</p>
            <p className="mt-3 text-3xl font-extrabold text-ink num">{formatCurrency(lastSale.order.total, lastSale.order.currency)}</p>
            {lastSale.received != null && (
              <p className="mt-1 text-sm text-slate-600 num">
                {c.change} <strong>{formatCurrency(Math.max(0, lastSale.received - lastSale.order.total), lastSale.order.currency)}</strong>
              </p>
            )}
            <div className="mt-6 grid gap-2">
              {lastSale.order.order_type === 'online' ? (
                <>
                  {/* Online: the parcel label is the main document */}
                  <Button tone="primary" icon="truck" onClick={() => printShippingLabel(lastSale.order, shop, lang)}>{c.printLabel}</Button>
                  <Button tone="ghost" icon="print" onClick={() => printReceipt(lastSale.order, shop, lang)}>{c.printReceipt}</Button>
                </>
              ) : (
                <Button tone="primary" icon="print" onClick={() => printReceipt(lastSale.order, shop, lang, { received: lastSale.received })}>
                  {c.printReceipt}
                </Button>
              )}
              <Button tone="gold" onClick={newSale}>{c.newSale}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
