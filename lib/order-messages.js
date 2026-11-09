// Shop-facing text for a refused sale (codes from lib/orders.js). Safe to import in the browser.

const T = {
  lo: {
    out_of_stock: list => `ສິນຄ້າບໍ່ພໍ: ${list.map(x => `${x.name} (ເຫຼືອ ${x.available}, ຕ້ອງການ ${x.wanted})`).join(', ')}`,
    price_changed: d => `ລາຄາ ${d?.name || 'ສິນຄ້າ'} ຖືກປ່ຽນ ໂຫຼດສິນຄ້າໃໝ່ແລ້ວລອງອີກຄັ້ງ`,
    product_not_found: 'ມີສິນຄ້າທີ່ບໍ່ມີແລ້ວ ໂຫຼດສິນຄ້າໃໝ່ແລ້ວລອງອີກຄັ້ງ',
    coupon_invalid: 'ຄູປອງໃຊ້ບໍ່ໄດ້ແລ້ວ (ໝົດອາຍຸ ຫຼື ໃຊ້ຄົບແລ້ວ)',
    no_items: 'ຍັງບໍ່ມີສິນຄ້າໃນລາຍການ', bad_quantity: 'ຈຳນວນສິນຄ້າບໍ່ຖືກຕ້ອງ', bad_currency: 'ສະກຸນເງິນນີ້ໃຊ້ບໍ່ໄດ້',
    other: 'ບັນທຶກບໍ່ສຳເລັດ ກວດສອບອິນເຕີເນັດແລ້ວລອງໃໝ່',
  },
  th: {
    out_of_stock: list => `สินค้าไม่พอ: ${list.map(x => `${x.name} (เหลือ ${x.available}, ต้องการ ${x.wanted})`).join(', ')}`,
    price_changed: d => `ราคา ${d?.name || 'สินค้า'} ถูกเปลี่ยน โหลดสินค้าใหม่แล้วลองอีกครั้ง`,
    product_not_found: 'มีสินค้าที่ไม่มีแล้ว โหลดสินค้าใหม่แล้วลองอีกครั้ง',
    coupon_invalid: 'คูปองใช้ไม่ได้แล้ว (หมดอายุหรือใช้ครบแล้ว)',
    no_items: 'ยังไม่มีสินค้าในรายการ', bad_quantity: 'จำนวนสินค้าไม่ถูกต้อง', bad_currency: 'สกุลเงินนี้ใช้ไม่ได้',
    other: 'บันทึกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
  },
  en: {
    out_of_stock: list => `Not enough stock: ${list.map(x => `${x.name} (${x.available} left, ${x.wanted} wanted)`).join(', ')}`,
    price_changed: d => `The price of ${d?.name || 'a product'} changed. Reload products and try again.`,
    product_not_found: 'A product is no longer available. Reload products and try again.',
    coupon_invalid: 'The coupon can no longer be used (expired or used up).',
    no_items: 'Nothing in the order yet', bad_quantity: 'A quantity is not valid', bad_currency: "This currency can't be used",
    other: "The sale wasn't saved. Check your connection and try again.",
  },
};

export function orderErrorText(lang, code, detail) {
  const t = T[lang] || T.en;
  const v = t[code];
  if (typeof v === 'function') return v(detail || (code === 'out_of_stock' ? [] : null));
  return v || t.other;
}

// Codes after which the product list on screen is stale and should be reloaded.
export const RELOAD_PRODUCTS = new Set(['out_of_stock', 'price_changed', 'product_not_found']);
