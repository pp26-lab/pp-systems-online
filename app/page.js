'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from './layout';
import { t } from '../lib/i18n';
import { formatCurrency } from '../lib/currency';
import Link from 'next/link';

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff)).toISOString().split('T')[0];
}
function getSunday(mondayStr) {
  const d = new Date(mondayStr);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}
function getMonthStart(d) { return d.substring(0, 7) + '-01'; }
function getMonthEnd(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).toISOString().split('T')[0];
}

export default function Dashboard() {
  const { lang } = useContext(AppContext);
  const [report, setReport] = useState(null);
  const [products, setProducts] = useState([]);
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [activePreset, setActivePreset] = useState('today');

  useEffect(() => { fetch('/api/products').then(r => r.json()).then(setProducts); }, []);
  useEffect(() => { fetchReport(); }, [fromDate, toDate]);

  async function fetchReport() {
    const res = await fetch(`/api/reports?from=${fromDate}&to=${toDate}`);
    setReport(await res.json());
  }

  function applyPreset(preset) {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    switch (preset) {
      case 'today': setFromDate(todayStr); setToDate(todayStr); break;
      case 'this_week': { const mon = getMonday(todayStr); setFromDate(mon); setToDate(todayStr); break; }
      case 'last_week': {
        const thisMonday = getMonday(todayStr);
        const lastMon = new Date(thisMonday); lastMon.setDate(lastMon.getDate() - 7);
        const lastMonStr = lastMon.toISOString().split('T')[0];
        setFromDate(lastMonStr); setToDate(getSunday(lastMonStr)); break;
      }
      case 'this_month': setFromDate(getMonthStart(todayStr)); setToDate(todayStr); break;
      case 'last_month': {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const ym = d.toISOString().split('T')[0].substring(0, 7);
        setFromDate(ym + '-01'); setToDate(getMonthEnd(ym)); break;
      }
    }
  }

  function getProductName(p) {
    if (lang === 'lo') return p.name_lo || p.name_en;
    if (lang === 'th') return p.name_th || p.name_en;
    return p.name_en;
  }

  async function exportData(type) {
    const res = await fetch(`/api/export?type=${type}`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ppsystems-${type}-${fromDate}-${toDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!report) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-lg">Loading...</p></div>;

  const lowStockProducts = products.filter(p => (p.stock_in_stock || 0) <= 5);
  const totalStock = products.reduce((s, p) => s + (p.stock_in_stock || 0), 0);
  const profit = report.profitReport || {};
  const marginPct = profit.revenue ? ((profit.gross_profit / profit.revenue) * 100).toFixed(1) : '0.0';
  const isRange = fromDate !== toDate;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">{t('dashboard', lang)}</h1>
        <div className="flex gap-2">
          <button onClick={() => exportData('orders')} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
            {t('export_json', lang)}
          </button>
          <Link href="/pos" className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark">
            {t('pos', lang)} →
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {['today', 'this_week', 'last_week', 'this_month', 'last_month'].map(preset => (
            <button key={preset} onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                activePreset === preset ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t(preset, lang)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-gray-500">{t('from_date', lang)}:</label>
          <input type="date" value={fromDate}
            onChange={e => { setFromDate(e.target.value); setActivePreset(''); if (e.target.value > toDate) setToDate(e.target.value); }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          <label className="text-sm font-medium text-gray-500">{t('to_date', lang)}:</label>
          <input type="date" value={toDate}
            onChange={e => { setToDate(e.target.value); setActivePreset(''); if (e.target.value < fromDate) setFromDate(e.target.value); }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        {report.pendingOnlineOrders > 0 && (
          <div className="mt-2">
            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
              {t('pending_orders', lang)}: {report.pendingOnlineOrders}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-80">{isRange ? t('sales_period', lang) : t('today_sales', lang)}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(report.daySales.total, 'LAK')}</p>
          <p className="text-xs opacity-70 mt-1">{report.daySales.count} {t('orders', lang)}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-80">{t('month_sales', lang)}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(report.monthSales.total, 'LAK')}</p>
          <p className="text-xs opacity-70 mt-1">{report.monthSales.count} {t('orders', lang)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-80">{t('gross_profit', lang)}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(profit.gross_profit || 0, 'LAK')}</p>
          <p className="text-xs opacity-70 mt-1">{t('margin', lang)}: {marginPct}%</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-80">{t('total_products', lang)}</p>
          <p className="text-2xl font-bold mt-1">{products.length}</p>
          <p className="text-xs opacity-70 mt-1">{t('in_stock', lang)}: {totalStock}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold mb-3">{t('payment_currency', lang)}</h3>
          {report.salesByCurrency.length > 0 ? (
            <div className="space-y-2">
              {report.salesByCurrency.map(sc => (
                <div key={sc.currency} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-bold text-lg">{sc.currency}</span>
                    <span className="text-sm text-gray-500 ml-2">{sc.count} {t('orders', lang)}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(sc.total, sc.currency)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-center py-4">{t('no_items', lang)}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold mb-3">{t('order_type', lang)}</h3>
          {report.salesByType && report.salesByType.length > 0 ? (
            <div className="space-y-2">
              {report.salesByType.map(st => (
                <div key={st.order_type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className={`font-bold text-lg ${st.order_type === 'online' ? 'text-purple-600' : ''}`}>
                      {t(st.order_type, lang)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">{st.count} {t('orders', lang)}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(st.total, 'LAK')}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-center py-4">{t('no_items', lang)}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">{t('top_products', lang)}</h3>
            <Link href="/orders" className="text-sm text-primary hover:text-primary-dark">→</Link>
          </div>
          {(report.topProductsAllTime || report.topProducts).length > 0 ? (
            <div className="space-y-2">
              {(report.topProductsAllTime || report.topProducts).slice(0, 5).map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{getProductName(p)}</p>
                      <p className="text-xs text-gray-400">{p.sku}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{p.total_qty}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-center py-6">{t('no_items', lang)}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">{t('low_stock', lang)}</h3>
            <Link href="/inventory" className="text-sm text-primary hover:text-primary-dark">→</Link>
          </div>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-2">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium">{getProductName(p)}</span>
                    <span className="text-xs text-gray-400 ml-2">{p.sku}</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">{p.stock_in_stock} left</span>
                </div>
              ))}
            </div>
          ) : <p className="text-green-600 text-center py-6">{t('in_stock', lang)} ✓</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h3 className="font-bold mb-3">{t('daily_report', lang)}</h3>
          {report.dailyData.length > 0 ? (
            <div className="flex items-end gap-1 h-40 overflow-auto">
              {report.dailyData.map((d, idx) => {
                const max = Math.max(...report.dailyData.map(dd => dd.total));
                const height = max > 0 ? (d.total / max) * 100 : 0;
                return (
                  <div key={idx} className="flex flex-col items-center min-w-[28px]" title={`${d.date}: ${formatCurrency(d.total, 'LAK')}`}>
                    <div className="w-5 bg-primary rounded-t" style={{ height: `${height}%` }} />
                    <span className="text-[10px] text-gray-400 mt-1 rotate-45 origin-left">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-gray-400 text-center py-8">{t('no_items', lang)}</p>}
        </div>
      </div>
    </div>
  );
}
