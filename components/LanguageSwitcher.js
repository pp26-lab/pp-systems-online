'use client';
import { useState, useEffect, useRef } from 'react';

// One button showing the current language; tap it to pick another.
// Text labels only: Windows doesn't render flag emoji.
const languages = [
  { code: 'lo', label: 'ລາວ', name: 'ພາສາລາວ' },
  { code: 'th', label: 'ไทย', name: 'ภาษาไทย' },
  { code: 'en', label: 'EN', name: 'English' },
];

const TITLE = { lo: 'ປ່ຽນພາສາ', th: 'เปลี่ยนภาษา', en: 'Change language' };

export default function LanguageSwitcher({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const current = languages.find(l => l.code === lang) || languages[0];

  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (!box.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}
        aria-label={TITLE[lang] || TITLE.en} title={TITLE[lang] || TITLE.en}
        className="inline-flex items-center gap-1.5 min-h-11 lg:min-h-9 px-3 rounded-lg border border-line bg-white text-sm font-semibold text-ink hover:border-slate-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-500" aria-hidden="true">
          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        {current.label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={TITLE[lang] || TITLE.en}
          className="absolute right-0 mt-1.5 z-50 w-44 rounded-xl border border-line bg-white shadow-lg py-1">
          {languages.map(l => {
            const active = l.code === lang;
            return (
              <li key={l.code}>
                <button type="button" role="option" aria-selected={active} onClick={() => { setLang(l.code); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 min-h-11 text-sm ${active ? 'text-primary font-semibold bg-gold-soft' : 'text-ink hover:bg-canvas'}`}>
                  {l.name}
                  {active && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true"><path d="M5 12.5 10 17l9-10" /></svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
