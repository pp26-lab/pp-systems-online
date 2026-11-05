'use client';
import './globals.css';
import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '../components/Layout/Sidebar';
import Header from '../components/Layout/Header';
import BottomNav, { NO_PAD } from '../components/Layout/BottomNav';

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
  const [lang, setLangState] = useState('lo');

  // The chosen language is remembered on this device until someone picks another.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pp_lang');
      if (saved === 'lo' || saved === 'th' || saved === 'en') setLangState(saved);
    } catch { /* storage blocked: stay on the default */ }
  }, []);
  function setLang(next) {
    setLangState(next);
    try { localStorage.setItem('pp_lang', next); } catch { /* not saved, still switches */ }
  }
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Sidebar starts open on desktop, closed on phones/tablets so it never covers the page on load.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    setSidebarOpen(desktop.matches);
    const onChange = e => setSidebarOpen(e.matches);
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
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
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0E1A33" />
        <link rel="icon" type="image/png" sizes="192x192" href="/brand/pp-systems-icon-192.png" />
        <link rel="apple-touch-icon" href="/brand/pp-systems-icon-192.png" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+Lao:wght@400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0E1A33" />
        <link rel="icon" type="image/png" sizes="192x192" href="/brand/pp-systems-icon-192.png" />
        <link rel="apple-touch-icon" href="/brand/pp-systems-icon-192.png" />
        </head>
        <body className="bg-[#F3F5F8] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <img src="/brand/pp-systems-logo.png" alt="PP Systems" className="w-36 h-auto mx-auto mb-6" />
            <div className="w-8 h-8 border-[3px] border-[#1C3260] border-t-transparent rounded-full animate-spin mx-auto" aria-label="Loading"></div>
          </div>
        </body>
      </html>
    );
  }

  const hasBottomNav = !NO_PAD.some(p => pathname === p || pathname.startsWith(p + '/'));

  return (
    <html lang={lang}>
      <head>
        <BootScript />
        <title>PP Systems Online</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0E1A33" />
        <link rel="icon" type="image/png" sizes="192x192" href="/brand/pp-systems-icon-192.png" />
        <link rel="apple-touch-icon" href="/brand/pp-systems-icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+Lao:wght@400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-canvas min-h-screen">
        <AppContext.Provider value={{ lang, setLang, user, handleLogout }}>
          <div className="flex h-[100dvh] overflow-hidden">
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onClose={() => setSidebarOpen(false)} lang={lang} />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <Header lang={lang} setLang={setLang} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} user={user} />
              {/* Leave room for the bottom navigation on phones and tablets. */}
              <main className={`flex-1 overflow-auto p-4 lg:p-6 ${hasBottomNav ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-6' : ''}`}>
                {children}
              </main>
              <BottomNav lang={lang} onMore={() => setSidebarOpen(true)} />
            </div>
          </div>
        </AppContext.Provider>
      </body>
    </html>
  );
}
