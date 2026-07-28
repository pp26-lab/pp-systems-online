'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';

const reasonColors = {
  sale: 'bg-red-100 text-red-700',
  cancel: 'bg-green-100 text-green-700',
  stock_in: 'bg-blue-100 text-blue-700',
  adjustment: 'bg-yellow-100 text-yellow-700',
  initial: 'bg-purple-100 text-purple-700',
};

export default function StockLogPage() {
  const { lang } = useContext(AppContext);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    fetch('/api/stock-movements').then(r => r.json()).then(setMovements);
  }, []);

  function getName(m) {
    if (lang === 'lo') return m.name_lo || m.name_en;
    if (lang === 'th') return m.name_th || m.name_en;
    return m.name_en;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📜 {lang === 'th' ? 'ประวัติสต็อค' : lang === 'lo' ? 'ປະຫວັດສະຕ໋ອກ' : 'Stock Movements'}</h1>
      <div className="bg-white rounded-xl overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3">Variant</th>
              <th className="text-center px-4 py-3">Change</th>
              <th className="text-left px-4 py-3">Reason</th>
              <th className="text-left px-4 py-3">Note</th>
              <th className="text-left px-4 py-3">Ref</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-xs">{new Date(m.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{getName(m)}</div>
                  <div className="text-xs text-gray-400 font-mono">{m.sku}</div>
                </td>
                <td className="px-4 py-3 text-xs">{m.variant_color || m.variant_size ? `${m.variant_color || ''} / ${m.variant_size || ''}` : '-'}</td>
                <td className={`px-4 py-3 text-center font-bold ${m.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${reasonColors[m.reason] || 'bg-gray-100 text-gray-600'}`}>{m.reason}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{m.note}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{m.reference_type ? `${m.reference_type}#${m.reference_id}` : '-'}</td>
              </tr>
            ))}
            {movements.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400">No stock movements yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
