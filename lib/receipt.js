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
  lo: { receipt: 'ໃບບິນ', label: 'ໃບບິນສິນຄ້າຈັດສົ່ງ', no: 'ເລກທີ', date: 'ວັນທີ', phone: 'ເບີໂທ', address: 'ທີ່ຢູ່',
        delivery: 'ວັນຈັດສົ່ງ', note: 'ໝາຍເຫດ', subtotal: 'ລວມຍ່ອຍ', discount: 'ສ່ວນຫຼຸດ', total: 'ລວມທັງໝົດ', paid: 'ຮັບເງິນ',
        change: 'ເງິນທອນ', method: 'ຊຳລະໂດຍ', cash: 'ເງິນສົດ', transfer: 'ໂອນ', items: 'ລາຍການ', from: 'ຜູ້ສົ່ງ', to: 'ຜູ້ຮັບ',
        tracking: 'ເລກພັດສະດຸ', carrier: 'ຂົນສົ່ງ', thanks: 'ຂອບໃຈທີ່ໃຊ້ບໍລິການ', cod: 'ເກັບເງິນປາຍທາງ (COD)',
        deposit: 'ຈ່າຍແລ້ວ', paidFull: 'ຊຳລະຄົບແລ້ວ' },
  th: { receipt: 'ใบเสร็จรับเงิน', label: 'ใบบิลสินค้าจัดส่ง', no: 'เลขที่', date: 'วันที่', phone: 'โทร', address: 'ที่อยู่',
        delivery: 'วันจัดส่ง', note: 'หมายเหตุ', subtotal: 'รวมย่อย', discount: 'ส่วนลด', total: 'รวมทั้งสิ้น', paid: 'รับเงิน',
        change: 'เงินทอน', method: 'ชำระโดย', cash: 'เงินสด', transfer: 'โอน', items: 'รายการ', from: 'ผู้ส่ง', to: 'ผู้รับ',
        tracking: 'เลขพัสดุ', carrier: 'ขนส่ง', thanks: 'ขอบคุณที่ใช้บริการ', cod: 'เก็บเงินปลายทาง (COD)',
        deposit: 'จ่ายแล้ว', paidFull: 'ชำระครบแล้ว' },
  en: { receipt: 'Receipt', label: 'Delivery bill', no: 'No.', date: 'Date', phone: 'Phone', address: 'Address',
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
  /* Delivery bill: one per page, so several print in one go on a roll or on sheets. */
  .lbl { break-after: page; page-break-after: always; }
  .lbl:last-child { break-after: auto; page-break-after: auto; }
  .lbl-shop { font-size: 13px; text-align: center; padding-bottom: 5px; border-bottom: 2.5px solid #000; }
  .lbl-to { padding: 8px 0 7px; }
  .lbl-name { font-size: 22px; font-weight: 800; line-height: 1.15; word-break: break-word; }
  .lbl-phone { font-size: 19px; font-weight: 800; letter-spacing: .3px; margin-top: 2px; }
  .lbl-addr { font-size: 13px; margin-top: 4px; white-space: pre-line; word-break: break-word; }
  .lbl-ship { display: flex; align-items: stretch; border: 2px solid #000; border-radius: 3px; overflow: hidden; }
  .lbl-carrier { background: #000; color: #fff; font-size: 16px; font-weight: 800; padding: 5px 9px; display: flex; align-items: center;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .lbl-track { flex: 1; padding: 4px 8px; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: flex-end; word-break: break-all; }
  .lbl-cod { border: 3px solid #000; border-radius: 3px; margin-top: 7px; padding: 6px 9px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .lbl-cod .amt { font-size: 24px; font-weight: 800; line-height: 1.1; white-space: nowrap; }
  .lbl-paid { border: 1.5px solid #000; border-radius: 3px; margin-top: 7px; padding: 6px 9px; text-align: center; font-weight: 700; }
  .lbl-note { margin-top: 7px; font-size: 12px; font-weight: 700; white-space: pre-line; }
  .lbl-from { margin-top: 8px; padding-top: 5px; border-top: 1px dashed #000; font-size: 11px; display: flex; justify-content: space-between; gap: 8px; }
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

// Delivery bill for online orders: who it goes to, which carrier, and cash to collect.
// No order number or item list — the carrier and the customer don't need them, and the
// shorter paper is quicker to read at a sorting counter.
function shippingLabelHtml(order, shop, lang) {
  const t = T[lang] || T.en;
  const cur = order.currency || 'LAK';
  const total = Number(order.total) || 0;
  const paid = Math.max(0, Number(order.amount_paid) || 0);
  const cod = Math.max(0, total - paid);
  const carrier = order.shipping_carrier || '';
  const extra = [order.delivery_date ? `${t.delivery} ${esc(String(order.delivery_date).slice(0, 10))}` : '', esc(order.shipping_notes || '')]
    .filter(Boolean).join('<br>');

  return `<section class="lbl">
    <div class="lbl-shop serif b">${esc(shop.shop_name || '')}</div>
    <div class="lbl-to">
      <div class="tag">${t.to}</div>
      <div class="lbl-name">${esc(order.customer_name || '-')}</div>
      ${order.customer_phone ? `<div class="lbl-phone">${esc(order.customer_phone)}</div>` : ''}
      ${order.customer_address ? `<div class="lbl-addr">${esc(order.customer_address)}</div>` : ''}
    </div>
    ${carrier || order.tracking_number ? `<div class="lbl-ship">
      ${carrier ? `<div class="lbl-carrier">${esc(carrier)}</div>` : ''}
      <div class="lbl-track">${esc(order.tracking_number || '')}</div>
    </div>` : ''}
    ${cod > 0
      ? `<div class="lbl-cod"><div><div class="b">${t.cod}</div>${paid > 0 ? `<div class="muted">${t.deposit} ${formatCurrency(paid, cur)}</div>` : ''}</div><div class="amt">${formatCurrency(cod, cur)}</div></div>`
      : `<div class="lbl-paid">${t.paidFull}</div>`}
    ${extra ? `<div class="lbl-note">${extra}</div>` : ''}
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
