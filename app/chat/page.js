'use client';
import { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { AppContext } from '../layout';
import { formatCurrency } from '../../lib/currency';
import { Button, IconButton, Modal, Pill, EmptyState, Icon, SearchInput, inputCls } from '../../components/ui';
import LoadMore from '../../components/LoadMore';
import CustomerForm from '../../components/CustomerForm';
import { QR_COPY, QuickReplyPicker, QuickReplyManager, useQuickReplies } from '../../components/chat/QuickReplies';
import { SoundToggle } from '../../components/MessageAlert';
import { usePush, PushToggle, PushHint } from '../../components/PushSetup';
import ChatOrderPanel from '../../components/chat/ChatOrderPanel';

const COPY = {
  lo: {
    search: 'ຄົ້ນຫາຊື່, ເບີໂທ, ຂໍ້ຄວາມ', all: 'ຂໍ້ຄວາມທັງໝົດ', unread: 'ຍັງບໍ່ໄດ້ອ່ານ', unanswered: 'ຍັງບໍ່ໄດ້ຕອບ', allCh: 'ທຸກຊ່ອງທາງ',
    off: 'ຟັງຊັນແຊັດຍັງບໍ່ໄດ້ເປີດໃຊ້ສຳລັບຮ້ານນີ້', offText: 'ຕິດຕໍ່ PP Systems ເພື່ອເປີດໃຊ້ແຊັດ Facebook ແລະ WhatsApp',
    none: 'ຍັງບໍ່ມີແຊັດ', noneText: 'ເມື່ອລູກຄ້າທັກມາທາງເພຈ ຫຼື WhatsApp ຈະຂຶ້ນຢູ່ນີ້ທັນທີ', noMatch: 'ບໍ່ພົບແຊັດ',
    pick: 'ເລືອກແຊັດທາງຊ້າຍເພື່ອເລີ່ມຕອບ', placeholder: 'ພິມຂໍ້ຄວາມ… (Enter ສົ່ງ, Shift+Enter ຂຶ້ນແຖວໃໝ່)', send: 'ສົ່ງ', attach: 'ແນບຮູບ ຫຼື ໄຟລ໌', record: 'ອັດສຽງ', recording: 'ກຳລັງອັດສຽງ', cancelRec: 'ຍົກເລີກສຽງ', sendVoice: 'ສົ່ງສຽງ', micDenied: 'ໃຊ້ໄມໂຄຣໂຟນບໍ່ໄດ້ ກະລຸນາອະນຸຍາດໃນເບົາເຊີກ່ອນ',
    markDone: 'ຈັດການແລ້ວ', reopen: 'ເປີດຄືນ', older: 'ໂຫຼດຂໍ້ຄວາມເກົ່າ', today: 'ມື້ນີ້', yesterday: 'ມື້ວານ',
    sending: 'ກຳລັງສົ່ງ', sent: 'ສົ່ງແລ້ວ', delivered: 'ຮອດແລ້ວ', read: 'ອ່ານແລ້ວ', failed: 'ສົ່ງບໍ່ສຳເລັດ', retry: 'ສົ່ງໃໝ່',
    windowLeft: t => `ຕອບໄດ້ອີກ ${t}`, windowClosed: 'ສົ່ງຂໍ້ຄວາມຫາລູກຄ້ານີ້ບໍ່ໄດ້ແລ້ວ', windowClosedText: 'ລູກຄ້າທັກມາດົນເກີນກວ່າທີ່ລະບົບອະນຸຍາດ ລໍຖ້າລູກຄ້າທັກມາໃໝ່ ຈຶ່ງຈະຕອບໄດ້',
    humanAgent: 'ສົ່ງແບບພະນັກງານຕອບ (ໄດ້ພາຍໃນ 7 ມື້)', mediaMissing: 'ໂຫຼດໄຟລ໌ບໍ່ໄດ້', useSlip: 'ໃຊ້ເປັນສະລິບ', slipFor: 'ແນບສະລິບກັບອໍເດີ້',
    slipSaved: n => `ແນບສະລິບກັບ ${n} ແລ້ວ`, slipUsed: n => `ຮູບນີ້ເປັນສະລິບຂອງ ${n} ແລ້ວ`, needCustomer: 'ຜູກແຊັດກັບລູກຄ້າກ່ອນ ຈຶ່ງຈະເຫັນອໍເດີ້', noOrders: 'ລູກຄ້ານີ້ຍັງບໍ່ມີອໍເດີ້',
    customer: 'ລູກຄ້າ', link: 'ຜູກກັບລູກຄ້າທີ່ມີຢູ່', create: 'ບັນທຶກເປັນລູກຄ້າໃໝ່', unlink: 'ຍົກເລີກການຜູກ', suggest: 'ລູກຄ້າທີ່ເບີໂທກົງກັນ', pickCustomer: 'ເລືອກລູກຄ້າ',
    spent: 'ຍອດຊື້ລວມ', orders: 'ບິນ', avg: 'ສະເລ່ຍ', bought: 'ສິນຄ້າທີ່ເຄີຍຊື້', sendProduct: 'ກົດເພື່ອສົ່ງສິນຄ້ານີ້ໃຫ້ລູກຄ້າ', recent: 'ອໍເດີ້ຫຼ້າສຸດ',
    openProfile: 'ເປີດໜ້າລູກຄ້າ', blacklisted: 'ລູກຄ້ານີ້ຢູ່ໃນບັນຊີດຳ', vip: 'VIP', regular: 'ລູກຄ້າປະຈຳ', newC: 'ລູກຄ້າໃໝ່',
    errors: { voice_failed: 'ແປງສຽງບໍ່ສຳເລັດ ລອງອັດໃໝ່', window_closed: 'ໝົດເວລາຕອບ 24 ຊົ່ວໂມງແລ້ວ', feature_disabled: 'ຮ້ານນີ້ຍັງບໍ່ໄດ້ເປີດໃຊ້ຊ່ອງທາງນີ້', channel_disabled: 'ຊ່ອງທາງນີ້ຖືກຢຸດຊົ່ວຄາວ', unsupported_type: 'ສົ່ງໄຟລ໌ປະເພດນີ້ບໍ່ໄດ້', file_too_large: 'ໄຟລ໌ໃຫຍ່ເກີນ 16MB', send_failed: 'ສົ່ງບໍ່ສຳເລັດ', not_reply: 'ລູກຄ້າຕ້ອງທັກມາກ່ອນ', not_connected: 'ເບີ WhatsApp ນີ້ຍັງບໍ່ໄດ້ເຊື່ອມຕໍ່', rate_limited: 'ສົ່ງໄວເກີນໄປ ລໍຖ້າບຶດໜຶ່ງ', daily_limit: 'ສົ່ງຄົບຈຳນວນຂອງມື້ນີ້ແລ້ວ' },
    replyOnly: 'ລໍຖ້າລູກຄ້າທັກມາກ່ອນ', replyOnlyText: 'ເພື່ອບໍ່ໃຫ້ເບີຖືກແບນ ລະບົບຕອບໄດ້ສະເພາະລູກຄ້າທີ່ທັກມາກ່ອນ',
    status: { pending: 'ລໍຖ້າຈັດສົ່ງ', shipping: 'ກຳລັງຈັດສົ່ງ', completed: 'ສຳເລັດ', cancelled: 'ຍົກເລີກ' }, details: 'ຂໍ້ມູນລູກຄ້າ', back: 'ກັບ',
    saveAs: 'ບັນທຶກເປັນ:', saveInfo: 'ບັນທຶກເປັນຂໍ້ມູນລູກຄ້າ', asName: 'ຊື່', asPhone: 'ເບີໂທ', asAddress: 'ທີ່ຢູ່', noPhone: 'ບໍ່ພົບເບີໂທໃນຂໍ້ຄວາມນີ້', saveFailed: 'ບັນທຶກບໍ່ສຳເລັດ',
    savedAs: { name: v => `ບັນທຶກຊື່ແລ້ວ: ${v}`, phone: v => `ບັນທຶກເບີໂທແລ້ວ: ${v}`, address: v => `ບັນທຶກທີ່ຢູ່ແລ້ວ: ${v}` },
    newOrder: 'ສ້າງອໍເດີ້', orderMade: n => `ສ້າງອໍເດີ້ ${n} ແລ້ວ ສະຕ໋ອກຖືກຕັດແລ້ວ`, summaryFailed: e => `ແຕ່ສົ່ງສະຫຼຸບໃຫ້ລູກຄ້າບໍ່ໄດ້ (${e})`,
  },
  th: {
    search: 'ค้นหาชื่อ, เบอร์, ข้อความ', all: 'ข้อความทั้งหมด', unread: 'ยังไม่ได้อ่าน', unanswered: 'ยังไม่ได้ตอบ', allCh: 'ทุกช่องทาง',
    off: 'ฟังก์ชันแชทยังไม่ได้เปิดใช้สำหรับร้านนี้', offText: 'ติดต่อ PP Systems เพื่อเปิดใช้แชท Facebook และ WhatsApp',
    none: 'ยังไม่มีแชท', noneText: 'เมื่อลูกค้าทักมาทางเพจหรือ WhatsApp จะขึ้นที่นี่ทันที', noMatch: 'ไม่พบแชท',
    pick: 'เลือกแชททางซ้ายเพื่อเริ่มตอบ', placeholder: 'พิมพ์ข้อความ… (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)', send: 'ส่ง', attach: 'แนบรูปหรือไฟล์', record: 'อัดเสียง', recording: 'กำลังอัดเสียง', cancelRec: 'ยกเลิกเสียง', sendVoice: 'ส่งเสียง', micDenied: 'ใช้ไมโครโฟนไม่ได้ กรุณาอนุญาตในเบราว์เซอร์ก่อน',
    markDone: 'เสร็จแล้ว', reopen: 'เปิดใหม่', older: 'โหลดข้อความเก่า', today: 'วันนี้', yesterday: 'เมื่อวาน',
    sending: 'กำลังส่ง', sent: 'ส่งแล้ว', delivered: 'ถึงแล้ว', read: 'อ่านแล้ว', failed: 'ส่งไม่สำเร็จ', retry: 'ส่งใหม่',
    windowLeft: t => `ตอบได้อีก ${t}`, windowClosed: 'ส่งข้อความหาลูกค้านี้ไม่ได้แล้ว', windowClosedText: 'ลูกค้าทักมานานเกินกว่าที่ระบบอนุญาต รอลูกค้าทักมาใหม่ จึงจะตอบได้',
    humanAgent: 'ส่งแบบพนักงานตอบ (ได้ภายใน 7 วัน)', mediaMissing: 'โหลดไฟล์ไม่ได้', useSlip: 'ใช้เป็นสลิป', slipFor: 'แนบสลิปกับออเดอร์',
    slipSaved: n => `แนบสลิปกับ ${n} แล้ว`, slipUsed: n => `รูปนี้เป็นสลิปของ ${n} แล้ว`, needCustomer: 'ผูกแชทกับลูกค้าก่อน จึงจะเห็นออเดอร์', noOrders: 'ลูกค้านี้ยังไม่มีออเดอร์',
    customer: 'ลูกค้า', link: 'ผูกกับลูกค้าที่มีอยู่', create: 'บันทึกเป็นลูกค้าใหม่', unlink: 'ยกเลิกการผูก', suggest: 'ลูกค้าที่เบอร์ตรงกัน', pickCustomer: 'เลือกลูกค้า',
    spent: 'ยอดซื้อรวม', orders: 'บิล', avg: 'เฉลี่ย', bought: 'สินค้าที่เคยซื้อ', sendProduct: 'กดเพื่อส่งสินค้านี้ให้ลูกค้า', recent: 'ออเดอร์ล่าสุด',
    openProfile: 'เปิดหน้าลูกค้า', blacklisted: 'ลูกค้านี้อยู่ในบัญชีดำ', vip: 'VIP', regular: 'ลูกค้าประจำ', newC: 'ลูกค้าใหม่',
    errors: { voice_failed: 'แปลงเสียงไม่สำเร็จ ลองอัดใหม่', window_closed: 'หมดเวลาตอบ 24 ชั่วโมงแล้ว', feature_disabled: 'ร้านนี้ยังไม่ได้เปิดใช้ช่องทางนี้', channel_disabled: 'ช่องทางนี้ถูกหยุดชั่วคราว', unsupported_type: 'ส่งไฟล์ประเภทนี้ไม่ได้', file_too_large: 'ไฟล์ใหญ่เกิน 16MB', send_failed: 'ส่งไม่สำเร็จ', not_reply: 'ลูกค้าต้องทักมาก่อน', not_connected: 'เบอร์ WhatsApp นี้ยังไม่ได้เชื่อมต่อ', rate_limited: 'ส่งเร็วเกินไป รอสักครู่', daily_limit: 'ส่งครบจำนวนของวันนี้แล้ว' },
    replyOnly: 'รอลูกค้าทักมาก่อน', replyOnlyText: 'เพื่อไม่ให้เบอร์ถูกแบน ระบบตอบได้เฉพาะลูกค้าที่ทักมาก่อน',
    status: { pending: 'รอจัดส่ง', shipping: 'กำลังจัดส่ง', completed: 'สำเร็จ', cancelled: 'ยกเลิก' }, details: 'ข้อมูลลูกค้า', back: 'กลับ',
    saveAs: 'บันทึกเป็น:', saveInfo: 'บันทึกเป็นข้อมูลลูกค้า', asName: 'ชื่อ', asPhone: 'เบอร์โทร', asAddress: 'ที่อยู่', noPhone: 'ไม่พบเบอร์โทรในข้อความนี้', saveFailed: 'บันทึกไม่สำเร็จ',
    savedAs: { name: v => `บันทึกชื่อแล้ว: ${v}`, phone: v => `บันทึกเบอร์โทรแล้ว: ${v}`, address: v => `บันทึกที่อยู่แล้ว: ${v}` },
    newOrder: 'สร้างออเดอร์', orderMade: n => `สร้างออเดอร์ ${n} แล้ว ตัดสต็อกแล้ว`, summaryFailed: e => `แต่ส่งสรุปให้ลูกค้าไม่ได้ (${e})`,
  },
  en: {
    search: 'Search name, phone, message', all: 'All messages', unread: 'Unread', unanswered: 'Not replied', allCh: 'All channels',
    off: 'Chat is not enabled for this shop', offText: 'Contact PP Systems to turn on Facebook and WhatsApp chat.',
    none: 'No chats yet', noneText: 'Messages to your page or WhatsApp number appear here as they arrive.', noMatch: 'No matching chats',
    pick: 'Pick a chat on the left to reply', placeholder: 'Type a message… (Enter to send, Shift+Enter for a new line)', send: 'Send', attach: 'Attach photo or file', record: 'Record voice', recording: 'Recording', cancelRec: 'Discard recording', sendVoice: 'Send voice', micDenied: "Can't use the microphone. Allow it in the browser first.",
    markDone: 'Done', reopen: 'Reopen', older: 'Load older messages', today: 'Today', yesterday: 'Yesterday',
    sending: 'Sending', sent: 'Sent', delivered: 'Delivered', read: 'Read', failed: 'Not sent', retry: 'Retry',
    windowLeft: t => `${t} left to reply`, windowClosed: "This customer can't be messaged now", windowClosedText: "Their last message is older than the platform allows. You can reply again once they write to you.",
    humanAgent: 'Send as human agent (allowed within 7 days)', mediaMissing: "File couldn't be loaded", useSlip: 'Use as slip', slipFor: 'Attach slip to order',
    slipSaved: n => `Slip attached to ${n}`, slipUsed: n => `This photo is already the slip of ${n}`, needCustomer: 'Link this chat to a customer to see their orders', noOrders: 'No orders from this customer yet',
    customer: 'Customer', link: 'Link to existing customer', create: 'Save as new customer', unlink: 'Unlink', suggest: 'Customers with this phone', pickCustomer: 'Choose customer',
    spent: 'Lifetime', orders: 'Orders', avg: 'Average', bought: 'Bought before', sendProduct: 'Tap to send this product', recent: 'Recent orders',
    openProfile: 'Open customer page', blacklisted: 'This customer is blacklisted', vip: 'VIP', regular: 'Regular', newC: 'New customer',
    errors: { voice_failed: "Couldn't prepare the voice message. Record it again.", window_closed: 'The 24-hour window has closed', feature_disabled: 'This channel is not enabled', channel_disabled: 'This channel is paused', unsupported_type: "This file type can't be sent", file_too_large: 'File is over 16MB', send_failed: "Couldn't send", not_reply: 'The customer has to message first', not_connected: 'This WhatsApp number is not connected', rate_limited: 'Sending too fast, wait a moment', daily_limit: "Today's sending limit is reached" },
    replyOnly: 'Waiting for the customer to write first', replyOnlyText: 'To keep the number from being banned, the system only replies to customers who wrote first.',
    status: { pending: 'To ship', shipping: 'Shipped', completed: 'Completed', cancelled: 'Cancelled' }, details: 'Customer details', back: 'Back',
    saveAs: 'Save as:', saveInfo: 'Save as customer details', asName: 'Name', asPhone: 'Phone', asAddress: 'Address', noPhone: 'No phone number in this message', saveFailed: "Couldn't save",
    savedAs: { name: v => `Name saved: ${v}`, phone: v => `Phone saved: ${v}`, address: v => `Address saved: ${v}` },
    newOrder: 'Create order', orderMade: n => `Order ${n} created, stock taken`, summaryFailed: e => `but the summary couldn't be sent (${e})`,
  },
};

// tag: the word under a customer's photo. Facebook blue / WhatsApp green, dark enough to read at 10px.
const PLATFORM = {
  messenger: { label: 'Messenger', tag: 'Facebook', dot: 'bg-[#1565D8]', text: 'text-[#1565D8]' },
  whatsapp: { label: 'WhatsApp', tag: 'WhatsApp', dot: 'bg-[#0E8A5F]', text: 'text-[#0B7A53]' },
  whatsapp_web: { label: 'WhatsApp', tag: 'WhatsApp', dot: 'bg-[#0E8A5F]', text: 'text-[#0B7A53]' },
};
const ORDER_TONE = { pending: 'gold', shipping: 'navy', completed: 'green', cancelled: 'gray' };

function initials(s) {
  return (s || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

// The customer's photo with where they wrote from underneath: "Facebook" or "WhatsApp".
function Avatar({ conv, size = 'w-10 h-10' }) {
  const pf = PLATFORM[conv.platform];
  return (
    <span className="shrink-0 w-14 flex flex-col items-center gap-0.5">
      {conv.avatar_url
        ? <img src={conv.avatar_url} alt="" className={`${size} rounded-full object-cover bg-canvas`} referrerPolicy="no-referrer" />
        : <span className={`${size} rounded-full bg-gold-soft text-[#0950C2] flex items-center justify-center text-sm font-bold`}>{initials(conv.customer_name || conv.name || conv.phone)}</span>}
      {pf && <span className={`text-[0.625rem] leading-none font-bold ${pf.text}`}>{pf.tag}</span>}
    </span>
  );
}

function shortTime(v, c, locale) {
  const d = new Date(v);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return c.yesterday;
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export default function ChatPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const locale = lang === 'lo' ? 'lo-LA' : lang === 'th' ? 'th-TH' : 'en-GB';

  const [state, setState] = useState('loading'); // loading | ready | off
  const [list, setList] = useState([]);
  const [counts, setCounts] = useState({});
  const [platforms, setPlatforms] = useState([]);
  const [channels, setChannels] = useState([]); // the shop's pages / numbers
  const [filter, setFilter] = useState('all'); // all | unread | unanswered
  const [platform, setPlatform] = useState(''); // '' | 'messenger' | 'whatsapp' | 'ch:<channel id>'
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState('list'); // mobile: list | thread | profile
  const push = usePush(lang);
  const [notice, setNotice] = useState('');
  const say = text => { setNotice(text); setTimeout(() => setNotice(''), 4000); };

  // Opened from a notification (/chat?c=<id>): go straight to that conversation.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('c'));
    if (id > 0) { setActiveId(id); setView('thread'); }
  }, []);

  // While a conversation is open on a phone, hide the bottom menu so the message box has room.
  useEffect(() => {
    if (view === 'list') delete document.documentElement.dataset.chatThread;
    else document.documentElement.dataset.chatThread = '1';
    return () => { delete document.documentElement.dataset.chatThread; };
  }, [view]);

  // The inbox loads 30 chats; more come when the list is scrolled to the end. The refresh
  // every few seconds only asks for the newest 30 and merges them in, so a long inbox costs
  // the same as a short one.
  const listKey = useRef('');
  const [hasMore, setHasMore] = useState(false);
  const [more, setMore] = useState(false);
  const query = useCallback(extra => {
    const p = new URLSearchParams({ filter, limit: 30, ...extra });
    if (platform.startsWith('ch:')) p.set('channel', platform.slice(3));
    else if (platform) p.set('platform', platform);
    if (search.trim()) p.set('q', search.trim());
    return fetch(`/api/chat/conversations?${p}`);
  }, [filter, platform, search]);

  const loadList = useCallback(async () => {
    const key = `${filter}|${platform}|${search.trim()}`;
    const res = await query({});
    if (res.status === 403) { setState('off'); return; }
    if (!res.ok) return;
    const d = await res.json();
    const rows = d.conversations || [];
    const fresh = listKey.current !== key; // filter / search changed: start over
    listKey.current = key;
    if (fresh) {
      setList(rows);
      setHasMore(!!d.hasMore);
    } else {
      // Keep the older chats already loaded below the newest page; chats inside the newest
      // page's time range come from the server as they are now (moved, read, or gone).
      const oldest = rows[rows.length - 1];
      const older = x => oldest && (Date.parse(x.last_message_at) < Date.parse(oldest.last_message_at)
        || (Date.parse(x.last_message_at) === Date.parse(oldest.last_message_at) && x.id < oldest.id));
      setList(prev => {
        const ids = new Set(rows.map(r => r.id));
        const tail = d.hasMore ? prev.filter(x => !ids.has(x.id) && older(x)) : [];
        return [...rows, ...tail];
      });
      if (!d.hasMore) setHasMore(false);
    }
    setCounts(d.counts || {});
    setPlatforms(d.platforms || []);
    setChannels(d.channels || []);
    setState('ready');
  }, [query, filter, platform, search]);

  const loadMore = useCallback(async () => {
    const last = list[list.length - 1];
    if (more || !last) return;
    const key = listKey.current;
    setMore(true);
    try {
      const res = await query({ before_at: last.last_message_at, before_id: last.id });
      if (!res.ok) return;
      const d = await res.json();
      if (listKey.current !== key) return;
      setList(prev => { const ids = new Set(prev.map(x => x.id)); return [...prev, ...(d.conversations || []).filter(x => !ids.has(x.id))]; });
      setHasMore(!!d.hasMore);
    } finally {
      setMore(false);
    }
  }, [more, list, query]);

  useEffect(() => {
    const t = setTimeout(loadList, search ? 250 : 0);
    const id = setInterval(() => document.visibilityState === 'visible' && loadList(), 4000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [loadList]);

  function openChat(id) {
    setActiveId(id);
    setView('thread');
    setList(prev => prev.map(x => (x.id === id ? { ...x, unread_count: 0 } : x)));
  }

  if (state === 'off') {
    return <div className="max-w-xl mx-auto mt-10 bg-white rounded-xl border border-line"><EmptyState icon="chat" title={c.off} text={c.offText} /></div>;
  }

  const active = list.find(x => x.id === activeId);

  return (
    <div className={`relative -m-4 lg:-m-6 flex bg-white overflow-hidden ${view === 'list' ? 'h-[calc(100dvh-8rem-env(safe-area-inset-bottom))]' : 'h-[calc(100dvh-4rem)]'} lg:h-[calc(100dvh-4rem)]`}>
      {/* Conversation list */}
      <aside className={`${view === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-96 shrink-0 flex-col border-r border-line`}>
        {/* One search box and one row of tabs: every chat, chats nobody has opened yet, and chats
            where the customer wrote last and is still waiting for a reply. The channel picker only
            appears when a shop has more than one. */}
        <div className="px-3 pt-3 border-b border-line">
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Icon name="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={c.search} aria-label={c.search}
                className="w-full min-h-11 lg:min-h-10 pl-10 pr-3 rounded-lg bg-canvas border border-transparent text-base lg:text-sm text-ink placeholder:text-slate-400 focus:bg-white focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15" />
            </div>
            {(platforms.length > 1 || channels.length > 1) && (
                <label className="relative shrink-0">
                  <span className="sr-only">{c.allCh}</span>
                  <select value={platform} onChange={e => setPlatform(e.target.value)}
                    className="appearance-none w-[6.5rem] sm:w-28 truncate min-h-11 lg:min-h-10 pl-2.5 pr-7 rounded-lg text-xs font-semibold text-slate-600 bg-canvas hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">{c.allCh}</option>
                    {/* With several pages / numbers, each one can be picked on its own. */}
                    {channels.length > 1
                      ? channels.map(ch => <option key={ch.id} value={`ch:${ch.id}`}>{PLATFORM[ch.platform]?.tag}: {ch.name}</option>)
                      : platforms.map(p => <option key={p} value={p}>{PLATFORM[p].tag}</option>)}
                  </select>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                </label>
              )}
          </div>
          <div className="mt-1 flex items-end">
            <div role="tablist" aria-label={c.all} className="flex flex-1 min-w-0 overflow-x-auto no-scrollbar">
              {['all', 'unread', 'unanswered'].map(f => {
                const on = filter === f;
                const n = f === 'all' ? 0 : counts[f] || 0;
                return (
                  <button key={f} role="tab" aria-selected={on} onClick={() => setFilter(f)}
                    className={`relative shrink-0 px-2 xl:px-3 min-h-11 text-sm font-semibold whitespace-nowrap transition-colors ${on ? 'text-primary' : 'text-slate-500 hover:text-ink'}`}>
                    {c[f]}
                    {n > 0 && <span className={`ml-1.5 num text-xs ${on ? 'text-primary' : f === 'unread' ? 'text-danger' : 'text-slate-400'}`}>{n}</span>}
                    {on && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <SoundToggle lang={lang} />
            <PushToggle lang={lang} push={push} onMessage={say} />
          </div>
          {notice && <p role="status" className="mb-2 text-xs font-medium text-primary-dark">{notice}</p>}
          <PushHint lang={lang} push={push} onMessage={say} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {state === 'loading' ? (
            <div className="p-3 space-y-2" aria-busy="true">{[0, 1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-xl bg-canvas animate-pulse" />)}</div>
          ) : list.length === 0 ? (
            <EmptyState icon="chat" title={search ? c.noMatch : c.none} text={search ? undefined : c.noneText} />
          ) : (
            <ul>
              {list.map(conv => {
                const unread = conv.unread_count > 0;
                const selected = conv.id === activeId;
                return (
                  <li key={conv.id}>
                    <button onClick={() => openChat(conv.id)} aria-current={selected}
                      className={`w-full text-left flex items-center gap-2 pl-2 ${selected ? 'bg-gold-soft/70' : 'hover:bg-canvas/70'}`}>
                      <Avatar conv={conv} />
                      {/* Divider starts after the photo, so rows read as people rather than table cells. */}
                      <span className="flex-1 min-w-0 py-3 pr-4 border-b border-line/70">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-ink ${unread ? 'font-bold' : 'font-medium'}`}>{conv.customer_name || conv.name || conv.phone || PLATFORM[conv.platform].label}</span>
                          <span className={`text-xs shrink-0 num ${unread ? 'text-primary font-semibold' : 'text-slate-400'}`}>{conv.last_message_at && shortTime(conv.last_message_at, c, locale)}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2 mt-0.5">
                          <span className={`text-sm truncate ${unread ? 'text-ink font-medium' : 'text-slate-500'}`}>{conv.last_message_preview || ' '}</span>
                          {unread && <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-white text-[0.7rem] font-bold flex items-center justify-center num">{conv.unread_count > 99 ? '99+' : conv.unread_count}</span>}
                        </span>
                        {/* Which page / number this customer wrote to; only shown when the shop has more than one. */}
                        {channels.length > 1 && conv.channel_name && (
                          <span className="mt-0.5 block truncate text-[0.7rem] text-slate-400">{conv.channel_name}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {state === 'ready' && list.length > 0 && <LoadMore hasMore={hasMore} loading={more} onMore={loadMore} lang={lang} />}
        </div>
      </aside>

      {/* Thread + profile */}
      {activeId ? (
        <Thread key={activeId} id={activeId} summary={active} c={c} lang={lang} locale={locale} view={view} setView={setView} onChanged={loadList} />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-canvas/50">
          <EmptyState icon="chat" title={c.pick} />
        </div>
      )}
    </div>
  );
}

function Thread({ id, summary, c, lang, locale, view, setView, onChanged }) {
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [profileKey, setProfileKey] = useState(0);
  const [slipFor, setSlipFor] = useState(null); // message
  const [orderOpen, setOrderOpen] = useState(false);
  const [tagFor, setTagFor] = useState(null); // message id whose "save as" row is open
  const [info, setInfo] = useState('');
  const flash = text => { setInfo(text); setTimeout(() => setInfo(''), 5000); };

  // Staff tapped "save as name / phone / address" on a customer message.
  async function tagMessage(m, field) {
    setTagFor(null);
    setError('');
    try {
      const res = await fetch(`/api/chat/conversations/${id}/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field, message_id: m.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error === 'no_phone_in_message' ? c.noPhone : c.saveFailed); return; }
      flash(c.savedAs[field](String(d.value).slice(0, 60)));
      setProfileKey(k => k + 1);
      onChanged();
    } catch {
      setError(c.saveFailed);
    }
  }

  function orderDone(d) {
    setOrderOpen(false);
    const failed = d.summary && d.summary.status === 'failed';
    flash(c.orderMade(d.order.order_number) + (failed ? ` ${c.summaryFailed(c.errors[d.summary.error] || d.summary.error)}` : ''));
    setProfileKey(k => k + 1);
    load();
    onChanged();
  }
  const [preview, setPreview] = useState(null); // image url
  const [now, setNow] = useState(Date.now());
  // Touch keyboards: Enter makes a new line and the Send button sends, like the WhatsApp app.
  const [touch, setTouch] = useState(false);
  useEffect(() => { setTouch(window.matchMedia('(pointer: coarse)').matches); }, []);
  const scroller = useRef(null);
  const fileRef = useRef(null);
  const atBottom = useRef(true);
  const qc = QR_COPY[lang] || QR_COPY.en;
  const { replies, reload: reloadReplies } = useQuickReplies();
  const [qrOpen, setQrOpen] = useState(false); // false | 'button' | 'typed'
  const [qrFilter, setQrFilter] = useState('');
  const [qrManage, setQrManage] = useState(false);

  // Voice messages: tap the mic, talk, then send or discard. The server converts the recording
  // into what Messenger / WhatsApp play as a voice message. Up to 5 minutes.
  const recRef = useRef(null); // { recorder, chunks, stream, started, type }
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [canRecord, setCanRecord] = useState(false);
  useEffect(() => { setCanRecord(!!(window.MediaRecorder && navigator.mediaDevices?.getUserMedia)); }, []);
  useEffect(() => () => recRef.current?.stream.getTracks().forEach(t => t.stop()), []);
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - (recRef.current?.started || Date.now())) / 1000);
      setRecSecs(s);
      if (s >= 300) stopRec(true);
    }, 250);
    return () => clearInterval(t);
  }, [recording]);

  const merge = useCallback((rows, replaceTail) => {
    setMessages(prev => {
      const map = new Map(prev.map(m => [m.id, m]));
      for (const m of rows) map.set(m.id, m);
      // On a refresh of the newest page, the server's list is the truth for that range: drop
      // optimistic temp rows, and any message the server no longer has (e.g. a duplicate echo
      // copy it merged away), so a removed row doesn't linger on screen until reload.
      const keep = new Set(rows.map(m => m.id));
      const floor = rows.length ? Math.min(...rows.map(m => Number(m.id))) : Infinity;
      return [...map.values()]
        .filter(m => !(replaceTail && String(m.id).startsWith('tmp')))
        .filter(m => !(replaceTail && Number(m.id) >= floor && !keep.has(m.id)))
        .sort((a, b) => Number(a.id) - Number(b.id));
    });
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/chat/conversations/${id}`);
    if (!res.ok) return;
    const d = await res.json();
    setConv(d.conversation);
    merge(d.messages, true);
    setHasMore(h => h || d.hasMore);
  }, [id, merge]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 3000);
    const n = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(t); clearInterval(n); };
  }, [load]);

  // Stay pinned to the newest message unless the user has scrolled up to read.
  useEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = scroller.current;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function loadOlder() {
    const first = messages.find(m => !String(m.id).startsWith('tmp'));
    if (!first) return;
    const el = scroller.current;
    const before = el.scrollHeight;
    const res = await fetch(`/api/chat/conversations/${id}?before=${first.id}`);
    if (!res.ok) return;
    const d = await res.json();
    atBottom.current = false;
    merge(d.messages);
    setHasMore(d.hasMore);
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - before; });
  }

  // After the free 24 hours, Messenger replies from staff are sent with the "human agent" tag
  // by the server on its own (up to 7 days), so staff never have to tick anything.
  const win = conv?.window || {};
  const winOpen = win.open && (!win.closesAt || win.closesAt > now);
  const canSend = winOpen || (!!win.humanAgent && (!win.closesAt || win.closesAt > now));

  async function send(extra = {}) {
    if (sending) return;
    if (!extra.product_id && !text.trim() && !file) return;
    setSending(true);
    setError('');
    const form = new FormData();
    if (!extra.product_id) {
      form.append('text', text);
      if (file) form.append('file', file);
    }
    if (extra.product_id) form.append('product_id', extra.product_id);
    const temp = { id: `tmp${Date.now()}`, direction: 'out', type: file ? 'image' : 'text', text: extra.product_id ? '…' : text, status: 'sending', created_at: new Date().toISOString() };
    atBottom.current = true;
    setMessages(prev => [...prev, temp]);
    if (!extra.product_id) { setText(''); setFile(null); }
    try {
      const res = await fetch(`/api/chat/conversations/${id}/send`, { method: 'POST', body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok && d.error) setError(c.errors[d.error] || c.errors.send_failed);
    } finally {
      setSending(false);
      await load();
      onChanged();
    }
  }

  async function startRec() {
    setError('');
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setError(c.micDenied); return; }
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find(x => MediaRecorder.isTypeSupported?.(x)) || '';
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.start(250);
    recRef.current = { recorder, chunks, stream, started: Date.now(), type: recorder.mimeType || type || 'audio/webm' };
    setRecSecs(0);
    setRecording(true);
  }

  function stopRec(sendIt) {
    const cur = recRef.current;
    if (!cur) return;
    recRef.current = null;
    cur.recorder.onstop = () => {
      cur.stream.getTracks().forEach(t => t.stop());
      const secs = Math.round((Date.now() - cur.started) / 1000);
      // Under a second is almost always a mis-tap; don't send it.
      if (sendIt && Date.now() - cur.started >= 800) sendVoice(new Blob(cur.chunks, { type: cur.type }), secs);
    };
    cur.recorder.stop();
    setRecording(false);
  }

  async function sendVoice(blob, secs) {
    setSending(true);
    setError('');
    const mime = blob.type.split(';')[0] || 'audio/webm';
    const form = new FormData();
    form.append('file', new File([blob], `voice${mime === 'audio/mp4' ? '.m4a' : mime === 'audio/ogg' ? '.ogg' : '.webm'}`, { type: mime }));
    form.append('voice', '1');
    atBottom.current = true;
    setMessages(prev => [...prev, { id: `tmp${Date.now()}`, direction: 'out', type: 'text', text: `🎤 ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, status: 'sending', created_at: new Date().toISOString() }]);
    try {
      const res = await fetch(`/api/chat/conversations/${id}/send`, { method: 'POST', body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(c.errors[d.error] || c.errors.send_failed);
    } finally {
      setSending(false);
      await load();
      onChanged();
    }
  }

  // Typing "/" at the start of an empty message box opens the quick replies, filtered by what follows.
  function onType(v) {
    setText(v);
    const typed = /^\/[^\n]*$/.test(v);
    if (typed) { setQrOpen('typed'); setQrFilter(v.slice(1)); }
    else if (qrOpen === 'typed') setQrOpen(false);
  }

  async function sendQuick(reply) {
    if (sending) return;
    setSending(true);
    setError('');
    const form = new FormData();
    form.append('quick_reply_id', reply.id);
    atBottom.current = true;
    setMessages(prev => [...prev, { id: `tmp${Date.now()}`, direction: 'out', type: 'text', text: reply.text || '…', status: 'sending', created_at: new Date().toISOString() }]);
    if (qrOpen === 'typed') setText('');
    setQrOpen(false);
    try {
      const res = await fetch(`/api/chat/conversations/${id}/send`, { method: 'POST', body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(c.errors[d.error] || c.errors.send_failed);
    } finally {
      setSending(false);
      await load();
      onChanged();
      reloadReplies();
    }
  }

  async function retry(m) {
    setMessages(prev => prev.map(x => (x.id === m.id ? { ...x, status: 'sending' } : x)));
    const res = await fetch(`/api/chat/messages/${m.id}`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok && d.error) setError(c.errors[d.error] || c.errors.send_failed);
    load();
  }

  function onKey(e) {
    if (touch || qrOpen) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) send();
    }
  }

  function onPaste(e) {
    const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); setFile(f); }
  }

  const name = conv?.name || summary?.customer_name || summary?.name || conv?.phone || '';

  // Group messages under day headings.
  const grouped = useMemo(() => {
    const out = [];
    let day = '';
    for (const m of messages) {
      const d = new Date(m.created_at).toDateString();
      if (d !== day) { day = d; out.push({ day: m.created_at }); }
      out.push(m);
    }
    return out;
  }, [messages]);

  function dayLabel(v) {
    const d = new Date(v);
    const n = new Date();
    if (d.toDateString() === n.toDateString()) return c.today;
    const y = new Date(n); y.setDate(n.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return c.yesterday;
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <>
      <section className={`${view === 'thread' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 flex-col bg-canvas/60`}>
        {/* Header */}
        <header className="h-16 shrink-0 bg-white border-b border-line px-3 sm:px-4 flex items-center gap-3">
          <IconButton icon="back" label={c.back} onClick={() => setView('list')} className="md:hidden -ml-1" />
          {conv && <Avatar conv={{ ...conv, customer_name: summary?.customer_name }} size="w-9 h-9" />}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink truncate">{name}</p>
            <p className="text-xs text-slate-500 truncate">
              {conv && (conv.channel_name || PLATFORM[conv.platform].label)}
              {conv?.phone && <span className="num ml-1">({conv.phone})</span>}
            </p>
          </div>
          {/* Create order: just a "+" (its name shows as the tooltip and to screen readers). */}
          {conv && (
            <IconButton icon="plus" label={c.newOrder} onClick={() => setOrderOpen(true)}
              className="!text-primary bg-gold-soft/70 hover:!bg-gold-soft" />
          )}
          <IconButton icon="user" label={c.details} onClick={() => setView(view === 'profile' ? 'thread' : 'profile')} className="xl:hidden" />
        </header>

        {/* Messages */}
        <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1.5">
          {hasMore && (
            <div className="text-center mb-2"><button onClick={loadOlder} className="text-xs font-semibold text-primary hover:text-gold-dark">{c.older}</button></div>
          )}
          {grouped.map((m, i) => m.day ? (
            <div key={`d${i}`} className="flex justify-center py-2"><span className="text-[0.7rem] font-semibold text-slate-500 bg-white border border-line rounded-full px-3 py-0.5">{dayLabel(m.day)}</span></div>
          ) : (
            <Bubble key={m.id} m={m} c={c} locale={locale} onRetry={retry} onPreview={setPreview} onSlip={setSlipFor}
              tagOpen={tagFor === m.id} onTagToggle={() => setTagFor(tagFor === m.id ? null : m.id)} onTag={tagMessage} />
          ))}
        </div>

        {/* Composer */}
        <div className="relative shrink-0 bg-white border-t border-line p-3">
          {qrOpen && canSend && (
            <QuickReplyPicker c={qc} replies={replies} filter={qrFilter} onFilter={setQrFilter} typedFilter={qrOpen === 'typed'}
              onSend={sendQuick} sending={sending} onClose={() => setQrOpen(false)}
              onManage={() => { setQrOpen(false); setQrManage(true); }} />
          )}
          {/* Only when nothing can be sent at all (Messenger past 7 days, or a WhatsApp number
              the customer never wrote to). Within 7 days the server handles it in the background. */}
          {conv && !canSend && (
            <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
              <p className="font-semibold">{win.replyOnly ? c.replyOnly : c.windowClosed}</p>
              <p className="text-xs">{win.replyOnly ? c.replyOnlyText : c.windowClosedText}</p>
            </div>
          )}
          {error && <p role="alert" className="mb-2 text-sm text-danger">{error}</p>}
          {info && <p role="status" className="mb-2 text-sm font-medium text-success">{info}</p>}
          {file && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-xl bg-canvas pl-2 pr-1 py-1">
              {file.type.startsWith('image/') ? <img src={URL.createObjectURL(file)} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <Icon name="box" className="w-5 h-5 text-slate-400" />}
              <span className="text-xs text-slate-600 max-w-[12rem] truncate">{file.name}</span>
              <IconButton icon="close" label="Remove" onClick={() => setFile(null)} />
            </div>
          )}
          {recording ? (
            <div className="flex items-center gap-2">
              <IconButton icon="trash" label={c.cancelRec} onClick={() => stopRec(false)} className="!text-danger" />
              <div role="status" className="flex-1 min-w-0 h-11 rounded-xl bg-red-50 px-4 flex items-center gap-3 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-danger motion-safe:animate-pulse shrink-0" aria-hidden="true" />
                <span className="font-semibold text-danger truncate">{c.recording}</span>
                <span className="ml-auto num font-bold text-ink">{Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, '0')}</span>
              </div>
              <Button onClick={() => stopRec(true)} className="h-11">{c.send}</Button>
            </div>
          ) : (
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden"
              onChange={e => { setFile(e.target.files?.[0] || null); e.target.value = ''; }} />
            <IconButton icon="image" label={c.attach} onClick={() => fileRef.current?.click()} disabled={!canSend} />
            <IconButton icon="bolt" label={qc.open} data-qr-toggle="1" aria-expanded={!!qrOpen} disabled={!canSend}
              onClick={() => { if (qrOpen) setQrOpen(false); else { setQrFilter(''); setQrOpen('button'); } }}
              className={qrOpen ? '!text-primary !bg-gold-soft' : ''} />
            <textarea rows={1} data-qr-toggle="1" value={text} onChange={e => onType(e.target.value)} onKeyDown={onKey} onPaste={onPaste} disabled={!canSend}
              placeholder={canSend ? (touch ? c.placeholder.split(' (')[0] : c.placeholder) : (win.replyOnly ? c.replyOnly : c.windowClosed)} aria-label={c.placeholder.split(' (')[0]}
              className={`${inputCls} resize-none max-h-40 min-h-[2.75rem] disabled:bg-canvas`} style={{ fieldSizing: 'content' }} />
            {canRecord && !text.trim() && !file ? (
              <IconButton icon="mic" label={c.record} onClick={startRec} disabled={!canSend || sending}
                className="!w-11 !h-11 shrink-0 !rounded-xl !bg-primary !text-white hover:!bg-primary-dark disabled:!opacity-40" />
            ) : (
              <Button onClick={() => send()} disabled={!canSend || sending || (!text.trim() && !file)} className="h-11">{c.send}</Button>
            )}
          </div>
          )}
        </div>
      </section>

      <Profile key={`${id}-${profileKey}`} id={id} conv={conv} c={c} lang={lang} locale={locale}
        visible={view === 'profile'} onBack={() => setView('thread')}
        onLinked={() => { setProfileKey(k => k + 1); load(); onChanged(); }}
        onSendProduct={pid => { setView('thread'); send({ product_id: pid }); }} canSend={canSend} />

      <Modal open={!!preview} onClose={() => setPreview(null)} size="xl">
        {preview && <img src={preview} alt="" className="w-full max-h-[75vh] object-contain" />}
      </Modal>

      {qrManage && <QuickReplyManager c={qc} replies={replies} onClose={() => setQrManage(false)} onChanged={reloadReplies} />}

      {orderOpen && <ChatOrderPanel convId={id} lang={lang} onClose={() => setOrderOpen(false)} onDone={orderDone} />}

      {slipFor && <SlipPicker message={slipFor} convId={id} c={c} onClose={() => setSlipFor(null)} onDone={() => { setSlipFor(null); setProfileKey(k => k + 1); load(); }} />}
    </>
  );
}

const TICKS = { sending: '…', sent: '✓', delivered: '✓✓', read: '✓✓' };

function Bubble({ m, c, locale, onRetry, onPreview, onSlip, tagOpen, onTagToggle, onTag }) {
  const out = m.direction === 'out';
  const media = m.has_media ? `/api/chat/messages/${m.id}` : null;
  const isImg = media && String(m.media_mime).startsWith('image/');
  const sticker = isImg && m.type === 'sticker' && !m.text;
  // A customer's text can be saved onto their customer record (address / phone / name) with the
  // "+" beside it, or a tap on the text (not when the tap ends a text selection for copying).
  // The order panel then fills these in for this customer.
  const taggable = !out && !!m.text && !media && !String(m.id).startsWith('tmp');
  const onTextClick = taggable ? () => { if (!window.getSelection?.().toString()) onTagToggle(); } : undefined;
  const time = new Date(m.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div className={`group max-w-[85%] sm:max-w-[70%] flex flex-col ${out ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-1 max-w-full">
        {sticker ? (
          <img src={media} alt="" loading="lazy" className="w-32 h-32 sm:w-36 sm:h-36 object-contain" />
        ) : (
        <div className={`min-w-0 rounded-xl overflow-hidden ${out ? 'bg-primary text-white rounded-br-md' : 'bg-white text-ink border border-line rounded-bl-md'}`}>
          {isImg && (
            <button onClick={() => onPreview(media)} className="block">
              <img src={media} alt="" loading="lazy" className="max-h-72 w-auto object-cover" />
            </button>
          )}
          {media && !isImg && String(m.media_mime).startsWith('audio/') && <audio controls src={media} className="m-2 max-w-[16rem]" />}
          {media && !isImg && String(m.media_mime).startsWith('video/') && <video controls src={media} className="max-h-72" />}
          {media && !isImg && !/^(audio|video)\//.test(String(m.media_mime)) && (
            <a href={`${media}?download=1`} className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold ${out ? 'text-white' : 'text-primary'}`}>
              <Icon name="download" className="w-4 h-4" />{m.text || 'file'}
            </a>
          )}
          {!m.has_media && m.type !== 'text' && m.type !== 'location' && !m.text && (
            <p className="px-3.5 py-2 text-sm italic opacity-70">{m.error ? c.mediaMissing : `[${m.type}]`}</p>
          )}
          {m.text && !(media && !isImg && !/^(audio|video)\//.test(String(m.media_mime))) && (
            <p onClick={onTextClick} className={`px-3.5 py-2 text-[0.95rem] whitespace-pre-wrap break-words ${taggable ? 'cursor-pointer' : ''} ${tagOpen ? 'bg-gold-soft/60' : ''}`}>{m.text}</p>
          )}
        </div>
        )}
        {taggable && (
          <button type="button" onClick={onTagToggle} aria-label={c.saveInfo} title={c.saveInfo} aria-expanded={tagOpen}
            className={`shrink-0 w-9 h-9 lg:w-7 lg:h-7 rounded-full flex items-center justify-center border transition-colors ${tagOpen ? 'bg-primary border-primary text-white' : 'bg-white border-line text-primary hover:border-primary'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={`w-4 h-4 transition-transform ${tagOpen ? 'rotate-45' : ''}`} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}
        </div>
        {tagOpen && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500">{c.saveAs}</span>
            {[['address', c.asAddress], ['phone', c.asPhone], ['name', c.asName]].map(([f, l]) => (
              <button key={f} type="button" onClick={() => onTag(m, f)}
                className="px-3 min-h-10 lg:min-h-8 rounded-full bg-white border border-line font-semibold text-primary-dark hover:border-primary">{l}</button>
            ))}
          </div>
        )}
        <div className="mt-0.5 flex items-center gap-2 px-1 text-[0.7rem] text-slate-400">
          <span className="num">{time}</span>
          {out && m.status !== 'failed' && <span title={c[m.status]} className={m.status === 'read' ? 'text-success font-bold' : ''}>{TICKS[m.status]}</span>}
          {out && m.status === 'failed' && (
            <span className="text-danger font-semibold" title={m.error || ''}>
              {c.failed}{c.errors[m.error] ? ` (${c.errors[m.error]})` : ''} <button onClick={() => onRetry(m)} className="underline ml-1">{c.retry}</button>
            </span>
          )}
          {!out && isImg && (
            <button onClick={() => onSlip(m)} className={`font-semibold ${m.order_id ? 'text-success' : 'text-primary opacity-0 group-hover:opacity-100 focus:opacity-100'}`}>
              {m.order_id ? '✓ ' : ''}{c.useSlip}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Profile({ id, conv, c, lang, locale, visible, onBack, onLinked, onSendProduct, canSend }) {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState(''); // '' | link | create
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch(`/api/chat/conversations/${id}/profile`).then(r => r.json()).then(setData).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (mode !== 'link') return;
    const t = setTimeout(async () => {
      const d = await fetch(`/api/customers?search=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => []);
      setResults(Array.isArray(d) ? d.slice(0, 20) : []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, mode]);

  async function link(customerId) {
    await fetch(`/api/chat/conversations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: customerId }) });
    setMode('');
    onLinked();
  }

  const cu = data?.customer;
  const count = Number(cu?.order_count) || 0;
  const spent = Number(cu?.total_spent) || 0;
  const tier = !cu ? null : cu.is_blacklisted ? { tone: 'red', label: c.blacklisted } : spent >= 5000000 ? { tone: 'gold', label: c.vip } : count > 1 ? { tone: 'navy', label: c.regular } : { tone: 'gray', label: c.newC };
  const nameOf = p => (lang === 'lo' ? p.name_lo : lang === 'th' ? p.name_th : p.name_en) || p.name_lo || p.name_th || p.name_en || p.sku;

  return (
    <aside className={`${visible ? 'flex' : 'hidden'} xl:flex w-full md:w-80 xl:w-80 shrink-0 flex-col border-l border-line bg-white overflow-y-auto ${visible ? 'md:absolute md:right-0 md:inset-y-0 md:z-10 md:shadow-xl xl:static xl:shadow-none' : ''}`}>
      <div className="h-16 shrink-0 px-4 flex items-center gap-2 border-b border-line">
        <IconButton icon="back" label={c.back} onClick={onBack} className="xl:hidden -ml-1" />
        <h2 className="font-bold text-ink">{c.customer}</h2>
      </div>

      {!data ? (
        <div className="p-4 space-y-3" aria-busy="true"><div className="h-24 rounded-xl bg-canvas animate-pulse" /><div className="h-40 rounded-xl bg-canvas animate-pulse" /></div>
      ) : !cu ? (
        <div className="p-4 space-y-4">
          {data.suggestions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">{c.suggest}</p>
              <ul className="space-y-1.5">
                {data.suggestions.map(s => (
                  <li key={s.id}>
                    <button onClick={() => link(s.id)} className="w-full text-left rounded-xl border border-gold/50 bg-gold-soft/40 px-3 py-2 hover:bg-gold-soft">
                      <span className="block font-semibold text-ink">{s.name || s.phone}</span>
                      <span className="block text-xs text-slate-500 num">{s.phone}, {formatCurrency(s.total_spent, 'LAK')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mode === '' && (
            <div className="space-y-2">
              <Button className="w-full" icon="plus" onClick={() => setMode('create')}>{c.create}</Button>
              <Button className="w-full" tone="ghost" icon="link" onClick={() => setMode('link')}>{c.link}</Button>
            </div>
          )}
          {mode === 'link' && (
            <div>
              <SearchInput value={q} onChange={setQ} placeholder={c.pickCustomer} />
              <ul className="mt-2 max-h-80 overflow-y-auto divide-y divide-line">
                {results.map(r => (
                  <li key={r.id}>
                    <button onClick={() => link(r.id)} className="w-full text-left px-2 py-2 hover:bg-canvas rounded-lg">
                      <span className="block font-semibold text-ink text-sm">{r.name || r.phone}</span>
                      <span className="block text-xs text-slate-500 num">{r.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={() => setMode('')} className="mt-2 text-sm text-slate-500">{c.back}</button>
            </div>
          )}
          {mode === 'create' && (
            <CustomerForm lang={lang} initial={{ name: conv?.name || '', phone: conv?.phone || '' }} onCancel={() => setMode('')}
              onSaved={newId => link(newId)} />
          )}
        </div>
      ) : (
        <div className="p-4 space-y-5">
          {/* Who this person is to the shop */}
          <section className="rounded-xl bg-canvas border border-line p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-ink truncate">{cu.name || cu.phone}</p>
                {cu.phone && <p className="text-xs text-slate-500 num">{cu.phone}</p>}
              </div>
              {tier && <Pill tone={tier.tone}>{tier.label}</Pill>}
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
              <div><dt className="text-[0.7rem] text-slate-500">{c.spent}</dt><dd className="text-sm font-extrabold text-primary num truncate">{formatCurrency(spent, 'LAK')}</dd></div>
              <div><dt className="text-[0.7rem] text-slate-500">{c.orders}</dt><dd className="text-sm font-extrabold text-ink num">{count}</dd></div>
              <div><dt className="text-[0.7rem] text-slate-500">{c.avg}</dt><dd className="text-sm font-extrabold text-ink num truncate">{formatCurrency(count ? spent / count : 0, 'LAK')}</dd></div>
            </dl>
            {cu.address && <p className="mt-3 text-xs text-slate-600 whitespace-pre-wrap">{cu.address}</p>}
            {cu.note && <p className="mt-2 text-xs text-[#8A4B00] bg-[#FFF3DE] rounded-md px-2 py-1 whitespace-pre-wrap">{cu.note}</p>}
          </section>

          {data.products?.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-ink">{c.bought}</h3>
              <p className="text-xs text-slate-500">{c.sendProduct}</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {data.products.map(p => (
                  <button key={p.id} onClick={() => canSend && onSendProduct(p.id)} disabled={!canSend} title={nameOf(p)}
                    className="text-left rounded-xl border border-line overflow-hidden hover:border-gold disabled:opacity-50">
                    <span className="block aspect-square bg-canvas">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-slate-300"><Icon name="image" /></span>}
                    </span>
                    <span className="block px-1.5 py-1 text-[0.7rem] font-semibold text-ink truncate">{nameOf(p)}</span>
                    <span className="block px-1.5 pb-1 text-[0.65rem] text-slate-500 num">x{Number(p.qty)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-bold text-ink">{c.recent}</h3>
            {data.orders.length === 0 ? <p className="mt-1 text-sm text-slate-500">{c.noOrders}</p> : (
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {data.orders.slice(0, 8).map(o => (
                  <li key={o.id}>
                    <a href={`/orders?q=${encodeURIComponent(o.order_number)}`} className="flex items-center gap-2 py-2 hover:bg-canvas/60">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-ink num truncate">{o.order_number}</span>
                        <span className="block text-[0.7rem] text-slate-500">{new Date(o.created_at).toLocaleDateString(locale)}</span>
                      </span>
                      <Pill tone={ORDER_TONE[o.status]}>{c.status[o.status] || o.status}</Pill>
                      <span className="text-sm font-bold text-ink num">{formatCurrency(o.total, o.currency)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex items-center justify-between text-sm">
            <a href={`/customers/${cu.id}`} className="font-semibold text-primary hover:text-gold-dark">{c.openProfile}</a>
            <button onClick={() => link(null)} className="text-slate-400 hover:text-danger">{c.unlink}</button>
          </div>
        </div>
      )}
    </aside>
  );
}

function SlipPicker({ message, convId, c, onClose, onDone }) {
  const [orders, setOrders] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`/api/chat/conversations/${convId}/profile`).then(r => r.json()).then(d => setOrders(d.customer ? d.orders.filter(o => o.status !== 'cancelled') : false));
  }, [convId]);

  async function pick(o) {
    const res = await fetch('/api/chat/slip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: message.id, order_id: o.id }) });
    const d = await res.json().catch(() => ({}));
    if (res.status === 409) { setMsg(c.slipUsed(d.order_number)); return; }
    if (!res.ok) { setMsg(c.errors.send_failed); return; }
    onDone();
  }

  return (
    <Modal open onClose={onClose} title={c.slipFor} size="md">
      <img src={`/api/chat/messages/${message.id}`} alt="" className="max-h-56 mx-auto rounded-xl" />
      {msg && <p role="alert" className="mt-3 text-sm text-danger">{msg}</p>}
      {orders === null ? <div className="mt-4 h-20 rounded-xl bg-canvas animate-pulse" />
        : orders === false ? <p className="mt-4 text-sm text-slate-600">{c.needCustomer}</p>
        : orders.length === 0 ? <p className="mt-4 text-sm text-slate-600">{c.noOrders}</p>
        : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {orders.map(o => (
              <li key={o.id}>
                <button onClick={() => pick(o)} className="w-full flex items-center gap-3 py-2.5 px-1 text-left hover:bg-canvas">
                  <span className="flex-1 font-semibold text-ink num">{o.order_number}</span>
                  {o.payment_slip_url && <Pill tone="green">✓</Pill>}
                  <Pill tone={ORDER_TONE[o.status]}>{c.status[o.status]}</Pill>
                  <span className="font-bold num">{formatCurrency(o.total, o.currency)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </Modal>
  );
}
