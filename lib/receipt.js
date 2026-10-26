import { formatCurrency } from './currency';

// Prints receipts and shipping labels in their own window so only the paper
// content is printed, sized for 80mm thermal printers.

const T = {
  lo: { receipt: 'ໃບບິນ', label: 'ໃບປະໜ້າພັດສະດຸ', no: 'ເລກທີ', date: 'ວັນທີ', customer: 'ລູກຄ້າ', phone: 'ເບີໂທ', address: 'ທີ່ຢູ່',
        delivery: 'ວັນຈັດສົ່ງ', note: 'ໝາຍເຫດ', subtotal: 'ລວມຍ່ອຍ', discount: 'ສ່ວນຫຼຸດ', total: 'ລວມທັງໝົດ', paid: 'ຮັບເງິນ',
        change: 'ເງິນທອນ', method: 'ຊຳລະໂດຍ', cash: 'ເງິນສົດ', transfer: 'ໂອນ', items: 'ລາຍການ', from: 'ຜູ້ສົ່ງ', to: 'ຜູ້ຮັບ',
        tracking: 'ເລກພັດສະດຸ', thanks: 'ຂອບໃຈທີ່ໃຊ້ບໍລິການ', cod: 'ເກັບເງິນປາຍທາງ' },
  th: { receipt: 'ใบเสร็จรับเงิน', label: 'ใบปะหน้าพัสดุ', no: 'เลขที่', date: 'วันที่', customer: 'ลูกค้า', phone: 'โทร', address: 'ที่อยู่',
        delivery: 'วันจัดส่ง', note: 'หมายเหตุ', subtotal: 'รวมย่อย', discount: 'ส่วนลด', total: 'รวมทั้งสิ้น', paid: 'รับเงิน',
        change: 'เงินทอน', method: 'ชำระโดย', cash: 'เงินสด', transfer: 'โอน', items: 'รายการ', from: 'ผู้ส่ง', to: 'ผู้รับ',
        tracking: 'เลขพัสดุ', thanks: 'ขอบคุณที่ใช้บริการ', cod: 'เก็บเงินปลายทาง' },
  en: { receipt: 'Receipt', label: 'Shipping label', no: 'No.', date: 'Date', customer: 'Customer', phone: 'Phone', address: 'Address',
        delivery: 'Delivery', note: 'Note', subtotal: 'Subtotal', discount: 'Discount', total: 'Total', paid: 'Paid',
        change: 'Change', method: 'Paid by', cash: 'Cash', transfer: 'Transfer', items: 'Items', from: 'From', to: 'To',
        tracking: 'Tracking', thanks: 'Thank you for shopping with us', cod: 'Cash on delivery' },
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

const STYLE = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 5mm 4mm; width: 80mm; font-family: 'Noto Sans Lao','Noto Sans Thai','Segoe UI',sans-serif; font-size: 12px; color: #000; }
  .c { text-align: center; } .r { text-align: right; } .b { font-weight: 700; }
  h1 { font-size: 16px; margin: 0; } .muted { color: #444; font-size: 11px; }
  .rule { border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; vertical-align: top; }
  .row { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; }
  .big { font-size: 15px; font-weight: 800; }
  .logo { width: 40px; height: 40px; object-fit: contain; display: block; margin: 0 auto 4px; }
  .box { border: 1px solid #000; padding: 6px; margin-top: 6px; }
`;

function openAndPrint(html) {
  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><style>${STYLE}</style></head><body>${html}<script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script></body></html>`);
  win.document.close();
  return true;
}

function header(shop) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const logo = shop.shop_logo ? `<img class="logo" src="${esc(shop.shop_logo.startsWith('http') ? shop.shop_logo : origin + shop.shop_logo)}" alt="">` : '';
  return `${logo}<h1 class="c">${esc(shop.shop_name || 'PP Systems')}</h1>
    ${shop.shop_address ? `<div class="c muted">${esc(shop.shop_address)}</div>` : ''}
    ${shop.shop_phone ? `<div class="c muted">${esc(shop.shop_phone)}</div>` : ''}`;
}

export function printReceipt(order, shop = {}, lang = 'lo', extra = {}) {
  const t = T[lang] || T.en;
  const cur = order.currency || 'LAK';
  const items = (order.items || []).map(i => `
    <tr><td colspan="2">${esc(itemName(i, lang))}</td></tr>
    <tr><td class="muted">${i.quantity} × ${formatCurrency(i.unit_price, cur)}</td><td class="r">${formatCurrency(i.total, cur)}</td></tr>`).join('');
  const discount = Number(order.discount) || 0;
  const html = `
    ${header(shop)}
    <div class="c b" style="margin-top:6px">${t.receipt}</div>
    <div class="rule"></div>
    <div class="row"><span>${t.no}</span><span class="b">${esc(order.order_number)}</span></div>
    <div class="row"><span>${t.date}</span><span>${new Date(order.created_at || Date.now()).toLocaleString()}</span></div>
    ${order.customer_name ? `<div class="row"><span>${t.customer}</span><span>${esc(order.customer_name)}</span></div>` : ''}
    ${order.customer_phone ? `<div class="row"><span>${t.phone}</span><span>${esc(order.customer_phone)}</span></div>` : ''}
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

export function printShippingLabel(order, shop = {}, lang = 'lo') {
  const t = T[lang] || T.en;
  const cur = order.currency || 'LAK';
  const items = (order.items || []).map(i => `<div class="row"><span>${esc(itemName(i, lang))}</span><span>× ${i.quantity}</span></div>`).join('');
  const html = `
    <div class="c b">${t.label}</div>
    <div class="box">
      <div class="muted">${t.to}</div>
      <div class="big">${esc(order.customer_name || '-')}</div>
      <div class="b">${esc(order.customer_phone || '')}</div>
      <div style="white-space:pre-line;margin-top:2px">${esc(order.customer_address || '')}</div>
    </div>
    <div class="box">
      <div class="muted">${t.from}</div>
      <div class="b">${esc(shop.shop_name || '')}</div>
      <div>${esc(shop.shop_phone || '')}</div>
    </div>
    <div class="rule"></div>
    <div class="row"><span>${t.no}</span><span class="b">${esc(order.order_number)}</span></div>
    ${order.delivery_date ? `<div class="row"><span>${t.delivery}</span><span>${esc(String(order.delivery_date).slice(0, 10))}</span></div>` : ''}
    ${order.tracking_number ? `<div class="row"><span>${t.tracking}</span><span class="b">${esc(order.tracking_number)}</span></div>` : ''}
    ${order.shipping_notes ? `<div class="row"><span>${t.note}</span><span>${esc(order.shipping_notes)}</span></div>` : ''}
    <div class="rule"></div>
    <div class="muted">${t.items}</div>${items}
    <div class="rule"></div>
    <div class="row big"><span>${t.total}</span><span>${formatCurrency(order.total, cur)}</span></div>`;
  return openAndPrint(html);
}
