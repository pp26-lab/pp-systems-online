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

// SQL for a phone column with its usual separators removed, so "020 5555 1234" can be found by
// its digits. Plain REPLACE works on every MySQL/MariaDB version (REGEXP_REPLACE needs 8.0+).
// `column` must be a fixed column name from the code, never user input.
export function phoneDigitsSql(column) {
  let s = column;
  for (const ch of [' ', '-', '+', '(', ')', '.', '/']) s = `REPLACE(${s}, '${ch}', '')`;
  return s;
}

// A phone number inside a message like "ເບີ 020 5555 1234 ເດີ": the first run of 8-15 digits
// (spaces, dashes, dots, brackets and a leading + allowed between them), as the customer wrote it.
export function phoneInText(text) {
  const runs = String(text || '').match(/\+?\(?\d[\d\s().-]{6,}\d/g) || [];
  for (const r of runs) {
    const digits = r.replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) return r.trim();
  }
  return null;
}
