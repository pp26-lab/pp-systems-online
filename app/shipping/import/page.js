'use client';
import { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../../layout';
import { Button, Icon } from '../../../components/ui';

// The small window the bookmark opens from app.anousith.express. The bookmark reads the
// shop's parcels with the shop's own Anousith sign-in, in the shop's own browser, and hands
// them to this window with postMessage. Only messages from the Anousith site are accepted;
// this window then saves them for whichever PP Systems shop is signed in here.

const ANOUSITH_ORIGIN = 'https://app.anousith.express';

const COPY = {
  lo: {
    waiting: 'ກຳລັງຮັບບິນຈາກ Anousith…', saving: 'ກຳລັງບັນທຶກ ແລະ ຈັບຄູ່ອໍເດີ້…',
    notFromBookmark: 'ໜ້ານີ້ເປີດຈາກປຸ່ມ Bookmark ໃນເວັບ Anousith ເທົ່ານັ້ນ', howTo: 'ເບິ່ງວິທີຕິດຕັ້ງໃນໜ້າ ຂົນສົ່ງ',
    done: 'ຮັບບິນແລ້ວ', seen: 'ບິນ 3 ມື້ຫຼ້າສຸດ', added: 'ບິນໃໝ່', matched: 'ຈັບຄູ່ກັບອໍເດີ້', queued: 'ກຳລັງແຈ້ງລູກຄ້າ',
    nothingNew: 'ບໍ່ມີບິນໃໝ່ຕັ້ງແຕ່ຄັ້ງກ່ອນ', open: 'ເບິ່ງລາຍການ', close: 'ປິດໜ້າຕ່າງ',
    mismatchTitle: 'ບັນຊີ Anousith ບໍ່ກົງກັບຄັ້ງກ່ອນ', mismatchText: 'ບິນນີ້ມາຈາກບັນຊີ:',
    mismatchAsk: 'ຖ້າຮ້ານປ່ຽນບັນຊີແທ້ ກົດ "ໃຊ້ບັນຊີນີ້". ຖ້າເຂົ້າຜິດບັນຊີ ໃຫ້ປິດໜ້ານີ້ ແລ້ວເຂົ້າບັນຊີທີ່ຖືກໃນ Anousith',
    useThis: 'ໃຊ້ບັນຊີນີ້', cancel: 'ຍົກເລີກ',
    anousithError: 'ດຶງບິນຈາກ Anousith ບໍ່ໄດ້. ລອງອອກຈາກລະບົບ Anousith ແລ້ວເຂົ້າໃໝ່ ຈາກນັ້ນກົດປຸ່ມອີກຄັ້ງ',
    failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງກົດປຸ່ມອີກຄັ້ງ', off: 'ຮ້ານນີ້ຍັງບໍ່ໄດ້ເປີດໃຊ້ຟັງຊັນຂົນສົ່ງ',
  },
  th: {
    waiting: 'กำลังรับบิลจาก Anousith…', saving: 'กำลังบันทึกและจับคู่ออเดอร์…',
    notFromBookmark: 'หน้านี้เปิดจากปุ่ม Bookmark ในเว็บ Anousith เท่านั้น', howTo: 'ดูวิธีติดตั้งในหน้า ขนส่ง',
    done: 'รับบิลแล้ว', seen: 'บิล 3 วันล่าสุด', added: 'บิลใหม่', matched: 'จับคู่กับออเดอร์', queued: 'กำลังแจ้งลูกค้า',
    nothingNew: 'ไม่มีบิลใหม่ตั้งแต่ครั้งก่อน', open: 'ดูรายการ', close: 'ปิดหน้าต่าง',
    mismatchTitle: 'บัญชี Anousith ไม่ตรงกับครั้งก่อน', mismatchText: 'บิลนี้มาจากบัญชี:',
    mismatchAsk: 'ถ้าร้านเปลี่ยนบัญชีจริง กด "ใช้บัญชีนี้" ถ้าเข้าผิดบัญชี ให้ปิดหน้านี้แล้วเข้าบัญชีที่ถูกใน Anousith',
    useThis: 'ใช้บัญชีนี้', cancel: 'ยกเลิก',
    anousithError: 'ดึงบิลจาก Anousith ไม่ได้ ลองออกจากระบบ Anousith แล้วเข้าใหม่ จากนั้นกดปุ่มอีกครั้ง',
    failed: 'บันทึกไม่สำเร็จ ลองกดปุ่มอีกครั้ง', off: 'ร้านนี้ยังไม่ได้เปิดใช้ฟังก์ชันขนส่ง',
  },
  en: {
    waiting: 'Receiving bills from Anousith…', saving: 'Saving and matching orders…',
    notFromBookmark: 'This page opens from the bookmark on the Anousith site.', howTo: 'See how to set it up on the Shipping page',
    done: 'Bills received', seen: 'Bills, last 3 days', added: 'New', matched: 'Matched to orders', queued: 'Telling customers',
    nothingNew: 'No new bills since last time', open: 'See the list', close: 'Close window',
    mismatchTitle: 'A different Anousith account', mismatchText: 'These bills come from:',
    mismatchAsk: 'If the shop really changed accounts, tap "Use this account". If you signed in to the wrong one, close this window and sign in to the right account on Anousith.',
    useThis: 'Use this account', cancel: 'Cancel',
    anousithError: "Couldn't read bills from Anousith. Sign out of Anousith, sign in again, then tap the bookmark again.",
    failed: "Couldn't save. Tap the bookmark again.", off: 'Shipping is not enabled for this shop.',
  },
};

export default function ImportPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [state, setState] = useState('waiting'); // waiting | saving | done | mismatch | error | lost
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const payload = useRef(null);

  async function save(confirm) {
    setState('saving');
    const p = payload.current;
    try {
      const res = await fetch('/api/shipping/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: p.account, items: p.items, confirm_account: confirm || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.error === 'account_mismatch') { setState('mismatch'); return; }
      if (res.status === 403) { setError(c.off); setState('error'); return; }
      if (!res.ok) { setError(c.failed); setState('error'); return; }
      setResult(d);
      setState('done');
    } catch {
      setError(c.failed);
      setState('error');
    }
  }

  useEffect(() => {
    let handled = false;
    const onMessage = e => {
      if (e.origin !== ANOUSITH_ORIGIN) return; // only the Anousith site may hand us bills
      const d = e.data;
      if (!d || d.type !== 'pp-anousith-bills') return;
      try { e.source?.postMessage({ type: 'pp-got' }, ANOUSITH_ORIGIN); } catch { /* opener gone */ }
      if (handled) return;
      handled = true;
      if (d.error || !Array.isArray(d.items) || !d.account?.id) { setError(c.anousithError); setState('error'); return; }
      payload.current = { account: { id: String(d.account.id), name: String(d.account.name || ''), phone: String(d.account.phone || '') }, items: d.items };
      save(false);
    };
    window.addEventListener('message', onMessage);
    // Opened by hand instead of from the bookmark: explain after a moment.
    const t = setTimeout(() => { if (!handled) setState(s => (s === 'waiting' ? 'lost' : s)); }, 15000);
    return () => { window.removeEventListener('message', onMessage); clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openList = () => {
    try {
      if (window.opener && !window.opener.closed) { window.location.href = '/shipping'; return; }
    } catch { /* cross-origin opener */ }
    window.location.href = '/shipping';
  };

  return (
    <div className="max-w-md mx-auto pt-4 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-6">
        <img src="/brand/pp-systems-icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-ink">PP Systems</span>
        <span className="text-slate-300">+</span>
        <span className="font-bold text-[#C8102E]">Anousith</span>
      </div>

      {(state === 'waiting' || state === 'saving') && (
        <div className="bg-white rounded-xl border border-line p-6 flex items-center gap-4" aria-busy="true">
          <span className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="font-semibold text-ink">{state === 'waiting' ? c.waiting : c.saving}</p>
        </div>
      )}

      {state === 'lost' && (
        <div className="bg-white rounded-xl border border-line p-6">
          <p className="font-semibold text-ink">{c.notFromBookmark}</p>
          <a href="/shipping" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">{c.howTo}</a>
        </div>
      )}

      {state === 'done' && result && (
        <div className="bg-white rounded-xl border border-line overflow-hidden">
          <div className="px-6 pt-6 pb-5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#E3F5EC] text-success flex items-center justify-center"><Icon name="check" className="w-5 h-5" strokeWidth={2.4} /></span>
            <div>
              <p className="text-lg font-bold text-ink">{c.done}</p>
              {result.added === 0 && <p className="text-sm text-slate-500">{c.nothingNew}</p>}
            </div>
          </div>
          <dl className="grid grid-cols-2 border-t border-line">
            {[['seen', result.seen], ['added', result.added], ['matched', result.matched], ['queued', result.queued]].map(([k, v], i) => (
              <div key={k} className={`px-6 py-4 ${i % 2 ? 'border-l border-line' : ''} ${i > 1 ? 'border-t border-line' : ''}`}>
                <dt className="text-xs text-slate-500">{c[k]}</dt>
                <dd className="mt-0.5 text-2xl font-extrabold text-ink num">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="p-4 border-t border-line flex gap-2 [&>*]:flex-1">
            <Button tone="ghost" onClick={() => window.close()}>{c.close}</Button>
            <Button onClick={openList}>{c.open}</Button>
          </div>
        </div>
      )}

      {state === 'mismatch' && (
        <div className="bg-white rounded-xl border border-line p-6">
          <p className="text-lg font-bold text-ink">{c.mismatchTitle}</p>
          <p className="mt-3 text-sm text-slate-500">{c.mismatchText}</p>
          <p className="mt-1 font-semibold text-ink">{payload.current?.account.name} <span className="num text-slate-500 font-normal">{payload.current?.account.phone}</span></p>
          <p className="mt-4 text-sm text-slate-600">{c.mismatchAsk}</p>
          <div className="mt-5 flex gap-2 [&>*]:flex-1">
            <Button tone="ghost" onClick={() => window.close()}>{c.cancel}</Button>
            <Button onClick={() => save(true)}>{c.useThis}</Button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="bg-white rounded-xl border border-line p-6">
          <p role="alert" className="font-semibold text-danger">{error}</p>
          <Button tone="ghost" onClick={() => window.close()} className="mt-4 w-full">{c.close}</Button>
        </div>
      )}
    </div>
  );
}
