'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button, IconButton, Modal, Icon, Field, inputCls } from '../ui';
import { compressImage } from '../../lib/image';

// Quick replies: answers a shop sends over and over (bank account, how to order, size chart),
// saved once with photos or stickers and sent with two taps — pick, check, send.

export const QR_COPY = {
  lo: {
    open: 'ຂໍ້ຄວາມດ່ວນ', search: 'ຄົ້ນຫາຂໍ້ຄວາມດ່ວນ', manage: 'ຈັດການ', send: 'ສົ່ງ', back: 'ກັບ',
    none: 'ຍັງບໍ່ມີຂໍ້ຄວາມດ່ວນ', noneText: 'ບັນທຶກຄຳຕອບທີ່ໃຊ້ເລື້ອຍໆ ເຊັ່ນ ເລກບັນຊີ ຫຼື ວິທີສັ່ງຊື້ ແລ້ວສົ່ງໄດ້ໃນສອງຄັ້ງກົດ',
    create: 'ສ້າງຂໍ້ຄວາມດ່ວນ', noMatch: 'ບໍ່ພົບຂໍ້ຄວາມດ່ວນນີ້', hint: 'ພິມ / ໃນຊ່ອງພິມເພື່ອເປີດໄວ',
    willSend: (t, n) => [t && 'ຂໍ້ຄວາມ', n && `ຮູບ ${n}`].filter(Boolean).join(' + '),
    title: 'ຂໍ້ຄວາມດ່ວນ', edit: 'ແກ້ໄຂຂໍ້ຄວາມດ່ວນ', add: 'ສ້າງໃໝ່', name: 'ຊື່ຫຍໍ້', nameHint: 'ໃຊ້ຄົ້ນຫາ ລູກຄ້າບໍ່ເຫັນ ເຊັ່ນ: ເລກບັນຊີ, ວິທີສັ່ງ',
    text: 'ຂໍ້ຄວາມ', textPh: 'ສະບາຍດີ ຂອບໃຈທີ່ສົນໃຈສິນຄ້າຂອງຮ້ານ…', media: 'ຮູບ ແລະ ສະຕິກເກີ', addPhoto: 'ເພີ່ມຮູບ', addSticker: 'ເພີ່ມສະຕິກເກີ',
    stickerTag: 'ສະຕິກເກີ', mediaHint: n => `ສູງສຸດ ${n} ອັນ ສົ່ງຕາມລຳດັບທີ່ຮຽງໄວ້. ສະຕິກເກີຄວນເປັນຮູບພື້ນໃສ (PNG ຫຼື WebP)`,
    save: 'ບັນທຶກ', cancel: 'ຍົກເລີກ', del: 'ລຶບ', delAsk: t => `ລຶບ "${t}" ບໍ?`, moveUp: 'ຍ້າຍຂຶ້ນ', moveDown: 'ຍ້າຍລົງ', moveLeft: 'ຍ້າຍໄປໜ້າ', moveRight: 'ຍ້າຍໄປຫຼັງ', remove: 'ເອົາອອກ',
    used: n => `ໃຊ້ ${n} ຄັ້ງ`, preparing: 'ກຳລັງກຽມຮູບ…',
    errors: { title_required: 'ໃສ່ຊື່ຫຍໍ້ກ່ອນ', empty: 'ໃສ່ຂໍ້ຄວາມ ຫຼື ຮູບຢ່າງໜ້ອຍໜຶ່ງອັນ', too_many_media: 'ໃສ່ຮູບໄດ້ສູງສຸດ 5 ອັນ', file_too_large: 'ຮູບໃຫຍ່ເກີນ 5MB', unsupported_type: 'ໃຊ້ໄດ້ສະເພາະຮູບ JPG, PNG, WebP, GIF', file_content_invalid: 'ໄຟລ໌ນີ້ບໍ່ແມ່ນຮູບ', too_many_replies: 'ບັນທຶກໄດ້ສູງສຸດ 200 ຂໍ້ຄວາມ', save_failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່' },
  },
  th: {
    open: 'ข้อความด่วน', search: 'ค้นหาข้อความด่วน', manage: 'จัดการ', send: 'ส่ง', back: 'กลับ',
    none: 'ยังไม่มีข้อความด่วน', noneText: 'บันทึกคำตอบที่ใช้บ่อย เช่น เลขบัญชี หรือวิธีสั่งซื้อ แล้วส่งได้ในสองคลิก',
    create: 'สร้างข้อความด่วน', noMatch: 'ไม่พบข้อความด่วนนี้', hint: 'พิมพ์ / ในช่องพิมพ์เพื่อเปิดเร็ว',
    willSend: (t, n) => [t && 'ข้อความ', n && `รูป ${n}`].filter(Boolean).join(' + '),
    title: 'ข้อความด่วน', edit: 'แก้ไขข้อความด่วน', add: 'สร้างใหม่', name: 'ชื่อย่อ', nameHint: 'ใช้ค้นหา ลูกค้าไม่เห็น เช่น: เลขบัญชี, วิธีสั่ง',
    text: 'ข้อความ', textPh: 'สวัสดีค่ะ ขอบคุณที่สนใจสินค้าของร้าน…', media: 'รูปและสติกเกอร์', addPhoto: 'เพิ่มรูป', addSticker: 'เพิ่มสติกเกอร์',
    stickerTag: 'สติกเกอร์', mediaHint: n => `สูงสุด ${n} อัน ส่งตามลำดับที่เรียงไว้ สติกเกอร์ควรเป็นรูปพื้นใส (PNG หรือ WebP)`,
    save: 'บันทึก', cancel: 'ยกเลิก', del: 'ลบ', delAsk: t => `ลบ "${t}" ไหม?`, moveUp: 'เลื่อนขึ้น', moveDown: 'เลื่อนลง', moveLeft: 'เลื่อนไปหน้า', moveRight: 'เลื่อนไปหลัง', remove: 'เอาออก',
    used: n => `ใช้ ${n} ครั้ง`, preparing: 'กำลังเตรียมรูป…',
    errors: { title_required: 'ใส่ชื่อย่อก่อน', empty: 'ใส่ข้อความหรือรูปอย่างน้อยหนึ่งอย่าง', too_many_media: 'ใส่รูปได้สูงสุด 5 อัน', file_too_large: 'รูปใหญ่เกิน 5MB', unsupported_type: 'ใช้ได้เฉพาะรูป JPG, PNG, WebP, GIF', file_content_invalid: 'ไฟล์นี้ไม่ใช่รูป', too_many_replies: 'บันทึกได้สูงสุด 200 ข้อความ', save_failed: 'บันทึกไม่สำเร็จ ลองใหม่' },
  },
  en: {
    open: 'Quick replies', search: 'Search quick replies', manage: 'Manage', send: 'Send', back: 'Back',
    none: 'No quick replies yet', noneText: 'Save answers you type often, like your bank account or how to order, and send them in two taps.',
    create: 'Create a quick reply', noMatch: 'No quick reply matches', hint: 'Type / in the message box to open this fast',
    willSend: (t, n) => [t && 'Message', n && `${n} ${n === 1 ? 'photo' : 'photos'}`].filter(Boolean).join(' + '),
    title: 'Quick replies', edit: 'Edit quick reply', add: 'New', name: 'Short name', nameHint: 'For finding it; customers don\'t see it. E.g. Bank account, How to order',
    text: 'Message', textPh: 'Hi, thanks for your interest in our products…', media: 'Photos and stickers', addPhoto: 'Add photo', addSticker: 'Add sticker',
    stickerTag: 'Sticker', mediaHint: n => `Up to ${n}, sent in this order. Stickers work best with a transparent background (PNG or WebP).`,
    save: 'Save', cancel: 'Cancel', del: 'Delete', delAsk: t => `Delete "${t}"?`, moveUp: 'Move up', moveDown: 'Move down', moveLeft: 'Move earlier', moveRight: 'Move later', remove: 'Remove',
    used: n => `Used ${n}×`, preparing: 'Preparing photos…',
    errors: { title_required: 'Add a short name', empty: 'Add a message or at least one photo', too_many_media: 'Up to 5 photos', file_too_large: 'Photo is over 5MB', unsupported_type: 'Only JPG, PNG, WebP or GIF images', file_content_invalid: 'This file is not an image', too_many_replies: 'Up to 200 quick replies', save_failed: "Couldn't save. Try again." },
  },
};

const mediaUrl = id => `/api/chat/quick-replies/media/${id}`;

// Stickers: fit into 512×512 on a transparent canvas, saved as WebP so WhatsApp shows a real sticker.
// Browsers that can't write WebP (older Safari) give PNG, which is then sent as a photo.
async function prepareSticker(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(512 / bmp.width, 512 / bmp.height);
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    canvas.getContext('2d').drawImage(bmp, (512 - w) / 2, (512 - h) / 2, w, h);
    bmp.close?.();
    const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', 0.85));
    if (!blob) return file;
    const ext = blob.type === 'image/webp' ? 'webp' : 'png';
    return new File([blob], `sticker.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}

function Thumb({ src, sticker, className = 'w-9 h-9' }) {
  return sticker
    ? <img src={src} alt="" loading="lazy" className={`${className} object-contain`} />
    : <img src={src} alt="" loading="lazy" className={`${className} rounded-md object-cover bg-canvas`} />;
}

export function useQuickReplies() {
  const [replies, setReplies] = useState(null);
  const load = () => fetch('/api/chat/quick-replies').then(r => (r.ok ? r.json() : { replies: [] })).then(d => setReplies(d.replies || [])).catch(() => setReplies([]));
  useEffect(() => { load(); }, []);
  return { replies, reload: load };
}

// The picker that opens above the message box.
export function QuickReplyPicker({ c, replies, filter, onFilter, typedFilter, onSend, onManage, onClose, sending }) {
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(null);
  const searchRef = useRef(null);
  const panelRef = useRef(null);

  const list = useMemo(() => {
    const q = (filter || '').trim().toLowerCase();
    if (!replies) return [];
    if (!q) return replies;
    return replies.filter(r => r.title.toLowerCase().includes(q) || (r.text || '').toLowerCase().includes(q));
  }, [replies, filter]);

  useEffect(() => { setActive(0); }, [filter]);
  useEffect(() => {
    // Desktop: type straight into the search. Touch: don't pop the keyboard over the list.
    if (!typedFilter && window.matchMedia('(pointer: fine)').matches) searchRef.current?.focus();
  }, [typedFilter]);

  useEffect(() => {
    const onKey = e => {
      const handled = ['Escape', 'Enter', 'ArrowDown', 'ArrowUp'].includes(e.key) && !(e.key === 'Enter' && e.shiftKey);
      // Keep these keys away from the message box (Enter there would send the typed "/…").
      if (handled) e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); picked ? setPicked(null) : onClose(); return; }
      if (picked) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(picked); }
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(list.length - 1, a + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
      if (e.key === 'Enter' && !e.shiftKey && list[active]) { e.preventDefault(); setPicked(list[active]); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [list, active, picked, onSend, onClose]);

  useEffect(() => {
    panelRef.current?.querySelector('[data-active="1"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  useEffect(() => {
    const onDown = e => { if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest?.('[data-qr-toggle]')) onClose(); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [onClose]);

  return (
    <div ref={panelRef} role="dialog" aria-label={c.open}
      className="absolute bottom-full left-0 right-0 md:left-3 md:right-auto md:w-[26rem] mb-2 md:mb-1 z-20 bg-white border border-line md:rounded-xl rounded-t-xl shadow-[0_-8px_30px_rgba(14,26,51,.12)] md:shadow-[0_12px_32px_rgba(14,26,51,.16)] flex flex-col max-h-[min(30rem,60dvh)] overflow-hidden">
      {picked ? (
        <>
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-line">
            <IconButton icon="back" label={c.back} onClick={() => setPicked(null)} />
            <p className="flex-1 min-w-0 font-bold text-ink truncate">{picked.title}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-canvas/60">
            {picked.text && <p className="ml-auto max-w-[90%] w-fit rounded-xl rounded-br-md bg-primary text-white px-3.5 py-2 text-[0.95rem] whitespace-pre-wrap break-words">{picked.text}</p>}
            {picked.media.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2">
                {picked.media.map(m => <Thumb key={m.id} src={mediaUrl(m.id)} sticker={m.kind === 'sticker'} className={m.kind === 'sticker' ? 'w-24 h-24' : 'w-24 h-24 !rounded-lg'} />)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 border-t border-line">
            <span className="flex-1 text-xs text-slate-500">{c.willSend(!!picked.text, picked.media.length)}</span>
            <Button onClick={() => onSend(picked)} disabled={sending} className="min-w-24">{c.send}</Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 p-2 border-b border-line">
            {typedFilter ? (
              <p className="flex-1 px-2 text-sm font-bold text-ink flex items-center gap-2"><Icon name="bolt" className="w-4 h-4 text-primary" />{c.open}</p>
            ) : (
              <div className="relative flex-1">
                <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input ref={searchRef} type="search" value={filter} onChange={e => onFilter(e.target.value)} placeholder={c.search} aria-label={c.search}
                  className="w-full min-h-10 pl-9 pr-3 rounded-lg bg-canvas text-base md:text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25" />
              </div>
            )}
            <Button size="sm" tone="subtle" icon="edit" onClick={onManage}>{c.manage}</Button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {replies === null ? (
              <div className="p-3 space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-lg bg-canvas animate-pulse" />)}</div>
            ) : replies.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="font-semibold text-ink">{c.none}</p>
                <p className="mt-1 text-sm text-slate-500">{c.noneText}</p>
                <Button icon="plus" onClick={onManage} className="mt-4">{c.create}</Button>
              </div>
            ) : list.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">{c.noMatch}</p>
            ) : (
              <ul role="listbox" aria-label={c.open} className="py-1">
                {list.map((r, i) => (
                  <li key={r.id} role="option" aria-selected={i === active}>
                    <button type="button" onClick={() => setPicked(r)} onMouseEnter={() => setActive(i)} data-active={i === active ? '1' : undefined}
                      className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 min-h-14 ${i === active ? 'bg-gold-soft/70' : ''}`}>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-ink truncate">{r.title}</span>
                        {r.text && <span className="block text-sm text-slate-500 truncate">{r.text}</span>}
                      </span>
                      {r.media.length > 0 && (
                        <span className="flex items-center -space-x-2 shrink-0">
                          {r.media.slice(0, 3).map(m => <span key={m.id} className="ring-2 ring-white rounded-md bg-white"><Thumb src={mediaUrl(m.id)} sticker={m.kind === 'sticker'} className="w-8 h-8" /></span>)}
                          {r.media.length > 3 && <span className="w-8 h-8 rounded-md bg-canvas ring-2 ring-white text-[0.7rem] font-bold text-slate-500 flex items-center justify-center num">+{r.media.length - 3}</span>}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {replies?.length > 0 && !typedFilter && <p className="hidden md:block px-3.5 py-2 border-t border-line text-[0.72rem] text-slate-400">{c.hint}</p>}
        </>
      )}
    </div>
  );
}

// Create, edit, order and delete quick replies.
export function QuickReplyManager({ c, replies, onClose, onChanged, limits = { media: 5 } }) {
  const [editing, setEditing] = useState(null); // null | 'new' | reply
  const [order, setOrder] = useState(replies || []);
  useEffect(() => { setOrder(replies || []); }, [replies]);

  async function move(i, d) {
    const next = [...order];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    await fetch('/api/chat/quick-replies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: next.map(r => r.id) }) });
    onChanged();
  }

  async function remove(r) {
    if (!confirm(c.delAsk(r.title))) return;
    await fetch(`/api/chat/quick-replies/${r.id}`, { method: 'DELETE' });
    onChanged();
  }

  if (editing) {
    return <Editor c={c} reply={editing === 'new' ? null : editing} limits={limits} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />;
  }

  return (
    <Modal open onClose={onClose} title={c.title} size="lg"
      footer={<Button icon="plus" onClick={() => setEditing('new')}>{c.add}</Button>}>
      {order.length === 0 ? (
        <div className="py-8 text-center">
          <span className="mx-auto w-12 h-12 rounded-full bg-gold-soft text-primary flex items-center justify-center"><Icon name="bolt" className="w-6 h-6" /></span>
          <p className="mt-4 font-semibold text-ink">{c.none}</p>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{c.noneText}</p>
        </div>
      ) : (
        <ul className="-mx-5 sm:-mx-6 divide-y divide-line border-y border-line">
          {order.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2 pl-5 sm:pl-6 pr-2 sm:pr-3 py-2.5">
              <button type="button" onClick={() => setEditing(r)} className="flex-1 min-w-0 text-left py-1">
                <span className="block font-semibold text-ink truncate">{r.title}</span>
                <span className="block text-sm text-slate-500 truncate">{r.text || c.willSend(false, r.media.length)}</span>
              </button>
              {r.media.length > 0 && (
                <span className="hidden sm:flex items-center -space-x-2 shrink-0">
                  {r.media.slice(0, 3).map(m => <span key={m.id} className="ring-2 ring-white rounded-md bg-white"><Thumb src={mediaUrl(m.id)} sticker={m.kind === 'sticker'} className="w-8 h-8" /></span>)}
                </span>
              )}
              <span className="flex shrink-0">
                <IconButton icon="up" label={c.moveUp} onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-25" />
                <IconButton icon="down" label={c.moveDown} onClick={() => move(i, 1)} disabled={i === order.length - 1} className="disabled:opacity-25" />
                <IconButton icon="edit" label={c.edit} onClick={() => setEditing(r)} />
                <IconButton icon="trash" tone="danger" label={c.del} onClick={() => remove(r)} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Editor({ c, reply, limits, onClose, onSaved }) {
  const [title, setTitle] = useState(reply?.title || '');
  const [text, setText] = useState(reply?.text || '');
  // Items: existing { id, kind } or new { file, kind, url }
  const [items, setItems] = useState(() => (reply?.media || []).map(m => ({ id: m.id, kind: m.kind, url: mediaUrl(m.id) })));
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const photoRef = useRef(null);
  const stickerRef = useRef(null);
  const max = limits.media || 5;
  const room = max - items.length;

  useEffect(() => () => items.forEach(it => it.file && URL.revokeObjectURL(it.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addFiles(list, kind) {
    const files = [...(list || [])].filter(f => f.type.startsWith('image/')).slice(0, room);
    if (!files.length) return;
    setPreparing(true);
    try {
      const ready = [];
      for (const f of files) {
        const file = kind === 'sticker' ? await prepareSticker(f) : await compressImage(f);
        ready.push({ file, kind, url: URL.createObjectURL(file) });
      }
      setItems(prev => [...prev, ...ready].slice(0, max));
    } finally {
      setPreparing(false);
    }
  }

  function move(i, d) {
    setItems(prev => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  // Order on the server: kept photos first, then new ones. Save in that order so what the
  // shop sees here is what the customer gets.
  async function save() {
    setError('');
    if (!title.trim()) { setError(c.errors.title_required); return; }
    if (!text.trim() && !items.length) { setError(c.errors.empty); return; }
    setBusy(true);
    try {
      const firstNew = items.findIndex(it => it.file);
      const mixed = firstNew !== -1 && items.slice(firstNew).some(it => !it.file);
      let res;
      if (reply && !mixed) {
        const form = new FormData();
        form.append('title', title);
        form.append('text', text);
        form.append('keep', JSON.stringify(items.filter(it => !it.file).map(it => it.id)));
        items.filter(it => it.file).forEach(it => { form.append('file', it.file); form.append('kind', it.kind); });
        res = await fetch(`/api/chat/quick-replies/${reply.id}`, { method: 'PUT', body: form });
      } else {
        // New reply, or the shop moved a new photo in front of an old one:
        // re-upload everything in the chosen order.
        const form = new FormData();
        form.append('title', title);
        form.append('text', text);
        for (const it of items) {
          let file = it.file;
          if (!file) {
            const blob = await (await fetch(it.url)).blob();
            file = new File([blob], `p${it.id}`, { type: blob.type || 'image/jpeg' });
          }
          form.append('file', file);
          form.append('kind', it.kind);
        }
        if (reply) {
          form.append('keep', '[]');
          res = await fetch(`/api/chat/quick-replies/${reply.id}`, { method: 'PUT', body: form });
        } else {
          res = await fetch('/api/chat/quick-replies', { method: 'POST', body: form });
        }
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(c.errors[d.error] || c.errors.save_failed); return; }
      onSaved();
    } catch {
      setError(c.errors.save_failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={reply ? c.edit : c.create} size="lg"
      footer={<>
        <Button tone="ghost" onClick={onClose}>{c.cancel}</Button>
        <Button onClick={save} disabled={busy || preparing}>{c.save}</Button>
      </>}>
      <div className="space-y-5">
        <Field label={c.name} hint={c.nameHint}>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={60} className={`${inputCls} border-line`} autoFocus={!reply} />
        </Field>
        <Field label={c.text}>
          <textarea value={text} onChange={e => setText(e.target.value)} maxLength={2000} rows={5} placeholder={c.textPh}
            className={`${inputCls} border-line resize-y min-h-32`} />
          <span className="block mt-1 text-right text-xs text-slate-400 num">{text.length}/2000</span>
        </Field>

        <div>
          <p className="text-sm font-semibold text-ink">{c.media} <span className="font-normal text-slate-400 num">{items.length}/{max}</span></p>
          <p className="text-xs text-slate-500 mt-0.5">{c.mediaHint(max)}</p>
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {items.map((it, i) => (
              <div key={it.id || it.url} className={`relative aspect-square rounded-lg overflow-hidden ${it.kind === 'sticker' ? 'bg-[repeating-conic-gradient(#F3F5F8_0_25%,#fff_0_50%)] bg-[length:16px_16px] border border-line' : 'bg-canvas'}`}>
                <img src={it.url} alt="" className={`w-full h-full ${it.kind === 'sticker' ? 'object-contain p-1.5' : 'object-cover'}`} />
                {it.kind === 'sticker' && <span className="absolute left-1 top-1 rounded bg-ink/75 text-white text-[0.62rem] font-semibold px-1.5 py-0.5">{c.stickerTag}</span>}
                <button type="button" onClick={() => setItems(prev => prev.filter((_, k) => k !== i))} aria-label={c.remove}
                  className="absolute right-1 top-1 w-7 h-7 rounded-full bg-ink/70 text-white flex items-center justify-center hover:bg-danger">
                  <Icon name="close" className="w-3.5 h-3.5" strokeWidth={2.4} />
                </button>
                {items.length > 1 && (
                  <span className="absolute inset-x-1 bottom-1 flex justify-between">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={c.moveLeft}
                      className="w-7 h-7 rounded-full bg-white/90 text-ink shadow-sm flex items-center justify-center disabled:invisible"><Icon name="back" className="w-3.5 h-3.5" strokeWidth={2.4} /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={c.moveRight}
                      className="w-7 h-7 rounded-full bg-white/90 text-ink shadow-sm flex items-center justify-center disabled:invisible"><Icon name="chevron" className="w-3.5 h-3.5" strokeWidth={2.4} /></button>
                  </span>
                )}
              </div>
            ))}
            {room > 0 && (
              <>
                <button type="button" onClick={() => photoRef.current?.click()} disabled={preparing}
                  className="aspect-square rounded-lg border-2 border-dashed border-line text-slate-500 hover:border-primary/50 hover:text-primary flex flex-col items-center justify-center gap-1 text-xs font-semibold">
                  <Icon name="image" className="w-6 h-6" />{c.addPhoto}
                </button>
                <button type="button" onClick={() => stickerRef.current?.click()} disabled={preparing}
                  className="aspect-square rounded-lg border-2 border-dashed border-line text-slate-500 hover:border-primary/50 hover:text-primary flex flex-col items-center justify-center gap-1 text-xs font-semibold">
                  <Icon name="sticker" className="w-6 h-6" />{c.addSticker}
                </button>
              </>
            )}
          </div>
          {preparing && <p className="mt-2 text-xs text-slate-500">{c.preparing}</p>}
          <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden"
            onChange={e => { addFiles(e.target.files, 'image'); e.target.value = ''; }} />
          <input ref={stickerRef} type="file" accept="image/png,image/webp,image/gif,image/jpeg" multiple className="hidden"
            onChange={e => { addFiles(e.target.files, 'sticker'); e.target.value = ''; }} />
        </div>
        {error && <p role="alert" className="text-sm text-danger font-semibold">{error}</p>}
      </div>
    </Modal>
  );
}
