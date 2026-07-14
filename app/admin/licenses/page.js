'use client';
import { useEffect, useState } from 'react';

export default function AdminLicenses() {
  const [licenses, setLicenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', plan: 'starter', max_machines: '', expires_at: '', notes: '' });
  const [created, setCreated] = useState(null);

  async function load() {
    const res = await fetch('/api/admin/licenses');
    const data = await res.json();
    setLicenses(Array.isArray(data) ? data : []);
  }
  useEffect(() => { load(); }, []);

  async function createLicense(e) {
    e.preventDefault();
    const body = { ...form };
    if (!body.max_machines) delete body.max_machines;
    if (!body.expires_at) delete body.expires_at;
    const res = await fetch('/api/admin/licenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setCreated(data);
      setForm({ customer_name: '', customer_email: '', customer_phone: '', plan: 'starter', max_machines: '', expires_at: '', notes: '' });
      setShowForm(false);
      load();
    } else alert(data.error || 'Failed');
  }

  async function updateStatus(id, status) {
    await fetch('/api/admin/licenses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function extendExpiry(id, days) {
    const current = licenses.find(l => l.id === id);
    const base = new Date(current?.expires_at || Date.now());
    base.setDate(base.getDate() + days);
    await fetch('/api/admin/licenses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, expires_at: base.toISOString().split('T')[0] }),
    });
    load();
  }

  async function updateMaxMachines(id) {
    const val = prompt('Max machines:');
    if (!val) return;
    await fetch('/api/admin/licenses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, max_machines: parseInt(val) }),
    });
    load();
  }

  async function deleteLicense(id) {
    if (!confirm('Delete this license? This cannot be undone.')) return;
    await fetch(`/api/admin/licenses?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">🔑 Licenses</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700">
          + New License
        </button>
      </div>

      {created && (
        <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg">
          <p className="font-bold text-green-800">✅ License created</p>
          <p className="font-mono text-lg mt-1">{created.license_key}</p>
          <button onClick={() => setCreated(null)} className="mt-2 text-sm bg-green-600 text-white px-3 py-1 rounded">Done</button>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2">Key</th>
              <th className="text-left px-3 py-2">Customer</th>
              <th className="text-left px-3 py-2">Plan</th>
              <th className="text-center px-3 py-2">Machines</th>
              <th className="text-left px-3 py-2">Expires</th>
              <th className="text-center px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map(l => (
              <tr key={l.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{l.license_key}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold">{l.customer_name}</div>
                  <div className="text-xs text-gray-500">{l.customer_phone || l.customer_email}</div>
                </td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{l.plan}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => updateMaxMachines(l.id)} className="hover:underline">
                    {l.active_machines || 0} / {l.max_machines}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs">
                  {l.expires_at ? new Date(l.expires_at).toLocaleDateString() : '-'}
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => extendExpiry(l.id, 30)} className="text-xs text-blue-600 hover:underline">+30d</button>
                    <button onClick={() => extendExpiry(l.id, 365)} className="text-xs text-blue-600 hover:underline">+1y</button>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded ${l.status === 'active' ? 'bg-green-100 text-green-700' : l.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                    <option value="revoked">revoked</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => deleteLicense(l.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={createLicense} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
            <h2 className="text-xl font-bold">New License</h2>
            <input required placeholder="Customer name" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder="Email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder="Phone" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
              <option value="starter">Starter (1 machine)</option>
              <option value="business">Business (3 machines)</option>
              <option value="enterprise">Enterprise (99 machines)</option>
            </select>
            <input type="number" placeholder="Max machines (override, optional)" value={form.max_machines} onChange={e => setForm({ ...form, max_machines: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <input type="date" placeholder="Expires at" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
