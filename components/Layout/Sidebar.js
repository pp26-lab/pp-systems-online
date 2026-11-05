'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { t } from '../../lib/i18n';

const ICONS = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  pos: 'M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8zM9 8V6a3 3 0 0 1 6 0v2',
  orders: 'M9 3.5h6v3H9zM7 5H5.5A1.5 1.5 0 0 0 4 6.5v13A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 5H17M8 11.5h8M8 15.5h5',
  products: 'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9',
  inventory: 'M3 10.5 12 5l9 5.5V20H3zM8 20v-6h8v6M8 17h8',
  stock_log: 'M12 7.5V12l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4',
  customers: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8',
  chat: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V12a1.5 1.5 0 0 1-1.5 1.5H8L4 17V5.5zM16 8h2.5A1.5 1.5 0 0 1 20 9.5V20l-3.5-3H10a1.5 1.5 0 0 1-1.5-1.5v-2',
  handoffs: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4V5.5zM8 9h8M8 12h5',
  coupons: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4zM14.5 6v12',
  currencies: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM14.5 8.5h-3.75a1.75 1.75 0 0 0 0 3.5h2.5a1.75 1.75 0 0 1 0 3.5H9.5M12 7v1.5M12 15.5V17',
  webhooks: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  settings: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
};

const GROUPS = [
  { label: { lo: 'ການຂາຍ', th: 'การขาย', en: 'Sales' }, items: [
    { key: 'dashboard', path: '/' },
    { key: 'pos', path: '/pos' },
    { key: 'orders', path: '/orders', badge: 'pending_orders' },
    { key: 'chat', path: '/chat', badge: 'chat_unread', feature: 'chat' },
  ] },
  { label: { lo: 'ສິນຄ້າ', th: 'สินค้า', en: 'Catalog' }, items: [
    { key: 'products', path: '/products' },
    { key: 'inventory', path: '/inventory' },
    { key: 'stock_log', path: '/stock-log' },
  ] },
  { label: { lo: 'ລູກຄ້າ', th: 'ลูกค้า', en: 'Customers' }, items: [
    { key: 'customers', path: '/customers' },
    { key: 'handoffs', path: '/handoffs', badge: 'handoffs', feature: 'bot_api' },
    { key: 'coupons', path: '/coupons', feature: 'coupons' },
  ] },
  { label: { lo: 'ລະບົບ', th: 'ระบบ', en: 'System' }, items: [
    { key: 'currencies', path: '/currencies' },
    { key: 'webhooks', path: '/webhooks', feature: 'webhooks' },
    { key: 'settings', path: '/settings' },
  ] },
];

function Icon({ name, className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function Sidebar({ isOpen, onToggle, onClose, lang }) {
  const pathname = usePathname();
  const [shopName, setShopName] = useState('PP Systems');
  const [shopLogo, setShopLogo] = useState('');
  const [badges, setBadges] = useState({ handoffs: 0, pending_orders: 0, chat_unread: 0 });
  const [features, setFeatures] = useState(null);

  useEffect(() => {
    fetch('/api/features').then(r => (r.ok ? r.json() : null)).then(f => f && setFeatures(f)).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/shop-settings').then(r => r.json()).then(data => {
      if (data.shop_name) setShopName(data.shop_name);
      if (data.shop_logo) setShopLogo(data.shop_logo);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/badges');
        if (res.ok && alive) setBadges(await res.json());
      } catch {}
    }
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [pathname]);

  function handleNavigate() {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) onClose?.();
  }

  const collapsed = !isOpen;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-ink/50 z-[35] lg:hidden" onClick={onToggle} aria-hidden="true" />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 lg:z-auto bg-ink text-white flex flex-col no-print transition-[width,transform] duration-200 ease-out ${
          isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-[76px]'
        }`}
      >
        <div className={`h-16 flex items-center gap-3 border-b border-ink-line shrink-0 ${collapsed ? 'lg:justify-center px-5 lg:px-0' : 'px-5'}`}>
          <img
            src={shopLogo || '/brand/pp-systems-icon-192.png'}
            alt=""
            onError={e => { e.currentTarget.src = '/brand/pp-systems-icon-192.png'; }}
            className="w-9 h-9 rounded-lg object-cover ring-1 ring-gold/60 shrink-0"
          />
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="font-bold text-[0.95rem] leading-tight truncate">{shopName}</p>
            <p className="text-[0.7rem] text-slate-400 leading-tight">PP Systems</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3" aria-label="Main">
          {GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              <p className={`px-6 pb-1.5 text-[0.72rem] font-medium text-slate-500 ${collapsed ? 'lg:hidden' : ''}`}>
                {group.label[lang] || group.label.en}
              </p>
              {collapsed && gi > 0 && <div className="hidden lg:block mx-5 mb-2 border-t border-ink-line" />}
              <ul className="space-y-0.5">
                {group.items.filter(item => !item.feature || features?.[item.feature]).map(item => {
                  const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/'));
                  const count = item.badge ? badges[item.badge] || 0 : 0;
                  const label = t(item.key, lang);
                  return (
                    <li key={item.key} className="relative">
                      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gold" aria-hidden="true" />}
                      <Link
                        href={item.path}
                        onClick={handleNavigate}
                        title={collapsed ? label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`group flex items-center gap-3 mx-3 px-3 py-3 lg:py-2.5 rounded-lg text-[0.95rem] lg:text-[0.9rem] transition-colors ${
                          active ? 'bg-ink-soft text-white font-semibold' : 'text-slate-300 hover:bg-ink-soft hover:text-white'
                        } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
                      >
                        <span className="relative shrink-0">
                          <Icon name={item.key} className={`w-5 h-5 ${active ? 'text-gold' : 'text-slate-400 group-hover:text-slate-200'}`} />
                          {count > 0 && collapsed && (
                            <span className="hidden lg:block absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gold ring-2 ring-ink" />
                          )}
                        </span>
                        <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
                        {count > 0 && (
                          <span className={`ml-auto min-w-[1.375rem] h-[1.375rem] px-1.5 rounded-full bg-gold text-ink text-[0.72rem] font-bold flex items-center justify-center num ${collapsed ? 'lg:hidden' : ''}`}>
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-ink-line p-3 shrink-0 hidden lg:block">
          <button
            onClick={onToggle}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-ink-soft hover:text-white transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className={`w-5 h-5 shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`} aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            {!collapsed && <span>{lang === 'th' ? 'ย่อเมนู' : lang === 'lo' ? 'ຫຍໍ້ເມນູ' : 'Collapse'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
