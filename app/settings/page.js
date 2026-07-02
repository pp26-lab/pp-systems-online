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
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    fetch('/api/shop-settings').then(r => r.json()).then(data => {
      setForm({
        shop_name: data.shop_name || '',
        shop_phone: data.shop_phone || '',
        shop_address: data.shop_address || '',
        shop_logo: data.shop_logo || '',
        receipt_footer: data.receipt_footer || '',
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
        </div>
      </div>
    </div>
  );
}
