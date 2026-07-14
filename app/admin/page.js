'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [licenses, setLicenses] = useState([]);
  const [shops, setShops] = useState([]);
  const [keys, setKeys] = useState([]);

  useEffect(() => {
    fetch('/api/admin/licenses').then(r => r.json()).then(d => setLicenses(Array.isArray(d) ? d : []));
    fetch('/api/admin/shops').then(r => r.json()).then(d => setShops(Array.isArray(d) ? d : []));
    fetch('/api/admin/keys').then(r => r.json()).then(d => setKeys(Array.isArray(d) ? d : []));
  }, []);

  const active = licenses.filter(l => l.status === 'active').length;
  const expired = licenses.filter(l => new Date(l.expires_at) < new Date()).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href="/admin/licenses" className="bg-white p-5 rounded-xl hover:shadow-md">
          <p className="text-sm text-gray-500">Total Licenses</p>
          <p className="text-3xl font-bold text-blue-600">{licenses.length}</p>
        </Link>
        <div className="bg-white p-5 rounded-xl">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-3xl font-bold text-green-600">{active}</p>
        </div>
        <div className="bg-white p-5 rounded-xl">
          <p className="text-sm text-gray-500">Expired</p>
          <p className="text-3xl font-bold text-red-500">{expired}</p>
        </div>
        <Link href="/admin/shops" className="bg-white p-5 rounded-xl hover:shadow-md">
          <p className="text-sm text-gray-500">Active Shops</p>
          <p className="text-3xl font-bold text-purple-600">{shops.length}</p>
        </Link>
      </div>
      <div className="bg-white p-5 rounded-xl">
        <h2 className="font-bold mb-3">🤖 Total API Keys</h2>
        <p className="text-2xl font-bold">{keys.length}</p>
        <Link href="/admin/keys" className="text-sm text-blue-600 hover:underline">Manage →</Link>
      </div>
    </div>
  );
}
