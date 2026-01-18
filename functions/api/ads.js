import { json, badRequest } from '../_lib/http.js';
import { readJson, writeJson, nowIso } from '../_lib/store.js';

const KEY_ADS = 'ads';

function safeStr(v, max = 5000) {
  const s = String(v ?? '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeKey(key) {
  // bloqueia caminhos estranhos tipo ../
  const k = String(key || '').trim();
  if (!k) return '';
  if (k.includes('..')) return '';
  // opcional: impedir barras invertidas
  if (k.includes('\\')) return '';
  return k;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const city = safeStr(url.searchParams.get('city') || '', 120).toLowerCase();
  const category = safeStr(url.searchParams.get('category') || '', 120).toLowerCase();
  const q = safeStr(url.searchParams.get('q') || '', 200).toLowerCase();

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
      const hay = `${a.title || ''} ${a.description || ''} ${a.neighborhood || ''} ${a.price || ''}`.toLowerCase();
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

  const city = safeStr(body.city, 120);
  const title = safeStr(body.title, 120);
  const description = safeStr(body.description, 5000);
  const whatsapp = safeStr(body.whatsapp, 40).replace(/\D/g, '');

  if (!city) return badRequest('Missing city');
  if (!title) return badRequest('Missing title');
  if (!description) return badRequest('Missing description');
  if (!whatsapp || whatsapp.length < 10) return badRequest('Invalid whatsapp');

  // ✅ NOVO: aceita imageKey do R2
  const imageKey = normalizeKey(body.imageKey);
  const imageLink = safeStr(body.image, 800);

  // prioridade: se tiver imageKey, usa /api/image?key=
  const image =
    imageKey
      ? `/api/image?key=${encodeURIComponent(imageKey)}`
      : imageLink;

  const ad = {
    id: crypto.randomUUID(),
    city,
    title,
    price: safeStr(body.price, 60),
    category: safeStr(body.category || 'outros', 80).toLowerCase(),
    neighborhood: safeStr(body.neighborhood, 120),
    whatsapp,

    // ✅ guarda os dois (facilita admin e debug)
    imageKey: imageKey || '',
    image: image || '',

    description,
    plan: safeStr(body.plan, 80),

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

  return json({ ok: true, id: ad.id, image: ad.image, imageKey: ad.imageKey });
}
