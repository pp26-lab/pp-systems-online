'use client';
import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '../layout';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const COPY = {
  lo: {
    welcome: 'ເຂົ້າສູ່ລະບົບຮ້ານຂອງທ່ານ', hint: 'ໃສ່ License Key ທີ່ໄດ້ຮັບຕອນສະໝັກ',
    label: 'License Key', submit: 'ເຂົ້າສູ່ລະບົບ', busy: 'ກຳລັງກວດສອບ…', ok: 'ຍິນດີຕ້ອນຮັບ',
    offline: 'ເຊື່ອມຕໍ່ເຊີບເວີບໍ່ໄດ້ ກວດສອບອິນເຕີເນັດແລ້ວລອງໃໝ່',
    tagline: 'ລະບົບຂາຍໜ້າຮ້ານ ແລະ ອອນລາຍ', shared: 'ໃຊ້ License Key ດຽວກັນ ເຫັນຂໍ້ມູນຮ້ານດຽວກັນທຸກອຸປະກອນ',
  },
  th: {
    welcome: 'เข้าสู่ระบบร้านของคุณ', hint: 'ใส่ License Key ที่ได้รับตอนสมัคร',
    label: 'License Key', submit: 'เข้าสู่ระบบ', busy: 'กำลังตรวจสอบ…', ok: 'ยินดีต้อนรับ',
    offline: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
    tagline: 'ระบบขายหน้าร้านและออนไลน์', shared: 'ใช้ License Key เดียวกัน เห็นข้อมูลร้านเดียวกันทุกอุปกรณ์',
  },
  en: {
    welcome: 'Sign in to your shop', hint: 'Enter the License Key you received when you signed up',
    label: 'License Key', submit: 'Sign in', busy: 'Checking…', ok: 'Welcome',
    offline: "Can't reach the server. Check your internet connection and try again.",
    tagline: 'Point of sale for your shop and online orders', shared: 'One License Key shows the same shop on every device',
  },
};

// Formats input as PP-XXXXXXXX-XXXXXXXX-XXXXXXXX while typing.
function formatKey(raw) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if ('PP'.startsWith(clean)) return clean; // "", "P", "PP" while typing the prefix
  const body = clean.startsWith('PP') ? clean.slice(2) : clean;
  const parts = [body.slice(0, 8), body.slice(8, 16), body.slice(16, 24)].filter(Boolean);
  return 'PP-' + parts.join('-');
}

export default function LoginPage() {
  const { lang, setLang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
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
        setError(data.error || c.offline);
        return;
      }
      setSuccess(data);
      setTimeout(() => router.push('/'), 600);
    } catch {
      setError(c.offline);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-canvas">
      <aside className="hidden lg:flex flex-col justify-between bg-ink text-white p-12 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="w-11 h-11 rounded-xl ring-1 ring-gold/60" />
          <span className="font-bold text-lg tracking-tight">PP Systems</span>
        </div>
        <div className="max-w-md">
          <p className="text-[2.4rem] leading-[1.2] font-extrabold tracking-tight text-balance">
            {c.tagline}
          </p>
          <div className="mt-8 h-px w-24 bg-gold" aria-hidden="true" />
          <p className="mt-6 text-slate-400 leading-relaxed">{c.shared}</p>
        </div>
        <p className="text-xs text-slate-500">ppsystems-shop.com</p>
        <img src="/logo.png" alt="" aria-hidden="true"
          className="absolute -right-24 -bottom-24 w-[26rem] opacity-[0.06] pointer-events-none select-none" />
      </aside>

      <main className="flex flex-col p-6 sm:p-10">
        <div className="flex justify-end">
          <LanguageSwitcher lang={lang} setLang={setLang} />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <img src="/logo.png" alt="PP Systems" className="lg:hidden w-16 h-16 rounded-2xl ring-1 ring-gold/60 mb-6" />

            {success ? (
              <div role="status">
                <p className="text-sm font-semibold text-success">{c.ok}</p>
                <p className="mt-1 text-2xl font-extrabold text-ink">{success.customer_name || success.shop_name}</p>
                {success.plan && <p className="mt-2 text-sm text-slate-500">Plan {success.plan}</p>}
              </div>
            ) : (
              <form onSubmit={handleLogin} noValidate>
                <h1 className="text-2xl font-extrabold text-ink tracking-tight">{c.welcome}</h1>
                <p className="mt-1.5 text-sm text-slate-500">{c.hint}</p>

                <label htmlFor="license" className="block mt-8 text-sm font-semibold text-ink">{c.label}</label>
                <input
                  id="license"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={key}
                  onChange={e => setKey(formatKey(e.target.value))}
                  placeholder="PP-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  disabled={loading}
                  className="mt-2 w-full px-4 py-3.5 border rounded-xl text-[0.95rem] font-semibold tracking-wider num text-ink placeholder:text-slate-300 placeholder:font-normal"
                />

                {error && (
                  <p id="login-error" role="alert" className="mt-3 text-sm text-danger">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !key.trim()}
                  className="mt-6 w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? c.busy : c.submit}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
