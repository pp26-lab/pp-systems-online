'use client';
import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';
import { formatCurrency, calculateMargin } from '../../lib/currency';
import { Icon, IconButton, Button, Modal, Field, SearchInput, Chip, Pill, EmptyState, Toolbar, Segmented, inputCls, card } from '../../components/ui';

const EMPTY = {
  sku: '', barcode: '', name_lo: '', name_th: '', name_en: '', description: '', category: '',
  cost_price: 0, cost_currency: 'THB', freight_cost: 0, customs_duty: 0,
  proxy_fee: 0, transfer_fee: 0, selling_price_lak: 0, initial_stock: 0,
  wholesale_price_lak: 0, member_price_lak: 0,
  image_url: '', sale_end_date: '', has_variants: 0,
  variant_label_1: '', variant_label_2: '', status: 'active',
};

const COPY = {
  lo: {
    search: 'ຄົ້ນຫາຊື່, SKU ຫຼື ບາໂຄ້ດ', add: 'ເພີ່ມສິນຄ້າ', import: 'ນຳເຂົ້າ CSV', export: 'ສົ່ງອອກ CSV',
    all: 'ທັງໝົດ', active: 'ກຳລັງຂາຍ', hidden: 'ເຊື່ອງ', pre_order: 'ສັ່ງຈອງ', out_of_stock: 'ໝົດສະຕ໋ອກ', low: 'ໃກ້ໝົດ',
    empty: 'ຍັງບໍ່ມີສິນຄ້າ', emptyText: 'ເພີ່ມສິນຄ້າທຳອິດ ຫຼື ນຳເຂົ້າຈາກໄຟລ໌ CSV', noMatch: 'ບໍ່ພົບສິນຄ້າທີ່ກົງກັນ',
    product: 'ສິນຄ້າ', price: 'ລາຄາຂາຍ', stock: 'ສະຕ໋ອກ', status: 'ສະຖານະ', options: n => `${n} ຕົວເລືອກ`, expired: 'ໝົດເຂດຂາຍ',
    edit: 'ແກ້ໄຂ', duplicate: 'ສຳເນົາ', del: 'ລຶບ', delAsk: p => `ລຶບ "${p}"?`, delNote: 'ຖ້າສິນຄ້ານີ້ເຄີຍຂາຍແລ້ວ ລະບົບຈະເຊື່ອງໄວ້ແທນການລຶບ ເພື່ອຮັກສາປະຫວັດການຂາຍ', archived: 'ສິນຄ້ານີ້ມີປະຫວັດການຂາຍ ຈຶ່ງເຊື່ອງໄວ້ແທນການລຶບ',
    duplicated: 'ສຳເນົາແລ້ວ (ຖືກເຊື່ອງໄວ້ ແກ້ໄຂກ່ອນເປີດຂາຍ)', imported: (a, b, e) => `ນຳເຂົ້າ: ເພີ່ມ ${a}, ອັບເດດ ${b}${e ? `, ຜິດພາດ ${e}` : ''}`,
    photos: 'ຮູບພາບ', main: 'ຮູບຫຼັກ', extra: 'ຮູບເພີ່ມເຕີມ (ສົ່ງໃຫ້ລູກຄ້າຜ່ານແຊັດບອດ)', saveFirst: 'ບັນທຶກສິນຄ້າກ່ອນ ຈຶ່ງເພີ່ມຮູບເພີ່ມເຕີມໄດ້',
    upload: 'ອັບໂຫຼດ', remove: 'ເອົາອອກ', details: 'ຂໍ້ມູນສິນຄ້າ', nameLo: 'ຊື່ (ລາວ)', nameTh: 'ຊື່ (ໄທ)', nameEn: 'ຊື່ (ອັງກິດ)',
    skuHint: 'ປ່ອຍວ່າງ ລະບົບຈະສ້າງໃຫ້', barcode: 'ບາໂຄ້ດ', category: 'ໝວດໝູ່', endDate: 'ວັນໝົດເຂດຂາຍ', endHint: 'ປ່ອຍວ່າງ = ຂາຍຕະຫຼອດ',
    pricing: 'ຕົ້ນທຶນ ແລະ ລາຄາ', costNote: 'ຕົ້ນທຶນທັງໝົດຄິດເປັນສະກຸນທີ່ຊື້', landed: 'ຕົ້ນທຶນລວມ (ກີບ)', retail: 'ລາຄາຂາຍ', wholesale: 'ລາຄາສົ່ງ', member: 'ລາຄາສະມາຊິກ', margin: 'ກຳໄລ',
    variants: 'ຕົວເລືອກ (ເຊັ່ນ ສີ / ຂະໜາດ)', variantsNone: 'ສິນຄ້ານີ້ບໍ່ມີຕົວເລືອກ ສະຕ໋ອກນັບລວມ', addOption: 'ເພີ່ມຕົວເລືອກ',
    label1: 'ຊື່ຕົວເລືອກທີ 1', label2: 'ຊື່ຕົວເລືອກທີ 2', suffix: 'ທ້າຍ SKU', qty: 'ຈຳນວນ',
    opening: 'ສະຕ໋ອກເລີ່ມຕົ້ນ', save: 'ບັນທຶກສິນຄ້າ', saving: 'ກຳລັງບັນທຶກ…',
    needName: 'ໃສ່ຊື່ສິນຄ້າຢ່າງໜ້ອຍ 1 ພາສາ', dupSku: 'SKU ນີ້ມີສິນຄ້າອື່ນໃຊ້ແລ້ວ', failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ',
  },
  th: {
    search: 'ค้นหาชื่อ, SKU หรือบาร์โค้ด', add: 'เพิ่มสินค้า', import: 'นำเข้า CSV', export: 'ส่งออก CSV',
    all: 'ทั้งหมด', active: 'กำลังขาย', hidden: 'ซ่อน', pre_order: 'พรีออเดอร์', out_of_stock: 'สินค้าหมด', low: 'ใกล้หมด',
    empty: 'ยังไม่มีสินค้า', emptyText: 'เพิ่มสินค้าชิ้นแรก หรือนำเข้าจากไฟล์ CSV', noMatch: 'ไม่พบสินค้าที่ตรงกัน',
    product: 'สินค้า', price: 'ราคาขาย', stock: 'สต็อก', status: 'สถานะ', options: n => `${n} ตัวเลือก`, expired: 'หมดเขตขาย',
    edit: 'แก้ไข', duplicate: 'ทำสำเนา', del: 'ลบ', delAsk: p => `ลบ "${p}"?`, delNote: 'ถ้าสินค้านี้เคยขายแล้ว ระบบจะซ่อนไว้แทนการลบ เพื่อเก็บประวัติการขาย', archived: 'สินค้านี้มีประวัติการขาย จึงซ่อนไว้แทนการลบ',
    duplicated: 'ทำสำเนาแล้ว (ถูกซ่อนไว้ แก้ไขก่อนเปิดขาย)', imported: (a, b, e) => `นำเข้า: เพิ่ม ${a}, อัปเดต ${b}${e ? `, ผิดพลาด ${e}` : ''}`,
    photos: 'รูปภาพ', main: 'รูปหลัก', extra: 'รูปเพิ่มเติม (ส่งให้ลูกค้าผ่านแชทบอท)', saveFirst: 'บันทึกสินค้าก่อน จึงเพิ่มรูปเพิ่มเติมได้',
    upload: 'อัปโหลด', remove: 'เอาออก', details: 'ข้อมูลสินค้า', nameLo: 'ชื่อ (ลาว)', nameTh: 'ชื่อ (ไทย)', nameEn: 'ชื่อ (อังกฤษ)',
    skuHint: 'เว้นว่าง ระบบจะสร้างให้', barcode: 'บาร์โค้ด', category: 'หมวดหมู่', endDate: 'วันหมดเขตขาย', endHint: 'เว้นว่าง = ขายตลอด',
    pricing: 'ต้นทุนและราคา', costNote: 'ต้นทุนทั้งหมดคิดเป็นสกุลเงินที่ซื้อ', landed: 'ต้นทุนรวม (กีบ)', retail: 'ราคาขาย', wholesale: 'ราคาส่ง', member: 'ราคาสมาชิก', margin: 'กำไร',
    variants: 'ตัวเลือก (เช่น สี / ขนาด)', variantsNone: 'สินค้านี้ไม่มีตัวเลือก สต็อกนับรวม', addOption: 'เพิ่มตัวเลือก',
    label1: 'ชื่อตัวเลือกที่ 1', label2: 'ชื่อตัวเลือกที่ 2', suffix: 'ท้าย SKU', qty: 'จำนวน',
    opening: 'สต็อกเริ่มต้น', save: 'บันทึกสินค้า', saving: 'กำลังบันทึก…',
    needName: 'ใส่ชื่อสินค้าอย่างน้อย 1 ภาษา', dupSku: 'SKU นี้มีสินค้าอื่นใช้แล้ว', failed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',
  },
  en: {
    search: 'Search name, SKU or barcode', add: 'Add product', import: 'Import CSV', export: 'Export CSV',
    all: 'All', active: 'On sale', hidden: 'Hidden', pre_order: 'Pre-order', out_of_stock: 'Sold out', low: 'Running low',
    empty: 'No products yet', emptyText: 'Add your first product or import a CSV file', noMatch: 'No matching products',
    product: 'Product', price: 'Price', stock: 'Stock', status: 'Status', options: n => `${n} options`, expired: 'Sale ended',
    edit: 'Edit', duplicate: 'Duplicate', del: 'Delete', delAsk: p => `Delete "${p}"?`, delNote: 'If this product has been sold before, it is hidden instead so your sales history stays intact.', archived: 'This product has sales history, so it was hidden instead of deleted',
    duplicated: 'Copy created and hidden. Edit it before putting it on sale.', imported: (a, b, e) => `Imported: ${a} added, ${b} updated${e ? `, ${e} failed` : ''}`,
    photos: 'Photos', main: 'Main photo', extra: 'Extra photos (sent to customers by the chatbot)', saveFirst: 'Save the product first to add extra photos',
    upload: 'Upload', remove: 'Remove', details: 'Product details', nameLo: 'Name (Lao)', nameTh: 'Name (Thai)', nameEn: 'Name (English)',
    skuHint: 'Leave blank to generate one', barcode: 'Barcode', category: 'Category', endDate: 'Stop selling on', endHint: 'Blank = no end date',
    pricing: 'Cost and price', costNote: 'All costs are in the purchase currency', landed: 'Landed cost (LAK)', retail: 'Retail price', wholesale: 'Wholesale price', member: 'Member price', margin: 'Margin',
    variants: 'Options (e.g. color / size)', variantsNone: 'No options. Stock is counted as one item.', addOption: 'Add option',
    label1: 'First option name', label2: 'Second option name', suffix: 'SKU suffix', qty: 'Qty',
    opening: 'Opening stock', save: 'Save product', saving: 'Saving…',
    needName: 'Enter a product name in at least one language', dupSku: 'Another product already uses this SKU', failed: "Couldn't save. Try again.",
  },
};

const STATUS_TONE = { active: 'green', hidden: 'gray', pre_order: 'gold', out_of_stock: 'red' };

export default function ProductsPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState([]);
  const [threshold, setThreshold] = useState(5);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [notice, setNotice] = useState(null); // { text, tone }
  const [editing, setEditing] = useState(null); // { form, id, variants, images }
  const [confirmDel, setConfirmDel] = useState(null);
  const importRef = useRef(null);

  useEffect(() => {
    load();
    fetch('/api/currencies').then(r => r.json()).then(d => setCurrencies(d.currencies || [])).catch(() => {});
    fetch('/api/shop-settings').then(r => r.json()).then(s => {
      if (Number.isFinite(Number(s.low_stock_threshold))) setThreshold(Number(s.low_stock_threshold));
    }).catch(() => {});
  }, []);

  async function load() {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  function say(text, tone = 'green') {
    setNotice({ text, tone });
    setTimeout(() => setNotice(null), 5000);
  }

  function nameOf(p) {
    if (lang === 'lo') return p.name_lo || p.name_en || p.name_th;
    if (lang === 'th') return p.name_th || p.name_en || p.name_lo;
    return p.name_en || p.name_lo || p.name_th;
  }

  const stockOf = p => Number(p.stock_in_stock) || 0;
  const today = new Date().toISOString().slice(0, 10);
  const isExpired = p => p.sale_end_date && String(p.sale_end_date).slice(0, 10) < today;

  const counts = useMemo(() => {
    const m = { active: 0, hidden: 0, pre_order: 0, out_of_stock: 0, low: 0 };
    for (const p of products) {
      m[p.status || 'active'] = (m[p.status || 'active'] || 0) + 1;
      if (p.status !== 'hidden' && stockOf(p) <= threshold) m.low++;
    }
    return m;
  }, [products, threshold]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (filter === 'low') { if (p.status === 'hidden' || stockOf(p) > threshold) return false; }
      else if (filter && (p.status || 'active') !== filter) return false;
      if (!q) return true;
      return [p.name_lo, p.name_th, p.name_en, p.sku, p.barcode, p.category].some(v => v && String(v).toLowerCase().includes(q));
    });
  }, [products, search, filter, threshold]);

  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);

  async function openEditor(p) {
    if (!p) {
      setEditing({ form: { ...EMPTY }, id: null, variants: [], images: [] });
      return;
    }
    const images = await fetch(`/api/products/${p.id}/images`).then(r => r.json()).catch(() => []);
    setEditing({
      form: {
        ...EMPTY, ...p,
        sale_end_date: p.sale_end_date ? String(p.sale_end_date).slice(0, 10) : '',
        variant_label_1: p.variant_label_1 === 'color' ? '' : p.variant_label_1 || '',
        variant_label_2: p.variant_label_2 === 'size' ? '' : p.variant_label_2 || '',
      },
      id: p.id,
      variants: (p.variants || []).map(v => ({ ...v })),
      images: Array.isArray(images) ? images : [],
    });
  }

  async function duplicate(p) {
    const res = await fetch('/api/products/duplicate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }),
    });
    if (res.ok) { say(c.duplicated); load(); } else say(c.failed, 'red');
  }

  async function remove(p) {
    setConfirmDel(null);
    const res = await fetch(`/api/products?id=${p.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { say(c.failed, 'red'); return; }
    if (data.archived) say(c.archived, 'gold');
    load();
  }

  async function importCsv(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/products/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error();
      say(c.imported(data.inserted || 0, data.updated || 0, data.errors?.length || 0), data.errors?.length ? 'gold' : 'green');
      load();
    } catch {
      say(c.failed, 'red');
    }
  }

  return (
    <div className="max-w-7xl">
      <Toolbar actions={
        <>
          <input ref={importRef} type="file" accept=".csv,text/csv" onChange={importCsv} className="sr-only" tabIndex={-1} />
          <Button tone="ghost" icon="upload" onClick={() => importRef.current?.click()}>{c.import}</Button>
          <a href="/api/products/export" className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl px-4 py-2.5 text-sm bg-white text-ink border border-line hover:border-slate-300 hover:bg-canvas">
            <Icon name="download" className="w-4 h-4" strokeWidth={2} />{c.export}
          </a>
          <Button tone="primary" icon="plus" onClick={() => openEditor(null)}>{c.add}</Button>
        </>
      }>
        <SearchInput value={search} onChange={setSearch} placeholder={c.search} className="w-full sm:w-80" />
      </Toolbar>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <Chip active={!filter} onClick={() => setFilter('')} count={products.length}>{c.all}</Chip>
        {['active', 'pre_order', 'hidden', 'out_of_stock', 'low'].map(f => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)} count={counts[f] || 0}>{c[f]}</Chip>
        ))}
      </div>

      {notice && (
        <p role="status" className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
          notice.tone === 'red' ? 'bg-red-50 text-danger' : notice.tone === 'gold' ? 'bg-gold-soft text-[#7A5D1C]' : 'bg-[#E3F2EF] text-[#1E6B60]'
        }`}>{notice.text}</p>
      )}

      <section className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="p-6 space-y-3" aria-busy="true">{[0, 1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl bg-canvas animate-pulse" />)}</div>
        ) : products.length === 0 ? (
          <EmptyState icon="box" title={c.empty} text={c.emptyText}
            action={<Button tone="primary" icon="plus" onClick={() => openEditor(null)}>{c.add}</Button>} />
        ) : visible.length === 0 ? (
          <EmptyState icon="search" title={c.noMatch} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="text-left px-5 py-3">{c.product}</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">{c.category}</th>
                  <th className="text-right px-4 py-3">{c.price}</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">{c.margin}</th>
                  <th className="text-right px-4 py-3">{c.stock}</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">{c.status}</th>
                  <th className="px-3 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map(p => {
                  const margin = calculateMargin(Number(p.selling_price_lak) || 0, Number(p.landed_cost_lak) || 0);
                  const stock = stockOf(p);
                  const expired = isExpired(p);
                  return (
                    <tr key={p.id} className={`hover:bg-canvas/60 ${p.status === 'hidden' ? 'text-slate-400' : ''}`}>
                      <td className="px-5 py-3">
                        <button onClick={() => openEditor(p)} className="flex items-center gap-3 text-left group">
                          <span className="w-11 h-11 rounded-lg bg-canvas overflow-hidden shrink-0 flex items-center justify-center text-slate-300">
                            {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Icon name="image" className="w-5 h-5" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-ink group-hover:text-primary truncate max-w-[16rem]">{nameOf(p) || p.sku}</span>
                            <span className="block text-xs text-slate-500 num">
                              {p.sku}
                              {p.has_variants && p.variants?.length > 0 && <span className="ml-2">{c.options(p.variants.length)}</span>}
                              {expired && <span className="ml-2 text-danger font-semibold">{c.expired}</span>}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{p.category || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink num">{formatCurrency(p.selling_price_lak, 'LAK')}</td>
                      <td className={`px-4 py-3 text-right font-semibold num hidden sm:table-cell ${margin >= 30 ? 'text-success' : margin >= 15 ? 'text-warning' : 'text-danger'}`}>
                        {margin.toFixed(0)}%
                      </td>
                      <td className={`px-4 py-3 text-right font-bold num ${stock === 0 ? 'text-danger' : stock <= threshold ? 'text-warning' : 'text-ink'}`}>{stock}</td>
                      <td className="px-4 py-3 hidden lg:table-cell"><Pill tone={STATUS_TONE[p.status || 'active']}>{c[p.status || 'active']}</Pill></td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end">
                          <IconButton icon="edit" label={c.edit} onClick={() => openEditor(p)} />
                          <IconButton icon="copy" label={c.duplicate} onClick={() => duplicate(p)} />
                          <IconButton icon="trash" label={c.del} tone="danger" onClick={() => setConfirmDel(p)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title={confirmDel ? c.delAsk(nameOf(confirmDel) || confirmDel.sku) : ''} size="sm"
        footer={<>
          <Button tone="ghost" onClick={() => setConfirmDel(null)}>{t('cancel', lang)}</Button>
          <Button tone="danger" icon="trash" onClick={() => remove(confirmDel)}>{c.del}</Button>
        </>}>
        <p className="text-sm text-slate-600">{c.delNote}</p>
      </Modal>

      {editing && (
        <ProductEditor
          key={editing.id || 'new'}
          initial={editing}
          c={c}
          lang={lang}
          currencies={currencies}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ProductEditor({ initial, c, lang, currencies, categories, onClose, onSaved }) {
  const [form, setForm] = useState(initial.form);
  const [variants, setVariants] = useState(initial.variants);
  const [images, setImages] = useState(initial.images);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const id = initial.id;

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const num = k => e => set(k, parseFloat(e.target.value) || 0);

  const rate = form.cost_currency === 'LAK' ? 1 : Number(currencies.find(x => x.code === form.cost_currency)?.rate_to_lak) || 1;
  const foreign = ['cost_price', 'freight_cost', 'customs_duty', 'proxy_fee', 'transfer_fee'].reduce((s, k) => s + (Number(form[k]) || 0), 0);
  const landed = foreign * rate;
  const margin = calculateMargin(Number(form.selling_price_lak) || 0, landed);
  const label1 = form.variant_label_1 || t('color', lang);
  const label2 = form.variant_label_2 || t('size', lang);
  const costCurrencies = ['LAK', ...currencies.map(x => x.code).filter(x => x !== 'LAK')];

  async function upload(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || c.failed);
    return data.url;
  }

  async function uploadMain(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('main');
    setError('');
    try { set('image_url', await upload(file)); } catch (err) { setError(err.message); } finally { setBusy(''); }
  }

  async function uploadExtra(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !id) return;
    setBusy('extra');
    setError('');
    try {
      let count = images.length;
      for (const file of files) {
        if (count >= 5) break;
        const url = await upload(file);
        const res = await fetch(`/api/products/${id}/images`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: url }),
        });
        if (res.ok) {
          const { id: imageId } = await res.json();
          setImages(prev => [...prev, { id: imageId, image_url: url }]);
          count++;
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function removeExtra(imageId) {
    await fetch(`/api/products/${id}/images?image_id=${imageId}`, { method: 'DELETE' });
    setImages(prev => prev.filter(i => i.id !== imageId));
  }

  function setVariant(i, k, v) {
    setVariants(prev => prev.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  }

  async function save() {
    setError('');
    if (![form.name_lo, form.name_th, form.name_en].some(v => v && v.trim())) { setError(c.needName); return; }
    const rows = variants.filter(v => (v.color || '').trim() || (v.size || '').trim());
    setBusy('save');
    try {
      const body = {
        ...form,
        variant_label_1: form.variant_label_1.trim() || 'color',
        variant_label_2: form.variant_label_2.trim() || 'size',
        has_variants: rows.length > 0 ? 1 : 0,
        ...(id ? { id } : {}),
      };
      const res = await fetch('/api/products', {
        method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (res.status === 409) { setError(c.dupSku); return; }
      if (!res.ok) throw new Error();
      const productId = id || result.id;

      const existing = id ? await fetch(`/api/variants?product_id=${productId}`).then(r => r.json()).catch(() => []) : [];
      for (const ev of existing) {
        if (!rows.find(v => v.id === ev.id)) {
          await fetch(`/api/variants?id=${ev.id}&product_id=${productId}`, { method: 'DELETE' });
        }
      }
      for (const v of rows) {
        const payload = { ...v, quantity: parseInt(v.quantity) || 0, product_id: productId };
        await fetch('/api/variants', {
          method: typeof v.id === 'number' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch {
      setError(c.failed);
    } finally {
      setBusy('');
    }
  }

  return (
    <Modal open onClose={() => !busy && onClose()} size="xl" title={id ? t('edit_product', lang) : c.add}
      footer={
        <div className="w-full flex flex-col-reverse sm:flex-row sm:items-center gap-3">
          {error ? <p role="alert" className="text-sm text-danger flex-1">{error}</p> : <span className="flex-1" />}
          <Button tone="ghost" onClick={onClose} disabled={!!busy}>{t('cancel', lang)}</Button>
          <Button tone="primary" onClick={save} disabled={!!busy}>{busy === 'save' ? c.saving : c.save}</Button>
        </div>
      }>
      <div className="space-y-8">
        <section>
          <h3 className="font-bold text-ink">{c.photos}</h3>
          <div className="mt-3 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-slate-500 mb-2">{c.main}</p>
              <div className="w-28 h-28 rounded-xl bg-canvas border border-line overflow-hidden flex items-center justify-center text-slate-300">
                {form.image_url ? <img src={form.image_url} alt="" className="w-full h-full object-cover" /> : <Icon name="image" className="w-8 h-8" strokeWidth={1.3} />}
              </div>
              <div className="mt-2 flex gap-2 text-sm">
                <label className={`font-semibold text-primary hover:text-gold-dark cursor-pointer ${busy === 'main' ? 'opacity-50 pointer-events-none' : ''}`}>
                  {busy === 'main' ? '…' : c.upload}
                  <input type="file" accept="image/*" onChange={uploadMain} className="sr-only" />
                </label>
                {form.image_url && <button onClick={() => set('image_url', '')} className="text-slate-500 hover:text-danger">{c.remove}</button>}
              </div>
            </div>
            <div className="flex-1 min-w-[14rem]">
              <p className="text-xs text-slate-500 mb-2">{c.extra} <span className="num">({images.length}/5)</span></p>
              {id ? (
                <div className="flex flex-wrap gap-2">
                  {images.map(img => (
                    <div key={img.id} className="relative">
                      <img src={img.image_url} alt="" className="w-20 h-20 rounded-lg object-cover border border-line" />
                      <button onClick={() => removeExtra(img.id)} aria-label={c.remove}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-line text-slate-500 hover:text-danger flex items-center justify-center shadow-sm">
                        <Icon name="close" className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <label className={`w-20 h-20 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-gold hover:text-gold-dark cursor-pointer ${busy === 'extra' ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Icon name="plus" className="w-6 h-6" />
                      <span className="sr-only">{c.upload}</span>
                      <input type="file" accept="image/*" multiple onChange={uploadExtra} className="sr-only" />
                    </label>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{c.saveFirst}</p>
              )}
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-bold text-ink">{c.details}</h3>
          <div className="mt-3 grid sm:grid-cols-2 gap-4">
            <Field label={c.nameLo}><input value={form.name_lo} onChange={e => set('name_lo', e.target.value)} className={inputCls} /></Field>
            <Field label={c.nameTh}><input value={form.name_th} onChange={e => set('name_th', e.target.value)} className={inputCls} /></Field>
            <Field label={c.nameEn} className="sm:col-span-2"><input value={form.name_en} onChange={e => set('name_en', e.target.value)} className={inputCls} /></Field>
            <Field label="SKU" hint={c.skuHint}><input value={form.sku} onChange={e => set('sku', e.target.value)} className={`${inputCls} num`} /></Field>
            <Field label={c.barcode}><input value={form.barcode || ''} onChange={e => set('barcode', e.target.value)} className={`${inputCls} num`} /></Field>
            <Field label={c.category}>
              <input list="product-categories" value={form.category || ''} onChange={e => set('category', e.target.value)} className={inputCls} />
              <datalist id="product-categories">{categories.map(x => <option key={x} value={x} />)}</datalist>
            </Field>
            <Field label={c.endDate} hint={c.endHint}>
              <input type="date" value={form.sale_end_date || ''} onChange={e => set('sale_end_date', e.target.value)} className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <span className="block text-sm font-semibold text-ink mb-1.5">{c.status}</span>
              <Segmented value={form.status || 'active'} onChange={v => set('status', v)}
                options={['active', 'pre_order', 'hidden', 'out_of_stock'].map(v => ({ value: v, label: c[v] }))} />
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-bold text-ink">{c.pricing}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{c.costNote}</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label={t('cost', lang)}>
              <div className="flex gap-2">
                <input type="number" min="0" value={form.cost_price || ''} placeholder="0" onChange={num('cost_price')} className={`${inputCls} num`} />
                <select value={form.cost_currency} onChange={e => set('cost_currency', e.target.value)} className="px-2.5 border rounded-xl text-sm">
                  {costCurrencies.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            </Field>
            <Field label={t('freight', lang)}><input type="number" min="0" value={form.freight_cost || ''} placeholder="0" onChange={num('freight_cost')} className={`${inputCls} num`} /></Field>
            <Field label={t('customs', lang)}><input type="number" min="0" value={form.customs_duty || ''} placeholder="0" onChange={num('customs_duty')} className={`${inputCls} num`} /></Field>
            <Field label={t('proxy_fee', lang)}><input type="number" min="0" value={form.proxy_fee || ''} placeholder="0" onChange={num('proxy_fee')} className={`${inputCls} num`} /></Field>
            <Field label={t('transfer_fee', lang)}><input type="number" min="0" value={form.transfer_fee || ''} placeholder="0" onChange={num('transfer_fee')} className={`${inputCls} num`} /></Field>
          </div>

          <div className="mt-4 rounded-2xl bg-ink text-white p-5 grid sm:grid-cols-[1fr_1.2fr_auto] gap-5 items-end">
            <div>
              <p className="text-xs text-slate-400">{c.landed}</p>
              <p className="mt-1 text-xl font-bold num">{formatCurrency(landed, 'LAK')}</p>
            </div>
            <label className="block">
              <span className="block text-xs text-slate-400">{c.retail} (LAK)</span>
              <input type="number" min="0" value={form.selling_price_lak || ''} placeholder="0" onChange={num('selling_price_lak')}
                className="mt-1 w-full px-3 py-2 rounded-xl !bg-ink-soft !border-ink-line text-gold text-xl font-extrabold num" />
            </label>
            <div className="text-right">
              <p className="text-xs text-slate-400">{c.margin}</p>
              <p className={`mt-1 text-xl font-extrabold num ${margin >= 30 ? 'text-[#7FD3C4]' : margin >= 15 ? 'text-gold' : 'text-[#F2A39D]'}`}>{margin.toFixed(1)}%</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label={`${c.wholesale} (LAK)`}><input type="number" min="0" value={form.wholesale_price_lak || ''} placeholder="0" onChange={num('wholesale_price_lak')} className={`${inputCls} num`} /></Field>
            <Field label={`${c.member} (LAK)`}><input type="number" min="0" value={form.member_price_lak || ''} placeholder="0" onChange={num('member_price_lak')} className={`${inputCls} num`} /></Field>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-ink">{c.variants}</h3>
            <Button size="sm" tone="ghost" icon="plus" onClick={() => setVariants(v => [...v, { color: '', size: '', sku_suffix: '', quantity: 0, _tmp: Date.now() }])}>{c.addOption}</Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Field label={c.label1}><input value={form.variant_label_1} placeholder={t('color', lang)} onChange={e => set('variant_label_1', e.target.value)} className={inputCls} /></Field>
            <Field label={c.label2}><input value={form.variant_label_2} placeholder={t('size', lang)} onChange={e => set('variant_label_2', e.target.value)} className={inputCls} /></Field>
          </div>
          {variants.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{c.variantsNone}</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm min-w-[32rem]">
                <thead className="border-b border-line">
                  <tr>
                    <th className="text-left py-2 pr-2">{label1}</th>
                    <th className="text-left py-2 pr-2">{label2}</th>
                    <th className="text-left py-2 pr-2">{c.suffix}</th>
                    <th className="text-right py-2 pr-2">{c.qty}</th>
                    <th className="w-10"><span className="sr-only">{c.remove}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.id || v._tmp}>
                      <td className="py-1.5 pr-2"><input aria-label={label1} value={v.color} onChange={e => setVariant(i, 'color', e.target.value)} className={inputCls} /></td>
                      <td className="py-1.5 pr-2"><input aria-label={label2} value={v.size} onChange={e => setVariant(i, 'size', e.target.value)} className={inputCls} /></td>
                      <td className="py-1.5 pr-2"><input aria-label={c.suffix} value={v.sku_suffix || ''} placeholder="-BL-M" onChange={e => setVariant(i, 'sku_suffix', e.target.value)} className={`${inputCls} num`} /></td>
                      <td className="py-1.5 pr-2"><input aria-label={c.qty} type="number" min="0" value={v.quantity} onChange={e => setVariant(i, 'quantity', parseInt(e.target.value) || 0)} className={`${inputCls} text-right num w-24`} /></td>
                      <td className="py-1.5"><IconButton icon="trash" tone="danger" label={c.remove} onClick={() => setVariants(prev => prev.filter((_, j) => j !== i))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!id && variants.length === 0 && (
          <section>
            <Field label={c.opening} className="max-w-[12rem]">
              <input type="number" min="0" value={form.initial_stock || ''} placeholder="0" onChange={e => set('initial_stock', parseInt(e.target.value) || 0)} className={`${inputCls} num`} />
            </Field>
          </section>
        )}
      </div>
    </Modal>
  );
}
