'use client';
import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';
import { formatCurrency } from '../../lib/currency';

export default function CustomersPage() {
  const { lang } = useContext(AppContext);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', facebook_id: '', line_id: '', address: '', note: '' });

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    const res = await fetch(`/api/customers?${params}`);
    setCustomers(await res.json());
  }
  useEffect(() => { load(); }, [search, sort]);

  async function saveCustomer(e) {
    e.preventDefault();
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: '', phone: '', email: '', facebook_id: '', line_id: '', address: '', note: '' });
    load();
  }

  const labels = lang === 'th' ? {
    title: 'ลูกค้า', add: 'เพิ่มลูกค้า', search: 'ค้นหา...', name: 'ชื่อ', phone: 'เบอร์', email: 'อีเมล',
    address: 'ที่อยู่', note: 'หมายเหตุ', total: 'ยอดสะสม', orders: 'ครั้ง', last: 'ล่าสุด',
    sort_recent: 'ล่าสุด', sort_top: 'ยอดสูงสุด', sort_frequent: 'ซื้อบ่อย', empty: 'ไม่มีลูกค้า',
    view: 'ดู', save: 'บันทึก', cancel: 'ยกเลิก',
  } : lang === 'lo' ? {
    title: 'ລູກຄ້າ', add: 'ເພີ່ມລູກຄ້າ', search: 'ຄົ້ນຫາ...', name: 'ຊື່', phone: 'ເບີໂທ', email: 'ອີເມວ',
    address: 'ທີ່ຢູ່', note: 'ໝາຍເຫດ', total: 'ຍອດສະສົມ', orders: 'ຄັ້ງ', last: 'ຄັ້ງລ່າສຸດ',
    sort_recent: 'ຫຼ້າສຸດ', sort_top: 'ຍອດສູງສຸດ', sort_frequent: 'ຊື້ບໍ່ໆ', empty: 'ບໍ່ມີລູກຄ້າ',
    view: 'ເບິ່ງ', save: 'ບັນທຶກ', cancel: 'ຍົກເລີກ',
  } : {
    title: 'Customers', add: 'Add Customer', search: 'Search...', name: 'Name', phone: 'Phone', email: 'Email',
    address: 'Address', note: 'Note', total: 'Total Spent', orders: 'orders', last: 'Last Order',
    sort_recent: 'Recent', sort_top: 'Top Spenders', sort_frequent: 'Frequent', empty: 'No customers',
    view: 'View', save: 'Save', cancel: 'Cancel',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">{labels.title}</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark">
          + {labels.add}
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={labels.search}
          className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg" />
        <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="recent">{labels.sort_recent}</option>
          <option value="top">{labels.sort_top}</option>
          <option value="frequent">{labels.sort_frequent}</option>
        </select>
      </div>

      <div className="bg-white rounded-xl overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">{labels.name}</th>
              <th className="text-left px-4 py-3">{labels.phone}</th>
              <th className="text-right px-4 py-3">{labels.total}</th>
              <th className="text-center px-4 py-3">{labels.orders}</th>
              <th className="text-left px-4 py-3">{labels.last}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} className={`border-b hover:bg-gray-50 ${c.is_blacklisted ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3">
                  {c.is_blacklisted && <span className="text-red-500 mr-1">🚫</span>}
                  <span className="font-medium">{c.name || '-'}</span>
                </td>
                <td className="px-4 py-3">{c.phone || '-'}</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(c.total_spent, 'LAK')}</td>
                <td className="px-4 py-3 text-center">{c.order_count}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/customers/${c.id}`} className="text-primary hover:underline">{labels.view} →</Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan="6" className="text-center py-8 text-gray-400">{labels.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={saveCustomer} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
            <h2 className="text-xl font-bold">{labels.add}</h2>
            <input required placeholder={labels.name} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder={labels.phone} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder={labels.email} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder="Facebook ID" value={form.facebook_id} onChange={e => setForm({ ...form, facebook_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder="Line ID" value={form.line_id} onChange={e => setForm({ ...form, line_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <textarea placeholder={labels.address} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" />
            <textarea placeholder={labels.note} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">{labels.cancel}</button>
              <button type="submit" className="flex-1 bg-primary text-white py-2 rounded-lg font-semibold">{labels.save}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
