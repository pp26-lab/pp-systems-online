'use client';

const languages = [
  { code: 'lo', label: '🇱🇦 ລາວ' },
  { code: 'th', label: '🇹🇭 ไทย' },
  { code: 'en', label: '🇺🇸 English' },
];

export default function LanguageSwitcher({ lang, setLang }) {
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 bg-white cursor-pointer focus:ring-2 focus:ring-primary focus:outline-none"
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
