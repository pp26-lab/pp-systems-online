// Prices for one product line. Used by the sell screen, the chat sale panel AND the server
// (which re-checks every price), so all three always agree.
//
// Product types:
//   standard - one price (options like colour / size share it)
//   small    - "small items" sold in quantity: the price per unit drops once the quantity
//              bought reaches a step, e.g. 1 letter 30,000; 2+ letters 22,500 each.
// The quantity counted for a step is the whole quantity of that product in the order, all
// options together (2 pink letters + 1 blue letter = 3 letters).

export const PRODUCT_TYPES = ['standard', 'small'];
export const MAX_STEPS = 10;

// Clean price steps: [{ min_qty, price }], min_qty >= 2, price > 0, sorted, one per quantity.
export function cleanSteps(raw) {
  let list = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { list = []; }
  }
  if (!Array.isArray(list)) return [];
  const byQty = new Map();
  for (const s of list) {
    const min = Math.floor(Number(s?.min_qty));
    const price = Number(s?.price);
    if (Number.isFinite(min) && min >= 2 && min <= 100000 && Number.isFinite(price) && price > 0) byQty.set(min, price);
  }
  return [...byQty.entries()].sort((a, b) => a[0] - b[0]).slice(0, MAX_STEPS).map(([min_qty, price]) => ({ min_qty, price }));
}

export function isSmall(p) {
  return p?.product_type === 'small';
}

// The step reached with this quantity, or null.
export function stepFor(p, qty) {
  if (!isSmall(p)) return null;
  let hit = null;
  for (const s of cleanSteps(p.price_tiers)) if (qty >= s.min_qty) hit = s;
  return hit;
}

// The next step not reached yet (for "buy N more to pay X each"), or null.
export function nextStep(p, qty) {
  if (!isSmall(p)) return null;
  return cleanSteps(p.price_tiers).find(s => qty < s.min_qty) || null;
}

// Price per unit in LAK for `qty` units, for a customer type. The customer always gets the
// lower of their own price (wholesale / member) and the quantity step.
export function unitPrice(p, qty, type = 'retail') {
  const retail = Number(p.selling_price_lak) || 0;
  const wholesale = Number(p.wholesale_price_lak) || 0;
  const member = Number(p.member_price_lak) || 0;
  let base = retail;
  if (type === 'wholesale' && wholesale > 0) base = wholesale;
  else if (type === 'member' && member > 0) base = member;
  const step = stepFor(p, qty);
  return step ? Math.min(base, step.price) : base;
}

// Total quantity per product in a cart / order: { [product_id]: qty }.
export function qtyByProduct(lines, idKey = 'product_id') {
  const m = {};
  for (const l of lines) m[l[idKey]] = (m[l[idKey]] || 0) + (Number(l.quantity) || 0);
  return m;
}
