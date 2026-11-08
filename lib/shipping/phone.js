// Lao phone numbers are written many ways: "020 5555 1234", "+856 20 55551234",
// "8562055551234", "55551234". For matching we keep digits only, then drop the
// country code (856) and the trunk 0, so all of those become "2055551234".
export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('856')) d = d.slice(3);
  d = d.replace(/^0+/, '');
  // Mobile numbers written without the 20 prefix (8 digits starting 2/5/7/9).
  // "21xxxxxx" is left alone: that is a Vientiane landline (021) with its 0 dropped.
  if (/^(?:[579]\d|2[02-9])\d{6}$/.test(d)) d = `20${d}`;
  return d.slice(0, 20);
}
