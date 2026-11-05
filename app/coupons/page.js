'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { formatCurrency } from '../../lib/currency';
import { Button, IconButton, Modal, Field, Segmented, Pill, EmptyState, Toolbar, Chip, inputCls } from '../../components/ui';

const COPY = {
  lo: {
    add: 'ສ້າງຄູປອງ', edit: 'ແກ້ໄຂຄູປອງ', all: 'ທັງໝົດ', live: 'ໃຊ້ໄດ້', off: 'ປິດຢູ່', expired: 'ໝົດອາຍຸ', usedUp: 'ໃຊ້ຄົບແລ້ວ',
    off_: n => `ຫຼຸດ ${n}`, upTo: v => `ສູງສຸດ ${v}`, min: v => `ຊື້ຂັ້ນຕ່ຳ ${v}`, used: (u, l) => l ? `ໃຊ້ແລ້ວ ${u} / ${l}` : `ໃຊ້ແລ້ວ ${u} ຄັ້ງ`,
    until: d => `ໃຊ້ໄດ້ຮອດ ${d}`, noEnd: 'ບໍ່ມີວັນໝົດອາຍຸ', empty: 'ຍັງບໍ່ມີຄູປອງ', emptyText: 'ສ້າງໂຄດສ່ວນຫຼຸດໃຫ້ລູກຄ້າໃຊ້ຕອນຊຳລະເງິນ',
    code: 'ໂຄດຄູປອງ', codeHint: 'ລູກຄ້າພິມໂຄດນີ້ຕອນຊຳລະ ຕົວອັກສອນ ແລະ ຕົວເລກ', type: 'ປະເພດສ່ວນຫຼຸດ', percent: 'ເປີເຊັນ (%)', fixed: 'ຈຳນວນເງິນ (LAK)',
    value: 'ມູນຄ່າສ່ວນຫຼຸດ', minP: 'ຍອດຊື້ຂັ້ນຕ່ຳ (LAK)', cap: 'ຫຼຸດສູງສຸດ (LAK)', limit: 'ຈຳກັດຈຳນວນຄັ້ງ', expires: 'ວັນໝົດອາຍຸ', note: 'ໝາຍເຫດ',
    zeroAny: '0 = ບໍ່ຈຳກັດ', active: 'ເປີດໃຊ້ງານ', save: 'ບັນທຶກ', cancel: 'ຍົກເລີກ', remove: 'ລຶບ', removeAsk: c => `ລຶບຄູປອງ ${c}?`,
    copy: 'ສຳເນົາໂຄດ', copied: 'ສຳເນົາແລ້ວ', toggleOn: 'ເປີດຄູປອງ', toggleOff: 'ປິດຄູປອງ',
    errors: { code_required: 'ໃສ່ໂຄດຄູປອງ', invalid_value: 'ມູນຄ່າຕ້ອງຫຼາຍກວ່າ 0 ແລະ ເປີເຊັນບໍ່ເກີນ 100', duplicate_code: 'ໂຄດນີ້ມີຢູ່ແລ້ວ', failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ' },
  },
  th: {
    add: 'สร้างคูปอง', edit: 'แก้ไขคูปอง', all: 'ทั้งหมด', live: 'ใช้ได้', off: 'ปิดอยู่', expired: 'หมดอายุ', usedUp: 'ใช้ครบแล้ว',
    off_: n => `ลด ${n}`, upTo: v => `สูงสุด ${v}`, min: v => `ซื้อขั้นต่ำ ${v}`, used: (u, l) => l ? `ใช้แล้ว ${u} / ${l}` : `ใช้แล้ว ${u} ครั้ง`,
    until: d => `ใช้ได้ถึง ${d}`, noEnd: 'ไม่มีวันหมดอายุ', empty: 'ยังไม่มีคูปอง', emptyText: 'สร้างโค้ดส่วนลดให้ลูกค้าใช้ตอนชำระเงิน',
    code: 'โค้ดคูปอง', codeHint: 'ลูกค้าพิมพ์โค้ดนี้ตอนชำระ ใช้ตัวอักษรและตัวเลข', type: 'ประเภทส่วนลด', percent: 'เปอร์เซ็นต์ (%)', fixed: 'จำนวนเงิน (LAK)',
    value: 'มูลค่าส่วนลด', minP: 'ยอดซื้อขั้นต่ำ (LAK)', cap: 'ลดสูงสุด (LAK)', limit: 'จำกัดจำนวนครั้ง', expires: 'วันหมดอายุ', note: 'หมายเหตุ',
    zeroAny: '0 = ไม่จำกัด', active: 'เปิดใช้งาน', save: 'บันทึก', cancel: 'ยกเลิก', remove: 'ลบ', removeAsk: c => `ลบคูปอง ${c}?`,
    copy: 'คัดลอกโค้ด', copied: 'คัดลอกแล้ว', toggleOn: 'เปิดคูปอง', toggleOff: 'ปิดคูปอง',
    errors: { code_required: 'ใส่โค้ดคูปอง', invalid_value: 'มูลค่าต้องมากกว่า 0 และเปอร์เซ็นต์ไม่เกิน 100', duplicate_code: 'โค้ดนี้มีอยู่แล้ว', failed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' },
  },
  en: {
    add: 'New coupon', edit: 'Edit coupon', all: 'All', live: 'Active', off: 'Off', expired: 'Expired', usedUp: 'Used up',
    off_: n => `${n} off`, upTo: v => `up to ${v}`, min: v => `Min. spend ${v}`, used: (u, l) => l ? `Used ${u} of ${l}` : `Used ${u} times`,
    until: d => `Valid until ${d}`, noEnd: 'No end date', empty: 'No coupons yet', emptyText: 'Create discount codes customers can use at checkout.',
    code: 'Coupon code', codeHint: 'Customers type this at checkout. Letters and numbers.', type: 'Discount type', percent: 'Percent (%)', fixed: 'Amount (LAK)',
    value: 'Discount', minP: 'Minimum spend (LAK)', cap: 'Maximum discount (LAK)', limit: 'Usage limit', expires: 'Expires on', note: 'Note',
    zeroAny: '0 = no limit', active: 'Active', save: 'Save', cancel: 'Cancel', remove: 'Delete', removeAsk: c => `Delete coupon ${c}?`,
    copy: 'Copy code', copied: 'Copied', toggleOn: 'Turn on', toggleOff: 'Turn off',
    errors: { code_required: 'Enter a coupon code', invalid_value: 'Discount must be above 0, and a percent can be at most 100', duplicate_code: 'This code already exists', failed: "Couldn't save. Try again." },
  },
};

const EMPTY = { code: '', discount_type: 'percent', discount_value: 10, min_purchase: 0, max_discount: 0, usage_limit: 0, expires_at: '', is_active: true, note: '' };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function stateOf(cp) {
  const exp = cp.expires_at ? String(cp.expires_at).slice(0, 10) : '';
  if (exp && exp < today()) return 'expired';
  if (cp.usage_limit > 0 && cp.times_used >= cp.usage_limit) return 'usedUp';
  return cp.is_active ? 'live' : 'off';
}
const STATE_TONE = { live: 'green', off: 'gray', expired: 'red', usedUp: 'gold' };

export default function CouponsPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [copied, setCopied] = useState(null);

  async function load() {
    try {
      const data = await fetch('/api/coupons').then(r => r.json());
      setCoupons(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function open(cp) {
    setError('');
    setForm(cp ? { ...cp, is_active: !!cp.is_active, expires_at: cp.expires_at ? String(cp.expires_at).slice(0, 10) : '', note: cp.note || '' } : { ...EMPTY });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/coupons', {
        method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(c.errors[data.error] || c.errors.failed);
        return;
      }
      setForm(null);
      load();
    } catch {
      setError(c.errors.failed);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(cp) {
    setCoupons(prev => prev.map(x => (x.id === cp.id ? { ...x, is_active: cp.is_active ? 0 : 1 } : x)));
    await fetch('/api/coupons', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cp.id, is_active: !cp.is_active }) });
  }

  async function del() {
    await fetch(`/api/coupons?id=${delTarget.id}`, { method: 'DELETE' });
    setDelTarget(null);
    load();
  }

  function copy(cp) {
    navigator.clipboard?.writeText(cp.code).then(() => { setCopied(cp.id); setTimeout(() => setCopied(null), 1500); });
  }

  const counts = coupons.reduce((m, cp) => { const s = stateOf(cp); m[s] = (m[s] || 0) + 1; return m; }, {});
  const visible = filter ? coupons.filter(cp => stateOf(cp) === filter) : coupons;
  const set = k => e => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="max-w-6xl">
      <Toolbar actions={<Button icon="plus" onClick={() => open(null)}>{c.add}</Button>}>
        <Chip active={!filter} onClick={() => setFilter('')} count={coupons.length}>{c.all}</Chip>
        {['live', 'off', 'expired', 'usedUp'].filter(s => counts[s]).map(s => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)} count={counts[s]}>{c[s]}</Chip>
        ))}
      </Toolbar>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">{[0, 1, 2].map(i => <div key={i} className="h-40 rounded-xl bg-white animate-pulse" />)}</div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-line">
          <EmptyState icon="ticket" title={c.empty} text={c.emptyText} action={!coupons.length && <Button icon="plus" onClick={() => open(null)}>{c.add}</Button>} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(cp => {
            const st = stateOf(cp);
            const live = st === 'live';
            const amount = cp.discount_type === 'percent' ? `${Number(cp.discount_value)}%` : formatCurrency(cp.discount_value, 'LAK');
            return (
              <article key={cp.id} className={`relative flex rounded-xl border overflow-hidden ${live ? 'bg-white border-line' : 'bg-white/70 border-line'}`}>
                {/* Ticket stub: the discount amount is the thing people scan for */}
                <div className={`w-28 shrink-0 flex flex-col items-center justify-center px-2 py-5 border-r border-dashed ${live ? 'bg-gold-soft border-primary/30' : 'bg-canvas border-line'}`}>
                  <span className={`text-2xl font-extrabold num leading-none text-center break-all ${live ? 'text-primary-dark' : 'text-slate-400'}`}>{amount}</span>
                  {cp.discount_type === 'percent' && cp.max_discount > 0 && (
                    <span className="mt-2 text-[0.7rem] text-center text-slate-500">{c.upTo(formatCurrency(cp.max_discount, 'LAK'))}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => copy(cp)} title={c.copy} className="text-left min-w-0">
                      <span className="block text-lg font-extrabold text-ink tracking-wide truncate">{cp.code}</span>
                      <span className="block text-xs text-slate-400">{copied === cp.id ? c.copied : c.copy}</span>
                    </button>
                    <Pill tone={STATE_TONE[st]}>{c[st]}</Pill>
                  </div>
                  <ul className="mt-3 space-y-0.5 text-xs text-slate-500 flex-1">
                    {cp.min_purchase > 0 && <li>{c.min(formatCurrency(cp.min_purchase, 'LAK'))}</li>}
                    <li className="num">{c.used(cp.times_used || 0, cp.usage_limit || 0)}</li>
                    <li>{cp.expires_at ? c.until(String(cp.expires_at).slice(0, 10)) : c.noEnd}</li>
                    {cp.note && <li className="truncate text-slate-400">{cp.note}</li>}
                  </ul>
                  <div className="mt-3 flex items-center justify-between">
                    <button role="switch" aria-checked={!!cp.is_active} aria-label={cp.is_active ? c.toggleOff : c.toggleOn} onClick={() => toggle(cp)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${cp.is_active ? 'bg-success' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${cp.is_active ? 'left-[1.125rem]' : 'left-0.5'}`} />
                    </button>
                    <div className="flex">
                      <IconButton icon="edit" label={c.edit} onClick={() => open(cp)} />
                      <IconButton icon="trash" tone="danger" label={c.remove} onClick={() => setDelTarget(cp)} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={!!form} onClose={() => !busy && setForm(null)} title={form?.id ? c.edit : c.add} size="lg">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Field label={c.code} hint={c.codeHint}>
              <input autoFocus value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                className={`${inputCls} text-lg font-bold tracking-wide uppercase`} maxLength={50} />
            </Field>
            <div>
              <span className="block text-sm font-semibold text-ink mb-1.5">{c.type}</span>
              <Segmented value={form.discount_type} onChange={v => setForm({ ...form, discount_type: v })}
                options={[{ value: 'percent', label: c.percent }, { value: 'fixed', label: c.fixed }]} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={c.value}>
                <input type="number" min="0" max={form.discount_type === 'percent' ? 100 : undefined} step="any" value={form.discount_value} onChange={set('discount_value')} className={`${inputCls} num`} />
              </Field>
              {form.discount_type === 'percent' && (
                <Field label={c.cap} hint={c.zeroAny}><input type="number" min="0" value={form.max_discount} onChange={set('max_discount')} className={`${inputCls} num`} /></Field>
              )}
              <Field label={c.minP} hint={c.zeroAny}><input type="number" min="0" value={form.min_purchase} onChange={set('min_purchase')} className={`${inputCls} num`} /></Field>
              <Field label={c.limit} hint={c.zeroAny}><input type="number" min="0" value={form.usage_limit} onChange={set('usage_limit')} className={`${inputCls} num`} /></Field>
              <Field label={c.expires}><input type="date" value={form.expires_at || ''} onChange={set('expires_at')} className={inputCls} /></Field>
              <Field label={c.note}><input value={form.note} onChange={set('note')} className={inputCls} /></Field>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input type="checkbox" checked={!!form.is_active} onChange={set('is_active')} className="w-4 h-4 accent-[#0E8A5F]" />{c.active}
            </label>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button tone="subtle" onClick={() => setForm(null)}>{c.cancel}</Button>
              <button type="submit" disabled={busy} className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-40">{c.save}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title={delTarget ? c.removeAsk(delTarget.code) : ''} size="sm"
        footer={<><Button tone="subtle" onClick={() => setDelTarget(null)}>{c.cancel}</Button><Button tone="danger" onClick={del}>{c.remove}</Button></>}>
        <p className="text-sm text-slate-600">{delTarget && c.used(delTarget.times_used || 0, delTarget.usage_limit || 0)}</p>
      </Modal>
    </div>
  );
}
