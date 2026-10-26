'use client';
import { useState, useEffect, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '../layout';
import { formatCurrency } from '../../lib/currency';
import { Button, Modal, SearchInput, Chip, Pill, EmptyState, Toolbar, Icon, card } from '../../components/ui';
import CustomerForm from '../../components/CustomerForm';

const COPY = {
  lo: {
    add: 'ເພີ່ມລູກຄ້າ', search: 'ຄົ້ນຫາຊື່, ເບີໂທ, Facebook', recent: 'ຊື້ຫຼ້າສຸດ', top: 'ຍອດສູງສຸດ', frequent: 'ຊື້ເລື້ອຍ',
    customers: 'ລູກຄ້າທັງໝົດ', repeat: 'ກັບມາຊື້ຊ້ຳ', lifetime: 'ຍອດຊື້ລວມ', orders: n => `${n} ບິນ`, never: 'ຍັງບໍ່ເຄີຍຊື້',
    last: d => `ຊື້ຫຼ້າສຸດ ${d}`, empty: 'ຍັງບໍ່ມີລູກຄ້າ', emptyText: 'ລູກຄ້າຈະຖືກບັນທຶກອັດຕະໂນມັດເມື່ອຂາຍພ້ອມເບີໂທ', noMatch: 'ບໍ່ພົບລູກຄ້າ', blacklisted: 'ບັນຊີດຳ',
  },
  th: {
    add: 'เพิ่มลูกค้า', search: 'ค้นหาชื่อ, เบอร์, Facebook', recent: 'ซื้อล่าสุด', top: 'ยอดสูงสุด', frequent: 'ซื้อบ่อย',
    customers: 'ลูกค้าทั้งหมด', repeat: 'กลับมาซื้อซ้ำ', lifetime: 'ยอดซื้อรวม', orders: n => `${n} บิล`, never: 'ยังไม่เคยซื้อ',
    last: d => `ซื้อล่าสุด ${d}`, empty: 'ยังไม่มีลูกค้า', emptyText: 'ลูกค้าจะถูกบันทึกอัตโนมัติเมื่อขายพร้อมเบอร์โทร', noMatch: 'ไม่พบลูกค้า', blacklisted: 'บัญชีดำ',
  },
  en: {
    add: 'Add customer', search: 'Search name, phone, Facebook', recent: 'Recent', top: 'Top spenders', frequent: 'Most orders',
    customers: 'Customers', repeat: 'Came back', lifetime: 'Lifetime sales', orders: n => `${n} orders`, never: 'No orders yet',
    last: d => `Last order ${d}`, empty: 'No customers yet', emptyText: 'Customers are saved automatically when you sell with a phone number.', noMatch: 'No matching customers', blacklisted: 'Blacklisted',
  },
};

export default function CustomersPage() {
  const { lang } = useContext(AppContext);
  const c = COPY[lang] || COPY.en;
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [adding, setAdding] = useState(false);

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(async () => {
      const params = new URLSearchParams({ sort });
      if (search.trim()) params.set('search', search.trim());
      try {
        const data = await fetch(`/api/customers?${params}`).then(r => r.json());
        setCustomers(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    }, search ? 250 : 0);
    return () => clearTimeout(id);
  }, [search, sort]);

  const stats = useMemo(() => ({
    total: customers.length,
    repeat: customers.filter(x => Number(x.order_count) > 1).length,
    spent: customers.reduce((s, x) => s + (Number(x.total_spent) || 0), 0),
  }), [customers]);

  const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div className="max-w-6xl">
      <Toolbar actions={<Button icon="plus" onClick={() => setAdding(true)}>{c.add}</Button>}>
        <SearchInput value={search} onChange={setSearch} placeholder={c.search} className="w-full sm:w-80" />
        {['recent', 'top', 'frequent'].map(s => <Chip key={s} active={sort === s} onClick={() => setSort(s)}>{c[s]}</Chip>)}
      </Toolbar>

      {!search && customers.length > 0 && (
        <section className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-line bg-line mb-5">
          <Stat label={c.customers} value={stats.total.toLocaleString()} />
          <Stat label={c.repeat} value={stats.total ? `${Math.round(stats.repeat / stats.total * 100)}%` : '0%'} />
          <Stat label={c.lifetime} value={formatCurrency(stats.spent, 'LAK')} gold />
        </section>
      )}

      <section className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="p-6 space-y-3" aria-busy="true">{[0, 1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-canvas animate-pulse" />)}</div>
        ) : customers.length === 0 ? (
          search ? <EmptyState icon="user" title={c.noMatch} />
            : <EmptyState icon="user" title={c.empty} text={c.emptyText} action={<Button icon="plus" onClick={() => setAdding(true)}>{c.add}</Button>} />
        ) : (
          <ul className="divide-y divide-line">
            {customers.map(x => (
              <li key={x.id}>
                <a href={`/customers/${x.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas/60">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${x.is_blacklisted ? 'bg-red-50 text-danger' : 'bg-gold-soft text-[#8A6A22]'}`}>{initials(x.name || x.phone)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">
                      {x.name || x.phone || '-'}
                      {!!x.is_blacklisted && <span className="ml-2 align-middle"><Pill tone="red">{c.blacklisted}</Pill></span>}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {x.name && x.phone && <span className="num mr-2">{x.phone}</span>}
                      {x.last_order_at ? c.last(new Date(x.last_order_at).toLocaleDateString()) : c.never}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-ink num">{formatCurrency(x.total_spent, 'LAK')}</p>
                    <p className="text-xs text-slate-500">{c.orders(Number(x.order_count) || 0)}</p>
                  </div>
                  <Icon name="chevron" className="w-4 h-4 text-slate-300 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={adding} onClose={() => setAdding(false)} title={c.add} size="lg">
        <CustomerForm lang={lang} onCancel={() => setAdding(false)} onSaved={id => router.push(`/customers/${id}`)} />
      </Modal>
    </div>
  );
}

function Stat({ label, value, gold }) {
  return (
    <div className={`px-5 py-4 ${gold ? 'bg-ink' : 'bg-white'}`}>
      <p className={`text-xs ${gold ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-1 text-lg sm:text-2xl font-extrabold num truncate ${gold ? 'text-gold' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
