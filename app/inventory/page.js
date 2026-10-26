'use client';
import { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';
import { Icon, IconButton, Button, Modal, Field, SearchInput, Chip, Pill, EmptyState, Toolbar, inputCls, card } from '../../components/ui';

const STOCK_REASONS = {
  lo: { stock_in: 'ຮັບສິນຄ້າເຂົ້າ', count: 'ນັບສະຕ໋ອກໃໝ່', damaged: 'ເສຍຫາຍ / ເສຍ', return: 'ລູກຄ້າສົ່ງຄືນ', adjustment: 'ອື່ນໆ' },
  th: { stock_in: 'รับสินค้าเข้า', count: 'นับสต็อกใหม่', damaged: 'เสียหาย / สูญหาย', return: 'ลูกค้าคืนสินค้า', adjustment: 'อื่นๆ' },
  en: { stock_in: 'Received stock', count: 'Stock count', damaged: 'Damaged / lost', return: 'Customer return', adjustment: 'Other' },
};

const COPY = {
  lo: {
    search: 'ຄົ້ນຫາສິນຄ້າ ຫຼື SKU', receive: 'ຮັບສິນຄ້າເຂົ້າ', all: 'ທັງໝົດ', low: 'ໃກ້ໝົດ', zero: 'ໝົດສະຕ໋ອກ',
    in_stock: 'ມີຂອງ', in_transit: 'ກຳລັງມາ', pre_order: 'ສັ່ງຈອງ', ready_to_ship: 'ພ້ອມສົ່ງ',
    product: 'ສິນຄ້າ', adjust: 'ປັບສະຕ໋ອກ', options: n => `${n} ຕົວເລືອກ`, empty: 'ຍັງບໍ່ມີສິນຄ້າ', noMatch: 'ບໍ່ພົບສິນຄ້າ',
    batches: 'ລໍ້ດສິນຄ້າ', noBatches: 'ຍັງບໍ່ມີສະຕ໋ອກ ໃຊ້ຟອມດ້ານລຸ່ມເພື່ອຮັບສິນຄ້າເຂົ້າ', batch: 'ເລກລໍ້ດ', eta: 'ຄາດວ່າຈະມາຮອດ',
    qty: 'ຈຳນວນ', status: 'ສະຖານະ', reason: 'ເຫດຜົນ', note: 'ໝາຍເຫດ', save: 'ບັນທຶກ', remove: 'ລຶບລໍ້ດ', removeAsk: 'ລຶບລໍ້ດນີ້? ຈຳນວນຈະຖືກຫັກອອກຈາກສະຕ໋ອກ',
    addBatch: 'ຮັບສິນຄ້າເຂົ້າ', product_: 'ສິນຄ້າ', choose: 'ເລືອກສິນຄ້າ', variantNote: 'ປ່ຽນຈຳນວນແຕ່ລະຕົວເລືອກ ແລ້ວກົດບັນທຶກ',
    saved: 'ບັນທຶກແລ້ວ', failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ', needQty: 'ໃສ່ຈຳນວນທີ່ຫຼາຍກວ່າ 0', unchanged: 'ຍັງບໍ່ໄດ້ປ່ຽນຈຳນວນ',
    history: 'ເບິ່ງປະຫວັດສະຕ໋ອກ',
  },
  th: {
    search: 'ค้นหาสินค้าหรือ SKU', receive: 'รับสินค้าเข้า', all: 'ทั้งหมด', low: 'ใกล้หมด', zero: 'สินค้าหมด',
    in_stock: 'มีของ', in_transit: 'กำลังมา', pre_order: 'สั่งจอง', ready_to_ship: 'พร้อมส่ง',
    product: 'สินค้า', adjust: 'ปรับสต็อก', options: n => `${n} ตัวเลือก`, empty: 'ยังไม่มีสินค้า', noMatch: 'ไม่พบสินค้า',
    batches: 'ล็อตสินค้า', noBatches: 'ยังไม่มีสต็อก ใช้ฟอร์มด้านล่างเพื่อรับสินค้าเข้า', batch: 'เลขล็อต', eta: 'คาดว่าจะมาถึง',
    qty: 'จำนวน', status: 'สถานะ', reason: 'เหตุผล', note: 'หมายเหตุ', save: 'บันทึก', remove: 'ลบล็อต', removeAsk: 'ลบล็อตนี้? จำนวนจะถูกหักออกจากสต็อก',
    addBatch: 'รับสินค้าเข้า', product_: 'สินค้า', choose: 'เลือกสินค้า', variantNote: 'เปลี่ยนจำนวนแต่ละตัวเลือก แล้วกดบันทึก',
    saved: 'บันทึกแล้ว', failed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง', needQty: 'ใส่จำนวนที่มากกว่า 0', unchanged: 'ยังไม่ได้เปลี่ยนจำนวน',
    history: 'ดูประวัติสต็อก',
  },
  en: {
    search: 'Search product or SKU', receive: 'Receive stock', all: 'All', low: 'Running low', zero: 'Sold out',
    in_stock: 'In stock', in_transit: 'On the way', pre_order: 'Pre-ordered', ready_to_ship: 'Ready to ship',
    product: 'Product', adjust: 'Adjust', options: n => `${n} options`, empty: 'No products yet', noMatch: 'No matching products',
    batches: 'Batches', noBatches: 'No stock yet. Use the form below to receive stock.', batch: 'Batch no.', eta: 'Expected',
    qty: 'Qty', status: 'Status', reason: 'Reason', note: 'Note', save: 'Save', remove: 'Remove batch', removeAsk: 'Remove this batch? Its quantity is taken out of stock.',
    addBatch: 'Receive stock', product_: 'Product', choose: 'Choose a product', variantNote: 'Change the quantity of each option, then save.',
    saved: 'Saved', failed: "Couldn't save. Try again.", needQty: 'Enter a quantity above 0', unchanged: 'No quantities changed',
    history: 'View stock history',
  },
};

const BUCKETS = ['in_stock', 'in_transit', 'pre_order', 'ready_to_ship'];
const BUCKET_TONE = { in_stock: 'green', in_transit: 'navy', pre_order: 'gold', ready_to_ship: 'violet' };

export default function InventoryPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(5);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(null); // product id, or 'new'

  useEffect(() => {
    load();
    fetch('/api/shop-settings').then(r => r.json()).then(s => {
      if (Number.isFinite(Number(s.low_stock_threshold))) setThreshold(Number(s.low_stock_threshold));
    }).catch(() => {});
  }, []);

  async function load() {
    try {
      const [p, b] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/inventory').then(r => r.json()),
      ]);
      setProducts(Array.isArray(p) ? p : []);
      setBatches(Array.isArray(b) ? b : []);
    } finally {
      setLoading(false);
    }
  }

  function nameOf(p) {
    if (lang === 'lo') return p.name_lo || p.name_en || p.name_th;
    if (lang === 'th') return p.name_th || p.name_en || p.name_lo;
    return p.name_en || p.name_lo || p.name_th;
  }

  const qty = (p, bucket) => Number(p[`stock_${bucket}`]) || 0;

  const totals = useMemo(() => {
    const m = { in_stock: 0, in_transit: 0, pre_order: 0, ready_to_ship: 0 };
    for (const p of products) for (const b of BUCKETS) m[b] += qty(p, b);
    return m;
  }, [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      const s = qty(p, 'in_stock');
      if (filter === 'low' && !(s > 0 && s <= threshold)) return false;
      if (filter === 'zero' && s !== 0) return false;
      if (BUCKETS.includes(filter) && qty(p, filter) === 0) return false;
      if (!q) return true;
      return [p.name_lo, p.name_th, p.name_en, p.sku].some(v => v && String(v).toLowerCase().includes(q));
    });
  }, [products, search, filter, threshold]);

  const lowCount = products.filter(p => { const s = qty(p, 'in_stock'); return s > 0 && s <= threshold; }).length;
  const zeroCount = products.filter(p => qty(p, 'in_stock') === 0).length;
  const active = open && open !== 'new' ? products.find(p => p.id === open) : null;

  return (
    <div className="max-w-7xl">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-line bg-line mb-5">
        {BUCKETS.map(b => (
          <button key={b} onClick={() => setFilter(filter === b ? '' : b)} aria-pressed={filter === b}
            className={`text-left px-5 py-4 transition-colors ${filter === b ? 'bg-ink text-white' : 'bg-white hover:bg-canvas'}`}>
            <span className={`block text-xs ${filter === b ? 'text-slate-400' : 'text-slate-500'}`}>{c[b]}</span>
            <span className={`block mt-1 text-2xl font-extrabold num ${filter === b ? 'text-gold' : 'text-ink'}`}>{totals[b].toLocaleString()}</span>
          </button>
        ))}
      </section>

      <Toolbar actions={<Button icon="plus" onClick={() => setOpen('new')}>{c.receive}</Button>}>
        <SearchInput value={search} onChange={setSearch} placeholder={c.search} className="w-full sm:w-72" />
        <Chip active={!filter} onClick={() => setFilter('')} count={products.length}>{c.all}</Chip>
        <Chip active={filter === 'low'} onClick={() => setFilter('low')} count={lowCount}>{c.low}</Chip>
        <Chip active={filter === 'zero'} onClick={() => setFilter('zero')} count={zeroCount}>{c.zero}</Chip>
      </Toolbar>

      <section className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="p-6 space-y-3" aria-busy="true">{[0, 1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-canvas animate-pulse" />)}</div>
        ) : visible.length === 0 ? (
          <EmptyState icon="box" title={products.length ? c.noMatch : c.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="text-left px-5 py-3">{c.product}</th>
                  {BUCKETS.map(b => <th key={b} className={`text-right px-4 py-3 ${b === 'in_stock' ? '' : 'hidden md:table-cell'}`}>{c[b]}</th>)}
                  <th className="px-4 py-3"><span className="sr-only">{c.adjust}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map(p => {
                  const s = qty(p, 'in_stock');
                  return (
                    <tr key={p.id} className={`hover:bg-canvas/60 ${p.status === 'hidden' ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-lg bg-canvas overflow-hidden shrink-0 flex items-center justify-center text-slate-300">
                            {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Icon name="image" className="w-5 h-5" />}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate max-w-[16rem]">{nameOf(p) || p.sku}</p>
                            <p className="text-xs text-slate-500 num">
                              {p.sku}{p.has_variants && p.variants?.length > 0 && <span className="ml-2">{c.options(p.variants.length)}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      {BUCKETS.map(b => {
                        const v = qty(p, b);
                        const tone = b === 'in_stock' ? (v === 0 ? 'text-danger' : v <= threshold ? 'text-warning' : 'text-ink') : v ? 'text-ink' : 'text-slate-300';
                        return <td key={b} className={`px-4 py-3 text-right font-bold num ${tone} ${b === 'in_stock' ? '' : 'hidden md:table-cell'}`}>{v}</td>;
                      })}
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" tone="ghost" onClick={() => setOpen(p.id)}>{c.adjust}</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-4 text-right">
        <a href="/stock-log" className="text-sm font-semibold text-primary hover:text-gold-dark">{c.history}</a>
      </div>

      {open && (
        <StockEditor
          key={open}
          product={active}
          products={products}
          batches={batches}
          c={c}
          lang={lang}
          nameOf={nameOf}
          onClose={() => setOpen(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function StockEditor({ product, products, batches, c, lang, nameOf, onClose, onChanged }) {
  const reasons = STOCK_REASONS[lang] || STOCK_REASONS.en;
  const [productId, setProductId] = useState(product?.id || '');
  const target = product || products.find(p => String(p.id) === String(productId)) || null;
  const hasVariants = !!(target?.has_variants && target.variants?.length);
  const own = batches.filter(b => target && b.product_id === target.id);

  const [variantQty, setVariantQty] = useState(() => Object.fromEntries((product?.variants || []).map(v => [v.id, v.quantity])));
  const [reason, setReason] = useState(product ? 'count' : 'stock_in');
  const [note, setNote] = useState('');
  const [add, setAdd] = useState({ quantity: '', status: 'in_stock', batch_number: '', expected_arrival: '' });
  const [edit, setEdit] = useState(null); // { id, quantity, status }
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!product && target) setVariantQty(Object.fromEntries((target.variants || []).map(v => [v.id, v.quantity])));
  }, [productId]);

  async function call(url, method, body) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error();
  }

  async function wrap(fn) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: c.saved });
      await onChanged();
    } catch (e) {
      setMsg({ ok: false, text: e.message || c.failed });
    } finally {
      setBusy(false);
    }
  }

  const saveVariants = () => wrap(async () => {
    const changed = target.variants.filter(v => Number(variantQty[v.id]) !== Number(v.quantity));
    if (!changed.length) throw new Error(c.unchanged);
    for (const v of changed) {
      await call('/api/variants', 'PUT', { ...v, quantity: Math.max(0, parseInt(variantQty[v.id]) || 0), reason, note });
    }
  });

  const receive = () => wrap(async () => {
    const q = parseInt(add.quantity);
    if (!(q > 0)) throw new Error(c.needQty);
    await call('/api/inventory', 'POST', {
      product_id: target.id, quantity: q, status: add.status, batch_number: add.batch_number,
      expected_arrival: add.expected_arrival || null, reason, notes: note,
    });
    setAdd({ quantity: '', status: 'in_stock', batch_number: '', expected_arrival: '' });
    setNote('');
  });

  const saveBatch = b => wrap(async () => {
    await call('/api/inventory', 'PUT', {
      id: b.id, quantity: Math.max(0, parseInt(edit.quantity) || 0), status: edit.status,
      batch_number: b.batch_number, expected_arrival: b.expected_arrival ? String(b.expected_arrival).slice(0, 10) : null,
      reason, notes: note,
    });
    setEdit(null);
  });

  const removeBatch = b => wrap(async () => {
    await call(`/api/inventory?id=${b.id}`, 'DELETE');
    setConfirmId(null);
  });

  const reasonFields = (
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label={c.reason}>
        <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
          {Object.entries(reasons).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label={c.note}><input value={note} onChange={e => setNote(e.target.value)} className={inputCls} /></Field>
    </div>
  );

  return (
    <Modal open onClose={() => !busy && onClose()} size="lg"
      title={target ? nameOf(target) || target.sku : c.receive}
      description={target ? target.sku : undefined}>
      <div className="space-y-6">
        {!product && (
          <Field label={c.product_}>
            <select value={productId} onChange={e => setProductId(e.target.value)} className={inputCls}>
              <option value="">{c.choose}</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.sku} {nameOf(p)}</option>)}
            </select>
          </Field>
        )}

        {target && hasVariants && (
          <section>
            <p className="text-sm text-slate-500">{c.variantNote}</p>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {target.variants.map(v => {
                const changed = Number(variantQty[v.id]) !== Number(v.quantity);
                return (
                  <li key={v.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{[v.color, v.size].filter(Boolean).join(' / ') || '-'}</p>
                      <p className="text-xs text-slate-500 num">{target.sku}{v.sku_suffix}{changed && <span className="ml-2 text-gold-dark">{v.quantity} → {variantQty[v.id] || 0}</span>}</p>
                    </div>
                    <input type="number" min="0" aria-label={c.qty} value={variantQty[v.id] ?? ''}
                      onChange={e => setVariantQty({ ...variantQty, [v.id]: e.target.value })}
                      className={`${inputCls} w-28 text-right font-bold num`} />
                  </li>
                );
              })}
            </ul>
            <div className="mt-4">{reasonFields}</div>
            <div className="mt-4 flex justify-end"><Button onClick={saveVariants} disabled={busy}>{c.save}</Button></div>
          </section>
        )}

        {target && !hasVariants && (
          <>
            <section>
              <h3 className="font-bold text-ink text-sm">{c.batches}</h3>
              {own.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">{c.noBatches}</p>
              ) : (
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {own.map(b => (
                    <li key={b.id} className="py-2.5">
                      {edit?.id === b.id ? (
                        <div className="flex flex-wrap items-end gap-2">
                          <input type="number" min="0" aria-label={c.qty} value={edit.quantity} onChange={e => setEdit({ ...edit, quantity: e.target.value })} className={`${inputCls} w-24 text-right num`} />
                          <select aria-label={c.status} value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value })} className={`${inputCls} w-auto`}>
                            {BUCKETS.map(s => <option key={s} value={s}>{c[s]}</option>)}
                          </select>
                          <Button size="sm" onClick={() => saveBatch(b)} disabled={busy}>{c.save}</Button>
                          <Button size="sm" tone="subtle" onClick={() => setEdit(null)}>{t('cancel', lang)}</Button>
                        </div>
                      ) : confirmId === b.id ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-danger">{c.removeAsk}</span>
                          <div className="flex gap-2">
                            <Button size="sm" tone="danger" onClick={() => removeBatch(b)} disabled={busy}>{c.remove}</Button>
                            <Button size="sm" tone="subtle" onClick={() => setConfirmId(null)}>{t('cancel', lang)}</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg font-extrabold text-ink num w-12 text-right">{b.quantity}</span>
                            <Pill tone={BUCKET_TONE[b.status]}>{c[b.status]}</Pill>
                            <span className="text-xs text-slate-500 truncate">
                              {b.batch_number && <>{c.batch} {b.batch_number} </>}
                              {b.expected_arrival && <>{c.eta} {String(b.expected_arrival).slice(0, 10)}</>}
                            </span>
                          </div>
                          <div className="flex shrink-0">
                            <IconButton icon="edit" label={c.adjust} onClick={() => setEdit({ id: b.id, quantity: b.quantity, status: b.status })} />
                            <IconButton icon="trash" tone="danger" label={c.remove} onClick={() => setConfirmId(b.id)} />
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl bg-canvas p-4">
              <h3 className="font-bold text-ink text-sm">{c.addBatch}</h3>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label={c.qty}><input type="number" min="1" value={add.quantity} onChange={e => setAdd({ ...add, quantity: e.target.value })} className={`${inputCls} text-right num`} /></Field>
                <Field label={c.status}>
                  <select value={add.status} onChange={e => setAdd({ ...add, status: e.target.value })} className={inputCls}>
                    {BUCKETS.map(s => <option key={s} value={s}>{c[s]}</option>)}
                  </select>
                </Field>
                <Field label={c.batch}><input value={add.batch_number} onChange={e => setAdd({ ...add, batch_number: e.target.value })} className={inputCls} /></Field>
                <Field label={c.eta}><input type="date" value={add.expected_arrival} onChange={e => setAdd({ ...add, expected_arrival: e.target.value })} className={inputCls} /></Field>
              </div>
              <div className="mt-3">{reasonFields}</div>
              <div className="mt-3 flex justify-end"><Button icon="plus" onClick={receive} disabled={busy}>{c.addBatch}</Button></div>
            </section>
          </>
        )}

        {msg && msg.text && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm font-medium ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>}
      </div>
    </Modal>
  );
}
