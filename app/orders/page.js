'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';
import { formatCurrency } from '../../lib/currency';

export default function OrdersPage() {
  const { lang } = useContext(AppContext);
  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [shopSettings, setShopSettings] = useState({ shop_name: 'PP Systems' });

  useEffect(() => { fetchOrders(); }, [filterType, filterStatus]);
  useEffect(() => { fetch('/api/shop-settings').then(r => r.json()).then(setShopSettings).catch(() => {}); }, []);

  async function fetchOrders() {
    const params = new URLSearchParams();
    if (filterType) params.set('order_type', filterType);
    if (filterStatus) params.set('status', filterStatus);
    const res = await fetch(`/api/orders?${params}`);
    setOrders(await res.json());
  }

  function getProductName(item) {
    if (lang === 'lo') return item.name_lo || item.name_en;
    if (lang === 'th') return item.name_th || item.name_en;
    return item.name_en;
  }

  async function updateOrderStatus(orderId, newStatus) {
    await fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status: newStatus }),
    });
    fetchOrders();
  }

  function printShippingBill(order) {
    const win = window.open('', '_blank', 'width=400,height=600');
    const items = order.items?.map(item =>
      `<tr><td style="padding:4px;border-bottom:1px solid #eee">${getProductName(item)}</td><td style="padding:4px;text-align:right;border-bottom:1px solid #eee">x${item.quantity}</td></tr>`
    ).join('');
    win.document.write(`
      <html><head><title>Shipping Bill</title>
      <style>body{font-family:sans-serif;padding:20px;max-width:350px;margin:0 auto}
      .header{text-align:center;border-bottom:2px dashed #333;padding-bottom:10px;margin-bottom:10px}
      table{width:100%;border-collapse:collapse;margin:10px 0}
      .info{font-size:12px;margin:3px 0}
      .bold{font-weight:bold}
      @media print{button{display:none}}</style></head>
      <body>
        <div class="header">
          <h2 style="margin:0">${shopSettings.shop_name}</h2>
          <p style="margin:2px 0;font-size:12px">${t('print_shipping', lang)}</p>
        </div>
        <div class="info"><span class="bold">${t('order_number', lang)}:</span> ${order.order_number}</div>
        <div class="info"><span class="bold">${t('date', lang)}:</span> ${new Date(order.created_at).toLocaleString()}</div>
        <div class="info"><span class="bold">${t('customer_name', lang)}:</span> ${order.customer_name || '-'}</div>
        <div class="info"><span class="bold">${t('customer_phone', lang)}:</span> ${order.customer_phone || '-'}</div>
        <div class="info"><span class="bold">${t('customer_address', lang)}:</span></div>
        <div class="info" style="padding-left:10px">${order.customer_address || '-'}</div>
        ${order.delivery_date ? `<div class="info"><span class="bold">${t('delivery_date', lang)}:</span> ${order.delivery_date}</div>` : ''}
        ${order.shipping_notes ? `<div class="info"><span class="bold">${t('shipping_notes', lang)}:</span> ${order.shipping_notes}</div>` : ''}
        <table>${items}</table>
        <div style="border-top:2px dashed #333;padding-top:8px;text-align:right;font-size:14px">
          <strong>${t('total', lang)}: ${formatCurrency(order.total, order.currency)}</strong>
        </div>
        <div style="text-align:center;margin-top:20px">
          <button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer">Print</button>
        </div>
      </body></html>
    `);
    win.document.close();
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'completed': return 'status-in_stock';
      case 'pending': return 'status-in_transit';
      case 'shipping': return 'status-ready_to_ship';
      case 'cancelled': return 'status-pre_order';
      default: return '';
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{t('orders', lang)}</h1>
        <div className="flex gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">{t('order_type', lang)}: All</option>
            <option value="walk_in">{t('walk_in', lang)}</option>
            <option value="online">{t('online', lang)}</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">Status: All</option>
            <option value="pending">Pending</option>
            <option value="shipping">{t('shipping', lang)}</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-bold text-primary">{order.order_number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  order.order_type === 'online' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {t(order.order_type, lang)}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString()}
                </span>
                {order.customer_name && (
                  <span className="text-sm text-gray-600">{order.customer_name}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                  {order.status === 'shipping' ? t('shipping', lang) : order.status}
                </span>
                <span className="font-bold">{formatCurrency(order.total, order.currency)}</span>
                <span className="text-gray-400">{expandedOrder === order.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {expandedOrder === order.id && (
              <div className="px-4 pb-4 border-t border-gray-100">
                {/* Delivery info for online orders */}
                {order.order_type === 'online' && (
                  <div className="bg-purple-50 rounded-lg p-3 mt-2 text-sm space-y-1">
                    {order.customer_address && (
                      <div><strong>{t('customer_address', lang)}:</strong> {order.customer_address}</div>
                    )}
                    {order.delivery_date && (
                      <div><strong>{t('delivery_date', lang)}:</strong> {order.delivery_date}</div>
                    )}
                    {order.shipping_notes && (
                      <div><strong>{t('shipping_notes', lang)}:</strong> {order.shipping_notes}</div>
                    )}
                  </div>
                )}

                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1">{t('sku', lang)}</th>
                      <th className="text-left py-1">{t('products', lang)}</th>
                      <th className="text-right py-1">{t('quantity', lang)}</th>
                      <th className="text-right py-1">{t('price', lang)}</th>
                      <th className="text-right py-1">{t('total', lang)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.map(item => (
                      <tr key={item.id} className="border-t border-gray-50">
                        <td className="py-2 font-mono text-xs">{item.sku}</td>
                        <td className="py-2">{getProductName(item)}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(item.unit_price, order.currency)}</td>
                        <td className="py-2 text-right font-semibold">{formatCurrency(item.total, order.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-center mt-3 pt-2 border-t text-sm">
                  <span className="text-gray-500">
                    {t('payment_method', lang)}: {t(order.payment_method, lang)} | {order.currency}
                    {order.currency !== 'LAK' && ` (${t('exchange_rate', lang)}: ${order.exchange_rate_used})`}
                  </span>
                  <span className="font-bold text-lg">{formatCurrency(order.total, order.currency)}</span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3 pt-2 border-t">
                  {order.order_type === 'online' && order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'shipping')}
                      className="bg-secondary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90"
                    >{t('mark_shipped', lang)}</button>
                  )}
                  {order.status === 'shipping' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="bg-success text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90"
                    >{t('mark_completed', lang)}</button>
                  )}
                  {order.order_type === 'online' && (
                    <button
                      onClick={() => printShippingBill(order)}
                      className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90"
                    >{t('print_shipping', lang)}</button>
                  )}
                  {order.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        if (confirm(lang === 'lo' ? 'ຢືນຢັນຍົກເລີກອໍເດີ້?' : lang === 'th' ? 'ยืนยันยกเลิกออเดอร์?' : 'Cancel this order?')) {
                          updateOrderStatus(order.id, 'cancelled');
                        }
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 ml-auto"
                    >{t('cancel_order', lang)}</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-400">{t('no_items', lang)}</div>
        )}
      </div>
    </div>
  );
}
