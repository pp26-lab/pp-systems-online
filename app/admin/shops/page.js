'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminShops() {
  const [shops, setShops] = useState([]);

  useEffect(() => {
    fetch('/api/admin/shops').then(r => r.json()).then(d => setShops(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">🏪 Shops</h1>
      <div className="bg-white rounded-xl overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2">Shop</th>
              <th className="text-left px-3 py-2">License Key</th>
              <th className="text-center px-3 py-2">Products</th>
              <th className="text-center px-3 py-2">Orders</th>
              <th className="text-center px-3 py-2">API Keys</th>
              <th className="text-left px-3 py-2">Created</th>
              <th className="text-right px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {shops.map(s => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-semibold">{s.shop_name}</td>
                <td className="px-3 py-2 font-mono text-xs">{s.license_key}</td>
                <td className="px-3 py-2 text-center">{s.product_count}</td>
                <td className="px-3 py-2 text-center">{s.order_count}</td>
                <td className="px-3 py-2 text-center">{s.key_count}</td>
                <td className="px-3 py-2 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/keys?shop_id=${s.id}`} className="text-blue-600 hover:underline text-sm">Manage Keys →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
