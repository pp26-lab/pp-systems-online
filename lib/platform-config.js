import { query } from './db';
import { seal, open } from './secret-box';

// Platform-wide settings entered in the back office (not per shop) — chiefly the Meta app
// secret and verify token for Facebook Messenger. One Facebook app serves every page, so
// these are set once. A value saved here overrides the matching environment variable, so a
// server that already set them in its env keeps working until something is saved in the UI.

// Which settings hold a secret: stored encrypted, never returned to the browser.
const SECRET = new Set(['meta_app_secret', 'meta_verify_token']);

let cache = null;
let cacheAt = 0;
const TTL = 60 * 1000; // the webhook verifies every event, so don't hit the DB each time

export function clearConfigCache() { cache = null; cacheAt = 0; }

async function load() {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  let rows = [];
  try { rows = await query('SELECT name, value_enc FROM platform_settings'); } catch { rows = []; }
  const out = {};
  for (const r of rows) {
    if (r.value_enc == null || r.value_enc === '') continue;
    try { out[r.name] = SECRET.has(r.name) ? open(r.value_enc) : r.value_enc; } catch { /* unreadable: ignore */ }
  }
  cache = out;
  cacheAt = Date.now();
  return out;
}

// entries: { name: value }. '' or null deletes the setting (falls back to env, if any).
export async function setConfig(entries) {
  for (const [name, value] of Object.entries(entries)) {
    if (value === undefined) continue;
    if (value === null || value === '') {
      await query('DELETE FROM platform_settings WHERE name = ?', [name]);
      continue;
    }
    const stored = SECRET.has(name) ? seal(String(value)) : String(value).slice(0, 2000);
    await query(
      'INSERT INTO platform_settings (name, value_enc) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_enc = VALUES(value_enc)',
      [name, stored]
    );
  }
  clearConfigCache();
}

// The Meta app settings, DB first then environment. Secrets included — server-side only.
export async function metaConfig() {
  const c = await load();
  return {
    appSecret: c.meta_app_secret || process.env.META_APP_SECRET || '',
    verifyToken: c.meta_verify_token || process.env.META_VERIFY_TOKEN || '',
    graphVersion: c.meta_graph_version || process.env.META_GRAPH_VERSION || 'v23.0',
    publicBaseUrl: (c.public_base_url || process.env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  };
}

// Where each value comes from, for the back office — never the secret values themselves.
export async function configStatus() {
  const c = await load();
  const where = (key, env) => (c[key] ? 'saved' : process.env[env] ? 'env' : 'missing');
  return {
    app_secret: where('meta_app_secret', 'META_APP_SECRET'),
    verify_token: where('meta_verify_token', 'META_VERIFY_TOKEN'),
    public_base_url: c.public_base_url || process.env.PUBLIC_BASE_URL || '',
    graph_version: c.meta_graph_version || process.env.META_GRAPH_VERSION || 'v23.0',
  };
}
