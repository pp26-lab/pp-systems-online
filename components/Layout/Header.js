'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '../LanguageSwitcher';
import { t } from '../../lib/i18n';

const TITLE_KEYS = {
  '/': 'dashboard', '/pos': 'pos', '/orders': 'orders', '/products': 'products',
  '/inventory': 'inventory', '/stock-log': 'stock_log', '/customers': 'customers',
  '/handoffs': 'handoffs', '/chat': 'chat', '/shipping': 'carrier_bills', '/coupons': 'coupons', '/currencies': 'currencies',
  '/webhooks': 'webhooks', '/settings': 'settings',
};

const LOCALES = { lo: 'lo-LA', th: 'th-TH', en: 'en-GB' };

export default function Header({ lang, setLang, onMenuToggle, onLogout, user }) {
  const pathname = usePathname();
  const base = '/' + (pathname.split('/')[1] || '');
  const titleKey = TITLE_KEYS[base];
  const today = new Date().toLocaleDateString(LOCALES[lang] || 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const [logoFailed, setLogoFailed] = useState(false);
  // First letters of the shop name, cut by visible characters so Lao/Thai vowels stay whole.
  const name = (user?.shop_name || 'PP').replace(/\s+/g, '');
  const initials = (typeof Intl !== 'undefined' && Intl.Segmenter
    ? [...new Intl.Segmenter().segment(name)].slice(0, 2).map(x => x.segment).join('')
    : name.slice(0, 2)).toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-line px-4 lg:px-6 flex items-center gap-3 no-print shrink-0">
      <button
        onClick={onMenuToggle}
        className="p-2.5 -ml-2.5 rounded-lg text-slate-600 hover:bg-canvas lg:hidden"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        {titleKey && <p className="font-bold text-ink text-[1.05rem] leading-tight truncate">{t(titleKey, lang)}</p>}
        <p className="text-xs text-slate-500 leading-tight truncate hidden sm:block">{today}</p>
      </div>

      <LanguageSwitcher lang={lang} setLang={setLang} />

      <div className="flex items-center gap-2 pl-3 border-l border-line">
        {/* The shop's own logo; its initials when no logo has been uploaded. */}
        <div className="hidden sm:flex items-center gap-2.5 min-w-0" title={user?.shop_name || ''}>
          {user?.shop_logo && !logoFailed ? (
            <img src={user.shop_logo} alt="" onError={() => setLogoFailed(true)}
              className="w-9 h-9 rounded-full object-cover bg-white ring-1 ring-line" />
          ) : (
            <span className="w-9 h-9 rounded-full bg-gold-soft text-primary-dark flex items-center justify-center text-[0.8rem] font-bold ring-1 ring-primary/20" aria-hidden="true">
              {initials}
            </span>
          )}
          {user?.shop_name && <span className="hidden xl:block max-w-[10rem] truncate text-sm font-semibold text-ink">{user.shop_name}</span>}
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            aria-label={t('logout', lang)}
            className="inline-flex items-center justify-center gap-1.5 min-w-11 min-h-11 lg:min-w-0 lg:min-h-0 text-sm text-slate-500 hover:text-danger px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
            </svg>
            <span className="hidden sm:inline">{t('logout', lang)}</span>
          </button>
        )}
      </div>
    </header>
  );
}
