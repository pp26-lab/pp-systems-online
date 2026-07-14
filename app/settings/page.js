'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';

export default function SettingsPage() {
  const { lang } = useContext(AppContext);
  const [form, setForm] = useState({
    shop_name: '',
    shop_phone: '',
    shop_address: '',
    shop_logo: '',
    receipt_footer: '',
    default_order_type: 'walk_in',
    variant_label_1: 'color',
    variant_label_2: 'size',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyCreated, setNewKeyCreated] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  async function tryUnlock(e) {
    e.preventDefault();
    setUnlockError('');
    const res = await fetch('/api/bot/keys/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: unlockInput.trim() }),
    });
    if (res.ok) {
      setUnlocked(true);
      setUnlockInput('');
      fetchKeys();
    } else {
      setUnlockError(lang === 'th' ? 'License Key ไม่ถูกต้อง' : lang === 'lo' ? 'License Key ບໍ່ຖືກຕ້ອງ' : 'Invalid license key');
    }
  }

  async function fetchKeys() {
    const res = await fetch('/api/bot/keys');
    if (res.ok) setApiKeys(await res.json());
  }

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    const res = await fetch('/api/bot/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKeyCreated(data);
      setNewKeyName('');
      fetchKeys();
    }
    setCreatingKey(false);
  }

  async function deleteKey(id) {
    if (!confirm(t('confirm_delete', lang))) return;
    await fetch(`/api/bot/keys?id=${id}`, { method: 'DELETE' });
    fetchKeys();
  }


  useEffect(() => {
    fetch('/api/shop-settings').then(r => r.json()).then(data => {
      setForm({
        shop_name: data.shop_name || '',
        shop_phone: data.shop_phone || '',
        shop_address: data.shop_address || '',
        shop_logo: data.shop_logo || '',
        receipt_footer: data.receipt_footer || '',
        default_order_type: data.default_order_type || 'walk_in',
        variant_label_1: data.variant_label_1 || 'color',
        variant_label_2: data.variant_label_2 || 'size',
      });
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/shop-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) setForm({ ...form, shop_logo: data.url });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('settings', lang)}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4">{t('shop_info', lang)}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('shop_name', lang)} *</label>
              <input
                type="text"
                value={form.shop_name}
                onChange={e => setForm({ ...form, shop_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone', lang)}</label>
              <input
                type="text"
                value={form.shop_phone}
                onChange={e => setForm({ ...form, shop_phone: e.target.value })}
                placeholder="020 XXXX XXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('address', lang)}</label>
              <textarea
                value={form.shop_address}
                onChange={e => setForm({ ...form, shop_address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('shop_logo', lang)}</label>
              <div className="flex items-center gap-4">
                {form.shop_logo && (
                  <img src={form.shop_logo} alt="Logo" className="w-16 h-16 object-contain rounded-lg border" />
                )}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('receipt_footer', lang)}</label>
              <textarea
                value={form.receipt_footer}
                onChange={e => setForm({ ...form, receipt_footer: e.target.value })}
                rows={2}
                placeholder={lang === 'lo' ? 'ຂໍຂອບໃຈທີ່ໃຊ້ບໍລິການ' : lang === 'th' ? 'ขอบคุณที่ใช้บริการ' : 'Thank you for your purchase'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('default_order_type', lang)}</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, default_order_type: 'walk_in' })}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold ${form.default_order_type === 'walk_in' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {t('walk_in', lang)}
                </button>
                <button type="button" onClick={() => setForm({ ...form, default_order_type: 'online' })}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold ${form.default_order_type === 'online' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {t('online', lang)}
                </button>
              </div>
            </div>



            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? '...' : saved ? '✓ ' + t('saved', lang) : t('save', lang)}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4">{t('receipt_preview', lang)}</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center font-mono text-sm">
              {form.shop_logo && (
                <img src={form.shop_logo} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2" />
              )}
              <p className="text-lg font-bold">{form.shop_name || 'My Shop'}</p>
              {form.shop_address && <p className="text-xs text-gray-500 mt-1">{form.shop_address}</p>}
              {form.shop_phone && <p className="text-xs text-gray-500">{t('phone', lang)}: {form.shop_phone}</p>}
              <hr className="my-3 border-dashed" />
              <p className="text-xs text-gray-400">[{t('order_items', lang)}]</p>
              <hr className="my-3 border-dashed" />
              {form.receipt_footer && <p className="text-xs text-gray-500 mt-2">{form.receipt_footer}</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4">PP Systems Online</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('status', lang)}</span>
                <span className="font-bold text-green-600">Online</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {lang === 'lo' ? 'ຂໍ້ມູນທັງໝົດຖືກເກັບໄວ້ໃນ cloud ແລະ sync ອັດຕະໂນມັດ' :
                 lang === 'th' ? 'ข้อมูลทั้งหมดเก็บบน cloud และ sync อัตโนมัติ' :
                 'All data is stored in the cloud and synced automatically'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-2">🤖 Chatbot API Keys</h2>
            <p className="text-xs text-gray-500 mb-4">
              {lang === 'th' ? 'ใช้สำหรับ chatbot เรียก API ของร้าน (ดูสินค้า/สั่งซื้อ)' :
               lang === 'lo' ? 'ໃຊ້ສຳລັບ chatbot ເອີ້ນ API ຂອງຮ້ານ' :
               'For chatbot to call your shop API'}
            </p>

            {!unlocked ? (
              <form onSubmit={tryUnlock} className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔒 {lang === 'th' ? 'ใส่ License Key เพื่อจัดการ API Keys' :
                       lang === 'lo' ? 'ໃສ່ License Key ເພື່ອຈັດການ API Keys' :
                       'Enter License Key to manage API Keys'}
                </label>
                <input type="password" value={unlockInput} onChange={e => setUnlockInput(e.target.value.toUpperCase())}
                  placeholder="PP-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                {unlockError && <p className="text-red-600 text-xs mt-2">{unlockError}</p>}
                <button type="submit" disabled={!unlockInput.trim()}
                  className="mt-3 w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark disabled:opacity-50">
                  {lang === 'th' ? 'ปลดล็อก' : lang === 'lo' ? 'ປົດລັອກ' : 'Unlock'}
                </button>
              </form>
            ) : (
              <>
            {newKeyCreated && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-xs font-bold text-yellow-800 mb-1">⚠️ Save this key — you won't see it again</p>
                <div className="flex items-center gap-2 bg-white p-2 rounded font-mono text-xs break-all border">
                  {newKeyCreated.key}
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { navigator.clipboard.writeText(newKeyCreated.key); }}
                    className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700">Copy</button>
                  <button onClick={() => setNewKeyCreated(null)}
                    className="text-xs bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Done</button>
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. Chatbot)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <button onClick={createKey} disabled={creatingKey || !newKeyName.trim()}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark disabled:opacity-50">
                + Create
              </button>
            </div>

            {apiKeys.length > 0 ? (
              <div className="space-y-2">
                {apiKeys.map(k => (
                  <div key={k.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{k.name || '(no name)'}</p>
                      <p className="text-xs text-gray-500 font-mono">{k.key_preview}</p>
                      {k.last_used_at && <p className="text-xs text-gray-400">Last used: {new Date(k.last_used_at).toLocaleString()}</p>}
                    </div>
                    <button onClick={() => deleteKey(k.id)} className="text-red-500 hover:text-red-700 text-sm">🗑️</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">No API keys yet</p>
            )}

            <details className="mt-4">
              <summary className="text-xs text-primary cursor-pointer">📖 API Documentation</summary>
              <div className="mt-2 text-xs text-gray-600 space-y-2 font-mono bg-gray-50 p-3 rounded">
                <div><strong>Base URL:</strong> https://ppsystems-shop.com</div>
                <div><strong>Auth:</strong> Header <code>x-api-key: YOUR_KEY</code></div>
                <hr />
                <div><strong>GET /api/bot/products?search=xxx</strong> — list products</div>
                <div><strong>GET /api/bot/products/[sku]</strong> — get product + stock</div>
                <div><strong>POST /api/bot/orders</strong> — create order</div>
                <div><strong>GET /api/bot/orders?order_number=XX</strong> — check order</div>
              </div>
            </details>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
