// Turn a phone number as typed by staff into the international form wa.me expects.
// "020 5555 1234" -> "8562055551234" (with country code 856).
export function waNumber(phone, countryCode = '856') {
  const cc = String(countryCode || '856').replace(/\D/g, '') || '856';
  let p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (p.startsWith('00')) return p.slice(2);
  if (p.startsWith('0')) return cc + p.slice(1);
  if (p.startsWith(cc) || p.startsWith('66') || p.startsWith('856')) return p;
  return cc + p;
}

// Fill {name}, {order_number}, {total}, {status}, {tracking}, {carrier}, {shop} in a template.
export function fillTemplate(template, values) {
  return String(template || '').replace(/\{(\w+)\}/g, (m, key) => (values[key] != null ? String(values[key]) : ''));
}

export const TEMPLATE_KEYS = ['name', 'order_number', 'total', 'status', 'tracking', 'carrier', 'shop'];
