import { NextResponse } from 'next/server';
import { verifyAdminSession, adminAudit } from '../../../../lib/admin-auth';
import { hasEncryptionKey } from '../../../../lib/secret-box';
import { setConfig, metaConfig } from '../../../../lib/platform-config';

export const dynamic = 'force-dynamic';

// Save the platform-wide Facebook (Meta) app settings from the back office. These are not
// per shop: one Facebook app serves every page. Secrets are stored encrypted and never read back.
// Body: { app_secret?, verify_token?, public_base_url?, graph_version? }
//   - a non-empty string saves that value
//   - '' or null clears it (falls back to the server env, if any)
//   - a field left out is unchanged
export async function PUT(request) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasEncryptionKey()) return NextResponse.json({ error: 'missing_encryption_key' }, { status: 500 });

  const b = await request.json().catch(() => ({}));
  const entries = {};
  const changed = [];

  if (b.app_secret !== undefined) {
    const v = String(b.app_secret || '').trim();
    if (v && !/^[a-f0-9]{16,64}$/i.test(v)) return NextResponse.json({ error: 'app_secret_invalid' }, { status: 400 });
    entries.meta_app_secret = v;
    changed.push('app_secret');
  }
  if (b.verify_token !== undefined) {
    const v = String(b.verify_token || '').trim();
    if (v && (v.length < 6 || v.length > 200 || /\s/.test(v))) return NextResponse.json({ error: 'verify_token_invalid' }, { status: 400 });
    entries.meta_verify_token = v;
    changed.push('verify_token');
  }
  if (b.public_base_url !== undefined) {
    const v = String(b.public_base_url || '').trim().replace(/\/$/, '');
    if (v && !/^https:\/\/[a-z0-9.-]+(\.[a-z]{2,})(:\d+)?$/i.test(v)) return NextResponse.json({ error: 'url_invalid' }, { status: 400 });
    entries.public_base_url = v;
    changed.push('public_base_url');
  }
  if (b.graph_version !== undefined) {
    const v = String(b.graph_version || '').trim();
    if (v && !/^v\d+\.\d+$/.test(v)) return NextResponse.json({ error: 'graph_version_invalid' }, { status: 400 });
    entries.meta_graph_version = v;
    changed.push('graph_version');
  }
  if (!changed.length) return NextResponse.json({ error: 'nothing_to_save' }, { status: 400 });

  await setConfig(entries);
  await adminAudit(request, 'meta_config.saved', null, { fields: changed });

  const cfg = await metaConfig();
  return NextResponse.json({ ok: true, ready: !!(cfg.appSecret && cfg.verifyToken) });
}
