'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from './layout';
import { t } from '../lib/i18n';
import { formatCurrency } from '../lib/currency';
import Link from 'next/link';

function ymd(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function rangeFor(preset) {
  const now = new Date();
  const today = ymd(now);
  switch (preset) {
    case 'this_week': {
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return [ymd(mon), today];
    }
    case 'last_week': {
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return [ymd(mon), ymd(sun)];
    }
    case 'this_month':
      return [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), today];
    case 'last_month':
      return [ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), ymd(new Date(now.getFullYear(), now.getMonth(), 0))];
    default:
      return [today, today];
  }
}

const PRESETS = ['today', 'this_week', 'last_week', 'this_month', 'last_month'];

const COPY = {
  lo: {
    salesToday: 'ຍອດຂາຍມື້ນີ້', salesRange: 'ຍອດຂາຍໃນຊ່ວງທີ່ເລືອກ', orders: 'ອໍເດີ້', avg: 'ສະເລ່ຍຕໍ່ບິນ',
    profit: 'ກຳໄລຂັ້ນຕົ້ນ', openPos: 'ເປີດໜ້າຂາຍ', from: 'ຈາກ', to: 'ເຖິງ',
    pending: n => `${n} ອໍເດີ້ອອນລາຍລໍຖ້າຈັດສົ່ງ`, goOrders: 'ເປີດລາຍການສັ່ງ',
    top: 'ສິນຄ້າຂາຍດີ', topNote: 'ນັບຈາກທຸກການຂາຍ', sold: 'ຂາຍແລ້ວ', noTop: 'ເມື່ອມີການຂາຍ ສິນຄ້າຂາຍດີຈະສະແດງທີ່ນີ້',
    low: 'ສິນຄ້າໃກ້ໝົດ', lowNote: n => `ເຫຼືອບໍ່ເກີນ ${n} ຊິ້ນ`, lowEmpty: 'ສະຕ໋ອກພຽງພໍທຸກລາຍການ', left: 'ເຫຼືອ', out: 'ໝົດ',
    manage: 'ເຕີມສະຕ໋ອກ', channel: 'ຊ່ອງທາງການຂາຍ', currency: 'ສະກຸນເງິນທີ່ຮັບ', noSales: 'ຍັງບໍ່ມີການຂາຍໃນຊ່ວງນີ້',
    export: 'ດາວໂຫຼດອໍເດີ້ (JSON)', loading: 'ກຳລັງໂຫຼດ…',
  },
  th: {
    salesToday: 'ยอดขายวันนี้', salesRange: 'ยอดขายช่วงที่เลือก', orders: 'ออเดอร์', avg: 'เฉลี่ยต่อบิล',
    profit: 'กำไรขั้นต้น', openPos: 'เปิดหน้าขาย', from: 'จาก', to: 'ถึง',
    pending: n => `${n} ออเดอร์ออนไลน์รอจัดส่ง`, goOrders: 'เปิดรายการสั่งซื้อ',
    top: 'สินค้าขายดี', topNote: 'นับจากยอดขายทั้งหมด', sold: 'ขายแล้ว', noTop: 'เมื่อมียอดขาย สินค้าขายดีจะแสดงที่นี่',
    low: 'สินค้าใกล้หมด', lowNote: n => `เหลือไม่เกิน ${n} ชิ้น`, lowEmpty: 'สต็อกเพียงพอทุกรายการ', left: 'เหลือ', out: 'หมด',
    manage: 'เติมสต็อก', channel: 'ช่องทางการขาย', currency: 'สกุลเงินที่รับ', noSales: 'ยังไม่มียอดขายในช่วงนี้',
    export: 'ดาวน์โหลดออเดอร์ (JSON)', loading: 'กำลังโหลด…',
  },
  en: {
    salesToday: 'Sales today', salesRange: 'Sales in selected period', orders: 'Orders', avg: 'Average per bill',
    profit: 'Gross profit', openPos: 'Open checkout', from: 'From', to: 'To',
    pending: n => `${n} online ${n === 1 ? 'order is' : 'orders are'} waiting to ship`, goOrders: 'Open orders',
    top: 'Best sellers', topNote: 'Across all sales', sold: 'sold', noTop: 'Best sellers appear here once you make sales',
    low: 'Running low', lowNote: n => `${n} or fewer left`, lowEmpty: 'Every product is well stocked', left: 'left', out: 'Out',
    manage: 'Restock', channel: 'Sales channel', currency: 'Currencies received', noSales: 'No sales in this period yet',
    export: 'Download orders (JSON)', loading: 'Loading…',
  },
};

export default function Dashboard() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [report, setReport] = useState(null);
  const [products, setProducts] = useState([]);
  const [threshold, setThreshold] = useState(5);
  const [preset, setPreset] = useState('today');
  const [[fromDate, toDate], setRange] = useState(() => rangeFor('today'));

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/shop-settings').then(r => r.json()).then(s => {
      if (Number.isFinite(Number(s.low_stock_threshold))) setThreshold(Number(s.low_stock_threshold));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/reports?from=${fromDate}&to=${toDate}`)
      .then(r => r.json())
      .then(d => { if (alive && !d.error) setReport(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [fromDate, toDate]);

  function choosePreset(p) {
    setPreset(p);
    setRange(rangeFor(p));
  }

  function setFrom(v) {
    setPreset('');
    setRange(([, to]) => [v, v > to ? v : to]);
  }

  function setTo(v) {
    setPreset('');
    setRange(([from]) => [v < from ? v : from, v]);
  }

  function productName(p) {
    if (lang === 'lo') return p.name_lo || p.name_en || p.name_th;
    if (lang === 'th') return p.name_th || p.name_en || p.name_lo;
    return p.name_en || p.name_lo || p.name_th;
  }

  async function exportData() {
    const res = await fetch('/api/export?type=orders');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ppsystems-orders-${fromDate}-${toDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!report) {
    return (
      <div className="max-w-7xl" aria-busy="true">
        <div className="rounded-2xl bg-ink h-64 animate-pulse" />
        <p className="sr-only">{c.loading}</p>
      </div>
    );
  }

  const day = report.daySales || { count: 0, total: 0 };
  const orderCount = Number(day.count) || 0;
  const salesTotal = Number(day.total) || 0;
  const avgOrder = orderCount ? salesTotal / orderCount : 0;
  const profit = report.profitReport || {};
  const marginPct = profit.revenue ? ((profit.gross_profit / profit.revenue) * 100).toFixed(1) : '0.0';
  const isRange = fromDate !== toDate;

  const daily = (report.dailyData || []).map(d => ({ date: new Date(d.date), total: Number(d.total) || 0 }));
  const maxDaily = Math.max(1, ...daily.map(d => d.total));

  const top = (report.topProductsAllTime || report.topProducts || []).slice(0, 5);
  const maxQty = Math.max(1, ...top.map(p => Number(p.total_qty) || 0));

  const lowStock = products
    .filter(p => p.status !== 'hidden' && (p.stock_in_stock || 0) <= threshold)
    .sort((a, b) => (a.stock_in_stock || 0) - (b.stock_in_stock || 0))
    .slice(0, 8);

  const byType = report.salesByType || [];
  const typeTotal = byType.reduce((s, x) => s + (Number(x.total) || 0), 0);

  return (
    <div className="max-w-7xl space-y-6">
      <section className="rounded-2xl bg-ink text-white overflow-hidden" aria-labelledby="sales-heading">
        <div className="p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Period">
            {PRESETS.map(p => (
              <button
                key={p}
                role="tab"
                aria-selected={preset === p}
                onClick={() => choosePreset(p)}
                className={`px-3.5 py-1.5 rounded-full text-[0.8rem] font-semibold transition-colors ${
                  preset === p ? 'bg-gold text-ink' : 'text-slate-300 hover:bg-ink-soft hover:text-white'
                }`}
              >
                {t(p, lang)}
              </button>
            ))}
          </div>

          <div className="mt-7 flex flex-col lg:flex-row lg:items-end gap-8">
            <div className="flex-1 min-w-0">
              <p id="sales-heading" className="text-sm text-slate-400">{isRange ? c.salesRange : c.salesToday}</p>
              <p className="mt-1 text-[2.5rem] lg:text-[3.25rem] leading-none font-extrabold text-gold num tracking-tight break-words">
                {formatCurrency(salesTotal, 'LAK')}
              </p>
              <dl className="mt-6 grid grid-cols-3 gap-4 max-w-xl">
                <div>
                  <dt className="text-xs text-slate-400">{c.orders}</dt>
                  <dd className="mt-0.5 text-lg font-bold num">{orderCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">{c.avg}</dt>
                  <dd className="mt-0.5 text-lg font-bold num">{formatCurrency(avgOrder, 'LAK')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">{c.profit}</dt>
                  <dd className="mt-0.5 text-lg font-bold num">
                    {formatCurrency(profit.gross_profit || 0, 'LAK')}
                    <span className="ml-1.5 text-xs font-medium text-slate-400">{marginPct}%</span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col gap-3 lg:items-end shrink-0">
              <Link
                href="/pos"
                className="inline-flex items-center justify-center gap-2 bg-gold text-ink font-bold px-6 py-3 rounded-xl hover:bg-gold-dark hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                  <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8zM9 8V6a3 3 0 0 1 6 0v2" />
                </svg>
                {c.openPos}
              </Link>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <label className="flex items-center gap-1.5">
                  {c.from}
                  <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)}
                    className="rounded-md !bg-ink-soft !border-ink-line text-white px-2 py-1 [color-scheme:dark]" />
                </label>
                <label className="flex items-center gap-1.5">
                  {c.to}
                  <input type="date" value={toDate} onChange={e => setTo(e.target.value)}
                    className="rounded-md !bg-ink-soft !border-ink-line text-white px-2 py-1 [color-scheme:dark]" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {daily.length > 1 && (
          <div className="px-6 lg:px-8 pb-6">
            <div className="flex items-end gap-1 h-16" aria-hidden="true">
              {daily.map((d, i) => (
                <div
                  key={i}
                  title={`${d.date.toLocaleDateString()}: ${formatCurrency(d.total, 'LAK')}`}
                  className={`flex-1 min-w-[4px] rounded-t-sm ${i === daily.length - 1 ? 'bg-gold' : 'bg-gold/35'}`}
                  style={{ height: `${Math.max(4, (d.total / maxDaily) * 100)}%` }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[0.7rem] text-slate-500 num">
              <span>{daily[0].date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
              <span>{daily[daily.length - 1].date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
        )}
      </section>

      {report.pendingOnlineOrders > 0 && (
        <Link
          href="/orders"
          className="flex items-center justify-between gap-4 rounded-xl border border-gold/50 bg-gold-soft px-5 py-3.5 text-ink hover:border-gold transition-colors"
        >
          <span className="font-semibold">{c.pending(report.pendingOnlineOrders)}</span>
          <span className="text-sm font-semibold text-gold-dark shrink-0">{c.goOrders}</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3 bg-white rounded-2xl border border-line p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-bold text-ink text-lg">{c.top}</h2>
            <span className="text-xs text-slate-500">{c.topNote}</span>
          </div>
          {top.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {top.map((p, i) => {
                const qty = Number(p.total_qty) || 0;
                return (
                  <li key={p.sku || i} className="flex items-center gap-4">
                    <span className={`w-7 text-center text-sm font-bold num ${i === 0 ? 'text-gold-dark' : 'text-slate-400'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-semibold text-ink truncate">{productName(p)}</p>
                        <p className="text-sm text-slate-600 shrink-0 num">{qty} {c.sold}</p>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-canvas overflow-hidden">
                        <div className={`h-full rounded-full ${i === 0 ? 'bg-gold' : 'bg-primary/70'}`} style={{ width: `${(qty / maxQty) * 100}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-6 text-sm text-slate-500">{c.noTop}</p>
          )}
        </section>

        <section className="lg:col-span-2 bg-white rounded-2xl border border-line p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-bold text-ink text-lg">{c.low}</h2>
            <span className="text-xs text-slate-500">{c.lowNote(threshold)}</span>
          </div>
          {lowStock.length > 0 ? (
            <>
              <ul className="mt-4 divide-y divide-line">
                {lowStock.map(p => {
                  const qty = p.stock_in_stock || 0;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{productName(p)}</p>
                        <p className="text-xs text-slate-400">{p.sku}</p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 num ${qty === 0 ? 'text-danger' : 'text-warning'}`}>
                        {qty === 0 ? c.out : `${c.left} ${qty}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Link href="/inventory" className="mt-4 inline-flex text-sm font-semibold text-primary hover:text-gold-dark">{c.manage}</Link>
            </>
          ) : (
            <p className="mt-6 text-sm text-success font-medium">{c.lowEmpty}</p>
          )}
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="bg-white rounded-2xl border border-line p-6">
          <h2 className="font-bold text-ink text-lg">{c.channel}</h2>
          {byType.length > 0 ? (
            <>
              <div className="mt-5 flex h-2.5 rounded-full overflow-hidden bg-canvas" aria-hidden="true">
                {byType.map(x => (
                  <div key={x.order_type} className={x.order_type === 'online' ? 'bg-gold' : 'bg-primary'}
                    style={{ width: `${typeTotal ? ((Number(x.total) || 0) / typeTotal) * 100 : 0}%` }} />
                ))}
              </div>
              <ul className="mt-4 space-y-2.5">
                {byType.map(x => (
                  <li key={x.order_type} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className={`w-2.5 h-2.5 rounded-full ${x.order_type === 'online' ? 'bg-gold' : 'bg-primary'}`} />
                      {t(x.order_type, lang)}
                      <span className="text-slate-400 num">({x.count})</span>
                    </span>
                    <span className="font-semibold text-ink num">{formatCurrency(Number(x.total) || 0, 'LAK')}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-6 text-sm text-slate-500">{c.noSales}</p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-line p-6">
          <h2 className="font-bold text-ink text-lg">{c.currency}</h2>
          {(report.salesByCurrency || []).length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {report.salesByCurrency.map(sc => (
                <li key={sc.currency} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-slate-700"><strong className="text-ink">{sc.currency}</strong> <span className="text-slate-400 num">({sc.count})</span></span>
                  <span className="font-semibold text-ink num">{formatCurrency(Number(sc.total) || 0, sc.currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-slate-500">{c.noSales}</p>
          )}
        </section>
      </div>

      <div className="flex justify-end">
        <button onClick={exportData} className="text-sm text-slate-500 hover:text-primary underline-offset-4 hover:underline">
          {c.export}
        </button>
      </div>
    </div>
  );
}
