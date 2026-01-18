import { json } from '../../_lib/http.js';
import { readJson } from '../../_lib/store.js';
import { requireAdmin } from '../../_lib/auth.js';

const KEY_ADS = 'ads';

function safeStr(v, max = 200) {
  const s = String(v ?? '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  // ✅ Protegido por login (auth.js)
  const auth = requireAdmin(request, env);
  if (!auth.ok) return json({ error: auth.error }, 401);

  const url = new URL(request.url);
  const status = safeStr(url.searchParams.get('status') || '', 20).toLowerCase(); // pending/active/rejected
  const featuredOnly = (url.searchParams.get('featured') || '') === '1';
  const q = safeStr(url.searchParams.get('q') || '', 200).toLowerCase();
  const city = safeStr(url.searchParams.get('city') || '', 120).toLowerCase();

  const ads = await readJson(env.ADS_KV, KEY_ADS, []);

  let list = Array.isArray(ads) ? ads.slice() : [];

  // garantir image se houver imageKey
  list = list.map(a => {
    const imageKey = String(a?.imageKey || '').trim();
    const image = String(a?.image || '').trim();
    if (!image && imageKey) {
      return { ...a, image: `/api/image?key=${encodeURIComponent(imageKey)}` };
    }
    return a;
  });

  // filtros
  if (status) {
    list = list.filter(a => String(a.status || 'pending').toLowerCase() === status);
  }

  if (featuredOnly) {
    list = list.filter(a => Boolean(a.featured));
  }

  if (city) {
    list = list.filter(a => String(a.city || '').toLowerCase() === city);
  }

  if (q) {
    list = list.filter(a => {
      const hay = `${a.title || ''} ${a.description || ''} ${a.neighborhood || ''} ${a.price || ''} ${a.whatsapp || ''} ${a.plan || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // ordenar: destaque primeiro, depois mais novos
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
