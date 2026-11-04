'use client';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '../LanguageSwitcher';
import { t } from '../../lib/i18n';

const TITLE_KEYS = {
  '/': 'dashboard', '/pos': 'pos', '/orders': 'orders', '/products': 'products',
  '/inventory': 'inventory', '/stock-log': 'stock_log', '/customers': 'customers',
  '/handoffs': 'handoffs', '/chat': 'chat', '/coupons': 'coupons', '/currencies': 'currencies',
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
  const initials = (user?.shop_name || 'PP').trim().slice(0, 2).toUpperCase();

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
        <div className="hidden sm:flex w-9 h-9 rounded-full bg-ink text-gold items-center justify-center text-[0.8rem] font-bold ring-1 ring-gold/40" aria-hidden="true">
          {initials}
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
