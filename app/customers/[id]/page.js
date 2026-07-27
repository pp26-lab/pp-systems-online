'use client';
import { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppContext } from '../../layout';
import { t } from '../../../lib/i18n';
import { formatCurrency } from '../../../lib/currency';

export default function CustomerDetail() {
  const { lang } = useContext(AppContext);
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  async function load() {
    const res = await fetch(`/api/customers/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setCustomer(data);
      setForm(data);
    }
  }
  useEffect(() => { load(); }, [params.id]);

  async function save() {
    await fetch('/api/customers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: params.id }),
    });
    setEditing(false);
    load();
  }

  async function del() {
    if (!confirm('Delete this customer? Order history will remain.')) return;
    await fetch(`/api/customers?id=${params.id}`, { method: 'DELETE' });
    router.push('/customers');
  }

  if (!customer) return <div className="p-4">Loading...</div>;

  return (
    <div>
      <Link href="/customers" className="text-sm text-primary hover:underline mb-3 inline-block">← Back</Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200 lg:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-xl font-bold">{customer.name || '(No name)'}</h1>
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-primary text-sm">Edit</button>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full px-3 py-2 border rounded" />
              <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="w-full px-3 py-2 border rounded" />
              <input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2 border rounded" />
              <input value={form.facebook_id || ''} onChange={e => setForm({ ...form, facebook_id: e.target.value })} placeholder="Facebook ID" className="w-full px-3 py-2 border rounded" />
              <input value={form.line_id || ''} onChange={e => setForm({ ...form, line_id: e.target.value })} placeholder="Line ID" className="w-full px-3 py-2 border rounded" />
              <textarea value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" rows={2} className="w-full px-3 py-2 border rounded" />
              <textarea value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Note" rows={2} className="w-full px-3 py-2 border rounded" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_blacklisted} onChange={e => setForm({ ...form, is_blacklisted: e.target.checked })} />
                🚫 Blacklist this customer
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditing(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
                <button onClick={save} className="flex-1 bg-primary text-white py-2 rounded font-semibold">Save</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {customer.is_blacklisted && <p className="p-2 bg-red-100 text-red-700 rounded text-xs font-bold">🚫 Blacklisted</p>}
              <p><strong>Phone:</strong> {customer.phone || '-'}</p>
              <p><strong>Email:</strong> {customer.email || '-'}</p>
              <p><strong>Facebook:</strong> {customer.facebook_id || '-'}</p>
              <p><strong>Line:</strong> {customer.line_id || '-'}</p>
              <p><strong>Address:</strong> <span className="whitespace-pre-wrap">{customer.address || '-'}</span></p>
              <p><strong>Note:</strong> <span className="whitespace-pre-wrap">{customer.note || '-'}</span></p>
              <hr className="my-2" />
              <p><strong>Total Spent:</strong> <span className="text-lg font-bold text-primary">{formatCurrency(customer.total_spent, 'LAK')}</span></p>
              <p><strong>Orders:</strong> {customer.order_count}</p>
              <p><strong>Since:</strong> {new Date(customer.created_at).toLocaleDateString()}</p>
              <button onClick={del} className="mt-3 text-xs text-red-500 hover:underline">Delete customer</button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 lg:col-span-2">
          <h2 className="font-bold mb-3">Order History ({customer.orders.length})</h2>
          {customer.orders.length > 0 ? (
            <div className="space-y-2 max-h-[600px] overflow-auto">
              {customer.orders.map(o => (
                <div key={o.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-mono font-bold text-primary">{o.order_number}</p>
                    <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(o.total, o.currency)}</p>
                    <p className="text-xs px-2 py-0.5 bg-white rounded-full inline-block">{o.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-6">No orders yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
