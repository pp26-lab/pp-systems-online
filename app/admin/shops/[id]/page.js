'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Back office: one shop — which features it bought, its chat connections, and the change log.

const ERR = {
  missing_encryption_key: 'เซิร์ฟเวอร์ยังไม่ได้ตั้ง CHANNEL_ENC_KEY',
  token_required: 'ใส่ Access token',
  ids_required: 'ใส่ Phone number ID และ WhatsApp Business Account ID (ตัวเลข)',
  page_mismatch: 'Token นี้เป็นของเพจอื่น ไม่ตรงกับ Page ID ที่ใส่',
  owned_by_other_shop: 'เพจหรือเบอร์นี้เชื่อมกับร้านอื่นอยู่แล้ว',
  meta_rejected: 'Meta ปฏิเสธ token นี้',
  core_feature: 'ฟังก์ชันหลักปิดไม่ได้',
};

const PLATFORM = { messenger: 'Facebook Messenger', whatsapp: 'WhatsApp' };

export default function AdminShopDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [setup, setSetup] = useState(null);
  const [flash, setFlash] = useState(null);
  const [connect, setConnect] = useState(null); // { platform, token, external_id, account_id }
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/shops/${id}`);
    if (res.ok) setData(await res.json());
  }
  useEffect(() => {
    load();
    fetch('/api/admin/chat-setup').then(r => r.json()).then(setSetup).catch(() => {});
  }, [id]);

  function say(ok, text) {
    setFlash({ ok, text });
    setTimeout(() => setFlash(null), 4000);
  }

  async function saveFeature(f, patch) {
    const body = {
      feature_key: f.key,
      enabled: patch.enabled ?? (f.saved ? !!f.saved.enabled : f.default),
      expires_at: patch.expires_at !== undefined ? patch.expires_at : f.saved?.expires_at || null,
      note: f.saved?.note || '',
    };
    const res = await fetch(`/api/admin/shops/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) say(false, ERR[d.error] || d.error || 'บันทึกไม่สำเร็จ');
    else say(true, 'บันทึกแล้ว');
    load();
  }

  async function submitConnect(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/shops/${id}/channels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(connect) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { say(false, `${ERR[d.error] || d.error}${d.detail ? `: ${d.detail}` : ''}`); return; }
      say(true, `เชื่อมต่อ ${d.name || ''} แล้ว`);
      setConnect(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function channelStatus(ch, status) {
    await fetch(`/api/admin/shops/${id}/channels`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel_id: ch.id, status }) });
    load();
  }

  async function removeChannel(ch) {
    if (!window.confirm(`ยกเลิกการเชื่อมต่อ ${ch.name || PLATFORM[ch.platform]}?\nประวัติแชททั้งหมดของช่องทางนี้จะถูกลบ และกู้คืนไม่ได้`)) return;
    await fetch(`/api/admin/shops/${id}/channels?channel_id=${ch.id}`, { method: 'DELETE' });
    load();
  }

  if (!data) return <p className="text-slate-500">กำลังโหลด…</p>;
  const { shop, features, channels, audit, stats } = data;
  const setupOk = setup && setup.app_secret && setup.verify_token && setup.encryption_key;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/shops" className="text-sm text-slate-500 hover:text-slate-900">ร้านค้าทั้งหมด</Link>
        <h1 className="mt-1 text-2xl font-bold">{shop.shop_name}</h1>
        <p className="text-sm text-slate-500">
          <span className="font-mono">{shop.license_key}</span>
          <span className="ml-3">สินค้า {stats.products}, ออเดอร์ {stats.orders}, ลูกค้า {stats.customers}</span>
          {stats.last_order && <span className="ml-3">ขายล่าสุด {new Date(stats.last_order).toLocaleString()}</span>}
        </p>
      </div>

      {flash && <p role="status" className={`rounded-lg px-4 py-2.5 text-sm font-medium ${flash.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{flash.text}</p>}

      <section className="bg-white rounded-xl border border-slate-200">
        <h2 className="px-5 pt-4 font-bold">ฟังก์ชันที่ร้านนี้ใช้ได้</h2>
        <p className="px-5 text-sm text-slate-500">ฟังก์ชันหลักเปิดให้ทุกร้าน ส่วนเสริมเปิดหรือปิดได้ และตั้งวันหมดอายุได้</p>
        <ul className="mt-3 divide-y divide-slate-100">
          {features.map(f => (
            <li key={f.key} className="px-5 py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[12rem]">
                <p className="font-semibold">{f.name.th}</p>
                <p className="text-xs text-slate-500">
                  {f.core ? 'ฟังก์ชันหลัก' : f.saved ? 'ตั้งค่าโดยหลังบ้าน' : `ค่าเริ่มต้น: ${f.default ? 'เปิด' : 'ปิด'}`}
                  {f.saved?.expires_at && <span className="ml-2">หมดอายุ {String(f.saved.expires_at).slice(0, 10)}</span>}
                </p>
              </div>
              {!f.core && (
                <>
                  <label className="text-xs text-slate-500 flex items-center gap-2">
                    ใช้ได้ถึง
                    <input type="date" defaultValue={f.saved?.expires_at ? String(f.saved.expires_at).slice(0, 10) : ''}
                      onBlur={e => { const v = e.target.value || null; if (v !== (f.saved?.expires_at ? String(f.saved.expires_at).slice(0, 10) : null)) saveFeature(f, { expires_at: v }); }}
                      className="border border-slate-300 rounded-md px-2 py-1 text-sm" />
                  </label>
                  <button role="switch" aria-checked={f.active} aria-label={`${f.name.th} ${f.active ? 'ปิด' : 'เปิด'}`}
                    onClick={() => saveFeature(f, { enabled: !(f.saved ? !!f.saved.enabled : f.default) })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${f.active ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${f.active ? 'left-[1.375rem]' : 'left-0.5'}`} />
                  </button>
                </>
              )}
              {f.core && <span className="text-xs font-semibold text-emerald-700">เปิดเสมอ</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">การเชื่อมต่อแชท</h2>
            <p className="text-sm text-slate-500">Token ถูกตรวจกับ Meta ก่อนบันทึก และเก็บแบบเข้ารหัส ไม่มีใครเปิดดูได้อีก</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setConnect({ platform: 'messenger', token: '', external_id: '' })} disabled={!setupOk}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#1C3260] text-white disabled:opacity-40">เชื่อม Messenger</button>
            <button onClick={() => setConnect({ platform: 'whatsapp', token: '', external_id: '', account_id: '' })} disabled={!setupOk}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#1C3260] text-white disabled:opacity-40">เชื่อม WhatsApp</button>
          </div>
        </div>

        {setup && !setupOk && (
          <div className="mt-4 rounded-lg bg-amber-50 text-amber-900 px-4 py-3 text-sm">
            เซิร์ฟเวอร์ยังตั้งค่าไม่ครบ:
            {!setup.app_secret && <span className="ml-2 font-mono">META_APP_SECRET</span>}
            {!setup.verify_token && <span className="ml-2 font-mono">META_VERIFY_TOKEN</span>}
            {!setup.encryption_key && <span className="ml-2 font-mono">CHANNEL_ENC_KEY</span>}
          </div>
        )}
        {setup && (
          <p className="mt-3 text-xs text-slate-500">
            Callback URL สำหรับตั้งใน Meta App: <span className="font-mono select-all text-slate-800">{setup.webhook_url}</span>
          </p>
        )}

        {connect && (
          <form onSubmit={submitConnect} className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="font-semibold">{PLATFORM[connect.platform]}</p>
            {connect.platform === 'whatsapp' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm">Phone number ID
                  <input value={connect.external_id} onChange={e => setConnect({ ...connect, external_id: e.target.value.trim() })} inputMode="numeric"
                    className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-mono" />
                </label>
                <label className="text-sm">WhatsApp Business Account ID
                  <input value={connect.account_id} onChange={e => setConnect({ ...connect, account_id: e.target.value.trim() })} inputMode="numeric"
                    className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-mono" />
                </label>
              </div>
            )}
            <label className="block text-sm">{connect.platform === 'messenger' ? 'Page access token (แบบไม่หมดอายุ)' : 'System user access token'}
              <input type="password" autoComplete="off" value={connect.token} onChange={e => setConnect({ ...connect, token: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-mono" />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white disabled:opacity-40">{busy ? 'กำลังตรวจกับ Meta…' : 'ตรวจและเชื่อมต่อ'}</button>
              <button type="button" onClick={() => setConnect(null)} className="px-4 py-2 rounded-lg text-sm">ยกเลิก</button>
            </div>
          </form>
        )}

        <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          {channels.length === 0 && <li className="py-4 text-sm text-slate-500">ยังไม่ได้เชื่อมต่อช่องทางใด</li>}
          {channels.map(ch => (
            <li key={ch.id} className="py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[14rem]">
                <p className="font-semibold">{PLATFORM[ch.platform]}: {ch.name || ch.external_id}</p>
                <p className="text-xs text-slate-500">
                  ID {ch.external_id}, {ch.conversations} แชท
                  {ch.last_inbound ? `, ข้อความล่าสุด ${new Date(ch.last_inbound).toLocaleString()}` : ', ยังไม่มีข้อความเข้า'}
                </p>
                {ch.last_error && <p className="text-xs text-red-600">{ch.last_error}</p>}
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ch.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {ch.status === 'active' ? 'ใช้งาน' : ch.status === 'disabled' ? 'หยุดชั่วคราว' : 'มีปัญหา'}
              </span>
              <button onClick={() => setConnect(ch.platform === 'messenger'
                ? { platform: 'messenger', token: '', external_id: ch.external_id }
                : { platform: 'whatsapp', token: '', external_id: ch.external_id, account_id: ch.account_id })}
                className="text-sm text-[#1C3260] font-semibold">เปลี่ยน token</button>
              <button onClick={() => channelStatus(ch, ch.status === 'disabled' ? 'active' : 'disabled')} className="text-sm text-slate-600 font-semibold">
                {ch.status === 'disabled' ? 'เปิดใช้' : 'หยุดชั่วคราว'}
              </button>
              <button onClick={() => removeChannel(ch)} className="text-sm text-red-600 font-semibold">ยกเลิกการเชื่อมต่อ</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold">ประวัติการเปลี่ยนแปลง</h2>
        {audit.length === 0 ? <p className="mt-2 text-sm text-slate-500">ยังไม่มี</p> : (
          <ul className="mt-2 text-sm divide-y divide-slate-100">
            {audit.map((a, i) => (
              <li key={i} className="py-2 flex flex-wrap gap-x-3">
                <span className="text-slate-500 w-40">{new Date(a.created_at).toLocaleString()}</span>
                <span className="font-semibold">{a.action}</span>
                <span className="text-slate-600 break-all">{a.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
