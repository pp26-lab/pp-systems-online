'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') { setLoading(false); return; }
    fetch('/api/admin/me').then(r => {
      if (r.ok) { setAuthed(true); setLoading(false); }
      else router.push('/admin/login');
    });
  }, [pathname]);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  if (pathname === '/admin/login') return <>{children}</>;
  if (loading) return <div className="p-10 text-center text-gray-500">Loading...</div>;
  if (!authed) return null;

  const links = [
    { href: '/admin', label: '📊 Dashboard' },
    { href: '/admin/licenses', label: '🔑 Licenses' },
    { href: '/admin/shops', label: '🏪 Shops' },
    { href: '/admin/keys', label: '🤖 API Keys' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="font-bold">⚙️ PP Systems Admin</div>
          <div className="flex gap-2 flex-wrap">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded text-sm ${pathname === l.href ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                {l.label}
              </Link>
            ))}
            <button onClick={logout} className="px-3 py-1.5 rounded text-sm bg-red-600 hover:bg-red-700">Logout</button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
