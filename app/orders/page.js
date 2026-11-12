'use client';
import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';
import { formatCurrency } from '../../lib/currency';
import { printReceipt, printShippingLabel, printShippingLabels } from '../../lib/receipt';
import { waNumber, fillTemplate } from '../../lib/whatsapp';
import { Icon, Button, IconButton, Modal, Field, SearchInput, Chip, Pill, EmptyState, Toolbar, Segmented, inputCls, card } from '../../components/ui';

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
    cod: 'ເກັບປາຍທາງ (COD)', deposit: 'ມັດຈຳ', markPaid: 'ຮັບເງິນຄົບແລ້ວ', paidFull: 'ຊຳລະຄົບແລ້ວ',
    receipt: 'ພິມໃບບິນ', label: 'ພິມໃບບິນສິນຄ້າຈັດສົ່ງ', pickAll: 'ເລືອກທັງໝົດເພື່ອພິມ', pickOne: 'ເລືອກເພື່ອພິມ', printPicked: n => `ພິມໃບບິນຈັດສົ່ງ ${n} ໃບ`, clearPick: 'ລ້າງ', picked: n => `ເລືອກແລ້ວ ${n}`, popup: 'ເບົາເຊີບລັອກໜ້າຕ່າງພິມ ກະລຸນາອະນຸຍາດປັອບອັບ', whatsapp: 'ສົ່ງ WhatsApp', noPhone: 'ອໍເດີ້ນີ້ບໍ່ມີເບີໂທລູກຄ້າ',
    failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ', orders: n => `${n} ອໍເດີ້`,
    copy: 'ຄັດລອກທີ່ຢູ່ສົ່ງ', copied: 'ຄັດລອກແລ້ວ', call: 'ໂທຫາລູກຄ້າ', more: n => `+${n} ລາຍການ`, collect: 'ເກັບເງິນປາຍທາງ', paidVia: m => `ຈ່າຍແລ້ວ (${m})`,
    bill: 'ຮູບບິນຂົນສົ່ງ', addBill: 'ເພີ່ມຮູບບິນ', removeBill: 'ລຶບຮູບ',
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
    cod: 'เก็บปลายทาง (COD)', deposit: 'มัดจำ', markPaid: 'รับเงินครบแล้ว', paidFull: 'ชำระครบแล้ว',
    receipt: 'พิมพ์ใบเสร็จ', label: 'พิมพ์ใบบิลสินค้าจัดส่ง', pickAll: 'เลือกทั้งหมดเพื่อพิมพ์', pickOne: 'เลือกเพื่อพิมพ์', printPicked: n => `พิมพ์ใบบิลจัดส่ง ${n} ใบ`, clearPick: 'ล้าง', picked: n => `เลือกแล้ว ${n}`, popup: 'เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาตป๊อปอัป', whatsapp: 'ส่ง WhatsApp', noPhone: 'ออเดอร์นี้ไม่มีเบอร์ลูกค้า',
    failed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง', orders: n => `${n} ออเดอร์`,
    copy: 'คัดลอกที่อยู่ส่ง', copied: 'คัดลอกแล้ว', call: 'โทรหาลูกค้า', more: n => `+${n} รายการ`, collect: 'เก็บเงินปลายทาง', paidVia: m => `จ่ายแล้ว (${m})`,
    bill: 'รูปบิลขนส่ง', addBill: 'เพิ่มรูปบิล', removeBill: 'ลบรูป',
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
    cod: 'Collect on delivery (COD)', deposit: 'deposit', markPaid: 'Mark fully paid', paidFull: 'Paid in full',
    receipt: 'Print receipt', label: 'Print delivery bill', pickAll: 'Select all to print', pickOne: 'Select to print', printPicked: n => `Print ${n} delivery ${n === 1 ? 'bill' : 'bills'}`, clearPick: 'Clear', picked: n => `${n} selected`, popup: 'The browser blocked the print window. Allow pop-ups for this site.', whatsapp: 'Send on WhatsApp', noPhone: 'This order has no customer phone',
    failed: "Couldn't save. Try again.", orders: n => `${n} ${n === 1 ? 'order' : 'orders'}`,
    copy: 'Copy shipping details', copied: 'Copied', call: 'Call customer', more: n => `+${n} more`, collect: 'Collect on delivery', paidVia: m => `Paid (${m})`,
    bill: 'Carrier bill photo', addBill: 'Add bill photo', removeBill: 'Remove photo',
  },
};

// Why a photo or message didn't go through, in words staff can act on.
const BILL_ERR = {
  lo: {
    file_too_large: 'ຮູບໃຫຍ່ເກີນໄປ', unsupported_type: 'ໃຊ້ໄດ້ສະເພາະຮູບ JPG ຫຼື PNG', file_content_invalid: 'ໄຟລ໌ນີ້ບໍ່ແມ່ນຮູບ',
    file_missing: 'ບໍ່ພົບຮູບບິນ ອັບໂຫຼດໃໝ່', window_closed: 'ລູກຄ້າທັກມາເກີນ 7 ມື້ແລ້ວ ລໍຖ້າລູກຄ້າທັກມາໃໝ່',
    not_connected: 'WhatsApp ຍັງບໍ່ໄດ້ເຊື່ອມຕໍ່', channel_disabled: 'ຊ່ອງທາງແຊັດນີ້ຖືກປິດ',
  },
  th: {
    file_too_large: 'รูปใหญ่เกินไป', unsupported_type: 'ใช้ได้เฉพาะรูป JPG หรือ PNG', file_content_invalid: 'ไฟล์นี้ไม่ใช่รูป',
    file_missing: 'ไม่พบรูปบิล อัปโหลดใหม่', window_closed: 'ลูกค้าทักมาเกิน 7 วันแล้ว รอลูกค้าทักมาใหม่',
    not_connected: 'WhatsApp ยังไม่ได้เชื่อมต่อ', channel_disabled: 'ช่องทางแชทนี้ถูกปิด',
  },
  en: {
    file_too_large: 'The photo is too large', unsupported_type: 'Use a JPG or PNG photo', file_content_invalid: 'This file is not a photo',
    file_missing: 'The bill photo is missing. Upload it again.', window_closed: "The customer's last message is over 7 days old. Wait for them to write again.",
    not_connected: 'WhatsApp is not connected', channel_disabled: 'This chat channel is turned off',
  },
};

// Phone photos are often 5-10 MB (or HEIC). Re-encode to a JPEG of at most 1600 px so the
// upload is quick and every chat platform accepts it. Falls back to the original file.
async function shrinkPhoto(file) {
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    URL.revokeObjectURL(url);
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 1.5e6 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(ok => canvas.toBlob(ok, 'image/jpeg', 0.85));
    return blob ? new File([blob], 'bill.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

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

function itemName(i, lang) {
  const base = lang === 'lo' ? (i.name_lo || i.name_en) : lang === 'th' ? (i.name_th || i.name_en) : i.name_en;
  return base || i.name_lo || i.name_th || i.sku;
}

function variantOf(i) {
  return [i.variant_color, i.variant_size].filter(Boolean).join(' / ');
}

// What the customer bought, in one line: "Shirt (Blue / S) ×2 +1 more".
function itemsLine(order, lang, c) {
  const items = order.items || [];
  if (!items.length) return '';
  const first = items[0];
  const v = variantOf(first);
  return `${itemName(first, lang)}${v ? ` (${v})` : ''} ×${first.quantity}${items.length > 1 ? `  ${c.more(items.length - 1)}` : ''}`;
}

// Small product photo; a box when the product has none.
function Thumb({ src, className = 'w-11 h-11' }) {
  return src
    ? <img src={src} alt="" loading="lazy" className={`${className} shrink-0 rounded-lg object-cover bg-canvas border border-line`} />
    : <span className={`${className} shrink-0 rounded-lg bg-canvas border border-line flex items-center justify-center text-slate-300`}><Icon name="box" className="w-5 h-5" /></span>;
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
  const [picked, setPicked] = useState(() => new Set()); // orders ticked for printing delivery bills
  const [pickMsg, setPickMsg] = useState('');
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
  // For changes the server already saved through its own route (the bill photo).
  function setLocal(id, fields) {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, ...fields } : o)));
  }

  // Delivery bills only make sense for online orders that are still going out.
  const canPrint = o => o.order_type === 'online' && o.status !== 'cancelled';
  const printable = visible.filter(canPrint);
  // Only what is on screen gets printed: a ticked order hidden by a filter or search is left out.
  const pickedOrders = printable.filter(o => picked.has(o.id));
  const allPicked = printable.length > 0 && printable.every(o => picked.has(o.id));
  function togglePick(id) {
    setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function togglePickAll() {
    setPicked(prev => {
      const n = new Set(prev);
      printable.forEach(o => (allPicked ? n.delete(o.id) : n.add(o.id)));
      return n;
    });
  }
  function printPicked() {
    setPickMsg('');
    if (!printShippingLabels(pickedOrders, shop, lang)) setPickMsg(c.popup);
  }

  const detail = selected && (
    <OrderDetail key={selected.id} order={selected} c={c} lang={lang} shop={shop} onPatch={patch} onLocal={setLocal} />
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

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
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
            <>
            {printable.length > 0 && (
              <div className={`sticky top-0 z-10 flex items-center gap-2 pl-2 pr-3 sm:pr-4 min-h-12 border-b border-line ${pickedOrders.length ? 'bg-gold-soft' : 'bg-white'}`}>
                <label className="w-11 h-11 flex items-center justify-center shrink-0 cursor-pointer" title={c.pickAll}>
                  <input type="checkbox" checked={allPicked} onChange={togglePickAll} aria-label={c.pickAll} className="w-5 h-5 accent-[#0B63E5] cursor-pointer" />
                </label>
                <span className="flex-1 min-w-0 truncate text-sm text-slate-600">{pickedOrders.length ? c.picked(pickedOrders.length) : c.pickAll}</span>
                {pickedOrders.length > 0 && (
                  <>
                    <button type="button" onClick={() => setPicked(new Set())} className="px-2 min-h-10 text-sm font-semibold text-slate-500 hover:text-ink">{c.clearPick}</button>
                    <Button size="sm" icon="print" onClick={printPicked}>{c.printPicked(pickedOrders.length)}</Button>
                  </>
                )}
              </div>
            )}
            {pickMsg && <p role="alert" className="px-4 py-2 text-sm text-danger">{pickMsg}</p>}
            <ul className="divide-y divide-line">
              {visible.map(o => {
                const active = o.id === selectedId;
                const online = o.order_type === 'online';
                const when = new Date(o.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                // Who, what, and how it ships come first; the order number is only a small reference.
                return (
                  <li key={o.id} className={`flex items-stretch ${active ? 'bg-gold-soft/60' : picked.has(o.id) ? 'bg-gold-soft/30' : ''}`}>
                    {printable.length > 0 && (canPrint(o) ? (
                      <label className="w-11 pl-2 shrink-0 flex items-start pt-4 justify-center cursor-pointer" title={c.pickOne}>
                        <input type="checkbox" checked={picked.has(o.id)} onChange={() => togglePick(o.id)} aria-label={`${c.pickOne}: ${o.customer_name || o.order_number}`}
                          className="w-5 h-5 accent-[#0B63E5] cursor-pointer" />
                      </label>
                    ) : <span className="w-11 pl-2 shrink-0" aria-hidden="true" />)}
                    <button onClick={() => select(o)} aria-current={active || undefined}
                      className={`flex-1 min-w-0 text-left ${printable.length > 0 ? 'pl-1 pr-4 sm:pr-5' : 'px-4 sm:px-5'} py-3 flex gap-3 transition-colors ${active ? '' : 'hover:bg-canvas'} ${o.status === 'cancelled' ? 'opacity-60' : ''}`}>
                      <Thumb src={o.items?.[0]?.image_url} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-bold text-ink truncate">{o.customer_name || c.guest}</span>
                          <span className={`font-bold text-ink num shrink-0 ${o.status === 'cancelled' ? 'line-through' : ''}`}>{formatCurrency(o.total, o.currency)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-600 truncate">{itemsLine(o, lang, c)}</span>
                          <Pill tone={STATUS_TONE[o.status]}>{c[o.status] || o.status}</Pill>
                        </div>
                        <div className="mt-1 flex items-center gap-x-3 text-xs text-slate-400 min-w-0">
                          {o.customer_phone && <span className="inline-flex items-center gap-1 num shrink-0"><Icon name="phone" className="w-3.5 h-3.5" />{o.customer_phone}</span>}
                          {online && o.shipping_carrier && <span className="inline-flex items-center gap-1 font-semibold text-slate-500 truncate"><Icon name="truck" className="w-3.5 h-3.5 shrink-0" />{o.shipping_carrier}</span>}
                          {!online && <span className="shrink-0">{c.walkin}</span>}
                        </div>
                        <p className="mt-0.5 flex justify-between gap-3 text-[0.68rem] text-slate-400 num">
                          <span className="truncate">{o.order_number}</span>
                          <span className="shrink-0">{when}</span>
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            </>
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

function OrderDetail({ order, c, lang, shop, onPatch, onLocal }) {
  const [tracking, setTracking] = useState({ carrier: order.shipping_carrier || '', number: order.tracking_number || '' });
  const [note, setNote] = useState(order.internal_notes || '');
  const [busy, setBusy] = useState('');
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const online = order.order_type === 'online';
  const cancelled = order.status === 'cancelled';
  // The shop's saved chat message, filled in for this order (Settings → chat message). Empty = use the built-in default.
  const chatTemplate = (shop.order_chat_template || '').trim()
    ? fillTemplate(shop.order_chat_template, {
        name: order.customer_name || '', order_number: order.order_number || '',
        total: formatCurrency(order.total, order.currency), status: c[order.status] || order.status || '',
        tracking: order.tracking_number || '', carrier: order.shipping_carrier || '', shop: shop.shop_name || '',
      })
    : null;
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

  // The carrier's bill photo stays on the order (privately) until someone replaces or removes it.
  const bill = order.shipping_bill_file || null;
  async function uploadBill(picked) {
    setBusy('bill');
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', await shrinkPhoto(picked));
      const res = await fetch(`/api/orders/${order.id}/bill`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.shipping_bill_file) throw new Error(data.error || 'failed');
      onLocal(order.id, { shipping_bill_file: data.shipping_bill_file });
    } catch (e) {
      setError(BILL_ERR[lang]?.[e.message] || c.failed);
    } finally {
      setBusy('');
    }
  }
  async function removeBill() {
    setBusy('bill');
    setError('');
    try {
      const res = await fetch(`/api/orders/${order.id}/bill`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onLocal(order.id, { shipping_bill_file: null });
    } catch {
      setError(c.failed);
    } finally {
      setBusy('');
    }
  }

  // Name, phone and address in one go, for pasting into the carrier's booking app.
  async function copyShipping() {
    const text = [order.customer_name, order.customer_phone, order.customer_address, order.shipping_carrier]
      .filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setFlash(c.copied);
      setTimeout(() => setFlash(''), 2000);
    } catch {
      setError(c.failed);
    }
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

  const paid = Math.max(0, Number(order.amount_paid) || 0);
  const toCollect = Math.max(0, (Number(order.total) || 0) - paid);
  const items = order.items || [];

  return (
    <div className="p-5 sm:p-6">
      {/* Where the order stands, quietly: the people and the parcel below matter more. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Pill tone={STATUS_TONE[order.status]}>{c[order.status] || order.status}</Pill>
          <span className="text-xs text-slate-500 truncate">{online ? c.online : c.walkin}, {new Date(order.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {/* On phones the order number is already the title of the sheet. */}
        <span className="hidden lg:inline text-xs text-slate-400 num shrink-0">{order.order_number}</span>
      </div>

      {cancelled && <p className="mt-3 rounded-xl bg-canvas px-4 py-2.5 text-sm text-slate-600">{c.cancelled}</p>}

      {online ? (
        // The parcel label: who it goes to, how to reach them, and which carrier takes it.
        <section aria-label={c.shipTo} className="mt-4 rounded-2xl border-2 border-dashed border-[#C5D3EA] bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">{c.shipTo}</p>
              <p className="mt-0.5 text-xl font-extrabold text-ink leading-tight break-words">{order.customer_name || c.guest}</p>
            </div>
            {order.shipping_carrier && (
              <span className="shrink-0 -rotate-2 inline-flex items-center gap-1.5 rounded-lg border-2 border-primary/70 px-2.5 py-1 text-sm font-extrabold text-primary">
                <Icon name="truck" className="w-4 h-4" />{order.shipping_carrier}
              </span>
            )}
          </div>
          {order.customer_phone && (
            <a href={`tel:${String(order.customer_phone).replace(/[^\d+]/g, '')}`} title={c.call}
              className="mt-2.5 inline-flex items-center gap-2 text-[1.1rem] font-bold text-ink num hover:text-primary">
              <Icon name="phone" className="w-4 h-4 text-primary" />{order.customer_phone}
            </a>
          )}
          <p className="mt-2 flex items-start gap-2 text-[0.95rem] text-ink">
            <Icon name="pin" className="w-4 h-4 mt-1 shrink-0 text-primary" />
            <span className="whitespace-pre-line break-words">{order.customer_address || '-'}</span>
          </p>
          {(order.delivery_date || order.shipping_notes) && (
            <div className="mt-2.5 space-y-1 text-sm">
              {order.delivery_date && <p className="text-slate-600">{c.delivery}: <span className="font-semibold text-ink num">{dateOnly(order.delivery_date)}</span></p>}
              {order.shipping_notes && <p className="rounded-md bg-[#FFF3DE] px-2 py-1 text-[#8A4B00] whitespace-pre-line">{order.shipping_notes}</p>}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-dashed border-line flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-slate-500">
              {c.trackNo}: <span className={`num ${order.tracking_number ? 'font-bold text-ink' : ''}`}>{order.tracking_number || '-'}</span>
            </span>
            <Button size="sm" tone="ghost" icon="copy" onClick={copyShipping}>{c.copy}</Button>
          </div>
        </section>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          {c.customer}: <span className="font-semibold text-ink">{order.customer_name || c.guest}</span>
          {order.customer_phone && <span className="ml-2 num">{order.customer_phone}</span>}
        </p>
      )}

      {/* The money: how much to collect at the door, or that it's already paid. */}
      {online && !cancelled && (toCollect > 0 ? (
        <div className="mt-3 rounded-2xl bg-gold-soft px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-[#0950C2]">{c.collect}</p>
            {paid > 0 && <p className="text-xs text-[#0950C2]/80 num">{c.deposit} {formatCurrency(paid, order.currency)}</p>}
            <button onClick={() => run('paid', { amount_paid: order.total }, c.saved)} disabled={!!busy}
              className="mt-0.5 text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-ink">{c.markPaid}</button>
          </div>
          <p className="text-2xl font-extrabold text-[#0950C2] num shrink-0">{formatCurrency(toCollect, order.currency)}</p>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-[#E3F5EC] px-4 py-3 flex items-center justify-between gap-3">
          <p className="font-semibold text-[#0B6B49]">{c.paidVia(t(order.payment_method, lang))}</p>
          <p className="text-lg font-extrabold text-[#0B6B49] num">{formatCurrency(order.total, order.currency)}</p>
        </div>
      ))}

      {(error || flash) && (
        <p role={error ? 'alert' : 'status'} className={`mt-3 text-sm ${error ? 'text-danger' : 'text-success font-semibold'}`}>{error || flash}</p>
      )}

      {/* What to pack */}
      <div className="mt-5">
        <h3 className="font-bold text-ink text-sm">{c.items} <span className="font-normal text-slate-400 num">({items.reduce((n, i) => n + Number(i.quantity || 0), 0)})</span></h3>
        <ul className="mt-1.5 divide-y divide-line">
          {items.map(i => {
            const v = variantOf(i);
            return (
              <li key={i.id} className="py-2.5 flex items-start gap-3">
                <Thumb src={i.image_url} className="w-12 h-12" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink leading-snug">{itemName(i, lang)}</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {v && <span className="mr-2">{v}</span>}
                    <span className="font-bold text-ink num">×{i.quantity}</span>
                    <span className="ml-2 text-xs text-slate-400 num">{formatCurrency(i.unit_price, order.currency)}</span>
                  </p>
                  {i.sku && <p className="text-[0.68rem] text-slate-400 num">{i.sku}</p>}
                </div>
                <span className="font-semibold text-ink num shrink-0">{formatCurrency(i.total, order.currency)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-1 pt-2 border-t border-line space-y-1 text-sm">
          {discount > 0 && (
            <>
              <div className="flex justify-between text-slate-600"><span>{c.subtotal}</span><span className="num">{formatCurrency(order.subtotal, order.currency)}</span></div>
              <div className="flex justify-between text-slate-600">
                <span>{c.discount}{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                <span className="num">−{formatCurrency(discount, order.currency)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-slate-600">{c.total}{!online && <span className="ml-1 text-xs">({t(order.payment_method, lang)})</span>}</span>
            <span className="text-lg font-extrabold text-ink num">{formatCurrency(order.total, order.currency)}</span>
          </div>
          {order.currency !== 'LAK' && (
            <p className="text-right text-xs text-slate-500 num">{formatCurrency(order.total_in_lak, 'LAK')}</p>
          )}
        </div>
      </div>

      {/* Next step, then the printouts and messages */}
      {!cancelled && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {online && order.status === 'pending' && (
            <Button tone="gold" className="w-full sm:w-auto" icon="truck" disabled={!!busy} onClick={() => run('status', { status: 'shipping' })}>{c.markShipped}</Button>
          )}
          {order.status === 'shipping' && (
            <Button tone="gold" className="w-full sm:w-auto" icon="check" disabled={!!busy} onClick={() => run('status', { status: 'completed' })}>{c.markDelivered}</Button>
          )}
          {online && <Button tone="ghost" icon="print" onClick={() => printShippingLabel(order, shop, lang)}>{c.label}</Button>}
          <Button tone="ghost" icon="print" onClick={() => printReceipt(order, shop, lang)}>{c.receipt}</Button>
          <IconButton icon="whatsapp" label={c.whatsapp} onClick={sendWhatsApp} className="border border-line bg-white lg:!w-10 lg:!h-10" />
        </div>
      )}

      {online && !cancelled && (
        <div className="mt-5">
          <h3 className="font-bold text-ink text-sm">{c.tracking}</h3>
          <div className="mt-2 grid sm:grid-cols-[1fr_1.3fr_auto] gap-2">
            <input aria-label={c.carrier} placeholder={c.carrier} value={tracking.carrier} list="order-carriers"
              onChange={e => setTracking({ ...tracking, carrier: e.target.value })} className={inputCls} />
            <datalist id="order-carriers">
              {String(shop.shipping_carriers || '').split('\n').map(s => s.trim()).filter(Boolean).map(x => <option key={x} value={x} />)}
            </datalist>
            <input aria-label={c.trackNo} placeholder={c.trackNo} value={tracking.number}
              onChange={e => setTracking({ ...tracking, number: e.target.value })} className={`${inputCls} num`} />
            <Button tone="primary" disabled={!trackingDirty || !!busy}
              onClick={() => run('tracking', { shipping_carrier: tracking.carrier, tracking_number: tracking.number }, c.saved)}>{c.save}</Button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            {bill ? (
              <a href={`/api/orders/${order.id}/bill?f=${bill}`} target="_blank" rel="noopener noreferrer" title={c.bill} className="block shrink-0">
                <img src={`/api/orders/${order.id}/bill?f=${bill}`} alt={c.bill} className="w-16 h-20 object-cover rounded-lg border border-line" />
              </a>
            ) : (
              <span className="w-16 h-20 shrink-0 rounded-lg border-2 border-dashed border-line flex items-center justify-center text-slate-300">
                <Icon name="image" className="w-6 h-6" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{c.bill}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <label className={`${busy === 'bill' ? 'opacity-50 pointer-events-none' : ''} inline-flex items-center gap-2 px-3 min-h-10 lg:min-h-9 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-canvas cursor-pointer`}>
                  <Icon name="upload" className="w-4 h-4" />
                  {bill ? c.replace : c.addBill}
                  <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadBill(f); }} />
                </label>
                {bill && (
                  <button type="button" onClick={removeBill} disabled={busy === 'bill'}
                    className="px-2 min-h-10 lg:min-h-9 text-sm font-semibold text-slate-500 hover:text-danger">{c.removeBill}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!cancelled && <OrderChatSend key={order.id} order={order} lang={lang} bill={bill} onPickBill={uploadBill} billBusy={busy === 'bill'} initialText={chatTemplate} />}

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

const CHAT_COPY = {
  lo: {
    title: 'ສົ່ງໃຫ້ລູກຄ້າທາງແຊັດ', photo: 'ເລືອກຮູບບິນ ຫຼື ຮູບພັດສະດຸ', change: 'ປ່ຽນຮູບ', skip: 'ບໍ່ແນບຮູບນີ້', send: 'ສົ່ງ', sent: 'ສົ່ງໃຫ້ລູກຄ້າແລ້ວ',
    closed: 'ລູກຄ້າທັກມາດົນເກີນກວ່າທີ່ລະບົບອະນຸຍາດ ລໍຖ້າລູກຄ້າທັກມາໃໝ່', failed: 'ສົ່ງບໍ່ສຳເລັດ', openChat: 'ເປີດແຊັດ',
    text: o => `ອໍເດີ້ ${o.order_number}${o.tracking_number ? `\nເລກພັດສະດຸ: ${o.tracking_number}${o.shipping_carrier ? ` (${o.shipping_carrier})` : ''}` : ''}\nຂໍຂອບໃຈທີ່ອຸດໜູນ`,
  },
  th: {
    title: 'ส่งให้ลูกค้าทางแชท', photo: 'เลือกรูปบิลหรือรูปพัสดุ', change: 'เปลี่ยนรูป', skip: 'ไม่แนบรูปนี้', send: 'ส่ง', sent: 'ส่งให้ลูกค้าแล้ว',
    closed: 'ลูกค้าทักมานานเกินกว่าที่ระบบอนุญาต รอลูกค้าทักมาใหม่', failed: 'ส่งไม่สำเร็จ', openChat: 'เปิดแชท',
    text: o => `ອໍເດີ້ ${o.order_number}${o.tracking_number ? `\nເລກພັດສະດຸ: ${o.tracking_number}${o.shipping_carrier ? ` (${o.shipping_carrier})` : ''}` : ''}\nຂໍຂອບໃຈທີ່ອຸດໜູນ`,
  },
  en: {
    title: 'Send to customer by chat', photo: 'Choose bill or parcel photo', change: 'Change photo', skip: "Don't attach this photo", send: 'Send', sent: 'Sent to the customer',
    closed: "The customer's last message is too old to reply to. Wait for them to write again.", failed: "Couldn't send", openChat: 'Open chat',
    text: o => `ອໍເດີ້ ${o.order_number}${o.tracking_number ? `\nເລກພັດສະດຸ: ${o.tracking_number}${o.shipping_carrier ? ` (${o.shipping_carrier})` : ''}` : ''}\nຂໍຂອບໃຈທີ່ອຸດໜູນ`,
  },
};

// Send the order's bill photo (saved on the order) and a note to the customer through their
// Messenger or WhatsApp chat. Picking a photo here saves it on the order too, so it is still
// there after leaving the page.
function OrderChatSend({ order, lang, bill, onPickBill, billBusy, initialText }) {
  const c = CHAT_COPY[lang] || CHAT_COPY.en;
  const errs = BILL_ERR[lang] || BILL_ERR.en;
  const [chats, setChats] = useState(null);
  const [convId, setConvId] = useState(null);
  const [attach, setAttach] = useState(true); // send the saved bill with this message
  const [text, setText] = useState(() => initialText ?? c.text(order));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [expanded, setExpanded] = useState(false); // folded to one line until staff want it
  const fileRef = useRef(null);

  useEffect(() => {
    fetch(`/api/chat/for-order?order_id=${order.id}`).then(r => r.json()).then(d => {
      if (d.enabled && d.conversations?.length) { setChats(d.conversations); setConvId(d.conversations[0].id); }
      else setChats([]);
    }).catch(() => setChats([]));
  }, [order.id]);

  if (!chats || !chats.length) return null;
  const conv = chats.find(x => x.id === convId) || chats[0];
  // Staff messages on Messenger go out with the "human agent" tag after 24 hours (up to 7 days).
  const open = !!(conv.window?.open || conv.window?.humanAgent);
  const isWa = conv.platform.startsWith('whatsapp');
  const withBill = !!bill && attach;

  async function pick(f) {
    setMsg(null);
    setAttach(true);
    await onPickBill(f);
  }

  async function send() {
    setBusy(true);
    setMsg(null);
    const form = new FormData();
    form.append('text', text);
    form.append('order_id', order.id);
    if (withBill) form.append('use_bill', '1');
    try {
      const res = await fetch(`/api/chat/conversations/${conv.id}/send`, { method: 'POST', body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.status === 'failed') {
        const code = d.error || (res.status === 413 ? 'file_too_large' : '');
        // Unknown reasons (e.g. Facebook's own message) are shown as-is so they can be looked into.
        throw new Error(errs[code] || (code ? `${c.failed}: ${String(code).slice(0, 140)}` : c.failed));
      }
      setMsg({ ok: true, text: c.sent });
    } catch (e) {
      setMsg({ ok: false, text: e.message || c.failed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-line">
      <button type="button" onClick={() => setExpanded(x => !x)} aria-expanded={expanded}
        className="w-full flex items-center gap-2 px-4 min-h-12 text-left">
        <Icon name="chat" className="w-4 h-4 text-primary shrink-0" />
        <span className="flex-1 font-semibold text-ink text-sm">{c.title}</span>
        <Pill tone={isWa ? 'green' : 'navy'}><span className="max-w-[9rem] truncate inline-block align-bottom">{conv.channel_name || (isWa ? 'WhatsApp' : 'Messenger')}</span></Pill>
        <Icon name="down" className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
      <div className="px-4 pb-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
          {chats.length > 1 && (
            <select value={conv.id} onChange={e => setConvId(Number(e.target.value))} className={`${inputCls} py-1.5 text-sm w-auto`}>
              {chats.map(x => <option key={x.id} value={x.id}>{x.name || (x.platform.startsWith('whatsapp') ? 'WhatsApp' : 'Messenger')} ({x.channel_name})</option>)}
            </select>
          )}
          <a href={`/chat?c=${conv.id}`} className="text-sm font-semibold text-primary hover:text-gold-dark">{c.openChat}</a>
      </div>
      {!open ? (
        <p className="mt-2 text-sm text-danger">{c.closed}</p>
      ) : (
        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f); }} />
          <div className="relative w-28 h-28 shrink-0">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={billBusy} title={withBill ? c.change : c.photo}
              className={`w-full h-full rounded-xl border-2 border-dashed ${withBill ? 'border-transparent' : 'border-line hover:border-gold'} flex items-center justify-center overflow-hidden text-xs text-slate-500 text-center px-2 ${billBusy ? 'opacity-50 animate-pulse' : ''}`}>
              {withBill ? <img src={`/api/orders/${order.id}/bill?f=${bill}`} alt="" className="w-full h-full object-cover rounded-lg" /> : c.photo}
            </button>
            {withBill && (
              <button type="button" onClick={() => setAttach(false)} title={c.skip} aria-label={c.skip}
                className="absolute top-1 right-1 w-8 h-8 rounded-full bg-ink/70 text-white flex items-center justify-center hover:bg-ink">
                <Icon name="close" className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <textarea rows={3} value={text} onChange={e => setText(e.target.value)} className={`${inputCls} text-sm`} />
            <div className="flex items-center justify-between gap-2">
              {msg ? <span role="status" className={`text-sm ${msg.ok ? 'text-success font-semibold' : 'text-danger'}`}>{msg.text}</span> : <span />}
              <Button icon="chat" onClick={send} disabled={busy || billBusy || (!withBill && !text.trim())}>{c.send}</Button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </section>
  );
}
