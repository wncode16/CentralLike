import { json, badRequest } from '../_lib/http.js';
import { readJson, writeJson, nowIso } from '../_lib/store.js';

const KEY_ADS = 'ads';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const city = (url.searchParams.get('city') || '').trim().toLowerCase();
  const category = (url.searchParams.get('category') || '').trim().toLowerCase();
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();

  const ads = await readJson(env.ADS_KV, KEY_ADS, []);

  const now = Date.now();
  let list = ads.filter(a => (a.status || 'pending') === 'active');

  if (city) list = list.filter(a => String(a.city || '').toLowerCase() === city);

  // expiry filter
  list = list.filter(a => {
    if (!a.expiryAt) return true;
    const t = new Date(a.expiryAt).getTime();
    return Number.isNaN(t) ? true : t > now;
  });

  if (category) list = list.filter(a => String(a.category || '').toLowerCase() === category);

  if (q) {
    list = list.filter(a => {
      const hay = `${a.title||''} ${a.description||''} ${a.neighborhood||''} ${a.price||''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // featured first, then newest
  list.sort((a, b) => {
    const fa = a.featured ? 1 : 0;
    const fb = b.featured ? 1 : 0;
    if (fb !== fa) return fb - fa;

    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });

  return json(list);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return badRequest('Invalid JSON'); }

  const city = String(body.city || '').trim();
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const whatsapp = String(body.whatsapp || '').replace(/\D/g, '');

  if (!city) return badRequest('Missing city');
  if (!title) return badRequest('Missing title');
  if (!description) return badRequest('Missing description');
  if (!whatsapp || whatsapp.length < 10) return badRequest('Invalid whatsapp');

  const ad = {
    id: crypto.randomUUID(),
    city,
    title,
    price: String(body.price || '').trim(),
    category: String(body.category || 'outros').trim().toLowerCase(),
    neighborhood: String(body.neighborhood || '').trim(),
    whatsapp,
    image: String(body.image || '').trim(),
    description,
    plan: String(body.plan || '').trim(),

    // admin fields
    status: 'pending',
    paid: false,
    featured: false,
    expiryAt: null,

    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const ads = await readJson(env.ADS_KV, KEY_ADS, []);
  ads.unshift(ad);
  await writeJson(env.ADS_KV, KEY_ADS, ads);

  return json({ ok: true, id: ad.id });
}
