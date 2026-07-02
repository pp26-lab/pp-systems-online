'use client';
import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';

export default function LoginPage() {
  const { lang, setLang } = useContext(AppContext);
  const router = useRouter();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: key.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      setSuccess(data);
      setTimeout(() => router.push('/'), 1500);
    } catch (err) {
      setError('ບໍ່ສາມາດເຊື່ອມຕໍ່ Server ໄດ້');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="PP Systems" className="w-24 h-24 rounded-2xl mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-gray-800">PP Systems Online</h1>
          <p className="text-gray-500 mt-2">{t('enter_license_key', lang)}</p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {[{ code: 'lo', flag: '🇱🇦' }, { code: 'th', flag: '🇹🇭' }, { code: 'en', flag: '🇺🇸' }].map(l => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`px-3 py-1 rounded-lg text-sm ${lang === l.code ? 'bg-primary text-white' : 'bg-gray-100'}`}>
              {l.flag}
            </button>
          ))}
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-green-600 mb-2">{t('login', lang)} !</h2>
            <p className="text-gray-600 mb-1">{success.customer_name || success.shop_name}</p>
            <p className="text-sm text-gray-400">Plan: <span className="font-semibold text-primary">{success.plan?.toUpperCase()}</span></p>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-gray-700 mb-2">License Key</label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value.toUpperCase())}
              placeholder="PP-XXXXXXXX-XXXXXXXX-XXXXXXXX"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-lg font-mono tracking-wider focus:border-primary focus:outline-none"
              disabled={loading}
            />

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full mt-6 bg-primary text-white py-3 rounded-xl font-semibold text-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {loading ? t('logging_in', lang) : t('login', lang)}
            </button>

            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 text-center">
                {lang === 'lo' ? 'ໃສ່ License Key ດຽວກັນເພື່ອເຂົ້າເຖິງຂໍ້ມູນຮ້ານດຽວກັນ ຈາກຫຼາຍອຸປະກອນ' :
                 lang === 'th' ? 'ใส่ License Key เดียวกันเพื่อเข้าถึงข้อมูลร้านเดียวกัน จากหลายอุปกรณ์' :
                 'Use the same License Key to access the same shop data from multiple devices'}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
