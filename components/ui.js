'use client';
import { useEffect, useRef } from 'react';

// Shared building blocks so every page looks and behaves the same.

const PATHS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17l9-10',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  print: 'M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z',
  chat: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4V5.5z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  download: 'M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  image: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  box: 'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9',
  user: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  tag: 'M3 12V4h8l9 9-8 8-9-9zM7.5 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  history: 'M12 7.5V12l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  camera: 'M4 8h2.5L8 6h8l1.5 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  ticket: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4zM14.5 6v12',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6L13 3z',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  sticker: 'M12 21a9 9 0 1 1 9-9c0 5-4 9-9 9zM21 12h-5a4 4 0 0 0-4 4v5M8.5 10h.01M14 9h.01',
  whatsapp: 'M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20zM9 9.5c.5 2 2 3.5 4 4l1.2-1.2 2 1-1 2c-3.5 0-7-3.5-7-7l2-1 1 2L9 9.5z',
  phone: 'M5 4h3.5l1.5 4.5-2.2 1.3a11 11 0 0 0 6.4 6.4l1.3-2.2L20 15.5V19a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1z',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
};

export function Icon({ name, className = 'w-5 h-5', strokeWidth = 1.7 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

const BTN_BASE = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-[color,background-color,border-color,transform] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap';
// Below lg (phones and tablets) every control is at least ~44px tall for fingers.
const BTN_SIZE = { sm: 'px-3 min-h-10 lg:min-h-0 py-1.5 text-sm', md: 'px-4 min-h-11 lg:min-h-0 py-2.5 text-sm', lg: 'px-5 min-h-12 py-3.5 text-base' };
const BTN_TONE = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  // The main action of a screen (charge, save sale). Same blue, extra weight.
  gold: 'bg-primary text-white hover:bg-primary-dark shadow-[0_1px_0_rgba(14,26,51,.25)]',
  ghost: 'bg-white text-ink border border-line hover:border-slate-300 hover:bg-canvas',
  subtle: 'text-slate-600 hover:bg-canvas hover:text-ink',
  danger: 'bg-white text-danger border border-line hover:bg-red-50 hover:border-red-200',
};

export function btn(tone = 'primary', size = 'md') {
  return `${BTN_BASE} ${BTN_SIZE[size]} ${BTN_TONE[tone]}`;
}

export function Button({ tone = 'primary', size = 'md', className = '', icon, children, ...props }) {
  return (
    <button type="button" className={`${btn(tone, size)} ${className}`} {...props}>
      {icon && <Icon name={icon} className="w-4 h-4" strokeWidth={2} />}
      {children}
    </button>
  );
}

// Square icon-only action, always with an accessible label.
export function IconButton({ icon, label, tone = 'default', className = '', ...props }) {
  const tones = {
    default: 'text-slate-500 hover:text-ink hover:bg-canvas',
    danger: 'text-slate-400 hover:text-danger hover:bg-red-50',
    gold: 'text-slate-500 hover:text-gold-dark hover:bg-gold-soft',
  };
  return (
    <button type="button" aria-label={label} title={label}
      className={`inline-flex items-center justify-center w-11 h-11 lg:w-9 lg:h-9 rounded-lg transition-colors ${tones[tone]} ${className}`} {...props}>
      <Icon name={icon} className="w-[1.15rem] h-[1.15rem]" />
    </button>
  );
}

// 16px text below lg stops iPhones from zooming in when a field is tapped.
export const inputCls = 'w-full px-3.5 py-3 lg:py-2.5 border rounded-lg text-base lg:text-[0.95rem] text-ink placeholder:text-slate-400';

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-sm font-semibold text-ink mb-1.5">{label}</span>}
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}

// One-of-many choice as a row of buttons.
export function Segmented({ value, onChange, options, className = '', size = 'md' }) {
  const pad = size === 'sm' ? 'py-2 lg:py-1.5 text-[0.8rem]' : 'py-3 lg:py-2.5 text-sm';
  return (
    <div role="radiogroup" className={`grid gap-1 p-1 rounded-lg bg-canvas border border-line ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`px-2 rounded-md font-semibold transition-colors ${pad} ${
              active ? 'bg-white text-primary shadow-sm ring-1 ring-line' : 'text-slate-500 hover:text-ink'
            }`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const panel = useRef(null);
  // Keep the latest onClose without re-running the effect — re-running it on every
  // render would steal focus back from inputs while the user is typing.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') closeRef.current?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 no-print">
      <div className="absolute inset-0 bg-ink/55" onClick={onClose} aria-hidden="true" />
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={`relative w-full ${widths[size]} bg-white sm:rounded-2xl rounded-t-2xl max-h-[92dvh] flex flex-col outline-none`}>
        <span className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
        {title && (
          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-line">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-ink">{title}</h2>
              {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
            </div>
            <IconButton icon="close" label="Close" onClick={onClose} className="-mr-2 -mt-1" />
          </div>
        )}
        <div className={`px-5 sm:px-6 py-5 overflow-y-auto overscroll-contain ${footer ? '' : 'pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5'}`}>{children}</div>
        {footer && <div className="px-5 sm:px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-line flex flex-wrap justify-end gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon = 'box', title, text, action }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-full bg-canvas text-slate-400 flex items-center justify-center">
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500 max-w-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Card surface used for page sections and tables.
export const card = 'bg-white rounded-xl border border-line';

// Toolbar row at the top of a page: filters on the left, actions on the right.
export function Toolbar({ children, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
      <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, className = '', inputRef, onKeyDown }) {
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input ref={inputRef} type="search" value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown}
        placeholder={placeholder} className={`${inputCls} pl-10`} />
    </div>
  );
}

// Pill filter (category, status, period).
export function Chip({ active, onClick, children, count }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-4 lg:px-3.5 min-h-10 lg:min-h-0 py-1.5 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap ${
        active ? 'bg-gold-soft text-primary-dark border-primary/40' : 'bg-white text-slate-600 border-line hover:border-slate-300 hover:text-ink'
      }`}>
      {children}
      {count != null && <span className={`num text-xs ${active ? 'text-primary' : 'text-slate-400'}`}>{count}</span>}
    </button>
  );
}

const PILL = {
  green: 'bg-[#E3F5EC] text-[#0B6B49]',
  navy: 'bg-[#E8F1FF] text-[#0950C2]',
  gold: 'bg-[#FFF3DE] text-[#8A4B00]',
  red: 'bg-red-50 text-danger',
  gray: 'bg-canvas text-slate-600',
  violet: 'bg-[#EAE8F5] text-[#3F3A7A]',
};

export function Pill({ tone = 'gray', children }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${PILL[tone]}`}>{children}</span>;
}
