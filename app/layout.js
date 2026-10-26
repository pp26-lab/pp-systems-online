'use client';
import './globals.css';
import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '../components/Layout/Sidebar';
import Header from '../components/Layout/Header';

export const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

// Runs before React hydrates: kills stale service workers / caches that could
// serve old JS chunks, and auto-reloads once if a chunk fails to load so the
// user never sees the "client-side exception" screen.
const bootScript = `(function(){
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});}).catch(function(){});
    }
    if (window.caches && caches.keys) {
      caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k);});}).catch(function(){});
    }
  } catch(e){}
  function isChunkErr(m){ m=m||''; return m.indexOf('ChunkLoadError')!==-1 || m.indexOf('Loading chunk')!==-1 || m.indexOf('Loading CSS chunk')!==-1; }
  function reloadOnce(){
    try {
      if (!sessionStorage.getItem('pp_chunk_reload')) {
        sessionStorage.setItem('pp_chunk_reload','1');
        location.reload();
      }
    } catch(e){ location.reload(); }
  }
  window.addEventListener('error', function(e){ if (isChunkErr(e && e.message)) reloadOnce(); });
  window.addEventListener('unhandledrejection', function(e){ if (e && e.reason && isChunkErr(''+e.reason)) reloadOnce(); });
  window.addEventListener('load', function(){ setTimeout(function(){ try{ sessionStorage.removeItem('pp_chunk_reload'); }catch(e){} }, 4000); });
})();`;

function BootScript() {
  return <script dangerouslySetInnerHTML={{ __html: bootScript }} />;
}

export default function RootLayout({ children }) {
  const [lang, setLang] = useState('lo');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const r of regs) r.unregister();
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  async function checkAuth() {
    if (pathname === '/login' || pathname.startsWith('/admin')) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  }

  if (pathname === '/login' || pathname.startsWith('/admin')) {
    return (
      <html lang={lang}>
        <head>
          <BootScript />
          <title>PP Systems Online - Login</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className="bg-gray-50 min-h-screen">
          <AppContext.Provider value={{ lang, setLang, user }}>
            {children}
          </AppContext.Provider>
        </body>
      </html>
    );
  }

  if (loading) {
    return (
      <html lang={lang}>
        <head>
          <BootScript />
          <title>PP Systems Online</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang={lang}>
      <head>
        <BootScript />
        <title>PP Systems Online</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <AppContext.Provider value={{ lang, setLang, user, handleLogout }}>
          <div className="flex h-screen overflow-hidden">
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} lang={lang} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header lang={lang} setLang={setLang} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />
              <main className="flex-1 overflow-auto p-4 lg:p-6">
                {children}
              </main>
            </div>
          </div>
        </AppContext.Provider>
      </body>
    </html>
  );
}
