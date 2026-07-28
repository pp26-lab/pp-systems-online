'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';

const AVAILABLE_EVENTS = ['order.created', 'order.status_changed', 'product.low_stock'];

export default function WebhooksPage() {
  const { lang } = useContext(AppContext);
  const [hooks, setHooks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [], is_active: true });
  const [created, setCreated] = useState(null);

  async function load() {
    const res = await fetch('/api/webhooks');
    setHooks(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    const res = await fetch('/api/webhooks', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok && !form.id) {
      const data = await res.json();
      if (data.secret) setCreated(data);
    }
    setShowForm(false);
    setForm({ name: '', url: '', events: [], is_active: true });
    load();
  }

  async function del(id) {
    if (!confirm('Delete this webhook?')) return;
    await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' });
    load();
  }

  function toggleEvent(ev) {
    setForm(prev => ({ ...prev, events: prev.events.includes(ev) ? prev.events.filter(e => e !== ev) : [...prev.events, ev] }));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">🔔 Webhooks</h1>
        <button onClick={() => { setForm({ name: '', url: '', events: ['order.created'], is_active: true }); setShowForm(true); }}
          className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark">+ New Webhook</button>
      </div>

      {created && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="font-bold text-yellow-800">⚠️ Save this secret — used to verify webhook signatures</p>
          <p className="font-mono text-sm break-all mt-1 bg-white p-2 rounded">{created.secret}</p>
          <button onClick={() => setCreated(null)} className="mt-2 text-sm bg-gray-200 px-3 py-1 rounded">Done</button>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">URL</th>
              <th className="text-left px-4 py-3">Events</th>
              <th className="text-center px-4 py-3">Active</th>
              <th className="text-center px-4 py-3">Fails</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {hooks.map(h => (
              <tr key={h.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{h.name || '-'}</td>
                <td className="px-4 py-3 font-mono text-xs truncate max-w-xs">{h.url}</td>
                <td className="px-4 py-3 text-xs">{h.events?.split(',').map(e => <span key={e} className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-1">{e}</span>)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${h.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {h.is_active ? 'ON' : 'OFF'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">{h.fail_count > 0 ? <span className="text-red-500 font-bold">{h.fail_count}</span> : '0'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setForm({ ...h, events: (h.events || '').split(',').filter(Boolean), is_active: !!h.is_active }); setShowForm(true); }} className="text-primary hover:underline mr-2">✏️</button>
                  <button onClick={() => del(h.id)} className="text-red-500 hover:underline">🗑️</button>
                </td>
              </tr>
            ))}
            {hooks.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-gray-400">No webhooks yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
            <h2 className="text-xl font-bold">{form.id ? 'Edit' : 'New'} Webhook</h2>
            <input required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <input required type="url" placeholder="https://your-endpoint.com/webhook" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <div>
              <label className="block text-sm font-semibold mb-2">Events:</label>
              <div className="space-y-1">
                {AVAILABLE_EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                    <code>{ev}</code>
                  </label>
                ))}
              </div>
            </div>
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
