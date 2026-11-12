import { formatCurrency } from './currency';

// Prints receipts and shipping labels in their own window so only the paper
// content is printed, sized for 80mm thermal printers.
//
// Two documents, on purpose:
//  - printReceipt: proof of purchase for a walk-in sale. No customer details
//    (kept in the system, not exposed on the slip).
//  - printShippingLabel: stuck on an online order's parcel. Carries exactly what
//    the carrier needs — name, phone, address, carrier and any cash to collect (COD).

const T = {
  lo: { noCollect: 'ບໍ່ຕ້ອງເກັບເງິນ', collect: 'ເກັບເງິນປາຍທາງ', receipt: 'ໃບບິນ', label: 'ໃບບິນສິນຄ້າຈັດສົ່ງ', no: 'ເລກທີ', date: 'ວັນທີ', phone: 'ເບີໂທ', address: 'ທີ່ຢູ່',
        delivery: 'ວັນຈັດສົ່ງ', note: 'ໝາຍເຫດ', subtotal: 'ລວມຍ່ອຍ', discount: 'ສ່ວນຫຼຸດ', total: 'ລວມທັງໝົດ', paid: 'ຮັບເງິນ',
        change: 'ເງິນທອນ', method: 'ຊຳລະໂດຍ', cash: 'ເງິນສົດ', transfer: 'ໂອນ', items: 'ລາຍການ', from: 'ຜູ້ສົ່ງ', to: 'ຜູ້ຮັບ',
        tracking: 'ເລກພັດສະດຸ', carrier: 'ຂົນສົ່ງ', thanks: 'ຂອບໃຈທີ່ໃຊ້ບໍລິການ', cod: 'ເກັບເງິນປາຍທາງ (COD)',
        deposit: 'ຈ່າຍແລ້ວ', paidFull: 'ຊຳລະຄົບແລ້ວ' },
  th: { noCollect: 'ไม่ต้องเก็บเงิน', collect: 'เก็บเงินปลายทาง', receipt: 'ใบเสร็จรับเงิน', label: 'ใบบิลสินค้าจัดส่ง', no: 'เลขที่', date: 'วันที่', phone: 'โทร', address: 'ที่อยู่',
        delivery: 'วันจัดส่ง', note: 'หมายเหตุ', subtotal: 'รวมย่อย', discount: 'ส่วนลด', total: 'รวมทั้งสิ้น', paid: 'รับเงิน',
        change: 'เงินทอน', method: 'ชำระโดย', cash: 'เงินสด', transfer: 'โอน', items: 'รายการ', from: 'ผู้ส่ง', to: 'ผู้รับ',
        tracking: 'เลขพัสดุ', carrier: 'ขนส่ง', thanks: 'ขอบคุณที่ใช้บริการ', cod: 'เก็บเงินปลายทาง (COD)',
        deposit: 'จ่ายแล้ว', paidFull: 'ชำระครบแล้ว' },
  en: { noCollect: 'Nothing to collect', collect: 'Collect on delivery', receipt: 'Receipt', label: 'Delivery bill', no: 'No.', date: 'Date', phone: 'Phone', address: 'Address',
        delivery: 'Delivery', note: 'Note', subtotal: 'Subtotal', discount: 'Discount', total: 'Total', paid: 'Paid',
        change: 'Change', method: 'Paid by', cash: 'Cash', transfer: 'Transfer', items: 'Items', from: 'From', to: 'To',
        tracking: 'Tracking', carrier: 'Carrier', thanks: 'Thank you for shopping with us', cod: 'Cash on delivery (COD)',
        deposit: 'Paid', paidFull: 'Paid in full' },
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function itemName(item, lang) {
  const base = lang === 'lo' ? (item.name_lo || item.name_en) : lang === 'th' ? (item.name_th || item.name_en) : item.name_en;
  const name = item.name || base || item.sku || '';
  const variant = [item.variant_color, item.variant_size].filter(Boolean).join(' ');
  return variant && !name.includes(variant) ? `${name} (${variant})` : name;
}

const FONTS = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;700&family=Noto+Serif+Lao:wght@600;700&family=Noto+Sans+Thai:wght@400;500;700&display=swap';

const STYLE = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 5mm 4mm; width: 80mm; font-family: 'Noto Sans Lao','Noto Sans Thai','Segoe UI',sans-serif; font-size: 12px; line-height: 1.45; color: #000; -webkit-font-smoothing: antialiased; }
  .c { text-align: center; } .r { text-align: right; } .b { font-weight: 700; }
  .serif { font-family: 'Noto Serif Lao','Noto Serif Thai','Noto Sans Lao',serif; }
  h1 { font-size: 17px; margin: 0; letter-spacing: .2px; } .muted { color: #444; font-size: 11px; }
  .rule { border-top: 1px dashed #000; margin: 6px 0; }
  .rule-solid { border-top: 1.5px solid #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; vertical-align: top; }
  .row { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; }
  .big { font-size: 15px; font-weight: 800; }
  .logo { width: 42px; height: 42px; object-fit: contain; display: block; margin: 0 auto 4px; }
  .box { border: 1.5px solid #000; border-radius: 4px; padding: 7px 8px; margin-top: 7px; }
  .tag { font-size: 10px; color: #333; }
  .cod { border: 2px solid #000; border-radius: 4px; padding: 7px 9px; margin-top: 8px; text-align: center; }
  .cod .amt { font-size: 22px; font-weight: 800; line-height: 1.1; }
  .name { font-size: 18px; font-weight: 800; }
  /* Delivery bill: one per page, black only (thermal). Hierarchy by size and weight:
     who it goes to, then the money to collect (the one solid block), then the carrier. */
  .lbl { break-after: page; page-break-after: always; }
  .lbl:last-child { break-after: auto; page-break-after: auto; }
  .lbl svg { width: 14px; height: 14px; flex-shrink: 0; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .lbl-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding-bottom: 5px; border-bottom: 2px solid #000; }
  .lbl-head .shop { font-size: 13px; font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lbl-head .date { font-size: 11px; white-space: nowrap; }
  .lbl-to { padding: 9px 0 10px; }
  .lbl-k { font-size: 10px; color: #333; }
  .lbl-name { font-size: 22px; font-weight: 800; line-height: 1.15; margin-top: 1px; word-break: break-word; }
  .lbl-line { display: flex; align-items: flex-start; gap: 6px; margin-top: 5px; }
  .lbl-line svg { margin-top: 3px; }
  .lbl-phone { font-size: 18px; font-weight: 800; letter-spacing: .4px; }
  .lbl-phone svg { width: 16px; height: 16px; margin-top: 4px; }
  .lbl-addr { font-size: 13px; line-height: 1.4; white-space: pre-line; word-break: break-word; }
  .lbl-pay { border-radius: 4px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .lbl-pay.cod { background: #000; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .lbl-pay.cod .amt { font-size: 25px; font-weight: 800; line-height: 1; white-space: nowrap; }
  .lbl-pay.cod .sub { font-size: 10px; opacity: .85; margin-top: 2px; }
  .lbl-pay.paid { border: 1.5px solid #000; justify-content: flex-start; font-size: 13px; font-weight: 700; }
  .lbl-pay.paid svg { width: 16px; height: 16px; stroke-width: 2.5; }
  .lbl-ship { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 8px; margin-top: 8px; }
  .lbl-carrier { display: inline-flex; align-items: center; gap: 5px; border: 1.5px solid #000; border-radius: 999px; padding: 3px 10px 3px 8px;
    font-size: 13px; font-weight: 800; max-width: 100%; word-break: break-word; }
  /* A long tracking number drops to its own line whole rather than breaking in the middle. */
  .lbl-track { margin-left: auto; font-size: 13px; font-weight: 700; letter-spacing: .3px; white-space: nowrap; max-width: 100%; overflow-wrap: anywhere; }
  .lbl-note { margin-top: 8px; padding: 2px 0 2px 8px; border-left: 3px solid #000; font-size: 12px; font-weight: 600; white-space: pre-line; word-break: break-word; }
  .lbl-from { margin-top: 10px; padding-top: 5px; border-top: 1px dashed #000; font-size: 10.5px; display: flex; justify-content: space-between; gap: 8px; }
`;

function openAndPrint(html) {
  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet"><style>${STYLE}</style></head><body>${html}
<script>
var done=false;function go(){if(done)return;done=true;try{window.focus();}catch(e){}window.print();}
// Print once the web font is ready, with a fallback so it never hangs waiting.
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){setTimeout(go,150);});setTimeout(go,1800);}
else{window.onload=function(){setTimeout(go,350);};}
<\/script></body></html>`);
  win.document.close();
  return true;
}

function header(shop) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const logo = shop.shop_logo ? `<img class="logo" src="${esc(shop.shop_logo.startsWith('http') ? shop.shop_logo : origin + shop.shop_logo)}" alt="">` : '';
  return `${logo}<h1 class="c serif">${esc(shop.shop_name || 'PP Systems')}</h1>
    ${shop.shop_address ? `<div class="c muted">${esc(shop.shop_address)}</div>` : ''}
    ${shop.shop_phone ? `<div class="c muted">${esc(shop.shop_phone)}</div>` : ''}`;
}

// Walk-in sales slip. Deliberately carries no customer name/phone/address.
export function printReceipt(order, shop = {}, lang = 'lo', extra = {}) {
  const t = T[lang] || T.en;
  const cur = order.currency || 'LAK';
  const items = (order.items || []).map(i => `
    <tr><td colspan="2">${esc(itemName(i, lang))}</td></tr>
    <tr><td class="muted">${i.quantity} × ${formatCurrency(i.unit_price, cur)}</td><td class="r">${formatCurrency(i.total, cur)}</td></tr>`).join('');
  const discount = Number(order.discount) || 0;
  const html = `
    ${header(shop)}
    <div class="c b serif" style="margin-top:6px;font-size:14px">${t.receipt}</div>
    <div class="rule"></div>
    <div class="row"><span>${t.no}</span><span class="b">${esc(order.order_number)}</span></div>
    <div class="row"><span>${t.date}</span><span>${new Date(order.created_at || Date.now()).toLocaleString()}</span></div>
    <div class="rule"></div>
    <table>${items}</table>
    <div class="rule"></div>
    <div class="row"><span>${t.subtotal}</span><span>${formatCurrency(order.subtotal, cur)}</span></div>
    ${discount > 0 ? `<div class="row"><span>${t.discount}${order.coupon_code ? ` (${esc(order.coupon_code)})` : ''}</span><span>-${formatCurrency(discount, cur)}</span></div>` : ''}
    <div class="row big"><span>${t.total}</span><span>${formatCurrency(order.total, cur)}</span></div>
    ${cur !== 'LAK' ? `<div class="row muted"><span></span><span>${formatCurrency(order.total_in_lak, 'LAK')}</span></div>` : ''}
    <div class="row"><span>${t.method}</span><span>${t[order.payment_method] || esc(order.payment_method)}</span></div>
    ${extra.received ? `<div class="row"><span>${t.paid}</span><span>${formatCurrency(extra.received, cur)}</span></div>
      <div class="row b"><span>${t.change}</span><span>${formatCurrency(Math.max(0, extra.received - order.total), cur)}</span></div>` : ''}
    <div class="rule"></div>
    <div class="c muted" style="white-space:pre-line">${esc(shop.receipt_footer || t.thanks)}</div>`;
  return openAndPrint(html);
}

// Delivery bill for online orders: who it goes to, the money to collect, and the carrier.
// No order number or item list: the carrier and the customer don't need them.
const SVG = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.5l1.5 4.5-2.2 1.3a11 11 0 0 0 6.4 6.4l1.3-2.2L20 15.5V19a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

function dayOf(v) {
  const d = new Date(v || Date.now());
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function shippingLabelHtml(order, shop, lang) {
  const t = T[lang] || T.en;
  const cur = order.currency || 'LAK';
  const total = Number(order.total) || 0;
  const paid = Math.max(0, Number(order.amount_paid) || 0);
  const cod = Math.max(0, total - paid);
  const carrier = order.shipping_carrier || '';
  const note = [order.delivery_date ? `${t.delivery} ${esc(String(order.delivery_date).slice(0, 10))}` : '', esc(order.shipping_notes || '')]
    .filter(Boolean).join('<br>');

  const pay = cod > 0
    ? `<div class="lbl-pay cod"><div><div class="b">${t.collect}</div>${paid > 0 ? `<div class="sub">${t.deposit} ${formatCurrency(paid, cur)}</div>` : ''}</div><div class="amt">${formatCurrency(cod, cur)}</div></div>`
    : `<div class="lbl-pay paid">${SVG.check}<span>${t.paidFull}, ${t.noCollect}</span></div>`;

  return `<section class="lbl">
    <div class="lbl-head"><span class="shop">${esc(shop.shop_name || '')}</span><span class="date">${dayOf(order.created_at)}</span></div>
    <div class="lbl-to">
      <div class="lbl-k">${t.to}</div>
      <div class="lbl-name">${esc(order.customer_name || '-')}</div>
      ${order.customer_phone ? `<div class="lbl-line lbl-phone">${SVG.phone}<span>${esc(order.customer_phone)}</span></div>` : ''}
      ${order.customer_address ? `<div class="lbl-line lbl-addr">${SVG.pin}<span>${esc(order.customer_address)}</span></div>` : ''}
    </div>
    ${pay}
    ${carrier || order.tracking_number ? `<div class="lbl-ship">
      ${carrier ? `<span class="lbl-carrier">${SVG.truck}${esc(carrier)}</span>` : '<span></span>'}
      ${order.tracking_number ? `<span class="lbl-track">${esc(order.tracking_number)}</span>` : ''}
    </div>` : ''}
    ${note ? `<div class="lbl-note">${note}</div>` : ''}
    <div class="lbl-from"><span>${t.from}: <b>${esc(shop.shop_name || '')}</b></span><span>${esc(shop.shop_phone || '')}</span></div>
  </section>`;
}

export function printShippingLabel(order, shop = {}, lang = 'lo') {
  return printShippingLabels([order], shop, lang);
}

// Several delivery bills in one print job, one per page.
export function printShippingLabels(orders, shop = {}, lang = 'lo') {
  if (!orders?.length) return false;
  return openAndPrint(orders.map(o => shippingLabelHtml(o, shop, lang)).join(''));
}
