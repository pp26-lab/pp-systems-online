'use client';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../layout';
import { t } from '../../lib/i18n';
import { formatCurrency } from '../../lib/currency';

export default function POSPage() {
  const { lang } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [currency, setCurrency] = useState('LAK');
  const [currencies, setCurrencies] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderType, setOrderType] = useState('walk_in');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [variantPicker, setVariantPicker] = useState(null);
  const [shopSettings, setShopSettings] = useState({ shop_name: 'PP Systems' });

  useEffect(() => {
    fetchProducts();
    fetchCurrencies();
    fetch('/api/shop-settings').then(r => r.json()).then(setShopSettings).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, category]);

  async function fetchProducts() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    const now = new Date().toISOString().split('T')[0];
    const filtered = data.filter(p => !p.sale_end_date || p.sale_end_date >= now);
    setProducts(filtered);
    const cats = [...new Set(data.map(p => p.category).filter(Boolean))];
    if (cats.length > 0 && categories.length === 0) setCategories(cats);
  }

  async function fetchCurrencies() {
    const res = await fetch('/api/currencies');
    const data = await res.json();
    setCurrencies(data.currencies || []);
  }

  function getProductName(p) {
    if (lang === 'lo') return p.name_lo || p.name_en;
    if (lang === 'th') return p.name_th || p.name_en;
    return p.name_en;
  }

  function handleProductClick(product) {
    if (product.has_variants && product.variants && product.variants.length > 0) {
      setVariantPicker(product);
    } else if (product.stock_in_stock > 0) {
      addToCart(product, null);
    }
  }

  function addToCart(product, variant) {
    const cartKey = variant ? `${product.id}-v${variant.id}` : `${product.id}`;
    const variantLabel = variant ? ` (${variant.color} ${variant.size})` : '';

    setCart(prev => {
      const existing = prev.find(i => i.cart_key === cartKey);
      if (existing) {
        return prev.map(i =>
          i.cart_key === cartKey ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        cart_key: cartKey,
        product_id: product.id,
        variant_id: variant?.id || null,
        name: getProductName(product) + variantLabel,
        sku: product.sku + (variant?.sku_suffix || ''),
        unit_price: product.selling_price_lak,
        quantity: 1,
        total: product.selling_price_lak,
        image_url: product.image_url,
      }];
    });
    setVariantPicker(null);
  }

  function updateQty(cartKey, qty) {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.cart_key !== cartKey));
      return;
    }
    setCart(prev => prev.map(i =>
      i.cart_key === cartKey ? { ...i, quantity: qty, total: i.unit_price * qty } : i
    ));
  }

  function removeFromCart(cartKey) {
    setCart(prev => prev.filter(i => i.cart_key !== cartKey));
  }

  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const total = subtotal - discount;

  function getExchangeRate() {
    if (currency === 'LAK') return 1;
    const cur = currencies.find(c => c.code === currency);
    return cur?.rate_to_lak || 1;
  }

  function getTotalInCurrency() {
    return total / getExchangeRate();
  }

  function getChangeAmount() {
    const received = parseFloat(amountReceived) || 0;
    if (currency === 'LAK') return received - total;
    return received - getTotalInCurrency();
  }

  function getProductStock(product) {
    if (product.has_variants && product.variants) {
      return product.variant_total_qty;
    }
    return product.stock_in_stock;
  }

  async function completeSale() {
    const rate = getExchangeRate();
    const orderTotal = currency === 'LAK' ? total : getTotalInCurrency();

    const orderData = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      subtotal: currency === 'LAK' ? subtotal : subtotal / rate,
      discount: currency === 'LAK' ? discount : discount / rate,
      tax: 0,
      total: orderTotal,
      currency,
      payment_method: paymentMethod,
      order_type: orderType,
      delivery_date: deliveryDate || null,
      shipping_notes: shippingNotes,
      items: cart.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: currency === 'LAK' ? item.unit_price : item.unit_price / rate,
        total: currency === 'LAK' ? item.unit_price * item.quantity : (item.unit_price * item.quantity) / rate,
      })),
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    if (res.ok) {
      const order = await res.json();
      order.items = order.items.map((oi, idx) => ({ ...oi, name: cart[idx]?.name }));
      setLastOrder(order);
      setShowReceipt(true);
      setShowCheckout(false);
      setCart([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setAmountReceived('');
      setDeliveryDate('');
      setShippingNotes('');
      setOrderType('walk_in');
      fetchProducts();
    }
  }

  function printReceipt() {
    window.print();
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full -m-4 lg:-m-6">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input type="text" placeholder={t('search', lang)} value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary">
            <option value="">{t('all_categories', lang)}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map(product => {
              const stock = getProductStock(product);
              return (
                <button
                  key={product.id}
                  onClick={() => stock > 0 && handleProductClick(product)}
                  disabled={stock <= 0}
                  className={`bg-white rounded-xl p-3 text-left border-2 transition-all hover:shadow-lg ${
                    stock <= 0
                      ? 'border-gray-200 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-primary cursor-pointer'
                  } ${cart.find(i => i.product_id === product.id) ? 'border-primary bg-blue-50' : ''}`}
                >
                  <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">
                        {product.category === 'Clothing' ? '👕' :
                         product.category === 'Accessories' ? '👜' :
                         product.category === 'Electronics' ? '📱' :
                         product.category === 'Footwear' ? '👟' : '📦'}
                      </span>
                    )}
                    {product.has_variants && (
                      <span className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {product.variants?.length || 0} {t('variants', lang).split(' ')[0]}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm truncate">{getProductName(product)}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                  <p className="text-primary font-bold mt-1">{formatCurrency(product.selling_price_lak, 'LAK')}</p>
                  <p className={`text-xs mt-1 ${stock <= 5 ? 'text-red-500' : 'text-green-600'}`}>
                    {t('in_stock', lang)}: {stock}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart */}
      <div className="w-full lg:w-96 bg-white border-l border-gray-200 flex flex-col no-print">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">{t('cart', lang)} ({cart.length})</h2>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t('no_items', lang)}</p>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.cart_key} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.unit_price, 'LAK')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.cart_key, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold">-</button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.cart_key, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold">+</button>
                  </div>
                  <p className="text-sm font-bold w-24 text-right">{formatCurrency(item.unit_price * item.quantity, 'LAK')}</p>
                  <button onClick={() => removeFromCart(item.cart_key)}
                    className="text-red-400 hover:text-red-600 text-lg">&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && !showCheckout && (
          <div className="p-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('subtotal', lang)}</span>
              <span className="font-semibold">{formatCurrency(subtotal, 'LAK')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>{t('discount', lang)}</span>
              <input type="number" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="flex-1 px-2 py-1 border rounded text-right" placeholder="0" />
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>{t('total', lang)}</span>
              <span className="text-primary">{formatCurrency(total, 'LAK')}</span>
            </div>
            <button onClick={() => setShowCheckout(true)}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold text-lg hover:bg-primary-dark transition-colors">
              {t('checkout', lang)}
            </button>
          </div>
        )}

        {showCheckout && (
          <div className="p-4 border-t border-gray-200 space-y-3 overflow-auto max-h-[60vh]">
            <div className="flex justify-between text-lg font-bold">
              <span>{t('total', lang)}</span>
              <span className="text-primary">{formatCurrency(total, 'LAK')}</span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">{t('order_type', lang)}</label>
              <div className="flex gap-2 mt-1">
                {['walk_in', 'online'].map(ot => (
                  <button key={ot} onClick={() => setOrderType(ot)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      orderType === ot ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{t(ot, lang)}</button>
                ))}
              </div>
            </div>
            <input type="text" placeholder={t('customer_name', lang)} value={customerName}
              onChange={e => setCustomerName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            <input type="text" placeholder={t('customer_phone', lang)} value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            {orderType === 'online' && (
              <>
                <textarea placeholder={t('customer_address', lang)} value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={2} />
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('delivery_date', lang)}</label>
                  <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
                <input type="text" placeholder={t('shipping_notes', lang)} value={shippingNotes}
                  onChange={e => setShippingNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">{t('payment_currency', lang)}</label>
              <div className="flex gap-2 mt-1">
                {['LAK', 'THB', 'USD'].map(c => (
                  <button key={c} onClick={() => setCurrency(c)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      currency === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{c}</button>
                ))}
              </div>
            </div>
            {currency !== 'LAK' && (
              <div className="bg-blue-50 p-2 rounded-lg text-sm text-center">
                {t('total', lang)}: <strong>{formatCurrency(getTotalInCurrency(), currency)}</strong>
                <span className="text-gray-500 text-xs block">
                  ({t('exchange_rate', lang)}: 1 {currency} = {formatCurrency(getExchangeRate(), 'LAK')})
                </span>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">{t('payment_method', lang)}</label>
              <div className="flex gap-2 mt-1">
                {['cash', 'transfer'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      paymentMethod === m ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{t(m, lang)}</button>
                ))}
              </div>
            </div>
            {paymentMethod === 'cash' && (
              <div>
                <label className="text-sm font-medium text-gray-600">{t('amount_received', lang)}</label>
                <input type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-lg font-bold text-right" placeholder="0" />
                {amountReceived && getChangeAmount() >= 0 && (
                  <p className="text-right text-green-600 font-bold mt-1">
                    {t('change', lang)}: {formatCurrency(getChangeAmount(), currency)}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowCheckout(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300">{t('cancel', lang)}</button>
              <button onClick={completeSale}
                className="flex-1 bg-success text-white py-3 rounded-xl font-bold hover:opacity-90">{t('complete_sale', lang)}</button>
            </div>
          </div>
        )}
      </div>

      {/* Variant Picker Modal */}
      {variantPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-auto p-6">
            <h3 className="text-lg font-bold mb-1">{getProductName(variantPicker)}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('select_variant', lang)}</p>

            {(() => {
              const grouped = {};
              for (const v of variantPicker.variants || []) {
                const key = v.color || '-';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(v);
              }
              return Object.entries(grouped).map(([color, variants]) => (
                <div key={color} className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('color', lang)}: {color}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {variants.map(v => (
                      <button
                        key={v.id}
                        disabled={v.quantity <= 0}
                        onClick={() => addToCart(variantPicker, v)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          v.quantity <= 0
                            ? 'border-gray-200 opacity-40 cursor-not-allowed bg-gray-50'
                            : 'border-gray-200 hover:border-purple-500 hover:bg-purple-50 cursor-pointer'
                        }`}
                      >
                        <p className="font-bold text-sm">{v.size || '-'}</p>
                        <p className={`text-xs mt-1 ${v.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {v.quantity > 0 ? `${v.quantity} ${t('in_stock', lang)}` : t('no_variant_stock', lang)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ));
            })()}

            <button onClick={() => setVariantPicker(null)}
              className="w-full mt-4 bg-gray-200 text-gray-700 py-2 rounded-xl font-bold hover:bg-gray-300">
              {t('cancel', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-auto">
            <div className="receipt-container p-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold">{shopSettings.shop_name}</h2>
                <p className="text-xs text-gray-500">
                  {lastOrder.order_type === 'online' ? t('shipping', lang) + ' - ' : ''}{t('receipt', lang)}
                </p>
              </div>
              <div className="border-t border-dashed border-gray-300 py-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>{t('order_number', lang)}</span>
                  <span className="font-bold">{lastOrder.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('date', lang)}</span>
                  <span>{new Date(lastOrder.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('order_type', lang)}</span>
                  <span className="font-bold">{t(lastOrder.order_type, lang)}</span>
                </div>
                {lastOrder.customer_name && (
                  <div className="flex justify-between">
                    <span>{t('customer_name', lang)}</span>
                    <span>{lastOrder.customer_name}</span>
                  </div>
                )}
                {lastOrder.customer_phone && (
                  <div className="flex justify-between">
                    <span>{t('customer_phone', lang)}</span>
                    <span>{lastOrder.customer_phone}</span>
                  </div>
                )}
                {lastOrder.customer_address && (
                  <div className="mt-1">
                    <span className="font-semibold">{t('customer_address', lang)}:</span>
                    <p className="mt-0.5">{lastOrder.customer_address}</p>
                  </div>
                )}
                {lastOrder.delivery_date && (
                  <div className="flex justify-between">
                    <span>{t('delivery_date', lang)}</span>
                    <span className="font-bold">{lastOrder.delivery_date}</span>
                  </div>
                )}
                {lastOrder.shipping_notes && (
                  <div className="mt-1">
                    <span className="font-semibold">{t('shipping_notes', lang)}:</span>
                    <p className="mt-0.5">{lastOrder.shipping_notes}</p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t('payment_method', lang)}</span>
                  <span>{t(lastOrder.payment_method, lang)}</span>
                </div>
              </div>
              <div className="border-t border-dashed border-gray-300 py-2">
                {lastOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1">
                    <div>
                      <span>{item.name || item.name_en}</span>
                      {item.variant_color && <span className="text-gray-400 ml-1">({item.variant_color} {item.variant_size})</span>}
                      <span className="text-gray-400 ml-1">x{item.quantity}</span>
                    </div>
                    <span>{formatCurrency(item.total, lastOrder.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-300 py-2 text-sm space-y-1">
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('total', lang)}</span>
                  <span>{formatCurrency(lastOrder.total, lastOrder.currency)}</span>
                </div>
                {lastOrder.currency !== 'LAK' && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>({t('total', lang)} LAK)</span>
                    <span>{formatCurrency(lastOrder.total_in_lak, 'LAK')}</span>
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">Thank you! / ຂອບໃຈ!</p>
            </div>
            <div className="flex gap-2 p-4 border-t no-print">
              <button onClick={printReceipt}
                className="flex-1 bg-primary text-white py-2 rounded-lg font-bold text-sm">{t('print_receipt', lang)}</button>
              {lastOrder.order_type === 'online' && (
                <button onClick={printReceipt}
                  className="flex-1 bg-secondary text-white py-2 rounded-lg font-bold text-sm">{t('print_shipping', lang)}</button>
              )}
              <button onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold text-sm">{t('new_sale', lang)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
