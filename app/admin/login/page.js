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
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">⚙️ Admin Login</h1>
        <p className="text-sm text-gray-500 mb-6">PP Systems Administration</p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Admin password" autoFocus
          className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3" />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button type="submit" disabled={loading || !password}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? '...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
