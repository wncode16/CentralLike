import { json } from '../../_lib/http.js';
import { readJson } from '../../_lib/store.js';
import { requireAdmin } from '../../_lib/auth.js';

const KEY_ADS = 'ads';

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = requireAdmin(request, env);
  if (!auth.ok) return json({ error: auth.error }, 401);

  const ads = await readJson(env.ADS_KV, KEY_ADS, []);
  return json(ads);
}
