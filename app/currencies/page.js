'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';
import { formatCurrency } from '../../lib/currency';

export default function CurrenciesPage() {
  const { lang } = useContext(AppContext);
  const [currencies, setCurrencies] = useState([]);
  const [history, setHistory] = useState([]);
  const [editingCode, setEditingCode] = useState(null);
  const [newRate, setNewRate] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const res = await fetch('/api/currencies');
    const data = await res.json();
    setCurrencies(data.currencies || []);
    setHistory(data.history || []);
  }

  async function updateRate(code) {
    await fetch('/api/currencies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, rate_to_lak: parseFloat(newRate) }),
    });
    setEditingCode(null);
    setNewRate('');
    fetchData();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('currencies', lang)}</h1>

      {/* Currency Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {currencies.map(cur => (
          <div key={cur.code} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-2xl font-bold">{cur.symbol} {cur.code}</h3>
                <p className="text-sm text-gray-500">{cur.name}</p>
              </div>
              {cur.code !== 'LAK' && (
                <button
                  onClick={() => { setEditingCode(cur.code); setNewRate(cur.rate_to_lak.toString()); }}
                  className="text-primary hover:text-primary-dark text-sm"
                >✏️</button>
              )}
            </div>
            {cur.code !== 'LAK' ? (
              <div>
                <p className="text-sm text-gray-500">{t('exchange_rate', lang)}</p>
                {editingCode === cur.code ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      value={newRate}
                      onChange={e => setNewRate(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-right font-bold"
                    />
                    <button onClick={() => updateRate(cur.code)}
                      className="bg-primary text-white px-3 py-1 rounded text-sm font-bold">
                      {t('save', lang)}
                    </button>
                    <button onClick={() => setEditingCode(null)}
                      className="bg-gray-200 px-3 py-1 rounded text-sm">
                      {t('cancel', lang)}
                    </button>
                  </div>
                ) : (
                  <p className="text-xl font-bold text-primary">
                    1 {cur.code} = {formatCurrency(cur.rate_to_lak, 'LAK')}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {t('date', lang)}: {new Date(cur.updated_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <p className="text-lg font-bold text-green-600">{t('selling_price', lang)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Rate History */}
      <h2 className="text-xl font-bold mb-4">{t('rate_history', lang)}</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">{t('date', lang)}</th>
              <th className="text-left px-4 py-3">From</th>
              <th className="text-left px-4 py-3">To</th>
              <th className="text-right px-4 py-3">{t('exchange_rate', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{new Date(h.recorded_at).toLocaleString()}</td>
                <td className="px-4 py-2 font-bold">{h.from_currency}</td>
                <td className="px-4 py-2">{h.to_currency}</td>
                <td className="px-4 py-2 text-right font-mono">{formatCurrency(h.rate, 'LAK')}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan="4" className="text-center py-8 text-gray-400">{t('no_items', lang)}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
