'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { formatCurrency } from '../../lib/currency';
import { Button, EmptyState, inputCls, card } from '../../components/ui';

const COPY = {
  lo: {
    intro: 'ອັດຕາແລກປ່ຽນໃຊ້ຄຳນວນຕົ້ນທຶນສິນຄ້າໃໝ່ ແລະ ຮັບເງິນຕ່າງປະເທດໜ້າຮ້ານ ສິນຄ້າທີ່ເພີ່ມແລ້ວຈະໃຊ້ອັດຕາຕອນທີ່ເພີ່ມ',
    base: 'ສະກຸນເງິນຫຼັກ', updated: d => `ອັບເດດ ${d}`, change: 'ປ່ຽນອັດຕາ', save: 'ບັນທຶກ', cancel: 'ຍົກເລີກ',
    history: 'ປະຫວັດອັດຕາແລກປ່ຽນ', noHistory: 'ຍັງບໍ່ເຄີຍປ່ຽນອັດຕາ', invalid: 'ໃສ່ອັດຕາທີ່ຫຼາຍກວ່າ 0',
    failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ', saved: c => `ບັນທຶກອັດຕາ ${c} ແລ້ວ`,
  },
  th: {
    intro: 'อัตราแลกเปลี่ยนใช้คำนวณต้นทุนสินค้าใหม่และรับเงินต่างประเทศหน้าร้าน สินค้าที่เพิ่มแล้วจะใช้อัตรา ณ วันที่เพิ่ม',
    base: 'สกุลเงินหลัก', updated: d => `อัปเดต ${d}`, change: 'เปลี่ยนอัตรา', save: 'บันทึก', cancel: 'ยกเลิก',
    history: 'ประวัติอัตราแลกเปลี่ยน', noHistory: 'ยังไม่เคยเปลี่ยนอัตรา', invalid: 'ใส่อัตราที่มากกว่า 0',
    failed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง', saved: c => `บันทึกอัตรา ${c} แล้ว`,
  },
  en: {
    intro: 'Rates are used to cost new products and to accept foreign cash at checkout. Products you already added keep the rate from the day they were added.',
    base: 'Base currency', updated: d => `Updated ${d}`, change: 'Change rate', save: 'Save', cancel: 'Cancel',
    history: 'Rate history', noHistory: 'No rate changes yet', invalid: 'Enter a rate above 0',
    failed: "Couldn't save. Try again.", saved: c => `${c} rate saved`,
  },
};

export default function CurrenciesPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [currencies, setCurrencies] = useState([]);
  const [history, setHistory] = useState([]);
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await fetch('/api/currencies').then(r => r.json()).catch(() => ({}));
    setCurrencies(data.currencies || []);
    setHistory(data.history || []);
  }

  function start(cur) {
    setEditing(cur.code);
    setValue(String(cur.rate_to_lak));
    setError('');
  }

  async function save(code) {
    const rate = parseFloat(value);
    if (!(rate > 0)) { setError(c.invalid); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/currencies', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, rate_to_lak: rate }),
      });
      if (!res.ok) throw new Error();
      setEditing(null);
      setFlash(c.saved(code));
      setTimeout(() => setFlash(''), 3000);
      load();
    } catch {
      setError(c.failed);
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...currencies].sort((a, b) => (a.code === 'LAK' ? -1 : b.code === 'LAK' ? 1 : a.code.localeCompare(b.code)));

  return (
    <div className="max-w-5xl">
      <p className="text-sm text-slate-600 max-w-2xl mb-5">{c.intro}</p>
      {flash && <p role="status" className="mb-4 rounded-xl px-4 py-3 text-sm font-medium bg-[#E3F5EC] text-[#0B6B49]">{flash}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sorted.map(cur => {
          const base = cur.code === 'LAK';
          const open = editing === cur.code;
          return (
            <section key={cur.code} className={`${base ? 'bg-gold-soft border-primary/25' : 'bg-white border-line'} rounded-xl border p-5 flex flex-col`}>
              <div className="flex items-baseline justify-between">
                <p className={`text-2xl font-extrabold ${base ? 'text-primary-dark' : 'text-ink'}`}>{cur.code}</p>
                <span className="text-lg text-slate-400">{cur.symbol}</span>
              </div>
              <p className="text-sm text-slate-500">{cur.name}</p>

              <div className="mt-5 flex-1">
                {base ? (
                  <p className="text-sm font-semibold text-primary-dark">{c.base}</p>
                ) : open ? (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">1 {cur.code} = ? LAK</label>
                    <input autoFocus type="number" min="0" step="any" value={value}
                      onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && save(cur.code)}
                      className={`${inputCls} text-right font-bold num`} />
                    {error && <p role="alert" className="mt-1.5 text-xs text-danger">{error}</p>}
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => save(cur.code)} disabled={saving}>{c.save}</Button>
                      <Button size="sm" tone="subtle" onClick={() => setEditing(null)}>{c.cancel}</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">1 {cur.code} =</p>
                    <p className="text-xl font-extrabold text-ink num">{formatCurrency(cur.rate_to_lak, 'LAK')}</p>
                    <p className="mt-1 text-xs text-slate-400">{c.updated(new Date(cur.updated_at).toLocaleDateString())}</p>
                  </>
                )}
              </div>

              {!base && !open && (
                <button onClick={() => start(cur)} className="mt-4 self-start text-sm font-semibold text-primary hover:text-gold-dark">{c.change}</button>
              )}
            </section>
          );
        })}
      </div>

      <section className={`${card} mt-8`}>
        <h2 className="px-6 pt-5 font-bold text-ink text-lg">{c.history}</h2>
        {history.length === 0 ? (
          <EmptyState icon="history" title={c.noHistory} />
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {history.map(h => (
              <li key={h.id} className="px-6 py-3 flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500 num">{new Date(h.recorded_at).toLocaleString()}</span>
                <span className="font-semibold text-ink num">1 {h.from_currency} = {formatCurrency(h.rate, 'LAK')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
