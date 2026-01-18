import { json, badRequest } from '../../_lib/http.js';
import { readJson, writeJson, nowIso } from '../../_lib/store.js';
import { requireAdmin } from '../../_lib/auth.js';

const KEY_ADS = 'ads';

function notFound() {
  return json({ ok: false, error: 'Not found' }, 404);
}

export async function onRequestPost(context) {
  const { env, request } = context;

  // ✅ Proteção (Basic Auth)
  const auth = requireAdmin(request, env);
  if (!auth.ok) return json({ error: auth.error }, 401);

  let body;
  try { body = await request.json(); }
  catch { return badRequest('Invalid JSON'); }

  const id = String(body.id || '').trim();
  if (!id) return badRequest('Missing id');

  const ads = await readJson(env.ADS_KV, KEY_ADS, []);
  const idx = ads.findIndex(a => String(a.id) === id);
  if (idx === -1) return notFound();

  // DELETE
  if (body.delete === true) {
    const filtered = ads.filter(a => String(a.id) !== id);
    await writeJson(env.ADS_KV, KEY_ADS, filtered);
    return json({ ok: true, deleted: true });
  }

  // PATCH
  const patch = body.patch || {};
  if (!patch || typeof patch !== 'object') {
    return badRequest('Nothing to do. Send {delete:true} or {patch:{...}}');
  }

  const ad = ads[idx];

  if (patch.status !== undefined) ad.status = String(patch.status || '').trim();
  if (patch.paid !== undefined) ad.paid = !!patch.paid;
  if (patch.featured !== undefined) ad.featured = !!patch.featured;

  if (patch.expiryAt !== undefined) {
    const v = patch.expiryAt;
    if (v === null || v === '') ad.expiryAt = null;
    else {
      const t = new Date(String(v)).getTime();
      if (Number.isNaN(t)) return badRequest('Invalid expiryAt (use ISO string)');
      ad.expiryAt = new Date(t).toISOString();
    }
  }

  ad.updatedAt = nowIso();
  ads[idx] = ad;

  await writeJson(env.ADS_KV, KEY_ADS, ads);
  return json({ ok: true, id });
}
