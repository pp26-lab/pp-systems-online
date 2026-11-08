// Anousith Express customer site (app.anousith.express) talks to a GraphQL API.
// There is no public API, so this mirrors the calls the site itself makes:
//   1. customerLogin(username = phone, password) -> accessToken
//   2. itemsV2(where: { customerId, createdDate range }) -> parcels this shop sent
// Kept deliberately light: one login and a few pages per run, read-only queries only.

const ENDPOINT = 'https://pro.api.anousith.express/graphql';
const PAGE = 100;
const MAX_PAGES = 5; // 500 parcels per run is far more than a shop sends in two days
const TIMEOUT_MS = 20000;

export class CarrierError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

async function gql(query, variables, token) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // An honest name for this client; it does not pretend to be a browser.
        'User-Agent': 'PPSystems-ShippingSync/1.0 (+https://ppsystems-shop.com)',
        ...(token ? { authorization: token } : {}),
      },
      body: JSON.stringify({ query, variables }),
      signal: ctl.signal,
      redirect: 'manual', // a redirect here means the API turned this client away
    });
  } catch (e) {
    throw new CarrierError('network', e.name === 'AbortError' ? 'timeout' : e.message);
  } finally {
    clearTimeout(timer);
  }
  if (res.status >= 300 && res.status < 400) throw new CarrierError('blocked', `HTTP ${res.status}`);
  const body = await res.json().catch(() => null);
  if (!body) throw new CarrierError('bad_response', `HTTP ${res.status}`);
  if (body.errors?.length) {
    const msg = String(body.errors[0].message || '');
    if (/auth|token|login|password|unauth|permission/i.test(msg)) throw new CarrierError('auth', msg);
    throw new CarrierError('api', msg);
  }
  return body.data;
}

const LOGIN = `mutation CustomerLogin($where: CustomerLoginInput!) {
  customerLogin(where: $where) { accessToken data { id_list } }
}`;

// Only the fields needed to match a parcel to an order and tell the customer.
const ITEMS = `query ItemsV2($where: ItemV2WhereInput, $skip: Int, $limit: Int, $orderBy: OrderByItem) {
  itemsV2(where: $where, skip: $skip, limit: $limit, orderBy: $orderBy) {
    total
    data {
      trackingId
      receiverName
      receiverPhone
      itemStatus
      itemValueKIP
      createdDate
      isDeleted
      destBranchId { branch_name }
    }
  }
}`;

export async function login(username, password) {
  let data;
  try {
    data = await gql(LOGIN, { where: { username: String(username), password: String(password) } });
  } catch (e) {
    // Any refusal from the login call itself (the message may be in Lao) counts as a bad
    // login, so the caller stops retrying instead of locking the shop's account.
    if (e.code === 'api') throw new CarrierError('auth', e.message);
    throw e;
  }
  const r = data?.customerLogin;
  if (!r?.accessToken || !r?.data?.id_list) throw new CarrierError('auth', 'login rejected');
  return { token: r.accessToken, customerId: parseInt(r.data.id_list, 10) };
}

// The API may send an ISO string or epoch milliseconds (as a number or a string).
function toDate(v) {
  if (v === null || v === undefined || v === '') return null;
  const d = /^\d{10,13}$/.test(String(v)) ? new Date(Number(String(v).padEnd(13, '0'))) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Calendar day in Laos, as the site sends it ("YYYY-MM-DD", upper bound exclusive).
function laoDay(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Vientiane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// Parcels created in the last `days` days (today included).
export async function fetchRecentItems(session, days = 2) {
  const where = { customerId: session.customerId, isDeleted: 0, createdDate_gte: laoDay(-(days - 1)), createdDate_lt: laoDay(1) };
  const out = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await gql(ITEMS, { where, skip: page * PAGE, limit: PAGE, orderBy: 'createdDateDESC' }, session.token);
    const rows = data?.itemsV2?.data || [];
    out.push(...rows);
    if (rows.length < PAGE || out.length >= (data?.itemsV2?.total || 0)) break;
  }
  return mapItems(out);
}

// Raw itemsV2 rows (from the server, or sent in by the shop's browser) -> bills.
// Everything is re-checked here, since browser-sent data can't be trusted blindly.
export function mapItems(rows) {
  const seen = new Set();
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r !== 'object' || r.isDeleted) continue;
    const trackingNumber = String(r.trackingId ?? '').trim().slice(0, 64);
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(trackingNumber) || seen.has(trackingNumber)) continue;
    seen.add(trackingNumber);
    out.push({
      trackingNumber,
      receiverName: String(r.receiverName ?? '').trim().slice(0, 255),
      receiverPhone: String(r.receiverPhone ?? '').trim().slice(0, 50),
      destination: String(r.destBranchId?.branch_name ?? '').trim().slice(0, 255),
      codAmount: Math.max(0, Number(r.itemValueKIP) || 0),
      status: String(r.itemStatus ?? '').slice(0, 100),
      createdAt: toDate(r.createdDate),
    });
  }
  return out;
}

// The query the shop's browser runs on app.anousith.express (see the bookmark on the
// shipping page). Same fields as ITEMS above.
export const BROWSER_QUERY = ITEMS;
