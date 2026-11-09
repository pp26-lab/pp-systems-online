'use client';
import { useEffect, useState } from 'react';

// Platform-wide chat settings. The Facebook (Meta) app is shared by every page/shop, so its
// App Secret and Verify Token are entered here once. Each shop then connects its own page with
// its own Page Token on the shop screen.

const ERR = {
  app_secret_invalid: 'App Secret ไม่ถูกต้อง (เป็นชุดตัวอักษร a-f และตัวเลข)',
  verify_token_invalid: 'Verify Token ต้องยาว 6 ตัวขึ้นไป และห้ามมีช่องว่าง',
  url_invalid: 'URL ต้องขึ้นต้นด้วย https:// เช่น https://ppsystems-shop.com',
  graph_version_invalid: 'รูปแบบเวอร์ชันไม่ถูก เช่น v23.0',
  missing_encryption_key: 'เซิร์ฟเวอร์ยังไม่ได้ตั้ง CHANNEL_ENC_KEY',
  nothing_to_save: 'ไม่มีอะไรเปลี่ยน',
  failed: 'บันทึกไม่สำเร็จ ลองใหม่',
};

function suggestToken() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return 'pp-' + Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

export default function AdminSettings() {
  const [setup, setSetup] = useState(null);
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [copied, setCopied] = useState('');

  const load = () => fetch('/api/admin/chat-setup').then(r => r.json()).then(d => {
    setSetup(d);
    setBaseUrl(d.public_base_url || '');
  }).catch(() => {});
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    const body = { public_base_url: baseUrl };
    if (appSecret.trim()) body.app_secret = appSecret.trim();
    if (verifyToken.trim()) body.verify_token = verifyToken.trim();
    try {
      const res = await fetch('/api/admin/meta-config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: ERR[d.error] || ERR.failed }); return; }
      setAppSecret('');
      setVerifyToken('');
      setMsg({ ok: true, text: d.ready ? 'บันทึกแล้ว ตั้งค่าครบ พร้อมเชื่อม Messenger ได้เลย' : 'บันทึกแล้ว' });
      load();
    } catch {
      setMsg({ ok: false, text: ERR.failed });
    } finally {
      setBusy(false);
    }
  }

  function copy(text, which) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(which); setTimeout(() => setCopied(''), 1500); }).catch(() => {});
  }

  if (!setup) return <p className="text-gray-500">กำลังโหลด…</p>;

  const srcLabel = s => s === 'saved' ? 'ตั้งในหลังบ้าน' : s === 'env' ? 'ตั้งในเซิร์ฟเวอร์ (env)' : 'ยังไม่ได้ตั้ง';
  const dot = s => s === 'missing' ? 'bg-red-500' : 'bg-green-500';
  const ready = setup.app_secret && setup.verify_token && setup.encryption_key;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">⚙️ ตั้งค่าแชท Facebook Messenger</h1>
      <p className="text-gray-500 mb-6">แอป Facebook 1 แอป ใช้ได้หลายเพจ ค่าตรงนี้ตั้งครั้งเดียวสำหรับทั้งระบบ ส่วนรหัสเพจของแต่ละร้านใส่ที่หน้าร้าน</p>

      <div className={`mb-6 rounded-xl border p-4 ${ready ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <p className="font-bold mb-2">{ready ? '✓ ตั้งค่าครบแล้ว' : 'ยังตั้งค่าไม่ครบ'}</p>
        <ul className="text-sm space-y-1">
          <li className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${dot(setup.app_secret_source)}`} />App Secret — {srcLabel(setup.app_secret_source)}</li>
          <li className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${dot(setup.verify_token_source)}`} />Verify Token — {srcLabel(setup.verify_token_source)}</li>
          <li className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${setup.encryption_key ? 'bg-green-500' : 'bg-red-500'}`} />กุญแจเข้ารหัส (CHANNEL_ENC_KEY) — {setup.encryption_key ? 'พร้อม' : 'ยังไม่ได้ตั้งที่เซิร์ฟเวอร์'}</li>
        </ul>
      </div>

      <div className="bg-white rounded-xl p-5 space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-1">Public Base URL (โดเมนหลักของร้าน)</label>
          <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://ppsystems-shop.com"
            className="w-full border rounded-lg px-3 py-2 font-mono text-sm" />
          <p className="text-xs text-gray-500 mt-1">ใช้สร้าง Callback URL ด้านล่าง ปกติคือ https://ppsystems-shop.com</p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">App Secret</label>
          <input value={appSecret} onChange={e => setAppSecret(e.target.value)} autoComplete="off"
            placeholder={setup.app_secret ? 'ตั้งไว้แล้ว — ใส่ค่าใหม่เพื่อเปลี่ยน' : 'คัดลอกจาก Facebook App → Settings → Basic'}
            className="w-full border rounded-lg px-3 py-2 font-mono text-sm" />
          <p className="text-xs text-gray-500 mt-1">อยู่ใน Facebook App → Settings → Basic → App Secret (กด Show) เก็บแบบเข้ารหัส ไม่แสดงกลับ</p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Verify Token</label>
          <div className="flex gap-2">
            <input value={verifyToken} onChange={e => setVerifyToken(e.target.value)} autoComplete="off"
              placeholder={setup.verify_token ? 'ตั้งไว้แล้ว — ใส่ค่าใหม่เพื่อเปลี่ยน' : 'ตั้งรหัสอะไรก็ได้ หรือกดสุ่ม'}
              className="flex-1 border rounded-lg px-3 py-2 font-mono text-sm" />
            <button type="button" onClick={() => setVerifyToken(suggestToken())} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 whitespace-nowrap">สุ่มให้</button>
          </div>
          <p className="text-xs text-gray-500 mt-1">รหัสที่คุณตั้งเอง ต้องกรอกให้ตรงกันตอนตั้ง Webhook ในแอป Facebook</p>
        </div>

        {msg && <p className={`text-sm font-semibold ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
        <button onClick={save} disabled={busy} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40">
          {busy ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>

      <div className="bg-white rounded-xl p-5 mt-6">
        <h2 className="font-bold mb-3">ค่าที่ต้องเอาไปตั้งในแอป Facebook (Messenger → Webhooks)</h2>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Callback URL</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 bg-gray-100 rounded px-3 py-2 break-all select-all">{setup.webhook_url}</code>
              <button onClick={() => copy(setup.webhook_url, 'url')} className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 whitespace-nowrap">{copied === 'url' ? 'คัดลอกแล้ว' : 'คัดลอก'}</button>
            </div>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Verify Token</p>
            <p className="text-gray-600">ใช้ค่าเดียวกับที่กรอกด้านบน (ไม่แสดงซ้ำเพื่อความปลอดภัย)</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Subscription Fields (ติ๊กให้ครบ)</p>
            <code className="block bg-gray-100 rounded px-3 py-2 break-all">messages, messaging_postbacks, message_deliveries, message_reads, message_echoes</code>
          </div>
        </div>
      </div>
    </div>
  );
}
