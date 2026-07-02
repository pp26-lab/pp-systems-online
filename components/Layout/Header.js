'use client';
import LanguageSwitcher from '../LanguageSwitcher';
import { t } from '../../lib/i18n';

export default function Header({ lang, setLang, onMenuToggle, onLogout }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between no-print">
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <LanguageSwitcher lang={lang} setLang={setLang} />
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            title={t('logout', lang)}
          >
            {t('logout', lang)}
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
          PP
        </div>
      </div>
    </header>
  );
}
