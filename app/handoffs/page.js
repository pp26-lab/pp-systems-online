'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';

const statusColors = {
  pending: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
};

export default function HandoffsPage() {
  const { lang } = useContext(AppContext);
  const [handoffs, setHandoffs] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');

  async function load() {
    const q = filter ? `?status=${filter}` : '';
    const res = await fetch('/api/handoffs' + q);
    setHandoffs(await res.json());
  }
  useEffect(() => { load(); }, [filter]);

  async function updateStatus(id, status) {
    await fetch('/api/handoffs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setSelected(null);
    load();
  }

  async function saveNotes(id) {
    await fetch('/api/handoffs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, admin_notes: notes }),
    });
    load();
  }

  async function deleteHandoff(id) {
    if (!confirm(lang === 'th' ? 'ลบรายการนี้?' : lang === 'lo' ? 'ລຶບອັນນີ້?' : 'Delete this?')) return;
    await fetch(`/api/handoffs?id=${id}`, { method: 'DELETE' });
    setSelected(null);
    load();
  }

  const label = lang === 'th' ? {
    title: '📥 ข้อความจากลูกค้า', pending: 'ต้องตอบ', in_progress: 'กำลังตอบ',
    resolved: 'เสร็จแล้ว', all: 'ทั้งหมด', notes: 'บันทึกเพิ่มเติม',
    save: 'บันทึก', reply_facebook: 'ตอบใน Facebook', mark_progress: 'เริ่มตอบ',
    mark_resolved: 'ตอบแล้ว', received: 'ได้รับ', message: 'ข้อความ', source: 'ที่มา',
    from: 'จาก', empty: 'ไม่มีข้อความ',
  } : lang === 'lo' ? {
    title: '📥 ຂໍ້ຄວາມຈາກລູກຄ້າ', pending: 'ຕ້ອງຕອບ', in_progress: 'ກຳລັງຕອບ',
    resolved: 'ຕອບແລ້ວ', all: 'ທັງໝົດ', notes: 'ບັນທຶກເພີ່ມເຕີມ',
    save: 'ບັນທຶກ', reply_facebook: 'ຕອບໃນ Facebook', mark_progress: 'ເລີ່ມຕອບ',
    mark_resolved: 'ຕອບແລ້ວ', received: 'ໄດ້ຮັບ', message: 'ຂໍ້ຄວາມ', source: 'ທີ່ມາ',
    from: 'ຈາກ', empty: 'ບໍ່ມີຂໍ້ຄວາມ',
  } : {
    title: '📥 Customer Handoffs', pending: 'Pending', in_progress: 'In Progress',
    resolved: 'Resolved', all: 'All', notes: 'Notes',
    save: 'Save', reply_facebook: 'Reply on Facebook', mark_progress: 'Start Reply',
    mark_resolved: 'Mark Resolved', received: 'Received', message: 'Message', source: 'Source',
    from: 'From', empty: 'No handoffs',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">{label.title}</h1>
        <div className="flex gap-2 flex-wrap">
          {['pending', 'in_progress', 'resolved', ''].map(s => (
            <button key={s || 'all'} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${filter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
              {s === '' ? label.all : label[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {handoffs.map(h => (
            <div key={h.id} onClick={() => { setSelected(h); setNotes(h.admin_notes || ''); }}
              className={`bg-white p-4 rounded-xl border cursor-pointer hover:shadow-md transition ${selected?.id === h.id ? 'border-primary border-2' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{h.customer_name || h.facebook_user_id}</p>
                  <p className="text-xs text-gray-400">{h.source}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColors[h.status]}`}>
                  {label[h.status]}
                </span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2 whitespace-pre-wrap">{h.message}</p>
              <p className="text-xs text-gray-400 mt-2">{new Date(h.received_at).toLocaleString()}</p>
            </div>
          ))}
          {handoffs.length === 0 && (
            <div className="text-center py-12 text-gray-400">{label.empty}</div>
          )}
        </div>

        {selected && (
          <div className="bg-white p-5 rounded-xl border border-gray-200 lg:sticky lg:top-4 h-fit">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-gray-500">{label.from}</p>
                <p className="font-bold text-lg">{selected.customer_name || selected.facebook_user_id}</p>
                <p className="text-xs text-gray-400 font-mono">{selected.facebook_user_id}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColors[selected.status]}`}>
                {label[selected.status]}
              </span>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">{label.message}</p>
              <div className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                {selected.message}
              </div>
              <p className="text-xs text-gray-400 mt-1">{label.received}: {new Date(selected.received_at).toLocaleString()}</p>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">{label.notes}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button onClick={() => saveNotes(selected.id)}
                className="mt-1 text-xs bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">{label.save}</button>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href={`https://www.facebook.com/messages/t/${selected.facebook_user_id}`} target="_blank" rel="noopener"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">
                💬 {label.reply_facebook}
              </a>
              {selected.status === 'pending' && (
                <button onClick={() => updateStatus(selected.id, 'in_progress')}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-600">
                  → {label.mark_progress}
                </button>
              )}
              {selected.status !== 'resolved' && (
                <button onClick={() => updateStatus(selected.id, 'resolved')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700">
                  ✓ {label.mark_resolved}
                </button>
              )}
              <button onClick={() => deleteHandoff(selected.id)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 ml-auto">
                🗑️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
