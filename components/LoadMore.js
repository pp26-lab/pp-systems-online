'use client';
import { useEffect, useRef } from 'react';

const COPY = {
  lo: { more: 'ໂຫຼດເພີ່ມ', loading: 'ກຳລັງໂຫຼດ…', end: 'ສະແດງຄົບແລ້ວ' },
  th: { more: 'โหลดเพิ่ม', loading: 'กำลังโหลด…', end: 'แสดงครบแล้ว' },
  en: { more: 'Load more', loading: 'Loading…', end: "That's everything" },
};

// Put at the end of a long list. When it scrolls into view (a little before, so the next page
// is usually there by the time you reach it) it asks for the next page. The button is the
// fallback for keyboards, screen readers and browsers without IntersectionObserver.
export default function LoadMore({ hasMore, loading, onMore, lang = 'lo', showEnd = false, className = '' }) {
  const c = COPY[lang] || COPY.en;
  const ref = useRef(null);
  const busy = useRef(false);
  busy.current = loading;

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting) && !busy.current) onMore();
    }, { rootMargin: '400px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onMore]);

  if (!hasMore) {
    return showEnd ? <p className={`py-4 text-center text-xs text-slate-400 ${className}`}>{c.end}</p> : null;
  }
  return (
    <div ref={ref} className={`py-3 flex justify-center ${className}`}>
      <button type="button" onClick={() => !loading && onMore()} disabled={loading} aria-busy={loading}
        className="min-h-11 lg:min-h-9 px-4 rounded-lg text-sm font-semibold text-primary hover:bg-gold-soft disabled:text-slate-400">
        {loading ? c.loading : c.more}
      </button>
    </div>
  );
}
