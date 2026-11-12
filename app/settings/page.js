'use client';
import { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../layout';
import { Button, Field, Segmented, Icon, inputCls, card } from '../../components/ui';
import { fillTemplate, TEMPLATE_KEYS } from '../../lib/whatsapp';

const COPY = {
  lo: {
    shop: 'ຂໍ້ມູນຮ້ານ', shopNote: 'ສະແດງຢູ່ຫົວໃບບິນ ແລະ ໃບປະໜ້າພັດສະດຸ', name: 'ຊື່ຮ້ານ', phone: 'ເບີໂທຮ້ານ', address: 'ທີ່ຢູ່ຮ້ານ',
    logo: 'ໂລໂກ້', upload: 'ອັບໂຫຼດໂລໂກ້', replace: 'ປ່ຽນໂລໂກ້', removeLogo: 'ເອົາອອກ', footer: 'ຂໍ້ຄວາມທ້າຍໃບບິນ', footerPh: 'ຂໍຂອບໃຈທີ່ໃຊ້ບໍລິການ',
    sell: 'ການຂາຍ', orderType: 'ປະເພດການຂາຍເລີ່ມຕົ້ນ', walkin: 'ໜ້າຮ້ານ', online: 'ອອນລາຍ', low: 'ແຈ້ງເຕືອນສະຕ໋ອກໃກ້ໝົດເມື່ອເຫຼືອ', units: 'ຊິ້ນ ຫຼື ໜ້ອຍກວ່າ',
    options: 'ຊື່ຕົວເລືອກສິນຄ້າເລີ່ມຕົ້ນ', optionsNote: 'ໃຊ້ກັບສິນຄ້າໃໝ່ ເຊັ່ນ ສີ ແລະ ຂະໜາດ', opt1: 'ຕົວເລືອກທີ 1', opt2: 'ຕົວເລືອກທີ 2',
    carriers: 'ຂົນສົ່ງທີ່ຮ້ານໃຊ້', carriersNote: 'ພິມໜຶ່ງຊື່ຕໍ່ໜຶ່ງແຖວ ຈະຂຶ້ນໃຫ້ເລືອກຕອນອອກອໍເດີ້ອອນລາຍ', carriersPh: 'Anousith\nHAL\nMixay Express',
    wa: 'ຂໍ້ຄວາມ WhatsApp', waNote: 'ໃຊ້ເມື່ອກົດ "ສົ່ງ WhatsApp" ໃນໜ້າອໍເດີ້ ປ່ອຍວ່າງເພື່ອໃຊ້ຂໍ້ຄວາມມາດຕະຖານ', cc: 'ລະຫັດປະເທດ', template: 'ແມ່ແບບຂໍ້ຄວາມ',
    chat: 'ຂໍ້ຄວາມສົ່ງຮູບບິນທາງແຊັດ', chatNote: 'ຂໍ້ຄວາມເລີ່ມຕົ້ນຕອນສົ່ງຮູບບິນ/ພັດສະດຸໃຫ້ລູກຄ້າໃນໜ້າອໍເດີ້ ແກ້ເທື່ອດຽວ ຄັ້ງຕໍ່ໄປບໍ່ຕ້ອງພິມໃໝ່ (ຍັງແກ້ຕອນສົ່ງໄດ້)', chatPh: 'ອໍເດີ້ {order_number} · ເລກພັດສະດຸ {tracking} ({carrier})',
    insert: 'ກົດເພື່ອແຊກຂໍ້ມູນ', keys: { name: 'ຊື່ລູກຄ້າ', order_number: 'ເລກອໍເດີ້', total: 'ຍອດລວມ', status: 'ສະຖານະ', tracking: 'ເລກພັດສະດຸ', carrier: 'ຂົນສົ່ງ', shop: 'ຊື່ຮ້ານ' },
    previewMsg: 'ຕົວຢ່າງຂໍ້ຄວາມ', receipt: 'ຕົວຢ່າງໃບບິນ', item: 'ສິນຄ້າຕົວຢ່າງ', total: 'ລວມ',
    save: 'ບັນທຶກການຕັ້ງຄ່າ', saving: 'ກຳລັງບັນທຶກ', saved: 'ບັນທຶກແລ້ວ', failed: 'ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ', needName: 'ໃສ່ຊື່ຮ້ານ', unsaved: 'ມີການປ່ຽນແປງທີ່ຍັງບໍ່ໄດ້ບັນທຶກ',
    uploadFail: 'ອັບໂຫຼດບໍ່ສຳເລັດ',
  },
  th: {
    shop: 'ข้อมูลร้าน', shopNote: 'แสดงที่หัวใบเสร็จและใบปะหน้าพัสดุ', name: 'ชื่อร้าน', phone: 'เบอร์โทรร้าน', address: 'ที่อยู่ร้าน',
    logo: 'โลโก้', upload: 'อัปโหลดโลโก้', replace: 'เปลี่ยนโลโก้', removeLogo: 'เอาออก', footer: 'ข้อความท้ายใบเสร็จ', footerPh: 'ขอบคุณที่ใช้บริการ',
    sell: 'การขาย', orderType: 'ประเภทการขายเริ่มต้น', walkin: 'หน้าร้าน', online: 'ออนไลน์', low: 'แจ้งเตือนสต็อกใกล้หมดเมื่อเหลือ', units: 'ชิ้นหรือน้อยกว่า',
    options: 'ชื่อตัวเลือกสินค้าเริ่มต้น', optionsNote: 'ใช้กับสินค้าใหม่ เช่น สี และ ขนาด', opt1: 'ตัวเลือกที่ 1', opt2: 'ตัวเลือกที่ 2',
    carriers: 'ขนส่งที่ร้านใช้', carriersNote: 'พิมพ์หนึ่งชื่อต่อหนึ่งบรรทัด จะขึ้นให้เลือกตอนออกออเดอร์ออนไลน์', carriersPh: 'Anousith\nHAL\nMixay Express',
    wa: 'ข้อความ WhatsApp', waNote: 'ใช้เมื่อกด "ส่ง WhatsApp" ในหน้าออเดอร์ เว้นว่างเพื่อใช้ข้อความมาตรฐาน', cc: 'รหัสประเทศ', template: 'แม่แบบข้อความ',
    chat: 'ข้อความส่งรูปบิลทางแชท', chatNote: 'ข้อความเริ่มต้นตอนส่งรูปบิล/พัสดุให้ลูกค้าในหน้าออเดอร์ แก้ครั้งเดียว ครั้งต่อไปไม่ต้องพิมพ์ใหม่ (ยังแก้ตอนส่งได้)', chatPh: 'ออเดอร์ {order_number} · เลขพัสดุ {tracking} ({carrier})',
    insert: 'กดเพื่อแทรกข้อมูล', keys: { name: 'ชื่อลูกค้า', order_number: 'เลขออเดอร์', total: 'ยอดรวม', status: 'สถานะ', tracking: 'เลขพัสดุ', carrier: 'ขนส่ง', shop: 'ชื่อร้าน' },
    previewMsg: 'ตัวอย่างข้อความ', receipt: 'ตัวอย่างใบเสร็จ', item: 'สินค้าตัวอย่าง', total: 'รวม',
    save: 'บันทึกการตั้งค่า', saving: 'กำลังบันทึก', saved: 'บันทึกแล้ว', failed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง', needName: 'ใส่ชื่อร้าน', unsaved: 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
    uploadFail: 'อัปโหลดไม่สำเร็จ',
  },
  en: {
    shop: 'Shop details', shopNote: 'Printed at the top of receipts and shipping labels', name: 'Shop name', phone: 'Shop phone', address: 'Shop address',
    logo: 'Logo', upload: 'Upload logo', replace: 'Replace logo', removeLogo: 'Remove', footer: 'Receipt footer', footerPh: 'Thank you for shopping with us',
    sell: 'Selling', orderType: 'Default sale type', walkin: 'In store', online: 'Online', low: 'Warn me when stock is at', units: 'units or fewer',
    options: 'Default option names', optionsNote: 'Used for new products, for example colour and size', opt1: 'First option', opt2: 'Second option',
    carriers: 'Your carriers', carriersNote: 'One name per line. These appear as choices on online orders.', carriersPh: 'Anousith\nHAL\nMixay Express',
    wa: 'WhatsApp message', waNote: 'Used by "Send on WhatsApp" on the orders page. Leave empty to use the standard message.', cc: 'Country code', template: 'Message template',
    chat: 'Chat message for bill photos', chatNote: 'The standard message when you send a bill or parcel photo to a customer from the orders page. Set it once; you can still edit it per send.', chatPh: 'Order {order_number} · Tracking {tracking} ({carrier})',
    insert: 'Tap to insert', keys: { name: 'Customer name', order_number: 'Order number', total: 'Total', status: 'Status', tracking: 'Tracking no.', carrier: 'Carrier', shop: 'Shop name' },
    previewMsg: 'Message preview', receipt: 'Receipt preview', item: 'Sample item', total: 'Total',
    save: 'Save settings', saving: 'Saving', saved: 'Saved', failed: "Couldn't save. Try again.", needName: 'Enter a shop name', unsaved: 'You have unsaved changes',
    uploadFail: 'Upload failed',
  },
};

const SAMPLE = { name: 'Noy', order_number: 'ON-260101-0001', total: '₭350,000', status: 'Shipped', tracking: 'HAL123456', carrier: 'Anousith', shop: '' };

export default function SettingsPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const [form, setForm] = useState(null);
  const [initial, setInitial] = useState('');
  const [state, setState] = useState(''); // '', 'saving', 'saved', or an error message
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const tplRef = useRef(null);
  const chatTplRef = useRef(null);

  useEffect(() => {
    fetch('/api/shop-settings').then(r => r.json()).then(data => {
      // Keep every stored field (staff_pin etc.) so saving never resets settings not shown here.
      const f = {
        ...data,
        shop_name: data.shop_name || '', shop_phone: data.shop_phone || '', shop_address: data.shop_address || '',
        shop_logo: data.shop_logo || '', receipt_footer: data.receipt_footer || '',
        default_order_type: data.default_order_type || 'walk_in',
        variant_label_1: data.variant_label_1 || 'color', variant_label_2: data.variant_label_2 || 'size',
        low_stock_threshold: data.low_stock_threshold ?? 5,
        whatsapp_country_code: data.whatsapp_country_code || '856', whatsapp_template: data.whatsapp_template || '',
        order_chat_template: data.order_chat_template || '',
        shipping_carriers: data.shipping_carriers || '',
      };
      setForm(f);
      setInitial(JSON.stringify(f));
    }).catch(() => setForm({}));
  }, []);

  const dirty = form && JSON.stringify(form) !== initial;

  useEffect(() => {
    if (!dirty) return;
    const warn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = k => e => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e?.preventDefault();
    if (!form.shop_name.trim()) { setState(c.needName); return; }
    setState('saving');
    try {
      const res = await fetch('/api/shop-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      setInitial(JSON.stringify(form));
      setState('saved');
      setTimeout(() => setState(s => (s === 'saved' ? '' : s)), 2500);
    } catch {
      setState(c.failed);
    }
  }

  async function uploadLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json());
      if (!data.url) throw new Error();
      setForm(f => ({ ...f, shop_logo: data.url }));
    } catch {
      setState(c.uploadFail);
    } finally {
      setUploading(false);
    }
  }

  function insertKey(key, field = 'whatsapp_template', ref = tplRef) {
    const el = ref.current;
    const token = `{${key}}`;
    const v = form[field] || '';
    const start = el ? el.selectionStart : v.length;
    const end = el ? el.selectionEnd : v.length;
    setForm({ ...form, [field]: v.slice(0, start) + token + v.slice(end) });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); });
  }

  if (!form) {
    return <div className="max-w-6xl grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-busy="true"><div className="h-96 rounded-xl bg-white animate-pulse" /><div className="h-96 rounded-xl bg-white animate-pulse" /></div>;
  }

  const error = state && state !== 'saving' && state !== 'saved' ? state : '';

  return (
    <form onSubmit={save} className="max-w-6xl pb-24 lg:pb-24">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
        <div className="space-y-5">
          <Section title={c.shop} note={c.shopNote}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={c.name} className="sm:col-span-2"><input value={form.shop_name} onChange={set('shop_name')} className={`${inputCls} text-lg font-bold`} /></Field>
              <Field label={c.phone}><input type="tel" value={form.shop_phone} onChange={set('shop_phone')} placeholder="020 XXXX XXXX" className={`${inputCls} num`} /></Field>
              <div>
                <span className="block text-sm font-semibold text-ink mb-1.5">{c.logo}</span>
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl border border-line bg-canvas flex items-center justify-center overflow-hidden shrink-0">
                    {form.shop_logo ? <img src={form.shop_logo} alt="" className="w-full h-full object-contain" /> : <Icon name="image" className="w-5 h-5 text-slate-300" />}
                  </span>
                  <input ref={fileRef} type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
                  <Button size="sm" tone="ghost" icon="upload" onClick={() => fileRef.current?.click()} disabled={uploading}>{form.shop_logo ? c.replace : c.upload}</Button>
                  {form.shop_logo && <button type="button" onClick={() => setForm({ ...form, shop_logo: '' })} className="text-sm font-semibold text-slate-400 hover:text-danger">{c.removeLogo}</button>}
                </div>
              </div>
              <Field label={c.address} className="sm:col-span-2"><textarea rows={2} value={form.shop_address} onChange={set('shop_address')} className={inputCls} /></Field>
              <Field label={c.footer} className="sm:col-span-2"><textarea rows={2} value={form.receipt_footer} onChange={set('receipt_footer')} placeholder={c.footerPh} className={inputCls} /></Field>
            </div>
          </Section>

          <Section title={c.sell}>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <span className="block text-sm font-semibold text-ink mb-1.5">{c.orderType}</span>
                <Segmented value={form.default_order_type} onChange={v => setForm({ ...form, default_order_type: v })}
                  options={[{ value: 'walk_in', label: c.walkin }, { value: 'online', label: c.online }]} />
              </div>
              <div>
                <span className="block text-sm font-semibold text-ink mb-1.5">{c.low}</span>
                <div className="flex items-center gap-3">
                  <input type="number" min="0" value={form.low_stock_threshold}
                    onChange={e => setForm({ ...form, low_stock_threshold: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) })}
                    className={`${inputCls} w-24 text-right font-bold num`} aria-label={c.low} />
                  <span className="text-sm text-slate-500">{c.units}</span>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <label htmlFor="carriers" className="block text-sm font-semibold text-ink mb-1.5">{c.carriers}</label>
              <p className="text-xs text-slate-500 mb-1.5">{c.carriersNote}</p>
              <textarea id="carriers" rows={4} value={form.shipping_carriers} onChange={set('shipping_carriers')}
                placeholder={c.carriersPh} className={inputCls} />
            </div>
          </Section>

          <Section title={c.options} note={c.optionsNote}>
            <div className="grid grid-cols-2 gap-4">
              <Field label={c.opt1}><input value={form.variant_label_1} onChange={set('variant_label_1')} className={inputCls} /></Field>
              <Field label={c.opt2}><input value={form.variant_label_2} onChange={set('variant_label_2')} className={inputCls} /></Field>
            </div>
          </Section>

          <Section title={c.wa} note={c.waNote}>
            <div className="grid sm:grid-cols-[8rem_minmax(0,1fr)] gap-4">
              <Field label={c.cc}>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">+</span>
                  <input inputMode="numeric" value={form.whatsapp_country_code} onChange={e => setForm({ ...form, whatsapp_country_code: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={`${inputCls} pl-7 num`} />
                </div>
              </Field>
              <div>
                <label htmlFor="wa-template" className="block text-sm font-semibold text-ink mb-1.5">{c.template}</label>
                <textarea id="wa-template" ref={tplRef} rows={5} value={form.whatsapp_template} onChange={set('whatsapp_template')} className={inputCls} />
                <p className="mt-2 text-xs text-slate-500">{c.insert}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {TEMPLATE_KEYS.map(k => (
                    <button key={k} type="button" onClick={() => insertKey(k)}
                      className="px-2.5 py-1 rounded-lg border border-line text-xs font-semibold text-slate-600 hover:border-gold hover:text-gold-dark">{c.keys[k]}</button>
                  ))}
                </div>
                {form.whatsapp_template.trim() && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-500 mb-1.5">{c.previewMsg}</p>
                    <div className="rounded-xl rounded-tr-sm bg-[#E3F5EC] text-[#16443D] px-4 py-3 text-sm whitespace-pre-wrap break-words ml-auto max-w-sm">
                      {fillTemplate(form.whatsapp_template, { ...SAMPLE, shop: form.shop_name })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title={c.chat} note={c.chatNote}>
            <textarea id="chat-template" ref={chatTplRef} rows={4} value={form.order_chat_template}
              onChange={set('order_chat_template')} placeholder={c.chatPh} className={inputCls} />
            <p className="mt-2 text-xs text-slate-500">{c.insert}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TEMPLATE_KEYS.map(k => (
                <button key={k} type="button" onClick={() => insertKey(k, 'order_chat_template', chatTplRef)}
                  className="px-2.5 py-1 rounded-lg border border-line text-xs font-semibold text-slate-600 hover:border-gold hover:text-gold-dark">{c.keys[k]}</button>
              ))}
            </div>
            {form.order_chat_template.trim() && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-1.5">{c.previewMsg}</p>
                <div className="rounded-xl rounded-tr-sm bg-[#E3F5EC] text-[#16443D] px-4 py-3 text-sm whitespace-pre-wrap break-words ml-auto max-w-sm">
                  {fillTemplate(form.order_chat_template, { ...SAMPLE, shop: form.shop_name })}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* Live receipt preview: how the printed slip will look */}
        <aside className="lg:sticky lg:top-4 rounded-xl bg-[#E4E8EF] p-6">
          <p className="text-sm font-semibold text-slate-600 mb-4">{c.receipt}</p>
          <div className="mx-auto w-full max-w-[16rem] bg-white text-ink px-5 py-6 text-center text-[0.8rem] shadow-[0_10px_24px_-12px_rgba(14,26,51,.35)]"
            style={{ clipPath: 'polygon(0 0,100% 0,100% calc(100% - 6px),95% 100%,90% calc(100% - 6px),85% 100%,80% calc(100% - 6px),75% 100%,70% calc(100% - 6px),65% 100%,60% calc(100% - 6px),55% 100%,50% calc(100% - 6px),45% 100%,40% calc(100% - 6px),35% 100%,30% calc(100% - 6px),25% 100%,20% calc(100% - 6px),15% 100%,10% calc(100% - 6px),5% 100%,0 calc(100% - 6px))' }}>
            {form.shop_logo && <img src={form.shop_logo} alt="" className="w-12 h-12 object-contain mx-auto mb-2" />}
            <p className="text-base font-extrabold break-words">{form.shop_name || '—'}</p>
            {form.shop_address && <p className="mt-1 text-slate-500 whitespace-pre-wrap break-words">{form.shop_address}</p>}
            {form.shop_phone && <p className="text-slate-500 num">{form.shop_phone}</p>}
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="flex justify-between text-left"><span>{c.item} x2</span><span className="num">300,000</span></div>
            <div className="flex justify-between text-left"><span>{c.item} x1</span><span className="num">50,000</span></div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="flex justify-between font-extrabold text-sm"><span>{c.total}</span><span className="num">₭350,000</span></div>
            {form.receipt_footer && <p className="mt-4 text-slate-500 whitespace-pre-wrap break-words">{form.receipt_footer}</p>}
          </div>
        </aside>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0 inset-x-0 lg:left-auto z-30 no-print pointer-events-none">
        <div className="max-w-6xl lg:mr-8 ml-auto px-4 pb-4 pointer-events-auto">
          <div className={`ml-auto w-full sm:w-auto sm:max-w-md flex items-center justify-between gap-4 rounded-xl px-4 py-3 shadow-lg transition-colors ${dirty ? 'bg-ink text-white' : 'bg-white border border-line'}`}>
            <span role="status" className={`text-sm ${error ? 'text-danger' : dirty ? 'text-slate-300' : 'text-success'}`}>
              {error || (state === 'saved' ? c.saved : dirty ? c.unsaved : '')}
            </span>
            <button type="submit" disabled={state === 'saving' || (!dirty && !error)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gold text-ink hover:bg-gold-dark hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
              {state === 'saved' && !dirty && <Icon name="check" className="w-4 h-4" strokeWidth={2.2} />}
              {state === 'saving' ? c.saving : c.save}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Section({ title, note, children }) {
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <h2 className="font-bold text-ink">{title}</h2>
      {note && <p className="text-sm text-slate-500 mt-0.5">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
