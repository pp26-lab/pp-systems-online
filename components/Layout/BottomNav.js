'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { t } from '../../lib/i18n';

// Phone and tablet navigation: the 4 places a shop uses all day, plus "More" for the rest.
// Big targets with a label under every icon, so nobody has to guess what an icon means.

const ICON = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  pos: 'M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8zM9 8V6a3 3 0 0 1 6 0v2',
  orders: 'M9 3.5h6v3H9zM7 5H5.5A1.5 1.5 0 0 0 4 6.5v13A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 5H17M8 11.5h8M8 15.5h5',
  chat: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V12a1.5 1.5 0 0 1-1.5 1.5H8L4 17V5.5zM16 8h2.5A1.5 1.5 0 0 1 20 9.5V20l-3.5-3H10a1.5 1.5 0 0 1-1.5-1.5v-2',
  products: 'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9',
  more: 'M4 6h16M4 12h16M4 18h16',
};

const MORE = { lo: 'ເມນູ', th: 'เมนู', en: 'More' };

// The checkout screen owns the bottom of the screen (cart bar). The chat screen hides the
// bar itself while a conversation is open, so the message box gets the full height.
export const HIDE_ON = ['/pos'];
// Screens that size themselves to the viewport, so the page shouldn't add bottom padding.
export const NO_PAD = ['/pos', '/chat'];

export default function BottomNav({ lang, onMore }) {
  const pathname = usePathname();
  const [badges, setBadges] = useState({});
  const [features, setFeatures] = useState(null);

  useEffect(() => {
    fetch('/api/features').then(r => (r.ok ? r.json() : null)).then(f => f && setFeatures(f)).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => fetch('/api/badges').then(r => (r.ok ? r.json() : null)).then(b => { if (alive && b) setBadges(b); }).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (HIDE_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;

  const items = [
    { key: 'dashboard', path: '/' },
    { key: 'pos', path: '/pos' },
    { key: 'orders', path: '/orders', badge: badges.pending_orders },
    features?.chat ? { key: 'chat', path: '/chat', badge: badges.chat_unread } : { key: 'products', path: '/products' },
  ];

  return (
    <nav aria-label="Main" className="bottom-nav lg:hidden fixed inset-x-0 bottom-0 z-20 bg-white border-t border-line no-print pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map(item => {
          const active = item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <li key={item.key}>
              <Link href={item.path} aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 h-16 text-[0.72rem] font-semibold transition-colors ${active ? 'text-primary' : 'text-slate-500 active:text-ink'}`}>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-b-full bg-gold" aria-hidden="true" />}
                <span className="relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
                    <path d={ICON[item.key]} />
                  </svg>
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[1.2rem] h-[1.2rem] px-1 rounded-full bg-danger text-white text-[0.65rem] font-bold flex items-center justify-center num ring-2 ring-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="truncate max-w-full px-1">{t(item.key, lang)}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button onClick={onMore} className="w-full flex flex-col items-center justify-center gap-1 h-16 text-[0.72rem] font-semibold text-slate-500 active:text-ink">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-6 h-6" aria-hidden="true"><path d={ICON.more} /></svg>
            <span>{MORE[lang] || MORE.en}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
