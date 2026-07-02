'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from './layout';
import { t } from '../lib/i18n';
import { formatCurrency } from '../lib/currency';
import Link from 'next/link';

export default function Dashboard() {
  const { lang } = useContext(AppContext);
  const [report, setReport] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(setReport);
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);

  if (!report) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-lg">Loading...</p></div>;

  const lowStockProducts = products.filter(p => p.stock_in_stock <= 5);
  const totalStock = products.reduce((s, p) => s + (p.stock_in_stock || 0), 0);

  function getProductName(p) {
    if (lang === 'lo') return p.name_lo || p.name_en;
    if (lang === 'th') return p.name_th || p.name_en;
    return p.name_en;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('dashboard', lang)}</h1>
        <Link href="/pos" className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark">
          {t('pos', lang)} →
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-80">{t('today_sales', lang)}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(report.daySales.total, 'LAK')}</p>
          <p className="text-xs opacity-70 mt-1">{report.daySales.count} {t('orders', lang)}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-80">{t('month_sales', lang)}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(report.monthSales.total, 'LAK')}</p>
          <p className="text-xs opacity-70 mt-1">{report.monthSales.count} {t('orders', lang)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-80">{t('total_products', lang)}</p>
          <p className="text-2xl font-bold mt-1">{products.length}</p>
          <p className="text-xs opacity-70 mt-1">{t('in_stock', lang)}: {totalStock}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-80">{t('low_stock', lang)}</p>
          <p className="text-2xl font-bold mt-1">{lowStockProducts.length}</p>
          <p className="text-xs opacity-70 mt-1">{t('products', lang)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">{t('top_products', lang)}</h3>
            <Link href="/orders" className="text-sm text-primary hover:text-primary-dark">→</Link>
          </div>
          {report.topProducts.length > 0 ? (
            <div className="space-y-2">
              {report.topProducts.slice(0, 5).map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">{getProductName(p)}</span>
                  <span className="text-sm font-bold text-primary">{p.total_qty} sold</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-6">{t('no_items', lang)}</p>
          )}
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
          ) : (
            <p className="text-green-600 text-center py-6">{t('in_stock', lang)} ✓</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h3 className="font-bold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/pos" className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <span className="text-3xl mb-2">🛒</span>
              <span className="text-sm font-semibold text-blue-700">{t('pos', lang)}</span>
            </Link>
            <Link href="/products" className="flex flex-col items-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
              <span className="text-3xl mb-2">📦</span>
              <span className="text-sm font-semibold text-green-700">{t('products', lang)}</span>
            </Link>
            <Link href="/inventory" className="flex flex-col items-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
              <span className="text-3xl mb-2">🏭</span>
              <span className="text-sm font-semibold text-purple-700">{t('inventory', lang)}</span>
            </Link>
            <Link href="/reports" className="flex flex-col items-center p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
              <span className="text-3xl mb-2">📈</span>
              <span className="text-sm font-semibold text-amber-700">{t('reports', lang)}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
