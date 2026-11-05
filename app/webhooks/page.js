'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { Button, IconButton, Modal, Field, Pill, EmptyState, Toolbar, Icon, inputCls, card } from '../../components/ui';

const EVENTS = ['order.created', 'order.status_changed', 'product.low_stock'];

const COPY = {
  lo: {
    intro: 'ສົ່ງຂໍ້ມູນໄປລະບົບອື່ນອັດຕະໂນມັດ ເຊັ່ນ ບອດ, Google Sheet ຫຼື ລະບົບບັນຊີ ເມື່ອມີເຫດການເກີດຂຶ້ນໃນຮ້ານ',
    add: 'ເພີ່ມການເຊື່ອມຕໍ່', edit: 'ແກ້ໄຂການເຊື່ອມຕໍ່', name: 'ຊື່', namePh: 'ເຊັ່ນ ບອດ Facebook', url: 'URL ປາຍທາງ', events: 'ສົ່ງເມື່ອ',
    ev: { 'order.created': 'ມີອໍເດີ້ໃໝ່', 'order.status_changed': 'ສະຖານະອໍເດີ້ປ່ຽນ', 'product.low_stock': 'ສິນຄ້າໃກ້ໝົດ' },
    active: 'ເປີດໃຊ້ງານ', save: 'ບັນທຶກ', cancel: 'ຍົກເລີກ', remove: 'ລຶບ', removeAsk: n => `ລຶບການເຊື່ອມຕໍ່ ${n}?`,
    on: 'ເປີດ', off: 'ປິດ', failing: n => `ສົ່ງບໍ່ສຳເລັດ ${n} ຄັ້ງຕິດກັນ`, lastOk: d => `ສົ່ງສຳເລັດຫຼ້າສຸດ ${d}`, never: 'ຍັງບໍ່ເຄີຍສົ່ງ',
    empty: 'ຍັງບໍ່ມີການເຊື່ອມຕໍ່', emptyText: 'ເພີ່ມ URL ເພື່ອໃຫ້ລະບົບອື່ນຮູ້ທັນທີເມື່ອມີອໍເດີ້ໃໝ່',
    secretTitle: 'ເກັບລະຫັດລັບນີ້ໄວ້', secretText: 'ໃຊ້ກວດລາຍເຊັນ x-webhook-signature (HMAC-SHA256) ຈະສະແດງຄັ້ງດຽວເທົ່ານັ້ນ', copy: 'ສຳເນົາ', copied: 'ສຳເນົາແລ້ວ', done: 'ເກັບແລ້ວ',
    errors: { invalid_url: 'URL ຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ http:// ຫຼື https://', no_events: 'ເລືອກຢ່າງໜ້ອຍໜຶ່ງເຫດການ', failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ' },
  },
  th: {
    intro: 'ส่งข้อมูลไปยังระบบอื่นอัตโนมัติ เช่น บอท, Google Sheet หรือระบบบัญชี เมื่อมีเหตุการณ์เกิดขึ้นในร้าน',
    add: 'เพิ่มการเชื่อมต่อ', edit: 'แก้ไขการเชื่อมต่อ', name: 'ชื่อ', namePh: 'เช่น บอท Facebook', url: 'URL ปลายทาง', events: 'ส่งเมื่อ',
    ev: { 'order.created': 'มีออเดอร์ใหม่', 'order.status_changed': 'สถานะออเดอร์เปลี่ยน', 'product.low_stock': 'สินค้าใกล้หมด' },
    active: 'เปิดใช้งาน', save: 'บันทึก', cancel: 'ยกเลิก', remove: 'ลบ', removeAsk: n => `ลบการเชื่อมต่อ ${n}?`,
    on: 'เปิด', off: 'ปิด', failing: n => `ส่งไม่สำเร็จ ${n} ครั้งติดกัน`, lastOk: d => `ส่งสำเร็จล่าสุด ${d}`, never: 'ยังไม่เคยส่ง',
    empty: 'ยังไม่มีการเชื่อมต่อ', emptyText: 'เพิ่ม URL เพื่อให้ระบบอื่นรู้ทันทีเมื่อมีออเดอร์ใหม่',
    secretTitle: 'เก็บรหัสลับนี้ไว้', secretText: 'ใช้ตรวจลายเซ็น x-webhook-signature (HMAC-SHA256) จะแสดงครั้งเดียวเท่านั้น', copy: 'คัดลอก', copied: 'คัดลอกแล้ว', done: 'เก็บแล้ว',
    errors: { invalid_url: 'URL ต้องขึ้นต้นด้วย http:// หรือ https://', no_events: 'เลือกอย่างน้อยหนึ่งเหตุการณ์', failed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' },
  },
  en: {
    intro: 'Send shop events to other tools automatically, such as a bot, Google Sheets or accounting software.',
    add: 'Add connection', edit: 'Edit connection', name: 'Name', namePh: 'e.g. Facebook bot', url: 'Destination URL', events: 'Send when',
    ev: { 'order.created': 'A new order comes in', 'order.status_changed': 'An order changes status', 'product.low_stock': 'A product runs low' },
    active: 'Active', save: 'Save', cancel: 'Cancel', remove: 'Delete', removeAsk: n => `Delete connection ${n}?`,
    on: 'On', off: 'Off', failing: n => `Failed ${n} times in a row`, lastOk: d => `Last delivered ${d}`, never: 'Not sent yet',
    empty: 'No connections yet', emptyText: 'Add a URL so other tools hear about new orders straight away.',
    secretTitle: 'Save this secret', secretText: 'Use it to verify the x-webhook-signature header (HMAC-SHA256). It is shown only once.', copy: 'Copy', copied: 'Copied', done: "I've saved it",
    errors: { invalid_url: 'The URL must start with http:// or https://', no_events: 'Choose at least one event', failed: "Couldn't save. Try again." },
  },
};

const EMPTY = { name: '', url: '', events: ['order.created'], is_active: true };

export default function WebhooksPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState(null);
  const [copied, setCopied] = useState(false);
  const [delTarget, setDelTarget] = useState(null);

  async function load() {
    try {
      const data = await fetch('/api/webhooks').then(r => r.json());
      setHooks(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function open(h) {
    setError('');
    setForm(h ? { id: h.id, name: h.name || '', url: h.url, events: (h.events || '').split(',').filter(Boolean), is_active: !!h.is_active } : { ...EMPTY });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/webhooks', { method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(c.errors[data.error] || c.errors.failed); return; }
      if (!form.id && data.secret) setSecret(data.secret);
      setForm(null);
      load();
    } catch {
      setError(c.errors.failed);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(h) {
    setHooks(prev => prev.map(x => (x.id === h.id ? { ...x, is_active: h.is_active ? 0 : 1 } : x)));
    await fetch('/api/webhooks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: h.id, is_active: !h.is_active }) });
  }

  async function del() {
    await fetch(`/api/webhooks?id=${delTarget.id}`, { method: 'DELETE' });
    setDelTarget(null);
    load();
  }

  function toggleEvent(ev) {
    setForm(f => ({ ...f, events: f.events.includes(ev) ? f.events.filter(x => x !== ev) : [...f.events, ev] }));
  }

  function host(u) {
    try { return new URL(u).host; } catch { return u; }
  }

  return (
    <div className="max-w-5xl">
      <p className="text-sm text-slate-600 max-w-2xl mb-4">{c.intro}</p>
      <Toolbar actions={<Button icon="plus" onClick={() => open(null)}>{c.add}</Button>} />

      {secret && (
        <section role="alert" className="mb-5 rounded-xl bg-[#FFF8EB] border border-[#F2CC8F] p-5">
          <h2 className="font-bold text-[#8A4B00]">{c.secretTitle}</h2>
          <p className="mt-1 text-sm text-slate-700">{c.secretText}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 break-all rounded-lg bg-white border border-line px-3 py-2 text-sm text-ink">{secret}</code>
            <Button size="sm" tone="ghost" icon="copy" onClick={() => navigator.clipboard?.writeText(secret).then(() => setCopied(true))}>{copied ? c.copied : c.copy}</Button>
            <Button size="sm" tone="gold" onClick={() => { setSecret(null); setCopied(false); }}>{c.done}</Button>
          </div>
        </section>
      )}

      <section className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="p-5 space-y-3" aria-busy="true">{[0, 1].map(i => <div key={i} className="h-16 rounded-xl bg-canvas animate-pulse" />)}</div>
        ) : hooks.length === 0 ? (
          <EmptyState icon="link" title={c.empty} text={c.emptyText} action={<Button icon="plus" onClick={() => open(null)}>{c.add}</Button>} />
        ) : (
          <ul className="divide-y divide-line">
            {hooks.map(h => {
              const fails = Number(h.fail_count) || 0;
              return (
                <li key={h.id} className="px-5 py-4 flex items-start gap-4">
                  <span className={`mt-1 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${fails > 0 ? 'bg-red-50 text-danger' : h.is_active ? 'bg-gold-soft text-gold-dark' : 'bg-canvas text-slate-400'}`}>
                    <Icon name="link" className="w-[1.1rem] h-[1.1rem]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">{h.name || host(h.url)}</p>
                    <p className="text-xs text-slate-500 truncate" title={h.url}>{h.url}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(h.events || '').split(',').filter(Boolean).map(ev => <Pill key={ev} tone="navy">{c.ev[ev] || ev}</Pill>)}
                    </div>
                    <p className={`mt-2 text-xs ${fails > 0 ? 'text-danger font-semibold' : 'text-slate-400'}`}>
                      {fails > 0 ? c.failing(fails) : h.last_fired_at ? c.lastOk(new Date(h.last_fired_at).toLocaleString()) : c.never}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button role="switch" aria-checked={!!h.is_active} aria-label={h.is_active ? c.off : c.on} onClick={() => toggle(h)}
                      className={`relative w-10 h-6 rounded-full mr-1 transition-colors ${h.is_active ? 'bg-success' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${h.is_active ? 'left-[1.125rem]' : 'left-0.5'}`} />
                    </button>
                    <IconButton icon="edit" label={c.edit} onClick={() => open(h)} />
                    <IconButton icon="trash" tone="danger" label={c.remove} onClick={() => setDelTarget(h)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal open={!!form} onClose={() => !busy && setForm(null)} title={form?.id ? c.edit : c.add} size="md">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Field label={c.name}><input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={c.namePh} className={inputCls} /></Field>
            <Field label={c.url}><input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value.trim() })} placeholder="https://" className={inputCls} /></Field>
            <fieldset>
              <legend className="text-sm font-semibold text-ink mb-1.5">{c.events}</legend>
              <div className="space-y-1">
                {EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 cursor-pointer has-[:checked]:border-gold has-[:checked]:bg-gold-soft/50">
                    <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} className="w-4 h-4 accent-[#0B63E5]" />
                    <span className="flex-1 text-sm text-ink">{c.ev[ev]}</span>
                    <span className="text-xs text-slate-400">{ev}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-[#0E8A5F]" />{c.active}
            </label>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button tone="subtle" onClick={() => setForm(null)}>{c.cancel}</Button>
              <button type="submit" disabled={busy} className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-40">{c.save}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title={delTarget ? c.removeAsk(delTarget.name || host(delTarget.url)) : ''} size="sm"
        footer={<><Button tone="subtle" onClick={() => setDelTarget(null)}>{c.cancel}</Button><Button tone="danger" onClick={del}>{c.remove}</Button></>}>
        <p className="text-sm text-slate-600 break-all">{delTarget?.url}</p>
      </Modal>
    </div>
  );
}
