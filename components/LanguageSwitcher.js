'use client';

// Text-only labels: Windows doesn't render flag emoji (they show as "LA", "TH").
const languages = [
  { code: 'lo', label: 'ລາວ' },
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'EN' },
];

export default function LanguageSwitcher({ lang, setLang }) {
  return (
    <div role="radiogroup" aria-label="Language" className="inline-flex p-0.5 rounded-lg bg-canvas border border-line">
      {languages.map(l => {
        const active = lang === l.code;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLang(l.code)}
            className={`px-2.5 py-1 rounded-md text-[0.8rem] font-semibold transition-colors ${
              active ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'
            }`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
