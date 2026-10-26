'use client';
import { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppContext } from '../../layout';
import { formatCurrency } from '../../../lib/currency';
import { waNumber } from '../../../lib/whatsapp';
import { Button, IconButton, Modal, Pill, EmptyState, Icon, card } from '../../../components/ui';
import CustomerForm from '../../../components/CustomerForm';

const COPY = {
  lo: {
    back: 'ລູກຄ້າທັງໝົດ', edit: 'ແກ້ໄຂ', cancel: 'ຍົກເລີກ', remove: 'ລຶບລູກຄ້າ', removeAsk: 'ລຶບລູກຄ້ານີ້? ປະຫວັດບິນຍັງຢູ່ຄືເກົ່າ',
    spent: 'ຍອດຊື້ລວມ', orders: 'ຈຳນວນບິນ', avg: 'ສະເລ່ຍຕໍ່ບິນ', since: 'ລູກຄ້າຕັ້ງແຕ່', contact: 'ຂໍ້ມູນຕິດຕໍ່',
    phone: 'ເບີໂທ', email: 'ອີເມວ', address: 'ທີ່ຢູ່', note: 'ໝາຍເຫດ', history: 'ປະຫວັດການຊື້', noOrders: 'ລູກຄ້ານີ້ຍັງບໍ່ມີບິນ',
    blacklisted: 'ລູກຄ້ານີ້ຢູ່ໃນບັນຊີດຳ', notFound: 'ບໍ່ພົບລູກຄ້ານີ້', call: 'ໂທ', copy: 'ສຳເນົາເບີໂທ', copied: 'ສຳເນົາແລ້ວ',
    status: { pending: 'ລໍຖ້າຈັດສົ່ງ', shipping: 'ກຳລັງຈັດສົ່ງ', completed: 'ສຳເລັດ', cancelled: 'ຍົກເລີກ' }, walkin: 'ໜ້າຮ້ານ', online: 'ອອນລາຍ',
  },
  th: {
    back: 'ลูกค้าทั้งหมด', edit: 'แก้ไข', cancel: 'ยกเลิก', remove: 'ลบลูกค้า', removeAsk: 'ลบลูกค้านี้? ประวัติบิลยังอยู่เหมือนเดิม',
    spent: 'ยอดซื้อรวม', orders: 'จำนวนบิล', avg: 'เฉลี่ยต่อบิล', since: 'เป็นลูกค้าตั้งแต่', contact: 'ข้อมูลติดต่อ',
    phone: 'เบอร์โทร', email: 'อีเมล', address: 'ที่อยู่', note: 'หมายเหตุ', history: 'ประวัติการซื้อ', noOrders: 'ลูกค้านี้ยังไม่มีบิล',
    blacklisted: 'ลูกค้านี้อยู่ในบัญชีดำ', notFound: 'ไม่พบลูกค้านี้', call: 'โทร', copy: 'คัดลอกเบอร์', copied: 'คัดลอกแล้ว',
    status: { pending: 'รอจัดส่ง', shipping: 'กำลังจัดส่ง', completed: 'สำเร็จ', cancelled: 'ยกเลิก' }, walkin: 'หน้าร้าน', online: 'ออนไลน์',
  },
  en: {
    back: 'All customers', edit: 'Edit', cancel: 'Cancel', remove: 'Delete customer', removeAsk: 'Delete this customer? Their past orders stay as they are.',
    spent: 'Lifetime sales', orders: 'Orders', avg: 'Average order', since: 'Customer since', contact: 'Contact',
    phone: 'Phone', email: 'Email', address: 'Address', note: 'Note', history: 'Order history', noOrders: 'No orders from this customer yet',
    blacklisted: 'This customer is blacklisted', notFound: 'Customer not found', call: 'Call', copy: 'Copy phone', copied: 'Copied',
    status: { pending: 'To ship', shipping: 'Shipped', completed: 'Completed', cancelled: 'Cancelled' }, walkin: 'In store', online: 'Online',
  },
};
const TONE = { pending: 'gold', shipping: 'navy', completed: 'green', cancelled: 'gray' };

export default function CustomerDetail() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await fetch(`/api/customers/${params.id}`);
    if (res.ok) setCustomer(await res.json());
    else setMissing(true);
  }
  useEffect(() => { load(); }, [params.id]);

  async function del() {
    await fetch(`/api/customers?id=${params.id}`, { method: 'DELETE' });
    router.push('/customers');
  }

  function copyPhone() {
    navigator.clipboard?.writeText(customer.phone).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  if (missing) return <EmptyState icon="user" title={c.notFound} action={<a href="/customers" className="text-sm font-semibold text-primary">{c.back}</a>} />;
  if (!customer) return <div className="max-w-6xl space-y-4" aria-busy="true"><div className="h-36 rounded-2xl bg-white animate-pulse" /><div className="h-64 rounded-2xl bg-white animate-pulse" /></div>;

  // Cancelled orders are already taken out of total_spent / order_count by the orders API.
  const count = Number(customer.order_count) || 0;
  const spent = Number(customer.total_spent) || 0;
  const wa = waNumber(customer.phone);

  return (
    <div className="max-w-6xl">
      <a href="/customers" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-ink mb-4">
        <Icon name="back" className="w-4 h-4" />{c.back}
      </a>

      <section className="rounded-2xl bg-ink text-white p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold truncate">{customer.name || customer.phone || '-'}</h1>
            <p className="mt-1 text-sm text-slate-400">{c.since} {new Date(customer.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <Button tone="gold" size="sm" icon="edit" onClick={() => setEditing(true)}>{c.edit}</Button>
          </div>
        </div>
        {!!customer.is_blacklisted && <p className="mt-4 inline-flex rounded-lg bg-danger/20 text-red-200 px-3 py-1.5 text-sm font-semibold">{c.blacklisted}</p>}
        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-ink-line pt-5">
          <div><dt className="text-xs text-slate-400">{c.spent}</dt><dd className="mt-1 text-xl sm:text-3xl font-extrabold text-gold num truncate">{formatCurrency(spent, 'LAK')}</dd></div>
          <div><dt className="text-xs text-slate-400">{c.orders}</dt><dd className="mt-1 text-xl sm:text-3xl font-extrabold num">{count}</dd></div>
          <div><dt className="text-xs text-slate-400">{c.avg}</dt><dd className="mt-1 text-xl sm:text-3xl font-extrabold num truncate">{formatCurrency(count ? spent / count : 0, 'LAK')}</dd></div>
        </dl>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className={`${card} p-5 lg:col-span-1 self-start`}>
          <h2 className="font-bold text-ink">{c.contact}</h2>
          <dl className="mt-3 space-y-3 text-sm">
            {customer.phone && (
              <div>
                <dt className="text-xs text-slate-500">{c.phone}</dt>
                <dd className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink num">{customer.phone}</span>
                  <span className="flex">
                    <IconButton icon="copy" label={copied ? c.copied : c.copy} onClick={copyPhone} />
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-success hover:bg-[#E3F2EF]">
                      <Icon name="whatsapp" className="w-[1.15rem] h-[1.15rem]" />
                    </a>
                  </span>
                </dd>
              </div>
            )}
            {customer.facebook_id && <Row label="Facebook" value={customer.facebook_id} />}
            {customer.line_id && <Row label="WhatsApp / Line" value={customer.line_id} />}
            {customer.email && <Row label={c.email} value={customer.email} />}
            {customer.address && <Row label={c.address} value={customer.address} />}
            {customer.note && <Row label={c.note} value={customer.note} />}
          </dl>
          <div className="mt-5 pt-4 border-t border-line">
            {confirmDel ? (
              <div className="space-y-2">
                <p className="text-sm text-danger">{c.removeAsk}</p>
                <div className="flex gap-2">
                  <Button size="sm" tone="danger" onClick={del}>{c.remove}</Button>
                  <Button size="sm" tone="subtle" onClick={() => setConfirmDel(false)}>{c.cancel}</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="text-sm font-semibold text-slate-400 hover:text-danger">{c.remove}</button>
            )}
          </div>
        </section>

        <section className={`${card} lg:col-span-2 overflow-hidden`}>
          <h2 className="px-5 pt-5 pb-3 font-bold text-ink">{c.history}</h2>
          {customer.orders.length === 0 ? (
            <EmptyState icon="tag" title={c.noOrders} />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {customer.orders.map(o => (
                <li key={o.id}>
                  <a href={`/orders?q=${encodeURIComponent(o.order_number)}`} className={`flex items-center gap-4 px-5 py-3 hover:bg-canvas/60 ${o.status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink num">{o.order_number}</p>
                      <p className="text-xs text-slate-500">{new Date(o.created_at).toLocaleString()} ({o.order_type === 'online' ? c.online : c.walkin})</p>
                    </div>
                    <Pill tone={TONE[o.status] || 'gray'}>{c.status[o.status] || o.status}</Pill>
                    <span className={`w-32 text-right font-bold num ${o.status === 'cancelled' ? 'line-through text-slate-400' : 'text-ink'}`}>{formatCurrency(o.total, o.currency)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={c.edit} size="lg">
        <CustomerForm lang={lang} initial={customer} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />
      </Modal>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-ink whitespace-pre-wrap break-words">{value}</dd>
    </div>
  );
}
