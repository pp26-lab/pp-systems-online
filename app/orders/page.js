'use client';
import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';
import { formatCurrency } from '../../lib/currency';
import { printReceipt, printShippingLabel } from '../../lib/receipt';
import { waNumber, fillTemplate } from '../../lib/whatsapp';
import { Icon, Button, Modal, Field, SearchInput, Chip, Pill, EmptyState, Toolbar, Segmented, inputCls, card } from '../../components/ui';

const COPY = {
  lo: {
    search: 'ຄົ້ນຫາເລກອໍເດີ້ ຊື່ ຫຼື ເບີໂທ', today: 'ມື້ນີ້', week: 'ອາທິດນີ້', month: 'ເດືອນນີ້', all: 'ທັງໝົດ',
    anyChannel: 'ທຸກຊ່ອງທາງ', walkin: 'ໜ້າຮ້ານ', online: 'ອອນລາຍ', guest: 'ລູກຄ້າໜ້າຮ້ານ',
    pending: 'ລໍຖ້າຈັດສົ່ງ', shipping: 'ກຳລັງຈັດສົ່ງ', completed: 'ສຳເລັດ', cancelled: 'ຍົກເລີກ',
    empty: 'ບໍ່ມີອໍເດີ້ໃນຊ່ວງນີ້', emptyText: 'ລອງເລືອກຊ່ວງເວລາອື່ນ ຫຼື ລ້າງຕົວກອງ',
    pick: 'ເລືອກອໍເດີ້ເພື່ອເບິ່ງລາຍລະອຽດ', steps: ['ສັ່ງຊື້', 'ຈັດສົ່ງແລ້ວ', 'ສົ່ງສຳເລັດ'],
    markShipped: 'ຢືນຢັນຈັດສົ່ງແລ້ວ', markDelivered: 'ຢືນຢັນສົ່ງສຳເລັດ', cancel: 'ຍົກເລີກອໍເດີ້',
    cancelAsk: 'ຍົກເລີກອໍເດີ້ນີ້? ສະຕ໋ອກຈະຖືກຄືນ ແລະ ເປີດຄືນບໍ່ໄດ້', cancelled: 'ອໍເດີ້ນີ້ຖືກຍົກເລີກແລ້ວ',
    customer: 'ລູກຄ້າ', shipTo: 'ທີ່ຢູ່ຈັດສົ່ງ', delivery: 'ວັນຈັດສົ່ງ', notes: 'ໝາຍເຫດຈັດສົ່ງ',
    tracking: 'ຕິດຕາມພັດສະດຸ', carrier: 'ບໍລິສັດຂົນສົ່ງ', trackNo: 'ເລກພັດສະດຸ', save: 'ບັນທຶກ', saved: 'ບັນທຶກແລ້ວ',
    items: 'ລາຍການສິນຄ້າ', subtotal: 'ລວມຍ່ອຍ', discount: 'ສ່ວນຫຼຸດ', total: 'ຍອດລວມ', paidBy: 'ຊຳລະໂດຍ',
    slip: 'ສະລິບໂອນເງິນ', uploadSlip: 'ອັບໂຫຼດສະລິບ', replace: 'ປ່ຽນຮູບ', internal: 'ໂນດພາຍໃນ (ລູກຄ້າບໍ່ເຫັນ)',
    receipt: 'ພິມໃບບິນ', label: 'ພິມໃບປະໜ້າ', whatsapp: 'ສົ່ງ WhatsApp', noPhone: 'ອໍເດີ້ນີ້ບໍ່ມີເບີໂທລູກຄ້າ',
    failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ', orders: n => `${n} ອໍເດີ້`,
  },
  th: {
    search: 'ค้นหาเลขออเดอร์ ชื่อ หรือเบอร์โทร', today: 'วันนี้', week: 'สัปดาห์นี้', month: 'เดือนนี้', all: 'ทั้งหมด',
    anyChannel: 'ทุกช่องทาง', walkin: 'หน้าร้าน', online: 'ออนไลน์', guest: 'ลูกค้าหน้าร้าน',
    pending: 'รอจัดส่ง', shipping: 'กำลังจัดส่ง', completed: 'สำเร็จ', cancelled: 'ยกเลิก',
    empty: 'ไม่มีออเดอร์ในช่วงนี้', emptyText: 'ลองเลือกช่วงเวลาอื่น หรือล้างตัวกรอง',
    pick: 'เลือกออเดอร์เพื่อดูรายละเอียด', steps: ['สั่งซื้อ', 'จัดส่งแล้ว', 'ส่งสำเร็จ'],
    markShipped: 'ยืนยันจัดส่งแล้ว', markDelivered: 'ยืนยันส่งสำเร็จ', cancel: 'ยกเลิกออเดอร์',
    cancelAsk: 'ยกเลิกออเดอร์นี้? สต็อกจะถูกคืน และเปิดกลับไม่ได้', cancelled: 'ออเดอร์นี้ถูกยกเลิกแล้ว',
    customer: 'ลูกค้า', shipTo: 'ที่อยู่จัดส่ง', delivery: 'วันจัดส่ง', notes: 'หมายเหตุจัดส่ง',
    tracking: 'ติดตามพัสดุ', carrier: 'บริษัทขนส่ง', trackNo: 'เลขพัสดุ', save: 'บันทึก', saved: 'บันทึกแล้ว',
    items: 'รายการสินค้า', subtotal: 'รวมย่อย', discount: 'ส่วนลด', total: 'ยอดรวม', paidBy: 'ชำระโดย',
    slip: 'สลิปโอนเงิน', uploadSlip: 'อัปโหลดสลิป', replace: 'เปลี่ยนรูป', internal: 'โน้ตภายใน (ลูกค้าไม่เห็น)',
    receipt: 'พิมพ์ใบเสร็จ', label: 'พิมพ์ใบปะหน้า', whatsapp: 'ส่ง WhatsApp', noPhone: 'ออเดอร์นี้ไม่มีเบอร์ลูกค้า',
    failed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง', orders: n => `${n} ออเดอร์`,
  },
  en: {
    search: 'Search order number, name or phone', today: 'Today', week: 'This week', month: 'This month', all: 'All time',
    anyChannel: 'All channels', walkin: 'In store', online: 'Online', guest: 'Walk-in customer',
    pending: 'To ship', shipping: 'Shipped', completed: 'Completed', cancelled: 'Cancelled',
    empty: 'No orders in this period', emptyText: 'Pick another period or clear the filters',
    pick: 'Select an order to see its details', steps: ['Ordered', 'Shipped', 'Delivered'],
    markShipped: 'Mark as shipped', markDelivered: 'Mark as delivered', cancel: 'Cancel order',
    cancelAsk: 'Cancel this order? Stock is returned and the order cannot be reopened.', cancelled: 'This order was cancelled',
    customer: 'Customer', shipTo: 'Ship to', delivery: 'Delivery date', notes: 'Delivery note',
    tracking: 'Tracking', carrier: 'Carrier', trackNo: 'Tracking number', save: 'Save', saved: 'Saved',
    items: 'Items', subtotal: 'Subtotal', discount: 'Discount', total: 'Total', paidBy: 'Paid by',
    slip: 'Transfer slip', uploadSlip: 'Upload slip', replace: 'Replace', internal: 'Internal note (customer never sees it)',
    receipt: 'Print receipt', label: 'Print shipping label', whatsapp: 'Send on WhatsApp', noPhone: 'This order has no customer phone',
    failed: "Couldn't save. Try again.", orders: n => `${n} ${n === 1 ? 'order' : 'orders'}`,
  },
};

const STATUS_TONE = { pending: 'gold', shipping: 'navy', completed: 'green', cancelled: 'gray' };

function toMysqlUtc(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function rangeFor(preset) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  if (preset === 'today') return [new Date(now.getFullYear(), now.getMonth(), now.getDate()), end];
  if (preset === 'week') return [new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)), end];
  if (preset === 'month') return [new Date(now.getFullYear(), now.getMonth(), 1), end];
  return [null, null];
}

function dateOnly(v) {
  return v ? String(v).slice(0, 10) : '';
}

export default function OrdersPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState({});
  const [preset, setPreset] = useState('today');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [mobileDetail, setMobileDetail] = useState(false);

  const [linked, setLinked] = useState(null); // order number from ?q= (e.g. from a customer's history)

  useEffect(() => {
    fetch('/api/shop-settings').then(r => r.json()).then(setShop).catch(() => {});
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) { setSearch(q); setPreset('all'); setLinked(q); }
  }, []);
  useEffect(() => {
    load();
    // New sales from the POS (or the bot) show up without a manual refresh.
    const refresh = () => { if (document.visibilityState === 'visible') load(true); };
    const id = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [preset, channel]);
  useEffect(() => {
    if (!linked) return;
    const hit = orders.find(o => o.order_number === linked);
    if (hit) { setLinked(null); select(hit); }
  }, [orders, linked]);

  const loadSeq = useRef(0);
  async function load(quiet = false) {
    const seq = ++loadSeq.current;
    if (!quiet) setLoading(true);
    const params = new URLSearchParams();
    if (channel) params.set('order_type', channel);
    const [from, to] = rangeFor(preset);
    if (from) params.set('from', toMysqlUtc(from));
    if (to) params.set('to', toMysqlUtc(to));
    try {
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      if (seq === loadSeq.current) setOrders(Array.isArray(data) ? data : []);
    } catch {
      if (seq === loadSeq.current && !quiet) setOrders([]);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const m = { pending: 0, shipping: 0, completed: 0, cancelled: 0 };
    for (const o of orders) m[o.status] = (m[o.status] || 0) + 1;
    return m;
  }, [orders]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (status && o.status !== status) return false;
      if (!q) return true;
      return [o.order_number, o.customer_name, o.customer_phone].some(v => v && String(v).toLowerCase().includes(q));
    });
  }, [orders, status, search]);

  const selected = orders.find(o => o.id === selectedId) || null;

  function select(o) {
    setSelectedId(o.id);
    if (!window.matchMedia('(min-width: 1024px)').matches) setMobileDetail(true);
  }

  async function patch(id, body) {
    const res = await fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) throw new Error('failed');
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, ...body } : o)));
  }

  const detail = selected && (
    <OrderDetail key={selected.id} order={selected} c={c} lang={lang} shop={shop} onPatch={patch} />
  );

  return (
    <div className="max-w-7xl">
      <Toolbar actions={
        <Segmented size="sm" value={channel} onChange={setChannel} className="w-full sm:w-auto"
          options={[{ value: '', label: c.anyChannel }, { value: 'walk_in', label: c.walkin }, { value: 'online', label: c.online }]} />
      }>
        <SearchInput value={search} onChange={setSearch} placeholder={c.search} className="w-full sm:w-80" />
        <div className="flex gap-1.5 flex-wrap">
          {['today', 'week', 'month', 'all'].map(p => (
            <Chip key={p} active={preset === p} onClick={() => setPreset(p)}>{c[p]}</Chip>
          ))}
        </div>
      </Toolbar>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <Chip active={!status} onClick={() => setStatus('')} count={orders.length}>{c.all}</Chip>
        {['pending', 'shipping', 'completed', 'cancelled'].map(s => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)} count={counts[s] || 0}>{c[s]}</Chip>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
        <section className={`${card} overflow-hidden`}>
          {loading ? (
            <div className="p-6 space-y-3" aria-busy="true">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-canvas animate-pulse" />)}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon="ticket" title={c.empty} text={c.emptyText} />
          ) : (
            <ul className="divide-y divide-line">
              {visible.map(o => {
                const active = o.id === selectedId;
                return (
                  <li key={o.id}>
                    <button onClick={() => select(o)} aria-current={active || undefined}
                      className={`w-full text-left px-5 py-3.5 flex items-center gap-4 transition-colors ${active ? 'bg-gold-soft/60' : 'hover:bg-canvas'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink num">{o.order_number}</span>
                          {o.order_type === 'online' && <Pill tone="violet">{c.online}</Pill>}
                        </div>
                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {o.customer_name || c.guest}
                          <span className="ml-2 text-slate-400 num">{new Date(o.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-ink num">{formatCurrency(o.total, o.currency)}</p>
                        <div className="mt-1"><Pill tone={STATUS_TONE[o.status]}>{c[o.status] || o.status}</Pill></div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`${card} hidden lg:block lg:sticky lg:top-0`}>
          {detail || <EmptyState icon="chevron" title={c.pick} />}
        </section>
      </div>

      <Modal open={mobileDetail && !!selected} onClose={() => setMobileDetail(false)} title={selected?.order_number} size="lg">
        {detail}
      </Modal>
    </div>
  );
}

function OrderDetail({ order, c, lang, shop, onPatch }) {
  const [tracking, setTracking] = useState({ carrier: order.shipping_carrier || '', number: order.tracking_number || '' });
  const [note, setNote] = useState(order.internal_notes || '');
  const [busy, setBusy] = useState('');
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const online = order.order_type === 'online';
  const cancelled = order.status === 'cancelled';
  const stepIndex = { pending: 0, shipping: 1, completed: 2 }[order.status] ?? 0;
  const trackingDirty = tracking.carrier !== (order.shipping_carrier || '') || tracking.number !== (order.tracking_number || '');
  const noteDirty = note !== (order.internal_notes || '');
  const discount = Number(order.discount) || 0;

  async function run(key, body, ok) {
    setBusy(key);
    setError('');
    try {
      await onPatch(order.id, body);
      if (ok) { setFlash(ok); setTimeout(() => setFlash(''), 2000); }
    } catch {
      setError(c.failed);
    } finally {
      setBusy('');
    }
  }

  async function uploadSlip(file) {
    setBusy('slip');
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await up.json();
      if (!up.ok || !data.url) throw new Error(data.error || 'upload');
      await onPatch(order.id, { payment_slip_url: data.url });
    } catch (e) {
      setError(e.message && e.message !== 'upload' && e.message !== 'failed' ? e.message : c.failed);
    } finally {
      setBusy('');
    }
  }

  function itemName(i) {
    const base = lang === 'lo' ? (i.name_lo || i.name_en) : lang === 'th' ? (i.name_th || i.name_en) : i.name_en;
    return base || i.sku;
  }

  function sendWhatsApp() {
    if (!order.customer_phone) { setError(c.noPhone); return; }
    const head = {
      pending: '✅ ຢືນຢັນອໍເດີ້ຂອງທ່ານແລ້ວ',
      shipping: '🚚 ອໍເດີ້ຂອງທ່ານກຳລັງຈັດສົ່ງ',
      completed: '📦 ອໍເດີ້ຂອງທ່ານຈັດສົ່ງຮອດແລ້ວ',
      cancelled: '❌ ອໍເດີ້ຂອງທ່ານຖືກຍົກເລີກ',
    }[order.status] || 'ອໍເດີ້ຂອງທ່ານ';
    const to = waNumber(order.customer_phone, shop.whatsapp_country_code);
    if (shop.whatsapp_template && shop.whatsapp_template.trim()) {
      const text = fillTemplate(shop.whatsapp_template, {
        name: order.customer_name || '', order_number: order.order_number, total: formatCurrency(order.total, order.currency),
        status: head, tracking: order.tracking_number || '', carrier: order.shipping_carrier || '', shop: shop.shop_name || '',
      });
      window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, '_blank');
      return;
    }
    const lines = [`ສະບາຍດີ ຄຸນ ${order.customer_name || 'ລູກຄ້າ'} 🌸`, '', head, '',
      `🔖 ເລກທີ່ອໍເດີ້: ${order.order_number}`, `💰 ຍອດລວມ: ${formatCurrency(order.total, order.currency)}`];
    if (order.delivery_date) lines.push(`📅 ວັນຈັດສົ່ງ: ${dateOnly(order.delivery_date)}`);
    if (order.customer_address) lines.push(`📍 ທີ່ຢູ່: ${order.customer_address}`);
    if (order.tracking_number) {
      lines.push('', `📮 ເລກຕິດຕາມພັດສະດຸ: ${order.tracking_number}`);
      if (order.shipping_carrier) lines.push(`🚛 ຂົນສົ່ງ: ${order.shipping_carrier}`);
    }
    lines.push('', 'ຂໍຂອບໃຈທີ່ໃຫ້ຄວາມໄວ້ວາງໃຈ 💖', `— ${shop.shop_name || 'PP Systems'}`);
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-extrabold text-ink num">{order.order_number}</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {online ? c.online : c.walkin}, {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <Pill tone={STATUS_TONE[order.status]}>{c[order.status] || order.status}</Pill>
      </div>

      {online && !cancelled && (
        <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Order progress">
          {c.steps.map((label, i) => (
            <li key={label} className="flex flex-col gap-1.5">
              <span className={`h-1.5 rounded-full ${i <= stepIndex ? 'bg-gold' : 'bg-canvas'}`} />
              <span className={`text-xs ${i <= stepIndex ? 'text-ink font-semibold' : 'text-slate-400'}`}>{label}</span>
            </li>
          ))}
        </ol>
      )}
      {cancelled && <p className="mt-4 rounded-xl bg-canvas px-4 py-3 text-sm text-slate-600">{c.cancelled}</p>}

      {!cancelled && (
        <div className="mt-5 flex flex-wrap gap-2">
          {online && order.status === 'pending' && (
            <Button tone="gold" icon="truck" disabled={!!busy} onClick={() => run('status', { status: 'shipping' })}>{c.markShipped}</Button>
          )}
          {order.status === 'shipping' && (
            <Button tone="gold" icon="check" disabled={!!busy} onClick={() => run('status', { status: 'completed' })}>{c.markDelivered}</Button>
          )}
          <Button tone="ghost" icon="print" onClick={() => printReceipt(order, shop, lang)}>{c.receipt}</Button>
          {online && <Button tone="ghost" icon="truck" onClick={() => printShippingLabel(order, shop, lang)}>{c.label}</Button>}
          <Button tone="ghost" icon="whatsapp" onClick={sendWhatsApp}>{c.whatsapp}</Button>
        </div>
      )}

      {(error || flash) && (
        <p role={error ? 'alert' : 'status'} className={`mt-3 text-sm ${error ? 'text-danger' : 'text-success font-semibold'}`}>{error || flash}</p>
      )}

      <dl className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-500">{c.customer}</dt>
          <dd className="font-semibold text-ink mt-0.5">{order.customer_name || c.guest}{order.customer_phone && <span className="block font-normal text-slate-600 num">{order.customer_phone}</span>}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{c.paidBy}</dt>
          <dd className="font-semibold text-ink mt-0.5">{t(order.payment_method, lang)} <span className="font-normal text-slate-500">({order.currency})</span></dd>
        </div>
        {online && (
          <>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">{c.shipTo}</dt>
              <dd className="text-ink mt-0.5 whitespace-pre-line">{order.customer_address || '-'}</dd>
            </div>
            {order.delivery_date && (
              <div>
                <dt className="text-slate-500">{c.delivery}</dt>
                <dd className="font-semibold text-ink mt-0.5 num">{dateOnly(order.delivery_date)}</dd>
              </div>
            )}
            {order.shipping_notes && (
              <div>
                <dt className="text-slate-500">{c.notes}</dt>
                <dd className="text-ink mt-0.5">{order.shipping_notes}</dd>
              </div>
            )}
          </>
        )}
      </dl>

      {online && !cancelled && (
        <div className="mt-6">
          <h3 className="font-bold text-ink text-sm">{c.tracking}</h3>
          <div className="mt-2 grid sm:grid-cols-[1fr_1.3fr_auto] gap-2">
            <input aria-label={c.carrier} placeholder={c.carrier} value={tracking.carrier}
              onChange={e => setTracking({ ...tracking, carrier: e.target.value })} className={inputCls} />
            <input aria-label={c.trackNo} placeholder={c.trackNo} value={tracking.number}
              onChange={e => setTracking({ ...tracking, number: e.target.value })} className={`${inputCls} num`} />
            <Button tone="primary" disabled={!trackingDirty || !!busy}
              onClick={() => run('tracking', { shipping_carrier: tracking.carrier, tracking_number: tracking.number }, c.saved)}>{c.save}</Button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-bold text-ink text-sm">{c.items}</h3>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {(order.items || []).map(i => (
            <li key={i.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-ink font-medium">{itemName(i)}</p>
                <p className="text-xs text-slate-500 num">
                  {[i.variant_color, i.variant_size].filter(Boolean).join(' / ')}{(i.variant_color || i.variant_size) ? ', ' : ''}{i.quantity} × {formatCurrency(i.unit_price, order.currency)}
                </p>
              </div>
              <span className="font-semibold text-ink num shrink-0">{formatCurrency(i.total, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 text-sm">
          {discount > 0 && (
            <>
              <div className="flex justify-between text-slate-600"><span>{c.subtotal}</span><span className="num">{formatCurrency(order.subtotal, order.currency)}</span></div>
              <div className="flex justify-between text-slate-600">
                <span>{c.discount}{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                <span className="num">−{formatCurrency(discount, order.currency)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-baseline pt-1">
            <span className="font-semibold text-ink">{c.total}</span>
            <span className="text-xl font-extrabold text-ink num">{formatCurrency(order.total, order.currency)}</span>
          </div>
          {order.currency !== 'LAK' && (
            <p className="text-right text-xs text-slate-500 num">{formatCurrency(order.total_in_lak, 'LAK')}</p>
          )}
        </div>
      </div>

      {order.payment_method === 'transfer' && (
        <div className="mt-6">
          <h3 className="font-bold text-ink text-sm">{c.slip}</h3>
          <div className="mt-2 flex items-center gap-3">
            {order.payment_slip_url && (
              <a href={order.payment_slip_url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={order.payment_slip_url} alt={c.slip} className="w-16 h-20 object-cover rounded-lg border border-line" />
              </a>
            )}
            <label className={`${busy === 'slip' ? 'opacity-50 pointer-events-none' : ''} inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-canvas cursor-pointer`}>
              <Icon name="upload" className="w-4 h-4" />
              {order.payment_slip_url ? c.replace : c.uploadSlip}
              <input type="file" accept="image/*" className="sr-only" onChange={e => e.target.files?.[0] && uploadSlip(e.target.files[0])} />
            </label>
          </div>
        </div>
      )}

      <div className="mt-6">
        <Field label={c.internal}>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} className={inputCls} />
        </Field>
        {noteDirty && (
          <div className="mt-2 flex justify-end">
            <Button size="sm" disabled={!!busy} onClick={() => run('note', { internal_notes: note }, c.saved)}>{c.save}</Button>
          </div>
        )}
      </div>

      {!cancelled && (
        <div className="mt-8 pt-5 border-t border-line">
          {confirmCancel ? (
            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-sm text-danger font-medium">{c.cancelAsk}</p>
              <div className="mt-3 flex gap-2">
                <Button tone="danger" disabled={!!busy} onClick={() => run('cancel', { status: 'cancelled' }).then(() => setConfirmCancel(false))}>{c.cancel}</Button>
                <Button tone="subtle" onClick={() => setConfirmCancel(false)}>{t('cancel', lang)}</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmCancel(true)} className="text-sm font-semibold text-slate-500 hover:text-danger">{c.cancel}</button>
          )}
        </div>
      )}
    </div>
  );
}
