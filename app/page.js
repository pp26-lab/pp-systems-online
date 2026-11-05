'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from './layout';
import { formatCurrency } from '../lib/currency';
import Link from 'next/link';

// Home: answers two questions the moment it opens —
// "how much did we sell, and is that better than before?" and "what needs doing now?"

function ymd(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Each period and the period just before it, of the same length, for the comparison.
function periods(preset, custom) {
  const now = new Date();
  if (preset === 'today') return { cur: [ymd(now), ymd(now)], prev: [ymd(addDays(now, -1)), ymd(addDays(now, -1))] };
  if (preset === 'week') return { cur: [ymd(addDays(now, -6)), ymd(now)], prev: [ymd(addDays(now, -13)), ymd(addDays(now, -7))] };
  if (preset === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevLast = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevSameDay = new Date(prevFirst.getFullYear(), prevFirst.getMonth(), Math.min(now.getDate(), prevLast.getDate()));
    return { cur: [ymd(first), ymd(now)], prev: [ymd(prevFirst), ymd(prevSameDay)] };
  }
  return { cur: custom, prev: null };
}

const COPY = {
  lo: {
    today: 'ມື້ນີ້', week: '7 ມື້', month: 'ເດືອນນີ້', pick: 'ເລືອກວັນ', from: 'ຈາກ', to: 'ເຖິງ',
    title: { today: 'ຍອດຂາຍມື້ນີ້', week: 'ຍອດຂາຍ 7 ມື້ຫຼ້າສຸດ', month: 'ຍອດຂາຍເດືອນນີ້', custom: 'ຍອດຂາຍຊ່ວງທີ່ເລືອກ' },
    vs: { today: 'ມື້ວານ', week: '7 ມື້ກ່ອນໜ້າ', month: 'ຊ່ວງດຽວກັນເດືອນກ່ອນ' },
    up: (p, w) => `ຂຶ້ນ ${p}% ຈາກ${w}`, down: (p, w) => `ລົງ ${p}% ຈາກ${w}`, same: w => `ເທົ່າກັບ${w}`, prevNone: w => `${w}ຍັງບໍ່ມີຍອດຂາຍ`,
    bills: 'ຈຳນວນບິນ', profit: 'ກຳໄລໂດຍປະມານ', sell: 'ຂາຍສິນຄ້າ',
    todo: 'ຕ້ອງເຮັດ', allDone: 'ຮຽບຮ້ອຍທຸກຢ່າງ ບໍ່ມີວຽກຄ້າງ',
    toShip: n => `${n} ອໍເດີ້ອອນລາຍລໍຖ້າຈັດສົ່ງ`, lowStock: n => `${n} ສິນຄ້າໃກ້ໝົດ`, outStock: n => `${n} ສິນຄ້າໝົດແລ້ວ`, unread: n => `${n} ແຊັດລູກຄ້າຍັງບໍ່ໄດ້ອ່ານ`,
    best: 'ສິນຄ້າຂາຍດີ', bestAll: 'ນັບຈາກທຸກການຂາຍ', sold: n => `${n} ຊິ້ນ`, noBest: 'ຍັງບໍ່ມີການຂາຍ ເມື່ອຂາຍແລ້ວ ສິນຄ້າຂາຍດີຈະຂຶ້ນຢູ່ນີ້',
    noSales: 'ຍັງບໍ່ມີການຂາຍໃນຊ່ວງນີ້', export: 'ດາວໂຫຼດຂໍ້ມູນອໍເດີ້', loading: 'ກຳລັງໂຫຼດ…',
  },
  th: {
    today: 'วันนี้', week: '7 วัน', month: 'เดือนนี้', pick: 'เลือกวัน', from: 'จาก', to: 'ถึง',
    title: { today: 'ยอดขายวันนี้', week: 'ยอดขาย 7 วันล่าสุด', month: 'ยอดขายเดือนนี้', custom: 'ยอดขายช่วงที่เลือก' },
    vs: { today: 'เมื่อวาน', week: '7 วันก่อนหน้า', month: 'ช่วงเดียวกันเดือนก่อน' },
    up: (p, w) => `ขึ้น ${p}% จาก${w}`, down: (p, w) => `ลดลง ${p}% จาก${w}`, same: w => `เท่ากับ${w}`, prevNone: w => `${w}ยังไม่มียอดขาย`,
    bills: 'จำนวนบิล', profit: 'กำไรโดยประมาณ', sell: 'ขายสินค้า',
    todo: 'ต้องทำ', allDone: 'เรียบร้อยทุกอย่าง ไม่มีงานค้าง',
    toShip: n => `${n} ออเดอร์ออนไลน์รอจัดส่ง`, lowStock: n => `${n} สินค้าใกล้หมด`, outStock: n => `${n} สินค้าหมดแล้ว`, unread: n => `${n} แชทลูกค้ายังไม่ได้อ่าน`,
    best: 'สินค้าขายดี', bestAll: 'นับจากยอดขายทั้งหมด', sold: n => `${n} ชิ้น`, noBest: 'ยังไม่มียอดขาย เมื่อขายแล้วสินค้าขายดีจะขึ้นที่นี่',
    noSales: 'ยังไม่มียอดขายในช่วงนี้', export: 'ดาวน์โหลดข้อมูลออเดอร์', loading: 'กำลังโหลด…',
  },
  en: {
    today: 'Today', week: '7 days', month: 'This month', pick: 'Pick dates', from: 'From', to: 'To',
    title: { today: 'Sales today', week: 'Sales, last 7 days', month: 'Sales this month', custom: 'Sales in selected dates' },
    vs: { today: 'yesterday', week: 'the 7 days before', month: 'the same days last month' },
    up: (p, w) => `Up ${p}% on ${w}`, down: (p, w) => `Down ${p}% on ${w}`, same: w => `Same as ${w}`, prevNone: w => `No sales ${w}`,
    bills: 'Bills', profit: 'Estimated profit', sell: 'Sell',
    todo: 'To do', allDone: 'All caught up, nothing waiting',
    toShip: n => `${n} online ${n === 1 ? 'order' : 'orders'} to ship`, lowStock: n => `${n} ${n === 1 ? 'product is' : 'products are'} running low`, outStock: n => `${n} ${n === 1 ? 'product is' : 'products are'} sold out`, unread: n => `${n} unread customer ${n === 1 ? 'chat' : 'chats'}`,
    best: 'Best sellers', bestAll: 'Across all sales', sold: n => `${n} sold`, noBest: 'Best sellers show here once you start selling',
    noSales: 'No sales in this period yet', export: 'Download order data', loading: 'Loading…',
  },
};

const ICON = {
  truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  box: 'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9',
  chat: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4V5.5z',
  check: 'M5 12.5 10 17l9-10',
  chevron: 'M9 6l6 6-6 6',
  bag: 'M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8zM9 8V6a3 3 0 0 1 6 0v2',
};
const Svg = ({ d, className = 'w-5 h-5', w = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={d} /></svg>
);

export default function Dashboard() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [preset, setPreset] = useState('today');
  const [custom, setCustom] = useState(() => [ymd(new Date()), ymd(new Date())]);
  const [report, setReport] = useState(null);
  const [prevTotal, setPrevTotal] = useState(null);
  const [products, setProducts] = useState([]);
  const [threshold, setThreshold] = useState(5);
  const [badges, setBadges] = useState({});
  const [features, setFeatures] = useState({});

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/shop-settings').then(r => r.json()).then(s => {
      if (Number.isFinite(Number(s.low_stock_threshold))) setThreshold(Number(s.low_stock_threshold));
    }).catch(() => {});
    fetch('/api/badges').then(r => r.json()).then(setBadges).catch(() => {});
    fetch('/api/features').then(r => (r.ok ? r.json() : {})).then(setFeatures).catch(() => {});
  }, []);

  const { cur, prev } = periods(preset, custom);

  useEffect(() => {
    let alive = true;
    setPrevTotal(null);
    fetch(`/api/reports?from=${cur[0]}&to=${cur[1]}`).then(r => r.json())
      .then(d => { if (alive && !d.error) setReport(d); }).catch(() => {});
    if (prev) {
      fetch(`/api/reports?from=${prev[0]}&to=${prev[1]}`).then(r => r.json())
        .then(d => { if (alive && !d.error) setPrevTotal(Number(d.daySales?.total) || 0); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [cur[0], cur[1], preset]);

  function nameOf(p) {
    if (lang === 'lo') return p.name_lo || p.name_en || p.name_th;
    if (lang === 'th') return p.name_th || p.name_en || p.name_lo;
    return p.name_en || p.name_lo || p.name_th;
  }

  async function exportData() {
    const data = await fetch('/api/export?type=orders').then(r => r.json());
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${cur[0]}-${cur[1]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const total = Number(report?.daySales?.total) || 0;
  const bills = Number(report?.daySales?.count) || 0;
  const profit = Number(report?.profitReport?.gross_profit) || 0;

  // Comparison line, only when there is a previous period to compare with.
  let trend = null;
  if (preset !== 'custom' && prevTotal !== null && report) {
    const w = c.vs[preset];
    if (prevTotal === 0) trend = total > 0 ? { tone: 'up', text: c.prevNone(w) } : null;
    else {
      const pct = Math.round(((total - prevTotal) / prevTotal) * 100);
      trend = pct > 0 ? { tone: 'up', text: c.up(pct, w) } : pct < 0 ? { tone: 'down', text: c.down(Math.abs(pct), w) } : { tone: 'same', text: c.same(w) };
    }
  }

  const daily = (report?.dailyData || []).map(d => ({ date: new Date(d.date), total: Number(d.total) || 0 }));
  const maxDaily = Math.max(1, ...daily.map(d => d.total));

  // Same rules as the stock page, so the number here matches the list the link opens.
  const inStock = p => Number(p.stock_in_stock) || 0;
  const lowCount = products.filter(p => inStock(p) > 0 && inStock(p) <= threshold).length;
  const outCount = products.filter(p => inStock(p) === 0).length;
  const todo = [
    badges.pending_orders > 0 && { href: '/orders', icon: ICON.truck, text: c.toShip(badges.pending_orders), tone: 'text-[#8A4B00] bg-[#FFF3DE]' },
    outCount > 0 && { href: '/inventory?filter=zero', icon: ICON.box, text: c.outStock(outCount), tone: 'text-danger bg-red-50' },
    lowCount > 0 && { href: '/inventory?filter=low', icon: ICON.box, text: c.lowStock(lowCount), tone: 'text-warning bg-[#FFF3DE]' },
    features.chat && badges.chat_unread > 0 && { href: '/chat', icon: ICON.chat, text: c.unread(badges.chat_unread), tone: 'text-primary-dark bg-gold-soft' },
  ].filter(Boolean);

  const periodTop = report?.topProducts || [];
  const top = (periodTop.length ? periodTop : report?.topProductsAllTime || []).slice(0, 5);
  const topIsAllTime = !periodTop.length && top.length > 0;
  const maxQty = Math.max(1, ...top.map(p => Number(p.total_qty) || 0));

  const tabs = [['today', c.today], ['week', c.week], ['month', c.month], ['custom', c.pick]];

  return (
    <div className="max-w-6xl">
      {/* Period + main action */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div role="tablist" aria-label="Period" className="inline-flex p-1 rounded-lg bg-white border border-line">
          {tabs.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={preset === key} onClick={() => setPreset(key)}
              className={`px-3.5 sm:px-4 min-h-10 lg:min-h-9 rounded-md text-sm font-semibold transition-colors ${
                preset === key ? 'bg-gold-soft text-primary-dark' : 'text-slate-500 hover:text-ink'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <Link href="/pos" className="hidden lg:inline-flex items-center gap-2 px-5 min-h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark">
          <Svg d={ICON.bag} className="w-5 h-5" />{c.sell}
        </Link>
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-slate-600">
          <label className="flex items-center gap-2">{c.from}
            <input type="date" value={custom[0]} max={custom[1]} onChange={e => setCustom([e.target.value, e.target.value > custom[1] ? e.target.value : custom[1]])}
              className="px-3 min-h-10 rounded-lg border border-line bg-white text-ink" />
          </label>
          <label className="flex items-center gap-2">{c.to}
            <input type="date" value={custom[1]} min={custom[0]} onChange={e => setCustom([e.target.value < custom[0] ? e.target.value : custom[0], e.target.value])}
              className="px-3 min-h-10 rounded-lg border border-line bg-white text-ink" />
          </label>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3 items-start">
        {/* The one bold element: the sales figure */}
        <section className="lg:col-span-2 rounded-xl bg-ink text-white p-6 sm:p-8" aria-labelledby="sales-title" aria-busy={!report}>
          <h2 id="sales-title" className="text-sm text-slate-300">{c.title[preset]}</h2>
          {!report ? (
            <div className="mt-3 h-14 w-2/3 rounded-lg bg-ink-soft animate-pulse" />
          ) : (
            <>
              <p className="mt-2 text-[2.4rem] sm:text-[3.25rem] leading-none font-extrabold text-gold num tracking-tight break-words">
                {formatCurrency(total, 'LAK')}
              </p>
              <p className={`mt-3 min-h-5 text-sm font-semibold ${trend?.tone === 'up' ? 'text-[#6EE7B7]' : trend?.tone === 'down' ? 'text-[#FCA5A5]' : 'text-slate-400'}`}>
                {trend ? <>{trend.tone === 'up' ? '▲ ' : trend.tone === 'down' ? '▼ ' : ''}{trend.text}</> : (total === 0 ? c.noSales : '')}
              </p>
              <dl className="mt-6 pt-5 border-t border-ink-line grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <dt className="text-xs text-slate-400">{c.bills}</dt>
                  <dd className="mt-1 text-xl font-bold num">{bills}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">{c.profit}</dt>
                  <dd className="mt-1 text-xl font-bold num">{formatCurrency(profit, 'LAK')}</dd>
                </div>
              </dl>
              {daily.length > 1 && (
                <div className="mt-6">
                  <div className="flex items-end gap-1 h-14" aria-hidden="true">
                    {daily.map((d, i) => (
                      <div key={i} title={`${d.date.toLocaleDateString()}: ${formatCurrency(d.total, 'LAK')}`}
                        className={`flex-1 min-w-[4px] rounded-t-sm ${i === daily.length - 1 ? 'bg-gold' : 'bg-gold/35'}`}
                        style={{ height: `${Math.max(4, (d.total / maxDaily) * 100)}%` }} />
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[0.7rem] text-slate-500 num">
                    <span>{daily[0].date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                    <span>{daily[daily.length - 1].date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <div className="space-y-5">
          {/* What needs doing now */}
          <section className="bg-white rounded-xl border border-line">
            <h2 className="px-5 pt-4 pb-2 font-bold text-ink">{c.todo}</h2>
            {todo.length === 0 ? (
              <p className="px-5 pb-5 flex items-center gap-2 text-sm text-success font-medium">
                <Svg d={ICON.check} className="w-5 h-5" w={2.2} />{c.allDone}
              </p>
            ) : (
              <ul className="pb-2">
                {todo.map(item => (
                  <li key={item.href}>
                    <Link href={item.href} className="flex items-center gap-3 px-5 min-h-14 hover:bg-canvas">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.tone}`}><Svg d={item.icon} /></span>
                      <span className="flex-1 text-sm font-semibold text-ink">{item.text}</span>
                      <Svg d={ICON.chevron} className="w-4 h-4 text-slate-400" w={2} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Best sellers */}
          <section className="bg-white rounded-xl border border-line">
            <div className="px-5 pt-4 pb-2 flex items-baseline justify-between gap-3">
              <h2 className="font-bold text-ink">{c.best}</h2>
              {topIsAllTime && <span className="text-xs text-slate-500">{c.bestAll}</span>}
            </div>
            {top.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-500">{c.noBest}</p>
            ) : (
              <ol className="px-5 pb-4 space-y-3">
                {top.map((p, i) => {
                  const qty = Number(p.total_qty) || 0;
                  return (
                    <li key={p.sku || i}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-ink"><span className="text-slate-400 num mr-2">{i + 1}</span>{nameOf(p)}</span>
                        <span className="shrink-0 font-semibold text-slate-600 num">{c.sold(qty)}</span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-canvas overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${(qty / maxQty) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      <div className="mt-6 text-right">
        <button onClick={exportData} className="text-xs text-slate-400 hover:text-primary hover:underline underline-offset-4">{c.export}</button>
      </div>
    </div>
  );
}
