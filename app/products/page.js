'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';
import { formatCurrency, calculateMargin } from '../../lib/currency';

const emptyProduct = {
  sku: '', name_lo: '', name_th: '', name_en: '', description: '', category: '',
  cost_price: 0, cost_currency: 'THB', freight_cost: 0, customs_duty: 0,
  proxy_fee: 0, transfer_fee: 0, selling_price_lak: 0, initial_stock: 0,
  image_url: '', sale_end_date: '', has_variants: 0,
};

export default function ProductsPage() {
  const { lang } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyProduct });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState([]);
  const [showVariants, setShowVariants] = useState(null);

  useEffect(() => { fetchProducts(); fetchCurrencies(); }, []);
  useEffect(() => { fetchProducts(); }, [search]);

  async function fetchProducts() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const res = await fetch(`/api/products?${params}`);
    setProducts(await res.json());
  }

  async function fetchCurrencies() {
    const res = await fetch('/api/currencies');
    const data = await res.json();
    setCurrencies(data.currencies || []);
  }

  function getRate(code) {
    return currencies.find(c => c.code === code)?.rate_to_lak || 1;
  }

  function getLandedCost() {
    const rate = getRate(form.cost_currency);
    const total = (parseFloat(form.cost_price) || 0) + (parseFloat(form.freight_cost) || 0) +
      (parseFloat(form.customs_duty) || 0) + (parseFloat(form.proxy_fee) || 0) + (parseFloat(form.transfer_fee) || 0);
    return total * rate;
  }

  function getMargin() {
    return calculateMargin(parseFloat(form.selling_price_lak) || 0, getLandedCost());
  }

  function getProductName(p) {
    if (lang === 'lo') return p.name_lo || p.name_en;
    if (lang === 'th') return p.name_th || p.name_en;
    return p.name_en;
  }

  function editProduct(p) {
    setForm({ ...p, sale_end_date: p.sale_end_date || '' });
    setEditId(p.id);
    setVariants(p.variants || []);
    setShowForm(true);
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url) setForm(prev => ({ ...prev, image_url: data.url }));
    setUploading(false);
  }

  async function saveProduct() {
    const method = editId ? 'PUT' : 'POST';
    const hasV = variants.length > 0 ? 1 : 0;
    const body = editId ? { ...form, id: editId, has_variants: hasV } : { ...form, has_variants: hasV };
    const res = await fetch('/api/products', {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    const productId = editId || result.id;

    if (hasV) {
      const existing = await fetch(`/api/variants?product_id=${productId}`).then(r => r.json());
      for (const ev of existing) {
        if (!variants.find(v => v.id === ev.id)) {
          await fetch(`/api/variants?id=${ev.id}&product_id=${productId}`, { method: 'DELETE' });
        }
      }
      for (const v of variants) {
        if (v.id && typeof v.id === 'number') {
          await fetch('/api/variants', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(v),
          });
        } else {
          await fetch('/api/variants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...v, product_id: productId }),
          });
        }
      }
    } else if (editId) {
      const existing = await fetch(`/api/variants?product_id=${productId}`).then(r => r.json());
      for (const ev of existing) {
        await fetch(`/api/variants?id=${ev.id}&product_id=${productId}`, { method: 'DELETE' });
      }
    }

    setShowForm(false);
    setForm({ ...emptyProduct });
    setEditId(null);
    setVariants([]);
    fetchProducts();
  }

  async function deleteProduct(id) {
    if (!confirm(t('confirm_delete', lang))) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    fetchProducts();
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function addVariant() {
    setVariants(prev => [...prev, { color: '', size: '', quantity: 0, sku_suffix: '', _tempId: Date.now() }]);
  }

  function updateVariant(idx, field, value) {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  }

  function removeVariant(idx) {
    setVariants(prev => prev.filter((_, i) => i !== idx));
  }

  function isExpired(p) {
    if (!p.sale_end_date) return false;
    return new Date(p.sale_end_date) < new Date();
  }

  function getStockDisplay(p) {
    if (p.has_variants && p.variants) {
      return p.variant_total_qty;
    }
    return p.stock_in_stock;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{t('products', lang)}</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="text" placeholder={t('search', lang)} value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 sm:w-64 px-4 py-2 border border-gray-300 rounded-lg" />
          <button onClick={() => { setForm({ ...emptyProduct }); setEditId(null); setVariants([]); setShowForm(true); }}
            className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark whitespace-nowrap">
            + {t('add_product', lang)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold"></th>
              <th className="text-left px-4 py-3 font-semibold">{t('sku', lang)}</th>
              <th className="text-left px-4 py-3 font-semibold">{t('products', lang)}</th>
              <th className="text-left px-4 py-3 font-semibold">{t('category', lang)}</th>
              <th className="text-right px-4 py-3 font-semibold">{t('selling_price', lang)}</th>
              <th className="text-right px-4 py-3 font-semibold">{t('margin', lang)}</th>
              <th className="text-center px-4 py-3 font-semibold">{t('in_stock', lang)}</th>
              <th className="text-center px-4 py-3 font-semibold">{t('variants', lang)}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const margin = calculateMargin(p.selling_price_lak, p.landed_cost_lak);
              const expired = isExpired(p);
              const stock = getStockDisplay(p);
              return (
                <tr key={p.id} className={`border-b hover:bg-gray-50 ${expired ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-lg">
                        {p.category === 'Clothing' ? '👕' : p.category === 'Accessories' ? '👜' : p.category === 'Electronics' ? '📱' : p.category === 'Footwear' ? '👟' : '📦'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 font-medium">
                    {getProductName(p)}
                    {expired && <span className="ml-2 text-xs text-red-500 font-bold">{t('expired', lang)}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.selling_price_lak, 'LAK')}</td>
                  <td className={`px-4 py-3 text-right font-bold ${margin > 30 ? 'text-green-600' : margin > 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {margin.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`status-badge ${stock > 5 ? 'status-in_stock' : 'status-pre_order'}`}>{stock}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.has_variants && p.variants ? (
                      <button onClick={() => setShowVariants(showVariants === p.id ? null : p.id)}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold hover:bg-purple-200">
                        {p.variants.length} {t('variants', lang).split(' ')[0]}
                      </button>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => editProduct(p)} className="text-primary hover:text-primary-dark p-1">✏️</button>
                      <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-600 p-1">🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Expanded variant detail */}
        {showVariants && (() => {
          const p = products.find(pr => pr.id === showVariants);
          if (!p || !p.variants) return null;
          const grouped = {};
          for (const v of p.variants) {
            const key = v.color || '-';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(v);
          }
          return (
            <div className="bg-purple-50 border-t border-purple-200 p-4">
              <h4 className="font-bold text-sm mb-2">{getProductName(p)} - {t('variants', lang)}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(grouped).map(([color, variants]) => (
                  <div key={color} className="bg-white rounded-lg p-3 border">
                    <p className="font-semibold text-sm mb-1">{t('color', lang)}: {color}</p>
                    <div className="space-y-1">
                      {variants.map(v => (
                        <div key={v.id} className="flex justify-between text-xs">
                          <span>{t('size', lang)}: {v.size || '-'}</span>
                          <span className={`font-bold ${v.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {v.quantity} {t('in_stock', lang).toLowerCase ? t('in_stock', lang) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
            <h2 className="text-xl font-bold mb-4">
              {editId ? t('edit_product', lang) : t('add_product', lang)}
            </h2>

            {/* Image Upload */}
            <div className="mb-4 flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-gray-300">📷</span>
                )}
              </div>
              <div>
                <label className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark inline-block">
                  {uploading ? '...' : t('upload_image', lang)}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {form.image_url && (
                  <button onClick={() => updateForm('image_url', '')} className="ml-2 text-red-500 text-sm hover:underline">
                    {t('delete', lang)}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('sku', lang)}</label>
                <input type="text" value={form.sku} onChange={e => updateForm('sku', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('category', lang)}</label>
                <input type="text" value={form.category} onChange={e => updateForm('category', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name (ລາວ)</label>
                <input type="text" value={form.name_lo} onChange={e => updateForm('name_lo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name (ไทย)</label>
                <input type="text" value={form.name_th} onChange={e => updateForm('name_th', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Name (EN)</label>
                <input type="text" value={form.name_en} onChange={e => updateForm('name_en', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('sale_end_date', lang)}</label>
                <input type="date" value={form.sale_end_date || ''}
                  onChange={e => updateForm('sale_end_date', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
                <p className="text-xs text-gray-400 mt-1">
                  {lang === 'th' ? 'ไม่ใส่ = ไม่มีกำหนด' : lang === 'lo' ? 'ບໍ່ໃສ່ = ບໍ່ມີກຳນົດ' : 'Leave empty = no expiry'}
                </p>
              </div>

              {/* Variants Section */}
              <div className="sm:col-span-2 border-t pt-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-lg">{t('variants', lang)}</h3>
                  <button onClick={addVariant}
                    className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-purple-700">
                    + {t('add_variant', lang)}
                  </button>
                </div>
                {variants.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
                      <span className="col-span-3">{t('color', lang)}</span>
                      <span className="col-span-3">{t('size', lang)}</span>
                      <span className="col-span-2">{t('sku', lang)}</span>
                      <span className="col-span-2">{t('quantity', lang)}</span>
                      <span className="col-span-2"></span>
                    </div>
                    {variants.map((v, idx) => (
                      <div key={v.id || v._tempId} className="grid grid-cols-12 gap-2 items-center">
                        <input type="text" value={v.color} onChange={e => updateVariant(idx, 'color', e.target.value)}
                          placeholder={t('color', lang)} className="col-span-3 px-2 py-1.5 border rounded text-sm" />
                        <input type="text" value={v.size} onChange={e => updateVariant(idx, 'size', e.target.value)}
                          placeholder={t('size', lang)} className="col-span-3 px-2 py-1.5 border rounded text-sm" />
                        <input type="text" value={v.sku_suffix || ''} onChange={e => updateVariant(idx, 'sku_suffix', e.target.value)}
                          placeholder="-BL-S" className="col-span-2 px-2 py-1.5 border rounded text-sm" />
                        <input type="number" value={v.quantity} onChange={e => updateVariant(idx, 'quantity', parseInt(e.target.value) || 0)}
                          className="col-span-2 px-2 py-1.5 border rounded text-sm text-center" />
                        <button onClick={() => removeVariant(idx)}
                          className="col-span-2 text-red-400 hover:text-red-600 text-center text-lg">&times;</button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 mt-1">
                      {lang === 'th' ? 'ตัวอย่าง: สีฟ้า S 2ตัว, สีแดง M 3ตัว' :
                       lang === 'lo' ? 'ຕົວຢ່າງ: ສີຟ້າ S 2ໂຕ, ສີແດງ M 3ໂຕ' :
                       'Example: Blue S 2pcs, Red M 3pcs'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-lg">
                    {lang === 'th' ? 'ไม่มีตัวเลือก - สินค้าเป็นแบบเดียว (ใช้สต็อกจาก Inventory)' :
                     lang === 'lo' ? 'ບໍ່ມີຕົວເລືອກ - ສິນຄ້າແບບດຽວ (ໃຊ້ສະຕ໋ອກຈາກ Inventory)' :
                     'No variants - single product (uses Inventory stock)'}
                  </p>
                )}
              </div>

              {/* Landed Cost Section */}
              <div className="sm:col-span-2 border-t pt-4 mt-2">
                <h3 className="font-bold text-lg mb-3">{t('landed_cost', lang)}</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('cost', lang)}</label>
                <div className="flex gap-2">
                  <input type="number" value={form.cost_price} onChange={e => updateForm('cost_price', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border rounded-lg" />
                  <select value={form.cost_currency} onChange={e => updateForm('cost_currency', e.target.value)}
                    className="px-3 py-2 border rounded-lg">
                    {currencies.filter(c => c.code !== 'LAK').map(c => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('freight', lang)}</label>
                <input type="number" value={form.freight_cost} onChange={e => updateForm('freight_cost', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('customs', lang)}</label>
                <input type="number" value={form.customs_duty} onChange={e => updateForm('customs_duty', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('proxy_fee', lang)}</label>
                <input type="number" value={form.proxy_fee} onChange={e => updateForm('proxy_fee', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('transfer_fee', lang)}</label>
                <input type="number" value={form.transfer_fee} onChange={e => updateForm('transfer_fee', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div className="sm:col-span-2 bg-blue-50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">{t('landed_cost', lang)}</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(getLandedCost(), 'LAK')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('selling_price', lang)}</p>
                    <input type="number" value={form.selling_price_lak}
                      onChange={e => updateForm('selling_price_lak', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border rounded text-center font-bold text-lg" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('net_margin', lang)}</p>
                    <p className={`text-lg font-bold ${getMargin() > 30 ? 'text-green-600' : getMargin() > 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {getMargin().toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {!editId && variants.length === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t('in_stock', lang)} ({t('quantity', lang)})</label>
                  <input type="number" value={form.initial_stock} onChange={e => updateForm('initial_stock', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowForm(false); setVariants([]); }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300">
                {t('cancel', lang)}
              </button>
              <button onClick={saveProduct}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark">
                {t('save', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
