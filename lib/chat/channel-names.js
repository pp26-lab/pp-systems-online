import { query } from '../db';
import { open } from '../secret-box';
import { messengerPageName } from './meta';

// Pages connected before names were read (or when Meta didn't give one) show their page id.
// Ask Meta for the name in the background, at most once every 6 hours per page, and store it.
// A name the back office typed (label) always wins and is never touched here.

const RETRY_MS = 6 * 3600 * 1000;
const tried = new Map(); // channel id -> last attempt (per server process)

export function fillMissingPageNames(shopId) {
  run(shopId).catch(e => console.warn('fillMissingPageNames:', e.message));
}

async function run(shopId) {
  const rows = await query(
    "SELECT id, external_id, token_enc FROM chat_channels WHERE shop_id = ? AND platform = 'messenger' AND name = '' AND label = '' AND status <> 'disabled'",
    [shopId]
  );
  const now = Date.now();
  for (const ch of rows) {
    if (now - (tried.get(ch.id) || 0) < RETRY_MS) continue;
    tried.set(ch.id, now);
    let token;
    try { token = open(ch.token_enc); } catch { continue; }
    const name = await messengerPageName(ch.external_id, token);
    if (name) await query("UPDATE chat_channels SET name = ? WHERE id = ? AND shop_id = ? AND name = ''", [name.slice(0, 255), ch.id, shopId]);
  }
}
