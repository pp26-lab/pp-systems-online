'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AdminKeys() {
  const searchParams = useSearchParams();
  const filterShopId = searchParams.get('shop_id');
  const [keys, setKeys] = useState([]);
  const [shops, setShops] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ shop_id: filterShopId || '', name: '' });
  const [created, setCreated] = useState(null);

  async function load() {
    const q = filterShopId ? `?shop_id=${filterShopId}` : '';
    const [k, s] = await Promise.all([
      fetch('/api/admin/keys' + q).then(r => r.json()),
      fetch('/api/admin/shops').then(r => r.json()),
    ]);
    setKeys(Array.isArray(k) ? k : []);
    setShops(Array.isArray(s) ? s : []);
  }
  useEffect(() => { load(); }, [filterShopId]);

  async function createKey(e) {
    e.preventDefault();
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setCreated(data);
      setForm({ shop_id: filterShopId || '', name: '' });
      setShowForm(false);
      load();
    }
  }

  async function deleteKey(id) {
    if (!confirm('Delete this API key?')) return;
    await fetch(`/api/admin/keys?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">🤖 API Keys{filterShopId && ' (filtered)'}</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700">
          + New Key
        </button>
      </div>

      {created && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="font-bold text-yellow-800">⚠️ Save this key — you won't see it again</p>
          <p className="font-mono text-sm break-all mt-1 bg-white p-2 rounded">{created.key}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => navigator.clipboard.writeText(created.key)} className="text-sm bg-yellow-600 text-white px-3 py-1 rounded">Copy</button>
            <button onClick={() => setCreated(null)} className="text-sm bg-gray-200 px-3 py-1 rounded">Done</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2">Shop</th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Preview</th>
              <th className="text-left px-3 py-2">Created</th>
              <th className="text-left px-3 py-2">Last Used</th>
              <th className="text-right px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-semibold">{k.shop_name}</td>
                <td className="px-3 py-2">{k.name || '-'}</td>
                <td className="px-3 py-2 font-mono text-xs">{k.key_preview}</td>
                <td className="px-3 py-2 text-xs">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '-'}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => deleteKey(k.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={createKey} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
            <h2 className="text-xl font-bold">New API Key</h2>
            <select required value={form.shop_id} onChange={e => setForm({ ...form, shop_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg">
              <option value="">-- Select shop --</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.shop_name} ({s.license_key})</option>)}
            </select>
            <input placeholder="Key name (e.g. Line Bot)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
              <button type="submit" disabled={!form.shop_id} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
