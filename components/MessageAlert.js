'use client';
import { useState, useEffect, useRef } from 'react';
import { useBadges } from './useBadges';

// Plays the PP Systems sound when a new customer message arrives (WhatsApp or Messenger),
// on any page of the shop system. Mounted once in the layout; renders nothing.
//
// - Watches chat_last_in (newest incoming message id) from the shared badge poller, so a
//   message into an already-unread chat still rings.
// - The first value after the page opens is only a baseline: opening the app never rings.
// - Several messages between two checks ring once.
// - Browsers only allow sound after the user has touched the page; the first tap/key
//   "unlocks" it (needed on iPhone/iPad), and a blocked play is silently skipped.
// - Can be turned off per device (localStorage pp_sound = 'off'), see SoundToggle.

export const SOUND_URL = '/sounds/ppsystems-message-v1.wav';
export const SOUND_KEY = 'pp_sound';

export function soundEnabled() {
  try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
}

const TOGGLE_LABEL = {
  lo: { on: 'ສຽງແຈ້ງເຕືອນເປີດຢູ່ (ກົດເພື່ອປິດ)', off: 'ສຽງແຈ້ງເຕືອນປິດຢູ່ (ກົດເພື່ອເປີດ)' },
  th: { on: 'เสียงแจ้งเตือนเปิดอยู่ (กดเพื่อปิด)', off: 'เสียงแจ้งเตือนปิดอยู่ (กดเพื่อเปิด)' },
  en: { on: 'Message sound on (tap to mute)', off: 'Message sound off (tap to turn on)' },
};

// Speaker button to mute/unmute the message sound on this device. Turning it on plays the
// sound once, so the shop knows what it sounds like (and the tap unlocks audio).
export function SoundToggle({ lang = 'lo' }) {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(soundEnabled()); }, []);
  const t = TOGGLE_LABEL[lang] || TOGGLE_LABEL.en;
  function toggle() {
    const next = !on;
    setOn(next);
    try { localStorage.setItem(SOUND_KEY, next ? 'on' : 'off'); } catch { /* not saved */ }
    if (next) { const a = new Audio(SOUND_URL); a.play().catch(() => {}); }
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={on} title={on ? t.on : t.off} aria-label={on ? t.on : t.off}
      className={`mb-1.5 ml-1 shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${on ? 'text-primary hover:bg-canvas' : 'text-slate-400 hover:bg-canvas'}`}>
      <svg viewBox="0 0 24 24" className="w-[1.05rem] h-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5M21 9.5l-5 5" />}
      </svg>
    </button>
  );
}

export default function MessageAlert() {
  const { chat_last_in: lastIn } = useBadges();
  const seen = useRef(null);
  const audio = useRef(null);

  useEffect(() => {
    const a = new Audio(SOUND_URL);
    a.preload = 'auto';
    audio.current = a;
    const unlock = () => {
      a.muted = true;
      a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {}).finally(() => { a.muted = false; });
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (lastIn == null) return; // badges not loaded yet
    const id = Number(lastIn) || 0;
    if (seen.current === null) { seen.current = id; return; } // baseline, no sound
    if (id > seen.current) {
      seen.current = id;
      const a = audio.current;
      if (a && soundEnabled()) {
        a.currentTime = 0;
        a.play().catch(() => { /* not unlocked yet, or the device blocks sound */ });
      }
    }
  }, [lastIn]);

  return null;
}
