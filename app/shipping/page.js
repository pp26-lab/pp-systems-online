'use client';
import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { AppContext } from '../layout';
import { Button, Modal, Field, Pill, EmptyState, Icon, inputCls, card } from '../../components/ui';

// Shipping: the shop's Anousith connection, and what happened to every parcel found there —
// matched to an order, customer told automatically, or waiting for the shop to tell them.

const COPY = {
  lo: {
    off: 'ຟັງຊັນນີ້ຍັງບໍ່ໄດ້ເປີດໃຊ້ສຳລັບຮ້ານນີ້', offText: 'ຕິດຕໍ່ PP Systems ເພື່ອເປີດໃຊ້ການດຶງບິນຂົນສົ່ງ ແລະ ແຈ້ງລູກຄ້າອັດຕະໂນມັດ',
    connectTitle: 'ເຊື່ອມຕໍ່ບັນຊີ Anousith', connectText: 'ລະບົບຈະກວດບິນໃໝ່ທຸກຊົ່ວໂມງ ຈັບຄູ່ກັບອໍເດີ້ຕາມເບີລູກຄ້າ ແລ້ວແຈ້ງເລກພັດສະດຸໃຫ້ລູກຄ້າທາງແຊັດ',
    connect: 'ເຊື່ອມຕໍ່ Anousith', settings: 'ຕັ້ງຄ່າ', checkNow: 'ກວດດຽວນີ້', checking: 'ກຳລັງກວດ…',
    account: 'ບັນຊີ Anousith', auto: 'ກວດອັດຕະໂນມັດທຸກຊົ່ວໂມງ', paused: 'ຢຸດກວດ',
    lastRun: d => `ກວດລ່າສຸດ ${d}`, never: 'ຍັງບໍ່ເຄີຍກວດ', found: (n, m) => `ພົບບິນໃໝ່ ${n}, ຈັບຄູ່ໄດ້ ${m}`,
    err: {
      login_failed: 'ລະຫັດຜ່ານ Anousith ບໍ່ຖືກ ລະບົບຢຸດກວດແລ້ວ. ໃສ່ລະຫັດໃໝ່ໃນຕັ້ງຄ່າເພື່ອເລີ່ມຄືນ',
      blocked: 'Anousith ບໍ່ອະນຸຍາດໃຫ້ເຊີບເວີດຶງຂໍ້ມູນ. ຕິດຕໍ່ PP Systems',
      network: 'ເຊື່ອມຕໍ່ Anousith ບໍ່ໄດ້ ຈະລອງໃໝ່ຮອບໜ້າ', login_missing: 'ຍັງບໍ່ໄດ້ໃສ່ລະຫັດຜ່ານ', other: 'ກວດບໍ່ສຳເລັດ ຈະລອງໃໝ່ຮອບໜ້າ',
      too_soon: 'ຫາກໍ່ກວດໄປ ລໍຖ້າ 10 ນາທີ', feature_disabled: 'ຟັງຊັນນີ້ຖືກປິດ', not_set_up: 'ເປີດການກວດອັດຕະໂນມັດກ່ອນ',
    },
    tabs: { todo: 'ຕ້ອງແຈ້ງເອງ', sent: 'ແຈ້ງແລ້ວ', waiting: 'ກຳລັງແຈ້ງ', nomatch: 'ບໍ່ພົບອໍເດີ້', all: 'ທັງໝົດ' },
    empty: { todo: 'ບໍ່ມີລູກຄ້າທີ່ຕ້ອງແຈ້ງເອງ', sent: 'ຍັງບໍ່ມີບິນທີ່ແຈ້ງແລ້ວ', waiting: 'ບໍ່ມີບິນທີ່ລໍຖ້າສົ່ງ', nomatch: 'ທຸກບິນຈັບຄູ່ກັບອໍເດີ້ໄດ້', all: 'ຍັງບໍ່ພົບບິນໃນ 14 ມື້ຜ່ານມາ' },
    todoHint: 'ລູກຄ້າເຫຼົ່ານີ້ບໍ່ເຄີຍແຊັດກັບຮ້ານ ຫຼື ສົ່ງບໍ່ສຳເລັດ. ກົດ WhatsApp ເພື່ອສົ່ງຂໍ້ຄວາມທີ່ຂຽນໄວ້ແລ້ວ ຈາກເບີຂອງຮ້ານເອງ',
    order: 'ອໍເດີ້', noOrder: 'ບໍ່ພົບອໍເດີ້ທີ່ເບີກົງກັນ', sendWa: 'ສົ່ງທາງ WhatsApp', markDone: 'ແຈ້ງແລ້ວ',
    status: { queued: 'ລໍຖ້າສົ່ງ', sending: 'ກຳລັງສົ່ງ', sent: 'ແຈ້ງແລ້ວ', manual: 'ແຈ້ງເອງແລ້ວ', failed: 'ສົ່ງບໍ່ໄດ້', no_chat: 'ບໍ່ເຄີຍແຊັດ', off: 'ບໍ່ແຈ້ງ', waiting: 'ລໍຖ້າຈັບຄູ່' },
    form: {
      title: 'ຕັ້ງຄ່າ Anousith', phone: 'ເບີໂທທີ່ໃຊ້ເຂົ້າ Anousith', phoneHint: 'ເບີຂອງຮ້ານ ທີ່ເປັນຜູ້ຝາກ', password: 'ລະຫັດຜ່ານ Anousith',
      passwordKeep: 'ປ່ອຍວ່າງໄວ້ ຖ້າບໍ່ປ່ຽນ', passwordNote: 'ລະບົບຈະລອງເຂົ້າ Anousith ກ່ອນບັນທຶກ ແລະ ເກັບລະຫັດແບບເຂົ້າລະຫັດ ບໍ່ມີໃຜເບິ່ງໄດ້',
      auto: 'ກວດ ແລະ ແຈ້ງລູກຄ້າອັດຕະໂນມັດ', message: 'ຂໍ້ຄວາມແຈ້ງລູກຄ້າ', insert: 'ກົດເພື່ອໃສ່:', preview: 'ຕົວຢ່າງທີ່ລູກຄ້າຈະເຫັນ',
      reset: 'ໃຊ້ຂໍ້ຄວາມເລີ່ມຕົ້ນ', save: 'ບັນທຶກ', cancel: 'ຍົກເລີກ', disconnect: 'ຍົກເລີກການເຊື່ອມຕໍ່',
      disconnectAsk: 'ລຶບບັນຊີ Anousith ອອກຈາກລະບົບ? ລະບົບຈະຢຸດກວດບິນ',
      keys: { name: 'ຊື່ລູກຄ້າ', shop: 'ຊື່ຮ້ານ', tracking: 'ເລກພັດສະດຸ', branch: 'ສາຂາປາຍທາງ', cod: 'ເກັບເງິນປາຍທາງ', carrier: 'ຂົນສົ່ງ' },
      sample: { name: 'ນາງ ແກ້ວ', tracking: 'ANS123456789', branch: 'ສາຂາ ຫຼວງພະບາງ', cod: 'ເກັບເງິນປາຍທາງ: 150,000₭' },
      saved: 'ບັນທຶກແລ້ວ', unverified: 'ບັນທຶກແລ້ວ ແຕ່ຍັງກວດລະຫັດກັບ Anousith ບໍ່ໄດ້ ຈະລອງໃນຮອບກວດຕໍ່ໄປ',
      errors: { login_failed: 'ເບີ ຫຼື ລະຫັດຜ່ານ Anousith ບໍ່ຖືກ', username_invalid: 'ເບີໂທບໍ່ຖືກ', password_required: 'ໃສ່ລະຫັດຜ່ານ', too_many_attempts: 'ລອງຫຼາຍເກີນໄປ ລໍຖ້າ 10 ນາທີ', login_required: 'ໃສ່ເບີ ແລະ ລະຫັດຜ່ານກ່ອນ', server_key_missing: 'ເຊີບເວີຍັງບໍ່ພ້ອມ ຕິດຕໍ່ PP Systems', failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່' },
    },
  },
  th: {
    off: 'ฟังก์ชันนี้ยังไม่ได้เปิดใช้สำหรับร้านนี้', offText: 'ติดต่อ PP Systems เพื่อเปิดใช้การดึงบิลขนส่งและแจ้งลูกค้าอัตโนมัติ',
    connectTitle: 'เชื่อมต่อบัญชี Anousith', connectText: 'ระบบจะตรวจบิลใหม่ทุกชั่วโมง จับคู่กับออเดอร์ตามเบอร์ลูกค้า แล้วแจ้งเลขพัสดุให้ลูกค้าทางแชท',
    connect: 'เชื่อมต่อ Anousith', settings: 'ตั้งค่า', checkNow: 'ตรวจตอนนี้', checking: 'กำลังตรวจ…',
    account: 'บัญชี Anousith', auto: 'ตรวจอัตโนมัติทุกชั่วโมง', paused: 'หยุดตรวจ',
    lastRun: d => `ตรวจล่าสุด ${d}`, never: 'ยังไม่เคยตรวจ', found: (n, m) => `พบบิลใหม่ ${n}, จับคู่ได้ ${m}`,
    err: {
      login_failed: 'รหัสผ่าน Anousith ไม่ถูกต้อง ระบบหยุดตรวจแล้ว ใส่รหัสใหม่ในตั้งค่าเพื่อเริ่มอีกครั้ง',
      blocked: 'Anousith ไม่อนุญาตให้เซิร์ฟเวอร์ดึงข้อมูล ติดต่อ PP Systems',
      network: 'เชื่อมต่อ Anousith ไม่ได้ จะลองใหม่รอบหน้า', login_missing: 'ยังไม่ได้ใส่รหัสผ่าน', other: 'ตรวจไม่สำเร็จ จะลองใหม่รอบหน้า',
      too_soon: 'เพิ่งตรวจไป รอ 10 นาที', feature_disabled: 'ฟังก์ชันนี้ถูกปิด', not_set_up: 'เปิดการตรวจอัตโนมัติก่อน',
    },
    tabs: { todo: 'ต้องแจ้งเอง', sent: 'แจ้งแล้ว', waiting: 'กำลังแจ้ง', nomatch: 'ไม่พบออเดอร์', all: 'ทั้งหมด' },
    empty: { todo: 'ไม่มีลูกค้าที่ต้องแจ้งเอง', sent: 'ยังไม่มีบิลที่แจ้งแล้ว', waiting: 'ไม่มีบิลที่รอส่ง', nomatch: 'ทุกบิลจับคู่กับออเดอร์ได้', all: 'ยังไม่พบบิลใน 14 วันที่ผ่านมา' },
    todoHint: 'ลูกค้าเหล่านี้ไม่เคยแชทกับร้าน หรือส่งไม่สำเร็จ กด WhatsApp เพื่อส่งข้อความที่เขียนไว้แล้ว จากเบอร์ของร้านเอง',
    order: 'ออเดอร์', noOrder: 'ไม่พบออเดอร์ที่เบอร์ตรงกัน', sendWa: 'ส่งทาง WhatsApp', markDone: 'แจ้งแล้ว',
    status: { queued: 'รอส่ง', sending: 'กำลังส่ง', sent: 'แจ้งแล้ว', manual: 'แจ้งเองแล้ว', failed: 'ส่งไม่ได้', no_chat: 'ไม่เคยแชท', off: 'ไม่แจ้ง', waiting: 'รอจับคู่' },
    form: {
      title: 'ตั้งค่า Anousith', phone: 'เบอร์ที่ใช้เข้า Anousith', phoneHint: 'เบอร์ของร้านที่เป็นผู้ฝาก', password: 'รหัสผ่าน Anousith',
      passwordKeep: 'เว้นว่างไว้ถ้าไม่เปลี่ยน', passwordNote: 'ระบบจะลองเข้า Anousith ก่อนบันทึก และเก็บรหัสแบบเข้ารหัส ไม่มีใครดูได้',
      auto: 'ตรวจและแจ้งลูกค้าอัตโนมัติ', message: 'ข้อความแจ้งลูกค้า', insert: 'กดเพื่อใส่:', preview: 'ตัวอย่างที่ลูกค้าจะเห็น',
      reset: 'ใช้ข้อความเริ่มต้น', save: 'บันทึก', cancel: 'ยกเลิก', disconnect: 'ยกเลิกการเชื่อมต่อ',
      disconnectAsk: 'ลบบัญชี Anousith ออกจากระบบ? ระบบจะหยุดตรวจบิล',
      keys: { name: 'ชื่อลูกค้า', shop: 'ชื่อร้าน', tracking: 'เลขพัสดุ', branch: 'สาขาปลายทาง', cod: 'เก็บเงินปลายทาง', carrier: 'ขนส่ง' },
      sample: { name: 'นางแก้ว', tracking: 'ANS123456789', branch: 'สาขาหลวงพระบาง', cod: 'ເກັບເງິນປາຍທາງ: 150,000₭' },
      saved: 'บันทึกแล้ว', unverified: 'บันทึกแล้ว แต่ยังตรวจรหัสกับ Anousith ไม่ได้ จะลองในรอบตรวจถัดไป',
      errors: { login_failed: 'เบอร์หรือรหัสผ่าน Anousith ไม่ถูกต้อง', username_invalid: 'เบอร์โทรไม่ถูกต้อง', password_required: 'ใส่รหัสผ่าน', too_many_attempts: 'ลองหลายครั้งเกินไป รอ 10 นาที', login_required: 'ใส่เบอร์และรหัสผ่านก่อน', server_key_missing: 'เซิร์ฟเวอร์ยังไม่พร้อม ติดต่อ PP Systems', failed: 'บันทึกไม่สำเร็จ ลองใหม่' },
    },
  },
  en: {
    off: 'This feature is not enabled for this shop', offText: 'Contact PP Systems to turn on carrier bills and automatic customer notices.',
    connectTitle: 'Connect your Anousith account', connectText: 'New bills are checked every hour, matched to orders by the customer\'s phone, and the tracking number is sent to the customer in chat.',
    connect: 'Connect Anousith', settings: 'Settings', checkNow: 'Check now', checking: 'Checking…',
    account: 'Anousith account', auto: 'Checks every hour', paused: 'Paused',
    lastRun: d => `Last checked ${d}`, never: 'Not checked yet', found: (n, m) => `${n} new, ${m} matched`,
    err: {
      login_failed: 'The Anousith password is wrong, so checking stopped. Enter the new password in Settings to start again.',
      blocked: 'Anousith is not letting the server read bills. Contact PP Systems.',
      network: "Couldn't reach Anousith. It will try again next hour.", login_missing: 'No password saved yet', other: "Check failed. It will try again next hour.",
      too_soon: 'Just checked. Wait 10 minutes.', feature_disabled: 'This feature is off', not_set_up: 'Turn on automatic checks first',
    },
    tabs: { todo: 'Tell by hand', sent: 'Told', waiting: 'Sending', nomatch: 'No order', all: 'All' },
    empty: { todo: 'Nobody is waiting to be told', sent: 'No customers told yet', waiting: 'Nothing waiting to send', nomatch: 'Every bill matched an order', all: 'No bills in the last 14 days' },
    todoHint: "These customers never chatted with the shop, or the message failed. Tap WhatsApp to send the prepared message from the shop's own number.",
    order: 'Order', noOrder: 'No order with this phone', sendWa: 'Send on WhatsApp', markDone: 'Told',
    status: { queued: 'Waiting', sending: 'Sending', sent: 'Told', manual: 'Told by hand', failed: 'Not sent', no_chat: 'No chat', off: 'Not told', waiting: 'Matching' },
    form: {
      title: 'Anousith settings', phone: 'Phone used to sign in to Anousith', phoneHint: "The shop's sender number", password: 'Anousith password',
      passwordKeep: 'Leave empty to keep it', passwordNote: 'It is checked with Anousith before saving, then stored encrypted. Nobody can read it back.',
      auto: 'Check and tell customers automatically', message: 'Message to the customer', insert: 'Tap to insert:', preview: 'What the customer sees',
      reset: 'Use the default message', save: 'Save', cancel: 'Cancel', disconnect: 'Disconnect',
      disconnectAsk: 'Remove the Anousith account? Checking stops.',
      keys: { name: 'Customer name', shop: 'Shop name', tracking: 'Tracking number', branch: 'Destination branch', cod: 'Cash on delivery', carrier: 'Carrier' },
      sample: { name: 'Ms Keo', tracking: 'ANS123456789', branch: 'Luang Prabang branch', cod: 'ເກັບເງິນປາຍທາງ: 150,000₭' },
      saved: 'Saved', unverified: "Saved, but Anousith couldn't confirm the password yet. It will try on the next check.",
      errors: { login_failed: 'Wrong Anousith phone or password', username_invalid: 'Phone number is not valid', password_required: 'Enter the password', too_many_attempts: 'Too many tries. Wait 10 minutes.', login_required: 'Enter the phone and password first', server_key_missing: 'The server is not ready. Contact PP Systems.', failed: "Couldn't save. Try again." },
    },
  },
};

const TABS = ['todo', 'waiting', 'sent', 'nomatch', 'all'];
const inTab = {
  todo: b => b.todo,
  waiting: b => b.match_status === 'matched' && ['queued', 'sending'].includes(b.notify_status),
  sent: b => b.notify_status === 'sent',
  nomatch: b => b.match_status === 'no_match' || b.match_status === 'pending',
  all: () => true,
};
const TONE = { queued: 'navy', sending: 'navy', sent: 'green', manual: 'green', failed: 'red', no_chat: 'gold', off: 'gray', waiting: 'gray' };

function statusKey(b) {
  if (b.match_status === 'pending') return 'waiting';
  if (b.notify_status === 'sent' && b.notify_error === 'manual') return 'manual';
  return b.notify_status;
}

function errorText(c, code) {
  if (!code) return '';
  if (c.err[code]) return c.err[code];
  if (/^(network|bad_response)$/.test(code)) return c.err.network;
  return c.err.other;
}

export default function ShippingPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const locale = lang === 'lo' ? 'lo-LA' : lang === 'th' ? 'th-TH' : 'en-GB';
  const [state, setState] = useState('loading'); // loading | ready | off
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('todo');
  const [editing, setEditing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const pickedTab = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/shipping');
    if (res.status === 403) { setState('off'); return; }
    if (!res.ok) return;
    const d = await res.json();
    setData(d);
    setState('ready');
    // First load: open the tab that needs the shop, otherwise show everything.
    if (!pickedTab.current) {
      pickedTab.current = true;
      if (!d.bills.some(b => b.todo)) setTab('all');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 60000);
    return () => clearInterval(id);
  }, [load]);

  const bills = data?.bills || [];
  const counts = useMemo(() => Object.fromEntries(TABS.map(t => [t, bills.filter(inTab[t]).length])), [bills]);
  const shown = bills.filter(inTab[tab]);
  const acc = data?.account;
  const lastRun = data?.runs?.[0];

  const fmt = v => (v ? new Date(v).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

  async function checkNow() {
    setChecking(true);
    setNotice('');
    try {
      const res = await fetch('/api/shipping/run', { method: 'POST' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setNotice(errorText(c, d.error));
      else if (d.status && d.status !== 'ok') setNotice(errorText(c, d.error || d.status));
      await load();
    } finally {
      setChecking(false);
    }
  }

  async function markDone(b) {
    await fetch(`/api/shipping/bills/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'done' }) });
    load();
  }

  if (state === 'off') {
    return <div className={`max-w-xl mx-auto mt-10 ${card}`}><EmptyState icon="truck" title={c.off} text={c.offText} /></div>;
  }
  if (state === 'loading') {
    return <div className="max-w-5xl space-y-4" aria-busy="true"><div className="h-28 rounded-xl bg-white border border-line animate-pulse" /><div className="h-64 rounded-xl bg-white border border-line animate-pulse" /></div>;
  }

  return (
    <div className="max-w-5xl">
      {!acc?.connected ? (
        <section className={card}>
          <EmptyState icon="truck" title={c.connectTitle} text={c.connectText}
            action={<Button icon="link" onClick={() => setEditing(true)}>{c.connect}</Button>} />
        </section>
      ) : (
        <section className={`${card} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="w-11 h-11 rounded-lg bg-[#FDECEC] text-[#C8102E] flex items-center justify-center shrink-0"><Icon name="truck" className="w-6 h-6" /></span>
            <div className="flex-1 min-w-[12rem]">
              <p className="font-bold text-ink">Anousith <span className="font-normal text-slate-500 num">+856 {acc.username}</span></p>
              <p className="text-sm text-slate-500 mt-0.5">
                <span className={`inline-flex items-center gap-1.5 font-semibold ${acc.enabled ? 'text-success' : 'text-slate-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${acc.enabled ? 'bg-success' : 'bg-slate-300'}`} />{acc.enabled ? c.auto : c.paused}
                </span>
                <span className="mx-2 text-slate-300">|</span>
                {acc.last_run_at ? c.lastRun(fmt(acc.last_run_at)) : c.never}
                {lastRun?.status === 'ok' && <span className="text-slate-400">, {c.found(lastRun.bills_new, lastRun.bills_matched)}</span>}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
              <Button tone="ghost" icon="edit" onClick={() => setEditing(true)}>{c.settings}</Button>
              <Button tone="ghost" icon="refresh" onClick={checkNow} disabled={checking || !acc.enabled}>{checking ? c.checking : c.checkNow}</Button>
            </div>
          </div>
          {(acc.last_error || notice) && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-danger font-medium">{notice || errorText(c, acc.last_error)}</p>
          )}
        </section>
      )}

      {acc?.connected && (
        <section className={`${card} mt-5 overflow-hidden`}>
          <div role="tablist" className="flex overflow-x-auto no-scrollbar border-b border-line px-2">
            {TABS.map(t => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`relative shrink-0 px-3 sm:px-4 min-h-12 text-sm font-semibold whitespace-nowrap ${tab === t ? 'text-primary' : 'text-slate-500 hover:text-ink'}`}>
                {c.tabs[t]}
                {counts[t] > 0 && t !== 'all' && (
                  <span className={`ml-1.5 num text-xs ${t === 'todo' ? 'inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-[#FFF3DE] text-[#8A4B00]' : 'text-slate-400'}`}>{counts[t]}</span>
                )}
                {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden="true" />}
              </button>
            ))}
          </div>

          {tab === 'todo' && counts.todo > 0 && <p className="px-4 sm:px-5 py-3 text-sm text-slate-600 bg-canvas/60 border-b border-line">{c.todoHint}</p>}

          {shown.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">{c.empty[tab]}</p>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map(b => {
                const sk = statusKey(b);
                return (
                  <li key={b.id} className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-ink truncate">{b.customer_name || b.receiver_name || '-'}</span>
                        <span className="text-sm text-slate-500 num">{b.receiver_phone}</span>
                        <Pill tone={TONE[sk] || 'gray'}>{c.status[sk] || sk}</Pill>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 truncate">
                        <span className="num font-medium text-slate-700">{b.tracking_number}</span>
                        {b.destination && <> <span className="text-slate-300">|</span> {b.destination}</>}
                        <span className="text-slate-300"> | </span>
                        {b.order_number ? <>{c.order} <span className="num">{b.order_number}</span></> : <span className="text-[#8A4B00]">{c.noOrder}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {b.todo ? (
                        <>
                          {b.wa_link && (
                            <a href={b.wa_link} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 px-3.5 min-h-10 rounded-lg bg-[#0E8A5F] text-white text-sm font-semibold hover:bg-[#0B6B49] flex-1 sm:flex-none">
                              <Icon name="whatsapp" className="w-4 h-4" strokeWidth={2} />{c.sendWa}
                            </a>
                          )}
                          <Button size="sm" tone="ghost" icon="check" onClick={() => markDone(b)} className="flex-1 sm:flex-none">{c.markDone}</Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 num">{fmt(b.notified_at || b.first_seen_at)}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {editing && <SettingsModal c={c} acc={acc} defaultTemplate={data.default_template} shopName={data.shop_name}
        onClose={() => setEditing(false)} onSaved={msg => { setEditing(false); setNotice(msg || ''); load(); }} />}
    </div>
  );
}

function SettingsModal({ c, acc, defaultTemplate, shopName, onClose, onSaved }) {
  const f = c.form;
  const [username, setUsername] = useState(acc?.username || '');
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(acc ? acc.enabled : true);
  const [template, setTemplate] = useState(acc?.message_template || defaultTemplate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const area = useRef(null);

  function insert(key) {
    const el = area.current;
    const token = `{${key}}`;
    if (!el) { setTemplate(t => t + token); return; }
    const s = el.selectionStart ?? template.length;
    const e = el.selectionEnd ?? template.length;
    const next = template.slice(0, s) + token + template.slice(e);
    setTemplate(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
  }

  const preview = template
    .split('\n').filter(l => l.trim() !== '{cod}' || f.sample.cod).join('\n')
    .replace(/\{(name|shop|carrier|tracking|branch|cod)\}/g, (_, k) => ({
      name: f.sample.name, shop: shopName || 'PP Store', carrier: 'Anousith Express', tracking: f.sample.tracking, branch: f.sample.branch, cod: f.sample.cod,
    })[k]);

  async function save() {
    setBusy(true);
    setError('');
    try {
      const body = { username, enabled, message_template: template.trim() === defaultTemplate.trim() ? '' : template };
      if (password) body.password = password;
      const res = await fetch('/api/shipping/account', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(f.errors[d.error] || f.errors.failed); return; }
      onSaved(d.warning ? f.unverified : '');
    } catch {
      setError(f.errors.failed);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm(f.disconnectAsk)) return;
    await fetch('/api/shipping/account', { method: 'DELETE' });
    onSaved('');
  }

  return (
    <Modal open onClose={onClose} title={f.title} size="lg"
      footer={<>
        {acc?.connected && <Button tone="danger" onClick={disconnect} className="sm:mr-auto">{f.disconnect}</Button>}
        <Button tone="ghost" onClick={onClose}>{f.cancel}</Button>
        <Button onClick={save} disabled={busy}>{f.save}</Button>
      </>}>
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={f.phone} hint={f.phoneHint}>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-line bg-canvas text-sm text-slate-500 num">+856</span>
              <input value={username} onChange={e => setUsername(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" autoComplete="off"
                placeholder="2055551234" className={`${inputCls} border-line rounded-l-none num`} />
            </div>
          </Field>
          <Field label={f.password}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"
              placeholder={acc?.connected ? f.passwordKeep : ''} className={`${inputCls} border-line`} />
          </Field>
        </div>
        <p className="-mt-2 flex items-start gap-2 text-xs text-slate-500"><Icon name="check" className="w-4 h-4 text-success shrink-0" strokeWidth={2.2} />{f.passwordNote}</p>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3 cursor-pointer">
          <span className="text-sm font-semibold text-ink">{f.auto}</span>
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-5 h-5 accent-[#0B63E5]" />
        </label>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-ink">{f.message}</p>
            <button type="button" onClick={() => setTemplate(defaultTemplate)} className="text-xs font-semibold text-primary hover:underline">{f.reset}</button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">{f.insert}</span>
            {Object.keys(f.keys).map(k => (
              <button key={k} type="button" onClick={() => insert(k)}
                className="px-2.5 py-1 rounded-full bg-gold-soft text-primary-dark text-xs font-semibold hover:bg-primary hover:text-white">{f.keys[k]}</button>
            ))}
          </div>
          <div className="mt-2 grid md:grid-cols-2 gap-3">
            <textarea ref={area} value={template} onChange={e => setTemplate(e.target.value)} rows={8} maxLength={1000}
              className={`${inputCls} border-line resize-y font-[inherit]`} />
            <div className="rounded-lg bg-canvas p-3">
              <p className="text-xs text-slate-500 mb-2">{f.preview}</p>
              <p className="w-fit max-w-full rounded-xl rounded-bl-md bg-white border border-line px-3.5 py-2 text-sm text-ink whitespace-pre-wrap break-words">{preview}</p>
            </div>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-danger font-semibold">{error}</p>}
      </div>
    </Modal>
  );
}
