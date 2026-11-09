'use client';
import { useState, useEffect } from 'react';

// One shared poller for /api/badges. The sidebar, the bottom menu and the message sound all
// read from it, so the page makes one request every few seconds instead of one per component.

const EVERY_MS = 10000;
const store = { value: {}, subs: new Set(), timer: null, busy: false };

async function refresh() {
  if (store.busy) return;
  store.busy = true;
  try {
    const res = await fetch('/api/badges');
    if (res.ok) {
      store.value = await res.json();
      for (const fn of store.subs) fn(store.value);
    }
  } catch { /* offline for a moment: keep the last numbers */ }
  finally { store.busy = false; }
}

// Ask for fresh numbers now (e.g. right after the user reads a chat).
export function refreshBadges() { refresh(); }

export function useBadges() {
  const [badges, setBadges] = useState(store.value);
  useEffect(() => {
    store.subs.add(setBadges);
    if (!store.timer) {
      refresh();
      store.timer = setInterval(refresh, EVERY_MS);
    } else {
      setBadges(store.value);
    }
    return () => {
      store.subs.delete(setBadges);
      if (!store.subs.size) { clearInterval(store.timer); store.timer = null; }
    };
  }, []);
  return badges;
}
