'use client';
import { useState } from 'react';
import { Button, Field, inputCls } from './ui';

export const CUSTOMER_COPY = {
  lo: {
    name: 'ຊື່', phone: 'ເບີໂທ', email: 'ອີເມວ', address: 'ທີ່ຢູ່', note: 'ໝາຍເຫດ', save: 'ບັນທຶກ', cancel: 'ຍົກເລີກ',
    blacklist: 'ບັນຊີດຳ (ບໍ່ຮັບອໍເດີຈາກລູກຄ້ານີ້)', needName: 'ໃສ່ຊື່ ຫຼື ເບີໂທຢ່າງໜ້ອຍໜຶ່ງຢ່າງ',
    dupPhone: 'ເບີໂທນີ້ມີລູກຄ້າຢູ່ແລ້ວ', openDup: 'ເປີດລູກຄ້າທີ່ມີຢູ່', failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ',
  },
  th: {
    name: 'ชื่อ', phone: 'เบอร์โทร', email: 'อีเมล', address: 'ที่อยู่', note: 'หมายเหตุ', save: 'บันทึก', cancel: 'ยกเลิก',
    blacklist: 'บัญชีดำ (ไม่รับออเดอร์จากลูกค้านี้)', needName: 'ใส่ชื่อหรือเบอร์โทรอย่างน้อยหนึ่งอย่าง',
    dupPhone: 'เบอร์นี้มีลูกค้าอยู่แล้ว', openDup: 'เปิดลูกค้าที่มีอยู่', failed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',
  },
  en: {
    name: 'Name', phone: 'Phone', email: 'Email', address: 'Address', note: 'Note', save: 'Save', cancel: 'Cancel',
    blacklist: 'Blacklist (do not accept orders from this customer)', needName: 'Enter a name or a phone number',
    dupPhone: 'A customer with this phone already exists', openDup: 'Open existing customer', failed: "Couldn't save. Try again.",
  },
};

const EMPTY = { name: '', phone: '', email: '', facebook_id: '', line_id: '', address: '', note: '', is_blacklisted: false };

// Shared add/edit form. Calls onSaved(id) after a successful save.
export default function CustomerForm({ lang, initial, onSaved, onCancel }) {
  const c = CUSTOMER_COPY[lang] || CUSTOMER_COPY.en;
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = k => e => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() && !form.phone.trim()) { setError({ text: c.needName }); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/customers', {
        method: initial?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone: form.phone.trim(), name: form.name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) { setError({ text: c.dupPhone, id: data.id }); return; }
      if (!res.ok) throw new Error();
      onSaved(initial?.id || data.id);
    } catch {
      setError({ text: c.failed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={c.name}><input autoFocus value={form.name} onChange={set('name')} className={inputCls} /></Field>
        <Field label={c.phone}><input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} className={`${inputCls} num`} /></Field>
        <Field label="Facebook"><input value={form.facebook_id} onChange={set('facebook_id')} className={inputCls} /></Field>
        <Field label="WhatsApp / Line"><input value={form.line_id} onChange={set('line_id')} className={inputCls} /></Field>
        <Field label={c.email} className="sm:col-span-2"><input type="email" value={form.email} onChange={set('email')} className={inputCls} /></Field>
        <Field label={c.address} className="sm:col-span-2"><textarea rows={2} value={form.address} onChange={set('address')} className={inputCls} /></Field>
        <Field label={c.note} className="sm:col-span-2"><textarea rows={2} value={form.note} onChange={set('note')} className={inputCls} /></Field>
      </div>
      {initial?.id && (
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" checked={!!form.is_blacklisted} onChange={set('is_blacklisted')} className="w-4 h-4 accent-[#C2413A]" />
          {c.blacklist}
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error.text}
          {error.id && <a href={`/customers/${error.id}`} className="ml-2 font-semibold underline">{c.openDup}</a>}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button tone="subtle" onClick={onCancel}>{c.cancel}</Button>
        <button type="submit" disabled={busy} className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-40">{c.save}</button>
      </div>
    </form>
  );
}
