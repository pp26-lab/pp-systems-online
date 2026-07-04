'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '../../lib/i18n';
import { useState, useEffect } from 'react';

const menuItems = [
  { key: 'dashboard', path: '/', icon: '📊' },
  { key: 'pos', path: '/pos', icon: '🛒' },
  { key: 'products', path: '/products', icon: '📦' },
  { key: 'orders', path: '/orders', icon: '📋' },
  { key: 'inventory', path: '/inventory', icon: '🏭' },
  { key: 'currencies', path: '/currencies', icon: '💱' },
  { key: 'settings', path: '/settings', icon: '⚙️' },
];

export default function Sidebar({ isOpen, onToggle, lang }) {
  const pathname = usePathname();
  const [shopName, setShopName] = useState('PP Systems');
  const [shopLogo, setShopLogo] = useState('');

  useEffect(() => {
    fetch('/api/shop-settings').then(r => r.json()).then(data => {
      if (data.shop_name) setShopName(data.shop_name);
      if (data.shop_logo) setShopLogo(data.shop_logo);
    }).catch(() => {});
  }, []);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onToggle} />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-sidebar text-white transform transition-transform duration-200 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        <div className="p-4 border-b border-white/10 flex items-center gap-2 justify-center lg:justify-start">
          <img src={shopLogo || '/logo.png'} alt="" className="w-9 h-9 object-contain rounded bg-white/10 flex-shrink-0" />
          <h1 className={`font-bold text-xl ${!isOpen && 'lg:hidden'}`}>
            {shopName}
          </h1>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.key}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
                } ${!isOpen && 'lg:justify-center lg:px-2'}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className={!isOpen ? 'lg:hidden' : ''}>{t(item.key, lang)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 text-xs text-gray-400 text-center">
          PP Systems v1.0.0
        </div>
      </aside>
    </>
  );
}
