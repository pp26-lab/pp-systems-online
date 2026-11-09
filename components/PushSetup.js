'use client';
import { useState, useEffect, useCallback } from 'react';
import { Modal, Button } from './ui';

// Turn on chat notifications for this phone/browser (Web Push), so a customer message rings
// even with the screen off or another app open. Shows a bell toggle and, on phones that haven't
// turned it on yet, a one-time hint. iPhone/iPad only allow it from the Home Screen app.

const COPY = {
  lo: {
    on: 'ແຈ້ງເຕືອນໃນມືຖືເປີດຢູ່ (ກົດເພື່ອປິດ)', off: 'ເປີດແຈ້ງເຕືອນໃນມືຖື',
    hint: 'ຢາກໃຫ້ມືຖືດັງເມື່ອລູກຄ້າທັກ ເຖິງວ່າປິດຈໍ ຫຼື ໃຊ້ແອັບອື່ນຢູ່?', enable: 'ເປີດແຈ້ງເຕືອນ', later: 'ໄວ້ທີຫຼັງ',
    enabled: 'ເປີດແຈ້ງເຕືອນແລ້ວ ມືຖືຈະດັງເມື່ອມີຂໍ້ຄວາມໃໝ່', disabled: 'ປິດແຈ້ງເຕືອນໃນເຄື່ອງນີ້ແລ້ວ',
    iosTitle: 'ເປີດແຈ້ງເຕືອນໃນ iPhone / iPad',
    iosSteps: ['ເປີດເວັບນີ້ໃນ Safari', 'ກົດປຸ່ມແບ່ງປັນ (ສີ່ຫຼ່ຽມມີລູກສອນຂຶ້ນ) ຢູ່ລຸ່ມຈໍ', 'ເລືອກ "ເພີ່ມໃສ່ໜ້າຈໍຫຼັກ" (Add to Home Screen) ແລ້ວກົດ ເພີ່ມ', 'ເປີດ PP Systems ຈາກໄອຄອນໃໝ່ໃນໜ້າຈໍຫຼັກ ເຂົ້າສູ່ລະບົບ ແລ້ວກົດ ເປີດແຈ້ງເຕືອນ ອີກຄັ້ງ'],
    deniedTitle: 'ແຈ້ງເຕືອນຖືກບລັອກໄວ້',
    denied: 'ກ່ອນໜ້ານີ້ໄດ້ກົດ ບໍ່ອະນຸຍາດ ໄວ້. ໃຫ້ເປີດຄືນໃນການຕັ້ງຄ່າ: ກົດຮູບແມ່ກະແຈ ຫຼື ⓘ ຂ້າງທີ່ຢູ່ເວັບ → ການແຈ້ງເຕືອນ → ອະນຸຍາດ, ແລ້ວກົດປຸ່ມນີ້ອີກຄັ້ງ',
    unsupported: 'Browser ນີ້ຮັບແຈ້ງເຕືອນບໍ່ໄດ້ ລອງໃຊ້ Chrome (Android) ຫຼື Safari (iPhone)', ok: 'ເຂົ້າໃຈແລ້ວ', failed: 'ເປີດແຈ້ງເຕືອນບໍ່ສຳເລັດ ລອງໃໝ່',
  },
  th: {
    on: 'แจ้งเตือนในมือถือเปิดอยู่ (กดเพื่อปิด)', off: 'เปิดแจ้งเตือนในมือถือ',
    hint: 'อยากให้มือถือดังเมื่อลูกค้าทัก แม้ปิดจอหรือใช้แอปอื่นอยู่?', enable: 'เปิดแจ้งเตือน', later: 'ไว้ทีหลัง',
    enabled: 'เปิดแจ้งเตือนแล้ว มือถือจะดังเมื่อมีข้อความใหม่', disabled: 'ปิดแจ้งเตือนในเครื่องนี้แล้ว',
    iosTitle: 'เปิดแจ้งเตือนใน iPhone / iPad',
    iosSteps: ['เปิดเว็บนี้ใน Safari', 'กดปุ่มแชร์ (สี่เหลี่ยมมีลูกศรขึ้น) ด้านล่างจอ', 'เลือก "เพิ่มไปยังหน้าจอโฮม" แล้วกด เพิ่ม', 'เปิด PP Systems จากไอคอนใหม่บนหน้าจอโฮม เข้าสู่ระบบ แล้วกด เปิดแจ้งเตือน อีกครั้ง'],
    deniedTitle: 'การแจ้งเตือนถูกบล็อกไว้',
    denied: 'ก่อนหน้านี้กด ไม่อนุญาต ไว้ ให้เปิดคืนในการตั้งค่า: กดรูปแม่กุญแจหรือ ⓘ ข้างที่อยู่เว็บ → การแจ้งเตือน → อนุญาต แล้วกดปุ่มนี้อีกครั้ง',
    unsupported: 'เบราว์เซอร์นี้รับแจ้งเตือนไม่ได้ ลองใช้ Chrome (Android) หรือ Safari (iPhone)', ok: 'เข้าใจแล้ว', failed: 'เปิดแจ้งเตือนไม่สำเร็จ ลองใหม่',
  },
  en: {
    on: 'Phone notifications on (tap to turn off)', off: 'Turn on phone notifications',
    hint: 'Want your phone to ring when a customer writes, even with the screen off or another app open?', enable: 'Turn on', later: 'Later',
    enabled: 'Notifications on. This phone will ring for new messages.', disabled: 'Notifications turned off on this device.',
    iosTitle: 'Turn on notifications on iPhone / iPad',
    iosSteps: ['Open this site in Safari', 'Tap the Share button (square with an up arrow) at the bottom', 'Choose "Add to Home Screen", then Add', 'Open PP Systems from the new Home Screen icon, sign in, and tap Turn on again'],
    deniedTitle: 'Notifications are blocked',
    denied: 'Notifications were blocked earlier. Allow them in the site settings: tap the lock or ⓘ next to the address → Notifications → Allow, then tap this again.',
    unsupported: "This browser can't receive notifications. Use Chrome (Android) or Safari (iPhone).", ok: 'OK', failed: "Couldn't turn on notifications. Try again.",
  },
};

const HINT_KEY = 'pp_push_hint';

function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}
function supported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
function keyBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

// Signing out of this device: stop its notifications for the shop it was signed in to.
export async function pushSignOut() {
  try {
    if (!supported()) return;
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  } catch { /* best effort */ }
}

export function usePush(lang) {
  // unknown | unsupported | ios_install | denied | off | on
  const [state, setState] = useState('unknown');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supported()) { setState(isIOS() && !isStandalone() ? 'ios_install' : 'unsupported'); return; }
      try {
        const reg = await registration();
        const sub = await reg.pushManager.getSubscription();
        if (!alive) return;
        if (Notification.permission === 'denied') { setState('denied'); return; }
        if (sub && Notification.permission === 'granted') {
          setState('on');
          // Keep the server's copy current (shop signed in now, language).
          fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), lang }) }).catch(() => {});
        } else {
          setState('off');
        }
      } catch {
        if (alive) setState('unsupported');
      }
    })();
    return () => { alive = false; };
  }, [lang]);

  const enable = useCallback(async () => {
    if (!supported()) return isIOS() && !isStandalone() ? 'ios_install' : 'unsupported';
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return perm === 'denied' ? 'denied' : 'off'; }
    const reg = await registration();
    const { publicKey } = await fetch('/api/push').then(r => r.json());
    if (!publicKey) throw new Error('no_key');
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), lang }) });
    if (!res.ok) throw new Error('save_failed');
    setState('on');
    return 'on';
  }, [lang]);

  const disable = useCallback(async () => {
    await pushSignOut();
    setState('off');
  }, []);

  return { state, enable, disable };
}

function Guide({ c, kind, onClose }) {
  if (!kind) return null;
  const title = kind === 'ios_install' ? c.iosTitle : kind === 'denied' ? c.deniedTitle : c.off;
  return (
    <Modal open onClose={onClose} title={title} size="sm" footer={<Button onClick={onClose}>{c.ok}</Button>}>
      {kind === 'ios_install' ? (
        <ol className="space-y-3">
          {c.iosSteps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink">
              <span className="w-6 h-6 rounded-full bg-gold-soft text-primary-dark text-xs font-bold flex items-center justify-center shrink-0 num">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink">{kind === 'denied' ? c.denied : c.unsupported}</p>
      )}
    </Modal>
  );
}

// Bell button for the chat list header.
export function PushToggle({ lang = 'lo', push, onMessage }) {
  const c = COPY[lang] || COPY.en;
  const [guide, setGuide] = useState(null);
  const [busy, setBusy] = useState(false);
  const { state, enable, disable } = push;
  if (state === 'unknown') return null;
  const on = state === 'on';

  async function click() {
    if (busy) return;
    if (on) { setBusy(true); await disable(); setBusy(false); onMessage?.(c.disabled); return; }
    if (state === 'ios_install' || state === 'unsupported' || state === 'denied') { setGuide(state); return; }
    setBusy(true);
    try {
      const r = await enable();
      if (r === 'on') onMessage?.(c.enabled);
      else if (r !== 'off') setGuide(r);
    } catch { onMessage?.(c.failed); }
    setBusy(false);
  }

  return (
    <>
      <button type="button" onClick={click} aria-pressed={on} title={on ? c.on : c.off} aria-label={on ? c.on : c.off} disabled={busy}
        className={`mb-1.5 shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${on ? 'text-primary hover:bg-canvas' : 'text-slate-400 hover:bg-canvas'}`}>
        <svg viewBox="0 0 24 24" className="w-[1.05rem] h-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />
          {!on && <path d="M4 4l16 16" />}
        </svg>
      </button>
      <Guide c={c} kind={guide} onClose={() => setGuide(null)} />
    </>
  );
}

// One-time suggestion on phones/tablets that haven't turned notifications on.
export function PushHint({ lang = 'lo', push, onMessage }) {
  const c = COPY[lang] || COPY.en;
  const [show, setShow] = useState(false);
  const [guide, setGuide] = useState(null);
  const { state, enable } = push;

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(HINT_KEY) === 'dismissed'; } catch { /* storage blocked */ }
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    setShow(!dismissed && touch && (state === 'off' || state === 'ios_install'));
  }, [state]);

  if (!show) return null;
  const dismiss = () => { setShow(false); try { localStorage.setItem(HINT_KEY, 'dismissed'); } catch { /* not saved */ } };

  async function turnOn() {
    if (state === 'ios_install') { setGuide('ios_install'); return; }
    try {
      const r = await enable();
      if (r === 'on') { onMessage?.(c.enabled); setShow(false); } else if (r !== 'off') setGuide(r);
    } catch { onMessage?.(c.failed); }
  }

  return (
    <div className="mb-3 rounded-lg bg-gold-soft/70 px-3 py-2.5 text-sm text-ink">
      <p>{c.hint}</p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={turnOn}>{c.enable}</Button>
        <Button size="sm" tone="subtle" onClick={dismiss}>{c.later}</Button>
      </div>
      <Guide c={c} kind={guide} onClose={() => setGuide(null)} />
    </div>
  );
}
