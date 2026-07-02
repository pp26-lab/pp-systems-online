'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';

const statusColors = {
  in_stock: 'bg-green-100 text-green-800',
  in_transit: 'bg-blue-100 text-blue-800',
  pre_order: 'bg-yellow-100 text-yellow-800',
  ready_to_ship: 'bg-indigo-100 text-indigo-800',
};

export default function InventoryPage() {
  const { lang } = useContext(AppContext);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({
    product_id: '', quantity: 0, status: 'in_stock',
    batch_number: '', expected_arrival: '', notes: '',
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => { fetchInventory(); fetchProducts(); }, []);

  async function fetchInventory() {
    const res = await fetch('/api/inventory');
    setInventory(await res.json());
  }

  async function fetchProducts() {
    const res = await fetch('/api/products');
    setProducts(await res.json());
  }

  function getProductName(item) {
    if (lang === 'lo') return item.name_lo || item.name_en;
    if (lang === 'th') return item.name_th || item.name_en;
    return item.name_en;
  }

  async function saveInventory() {
    const method = editId ? 'PUT' : 'POST';
    const body = editId ? { ...form, id: editId } : form;
    await fetch('/api/inventory', {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setShowForm(false);
    setForm({ product_id: '', quantity: 0, status: 'in_stock', batch_number: '', expected_arrival: '', notes: '' });
    setEditId(null);
    fetchInventory();
  }

  async function deleteInventory(id) {
    if (!confirm(t('confirm_delete', lang))) return;
    await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
    fetchInventory();
  }

  function editItem(item) {
    setForm({
      product_id: item.product_id, quantity: item.quantity, status: item.status,
      batch_number: item.batch_number, expected_arrival: item.expected_arrival || '', notes: item.notes,
    });
    setEditId(item.id);
    setShowForm(true);
  }

  const filtered = filterStatus
    ? inventory.filter(i => i.status === filterStatus)
    : inventory;

  const statusCounts = {
    in_stock: inventory.filter(i => i.status === 'in_stock').reduce((s, i) => s + i.quantity, 0),
    in_transit: inventory.filter(i => i.status === 'in_transit').reduce((s, i) => s + i.quantity, 0),
    pre_order: inventory.filter(i => i.status === 'pre_order').reduce((s, i) => s + i.quantity, 0),
    ready_to_ship: inventory.filter(i => i.status === 'ready_to_ship').reduce((s, i) => s + i.quantity, 0),
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{t('inventory', lang)}</h1>
        <button
          onClick={() => { setForm({ product_id: '', quantity: 0, status: 'in_stock', batch_number: '', expected_arrival: '', notes: '' }); setEditId(null); setShowForm(true); }}
          className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark"
        >+ {t('add_product', lang)}</button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`p-4 rounded-xl border-2 text-center transition-all ${
              filterStatus === status ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm text-gray-500">{t(status, lang)}</p>
          </button>
        ))}
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">{t('sku', lang)}</th>
              <th className="text-left px-4 py-3 font-semibold">{t('products', lang)}</th>
              <th className="text-center px-4 py-3 font-semibold">{t('quantity', lang)}</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">{t('batch', lang)}</th>
              <th className="text-left px-4 py-3 font-semibold">{t('expected_arrival', lang)}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                <td className="px-4 py-3 font-medium">{getProductName(item)}</td>
                <td className="px-4 py-3 text-center font-bold">{item.quantity}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`status-badge ${statusColors[item.status]}`}>
                    {t(item.status, lang)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{item.batch_number}</td>
                <td className="px-4 py-3 text-gray-500">{item.expected_arrival || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => editItem(item)} className="text-primary hover:text-primary-dark p-1">✏️</button>
                    <button onClick={() => deleteInventory(item.id)} className="text-red-400 hover:text-red-600 p-1">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editId ? t('edit_product', lang) : t('add_product', lang)}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('products', lang)}</label>
                <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" disabled={!!editId}>
                  <option value="">--</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {getProductName(p)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('quantity', lang)}</label>
                <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg">
                  <option value="in_stock">{t('in_stock', lang)}</option>
                  <option value="in_transit">{t('in_transit', lang)}</option>
                  <option value="pre_order">{t('pre_order', lang)}</option>
                  <option value="ready_to_ship">{t('ready_to_ship', lang)}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('batch', lang)}</label>
                <input type="text" value={form.batch_number} onChange={e => setForm({ ...form, batch_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              {(form.status === 'in_transit' || form.status === 'pre_order') && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t('expected_arrival', lang)}</label>
                  <input type="date" value={form.expected_arrival} onChange={e => setForm({ ...form, expected_arrival: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300">{t('cancel', lang)}</button>
              <button onClick={saveInventory} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark">{t('save', lang)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
