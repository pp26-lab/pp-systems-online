'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.push('/admin');
    else {
      const data = await res.json();
      setError(data.error || 'Login failed');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm">
        <img src="/brand/pp-systems-logo.png" alt="PP Systems" className="w-36 h-auto mb-6" />
        <h1 className="text-xl font-bold mb-1">เข้าสู่หลังบ้าน</h1>
        <p className="text-sm text-gray-500 mb-6">สำหรับเจ้าของระบบ PP Systems เท่านั้น</p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="รหัสผ่านหลังบ้าน" autoFocus
          className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3" />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button type="submit" disabled={loading || !password}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}
