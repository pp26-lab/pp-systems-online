'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { formatCurrency } from '../../lib/currency';

export default function CouponsPage() {
  const { lang } = useContext(AppContext);
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCoupon());

  function emptyCoupon() {
    return { code: '', discount_type: 'percent', discount_value: 10, min_purchase: 0, max_discount: 0, usage_limit: 0, expires_at: '', is_active: true, note: '' };
  }

  async function load() {
    const res = await fetch('/api/coupons');
    setCoupons(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    await fetch('/api/coupons', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm(emptyCoupon());
    load();
  }

  async function del(id) {
    if (!confirm('Delete this coupon?')) return;
    await fetch(`/api/coupons?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">🎟️ {lang === 'th' ? 'คูปองส่วนลด' : lang === 'lo' ? 'ຄູປອງສ່ວນຫຼຸດ' : 'Coupons'}</h1>
        <button onClick={() => { setForm(emptyCoupon()); setShowForm(true); }}
          className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark">+ New Coupon</button>
      </div>

      <div className="bg-white rounded-xl overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Discount</th>
              <th className="text-right px-4 py-3">Min</th>
              <th className="text-center px-4 py-3">Used / Limit</th>
              <th className="text-left px-4 py-3">Expires</th>
              <th className="text-center px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-primary">{c.code}</td>
                <td className="px-4 py-3">
                  {c.discount_type === 'percent' ? `${c.discount_value}%` : formatCurrency(c.discount_value, 'LAK')}
                  {c.max_discount > 0 && c.discount_type === 'percent' && <span className="text-xs text-gray-500 ml-1">(max {formatCurrency(c.max_discount, 'LAK')})</span>}
                </td>
                <td className="px-4 py-3 text-right">{c.min_purchase > 0 ? formatCurrency(c.min_purchase, 'LAK') : '-'}</td>
                <td className="px-4 py-3 text-center">{c.times_used} / {c.usage_limit || '∞'}</td>
                <td className="px-4 py-3 text-xs">{c.expires_at || 'Never'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.is_active ? 'ON' : 'OFF'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setForm({ ...c, is_active: !!c.is_active }); setShowForm(true); }} className="text-primary hover:underline mr-2">✏️</button>
                  <button onClick={() => del(c.id)} className="text-red-500 hover:underline">🗑️</button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400">No coupons yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
            <h2 className="text-xl font-bold">{form.id ? 'Edit' : 'New'} Coupon</h2>
            <input required placeholder="Code (e.g. SAVE10)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border rounded-lg font-mono uppercase" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} className="px-3 py-2 border rounded-lg">
                <option value="percent">Percent %</option>
                <option value="fixed">Fixed LAK</option>
              </select>
              <input type="number" required placeholder="Value" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} className="px-3 py-2 border rounded-lg" />
            </div>
            <input type="number" placeholder="Minimum purchase (LAK, 0 = any)" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            {form.discount_type === 'percent' && (
              <input type="number" placeholder="Max discount cap (LAK, 0 = no cap)" value={form.max_discount} onChange={e => setForm({ ...form, max_discount: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            )}
            <input type="number" placeholder="Usage limit (0 = unlimited)" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <input type="date" placeholder="Expires" value={form.expires_at || ''} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <textarea placeholder="Note" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
              <button type="submit" className="flex-1 bg-primary text-white py-2 rounded-lg font-semibold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
