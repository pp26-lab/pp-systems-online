'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { Button, IconButton, Modal, Chip, Pill, EmptyState, Toolbar, Icon, inputCls, card } from '../../components/ui';

const COPY = {
  lo: {
    pending: 'ຕ້ອງຕອບ', in_progress: 'ກຳລັງຕອບ', resolved: 'ຕອບແລ້ວ', all: 'ທັງໝົດ',
    intro: 'ຂໍ້ຄວາມທີ່ບອດສົ່ງຕໍ່ໃຫ້ຄົນຕອບ ກົດເປີດ Facebook ເພື່ອຕອບລູກຄ້າ ແລ້ວໝາຍວ່າຕອບແລ້ວ',
    empty: { pending: 'ບໍ່ມີຂໍ້ຄວາມທີ່ຕ້ອງຕອບ', in_progress: 'ບໍ່ມີຂໍ້ຄວາມທີ່ກຳລັງຕອບ', resolved: 'ຍັງບໍ່ມີຂໍ້ຄວາມທີ່ຕອບແລ້ວ', '': 'ຍັງບໍ່ມີຂໍ້ຄວາມ' },
    pick: 'ເລືອກຂໍ້ຄວາມເພື່ອເບິ່ງ', message: 'ຂໍ້ຄວາມ', received: 'ໄດ້ຮັບ', notes: 'ໂນດພາຍໃນ', save: 'ບັນທຶກໂນດ', saved: 'ບັນທຶກແລ້ວ',
    reply: 'ຕອບໃນ Facebook', start: 'ເລີ່ມຕອບ', done: 'ໝາຍວ່າຕອບແລ້ວ', reopen: 'ເປີດຄືນ', remove: 'ລຶບ', removeAsk: 'ລຶບຂໍ້ຄວາມນີ້? ກູ້ຄືນບໍ່ໄດ້', cancel: 'ຍົກເລີກ',
    unknown: 'ລູກຄ້າບໍ່ລະບຸຊື່', ago: { m: n => `${n} ນາທີກ່ອນ`, h: n => `${n} ຊົ່ວໂມງກ່ອນ`, d: n => `${n} ມື້ກ່ອນ`, now: 'ຫາກໍ່ນີ້' },
  },
  th: {
    pending: 'ต้องตอบ', in_progress: 'กำลังตอบ', resolved: 'ตอบแล้ว', all: 'ทั้งหมด',
    intro: 'ข้อความที่บอทส่งต่อให้คนตอบ กดเปิด Facebook เพื่อตอบลูกค้า แล้วทำเครื่องหมายว่าตอบแล้ว',
    empty: { pending: 'ไม่มีข้อความที่ต้องตอบ', in_progress: 'ไม่มีข้อความที่กำลังตอบ', resolved: 'ยังไม่มีข้อความที่ตอบแล้ว', '': 'ยังไม่มีข้อความ' },
    pick: 'เลือกข้อความเพื่อดู', message: 'ข้อความ', received: 'ได้รับ', notes: 'โน้ตภายใน', save: 'บันทึกโน้ต', saved: 'บันทึกแล้ว',
    reply: 'ตอบใน Facebook', start: 'เริ่มตอบ', done: 'ทำเครื่องหมายว่าตอบแล้ว', reopen: 'เปิดใหม่', remove: 'ลบ', removeAsk: 'ลบข้อความนี้? กู้คืนไม่ได้', cancel: 'ยกเลิก',
    unknown: 'ลูกค้าไม่ระบุชื่อ', ago: { m: n => `${n} นาทีที่แล้ว`, h: n => `${n} ชั่วโมงที่แล้ว`, d: n => `${n} วันที่แล้ว`, now: 'เมื่อสักครู่' },
  },
  en: {
    pending: 'Needs reply', in_progress: 'Replying', resolved: 'Done', all: 'All',
    intro: 'Messages the bot passed to a person. Open Facebook to reply, then mark them done.',
    empty: { pending: 'Nothing waiting for a reply', in_progress: 'Nothing in progress', resolved: 'Nothing marked done yet', '': 'No messages yet' },
    pick: 'Select a message to read it', message: 'Message', received: 'Received', notes: 'Internal note', save: 'Save note', saved: 'Saved',
    reply: 'Reply on Facebook', start: 'Start replying', done: 'Mark as done', reopen: 'Reopen', remove: 'Delete', removeAsk: 'Delete this message? This cannot be undone.', cancel: 'Cancel',
    unknown: 'Unnamed customer', ago: { m: n => `${n} min ago`, h: n => `${n} h ago`, d: n => `${n} d ago`, now: 'Just now' },
  },
};
const TONE = { pending: 'red', in_progress: 'gold', resolved: 'green' };

export default function HandoffsPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedId, setSelectedId] = useState(null);
  const [mobile, setMobile] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetch('/api/handoffs').then(r => r.json());
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function update(id, body) {
    const res = await fetch('/api/handoffs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) });
    if (!res.ok) throw new Error();
    const row = await res.json();
    setItems(prev => prev.map(h => (h.id === id ? row : h)));
  }

  async function remove(id) {
    await fetch(`/api/handoffs?id=${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(h => h.id !== id));
    setSelectedId(null);
    setMobile(false);
  }

  function ago(v) {
    const mins = Math.floor((Date.now() - new Date(v).getTime()) / 60000);
    if (mins < 1) return c.ago.now;
    if (mins < 60) return c.ago.m(mins);
    if (mins < 1440) return c.ago.h(Math.floor(mins / 60));
    return c.ago.d(Math.floor(mins / 1440));
  }

  const counts = items.reduce((m, h) => { m[h.status] = (m[h.status] || 0) + 1; return m; }, {});
  const visible = filter ? items.filter(h => h.status === filter) : items;
  const selected = items.find(h => h.id === selectedId) || null;

  function select(h) {
    setSelectedId(h.id);
    if (!window.matchMedia('(min-width: 1024px)').matches) setMobile(true);
  }

  const detail = selected && <Detail key={selected.id} h={selected} c={c} ago={ago} onUpdate={update} onRemove={remove} />;

  return (
    <div className="max-w-6xl">
      <p className="text-sm text-slate-600 max-w-2xl mb-4">{c.intro}</p>
      <Toolbar actions={<IconButton icon="refresh" label="Refresh" onClick={load} />}>
        {['pending', 'in_progress', 'resolved'].map(s => <Chip key={s} active={filter === s} onClick={() => setFilter(s)} count={counts[s] || 0}>{c[s]}</Chip>)}
        <Chip active={!filter} onClick={() => setFilter('')} count={items.length}>{c.all}</Chip>
      </Toolbar>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className={`${card} overflow-hidden self-start`}>
          {loading ? (
            <div className="p-5 space-y-3" aria-busy="true">{[0, 1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-canvas animate-pulse" />)}</div>
          ) : visible.length === 0 ? (
            <EmptyState icon="chat" title={c.empty[filter]} />
          ) : (
            <ul className="divide-y divide-line">
              {visible.map(h => (
                <li key={h.id}>
                  <button onClick={() => select(h)} aria-current={selectedId === h.id}
                    className={`w-full text-left px-5 py-3.5 flex gap-3 ${selectedId === h.id ? 'bg-gold-soft/60 shadow-[inset_3px_0_0_#0B63E5]' : 'hover:bg-canvas/60'}`}>
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${h.status === 'pending' ? 'bg-danger' : h.status === 'in_progress' ? 'bg-gold' : 'bg-transparent'}`} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-ink truncate">{h.customer_name || c.unknown}</span>
                        <span className="text-xs text-slate-400 shrink-0">{ago(h.received_at)}</span>
                      </span>
                      <span className="block text-sm text-slate-600 line-clamp-2">{h.message}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="hidden lg:block">
          {detail || <div className={`${card} h-full min-h-[16rem]`}><EmptyState icon="chat" title={c.pick} /></div>}
        </div>
      </div>

      <div className="lg:hidden">
        <Modal open={mobile && !!selected} onClose={() => setMobile(false)} title={selected?.customer_name || c.unknown} size="lg">{detail}</Modal>
      </div>
    </div>
  );
}

function Detail({ h, c, ago, onUpdate, onRemove }) {
  const [notes, setNotes] = useState(h.admin_notes || '');
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function run(body, msg) {
    setBusy(true);
    try {
      await onUpdate(h.id, body);
      if (msg) { setFlash(msg); setTimeout(() => setFlash(''), 2000); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${card} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink truncate">{h.customer_name || c.unknown}</h2>
          <p className="text-xs text-slate-500">{h.source}{h.facebook_user_id && <span className="num ml-2">{h.facebook_user_id}</span>}</p>
        </div>
        <Pill tone={TONE[h.status]}>{c[h.status]}</Pill>
      </div>

      <div className="mt-4 rounded-xl rounded-tl-sm bg-canvas p-4 text-[0.95rem] text-ink whitespace-pre-wrap break-words max-h-72 overflow-auto">{h.message}</div>
      <p className="mt-1.5 text-xs text-slate-400">{c.received} {new Date(h.received_at).toLocaleString()} ({ago(h.received_at)})</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {h.facebook_user_id && (
          <a href={`https://www.facebook.com/messages/t/${encodeURIComponent(h.facebook_user_id)}`} target="_blank" rel="noopener noreferrer"
            onClick={() => h.status === 'pending' && run({ status: 'in_progress' })}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark">
            <Icon name="chat" className="w-4 h-4" />{c.reply}
          </a>
        )}
        {h.status === 'pending' && <Button tone="ghost" onClick={() => run({ status: 'in_progress' })} disabled={busy}>{c.start}</Button>}
        {h.status !== 'resolved'
          ? <Button tone="gold" icon="check" onClick={() => run({ status: 'resolved' })} disabled={busy}>{c.done}</Button>
          : <Button tone="ghost" icon="refresh" onClick={() => run({ status: 'pending' })} disabled={busy}>{c.reopen}</Button>}
      </div>

      <div className="mt-6">
        <label className="block text-sm font-semibold text-ink mb-1.5" htmlFor={`note-${h.id}`}>{c.notes}</label>
        <textarea id={`note-${h.id}`} rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
        <div className="mt-2 flex items-center gap-3">
          <Button size="sm" tone="ghost" onClick={() => run({ admin_notes: notes }, c.saved)} disabled={busy || notes === (h.admin_notes || '')}>{c.save}</Button>
          {flash && <span role="status" className="text-sm text-success">{flash}</span>}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-line">
        {confirm ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-danger mr-auto">{c.removeAsk}</span>
            <Button size="sm" tone="danger" onClick={() => onRemove(h.id)}>{c.remove}</Button>
            <Button size="sm" tone="subtle" onClick={() => setConfirm(false)}>{c.cancel}</Button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className="text-sm font-semibold text-slate-400 hover:text-danger">{c.remove}</button>
        )}
      </div>
    </section>
  );
}
