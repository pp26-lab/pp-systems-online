'use client';
import { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext } from '../layout';
import { SearchInput, Chip, Pill, EmptyState, Toolbar, card } from '../../components/ui';

const REASONS = {
  lo: { sale: 'ຂາຍ', cancel: 'ຍົກເລີກບິນ', stock_in: 'ຮັບເຂົ້າ', count: 'ນັບໃໝ່', damaged: 'ເສຍຫາຍ', return: 'ສົ່ງຄືນ', initial: 'ສະຕ໋ອກເລີ່ມຕົ້ນ', adjustment: 'ປັບ' },
  th: { sale: 'ขาย', cancel: 'ยกเลิกบิล', stock_in: 'รับเข้า', count: 'นับใหม่', damaged: 'เสียหาย', return: 'คืนสินค้า', initial: 'สต็อกเริ่มต้น', adjustment: 'ปรับ' },
  en: { sale: 'Sale', cancel: 'Order cancelled', stock_in: 'Received', count: 'Count', damaged: 'Damaged', return: 'Return', initial: 'Opening stock', adjustment: 'Adjusted' },
};
const TONE = { sale: 'navy', cancel: 'gray', stock_in: 'green', count: 'gold', damaged: 'red', return: 'violet', initial: 'green', adjustment: 'gold' };

const COPY = {
  lo: { search: 'ຄົ້ນຫາສິນຄ້າ, SKU ຫຼື ໝາຍເຫດ', all: 'ທັງໝົດ', in: 'ເຂົ້າ', out: 'ອອກ', empty: 'ຍັງບໍ່ມີການເຄື່ອນໄຫວສະຕ໋ອກ', noMatch: 'ບໍ່ພົບລາຍການ', order: n => `ບິນ #${n}`, limit: 'ສະແດງ 500 ລາຍການຫຼ້າສຸດ' },
  th: { search: 'ค้นหาสินค้า, SKU หรือหมายเหตุ', all: 'ทั้งหมด', in: 'เข้า', out: 'ออก', empty: 'ยังไม่มีการเคลื่อนไหวสต็อก', noMatch: 'ไม่พบรายการ', order: n => `บิล #${n}`, limit: 'แสดง 500 รายการล่าสุด' },
  en: { search: 'Search product, SKU or note', all: 'All', in: 'In', out: 'Out', empty: 'No stock movements yet', noMatch: 'No matching movements', order: n => `Order #${n}`, limit: 'Showing the latest 500 movements' },
};

export default function StockLogPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const reasons = REASONS[lang] || REASONS.en;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetch('/api/stock-movements').then(r => r.json())
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function nameOf(m) {
    if (lang === 'lo') return m.name_lo || m.name_en || m.name_th;
    if (lang === 'th') return m.name_th || m.name_en || m.name_lo;
    return m.name_en || m.name_lo || m.name_th;
  }

  const counts = useMemo(() => {
    const m = {};
    for (const r of rows) m[r.reason] = (m[r.reason] || 0) + 1;
    return m;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (reason && r.reason !== reason) return false;
      if (!q) return true;
      return [r.name_lo, r.name_th, r.name_en, r.sku, r.note].some(v => v && String(v).toLowerCase().includes(q));
    });
  }, [rows, search, reason]);

  // Group by local calendar day so the list reads like a ledger.
  const groups = useMemo(() => {
    const out = [];
    for (const r of visible) {
      const d = new Date(r.created_at);
      const key = d.toDateString();
      if (!out.length || out[out.length - 1].key !== key) out.push({ key, date: d, items: [] });
      out[out.length - 1].items.push(r);
    }
    return out;
  }, [visible]);

  const locale = lang === 'lo' ? 'lo-LA' : lang === 'th' ? 'th-TH' : 'en-GB';

  return (
    <div className="max-w-5xl">
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={c.search} className="w-full sm:w-72" />
        <Chip active={!reason} onClick={() => setReason('')} count={rows.length}>{c.all}</Chip>
        {Object.keys(reasons).filter(k => counts[k]).map(k => (
          <Chip key={k} active={reason === k} onClick={() => setReason(k)} count={counts[k]}>{reasons[k]}</Chip>
        ))}
      </Toolbar>

      <section className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="p-6 space-y-3" aria-busy="true">{[0, 1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-canvas animate-pulse" />)}</div>
        ) : groups.length === 0 ? (
          <EmptyState icon="history" title={rows.length ? c.noMatch : c.empty} />
        ) : groups.map(g => {
          const net = g.items.reduce((s, r) => s + Number(r.quantity_change || 0), 0);
          return (
            <div key={g.key}>
              <div className="flex items-center justify-between px-5 py-2.5 bg-canvas border-y border-line first:border-t-0">
                <h2 className="text-sm font-bold text-ink">{g.date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</h2>
                <span className={`text-xs font-bold num ${net > 0 ? 'text-success' : net < 0 ? 'text-danger' : 'text-slate-400'}`}>{net > 0 ? '+' : ''}{net}</span>
              </div>
              <ul className="divide-y divide-line">
                {g.items.map(m => {
                  const q = Number(m.quantity_change || 0);
                  const variant = [m.variant_color, m.variant_size].filter(Boolean).join(' / ');
                  return (
                    <li key={m.id} className="px-5 py-3 flex items-center gap-4">
                      <span className="w-12 text-xs text-slate-400 num shrink-0">{new Date(m.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink truncate">{nameOf(m) || m.sku}{variant && <span className="font-normal text-slate-500"> ({variant})</span>}</p>
                        <p className="text-xs text-slate-500 truncate">
                          <span className="num">{m.sku}</span>
                          {m.reference_type === 'order' && m.reference_id && <span className="ml-2">{c.order(m.reference_id)}</span>}
                          {m.note && <span className="ml-2">{m.note}</span>}
                        </p>
                      </div>
                      <span className="hidden sm:inline-flex"><Pill tone={TONE[m.reason] || 'gray'}>{reasons[m.reason] || m.reason}</Pill></span>
                      <span className={`w-16 text-right text-lg font-extrabold num ${q > 0 ? 'text-success' : 'text-danger'}`}>{q > 0 ? '+' : ''}{q}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
      {rows.length >= 500 && <p className="mt-3 text-xs text-slate-500">{c.limit}</p>}
    </div>
  );
}
