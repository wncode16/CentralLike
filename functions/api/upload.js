import { json, badRequest } from '../_lib/http.js';

// POST /api/upload
// Body: raw image bytes (fetch(file) style)
// Headers: Content-Type: image/jpeg|image/png|image/webp
// Returns: { ok:true, key, url }

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function extFromContentType(ct) {
  const t = (ct || '').toLowerCase();
  if (t.includes('image/jpeg')) return 'jpg';
  if (t.includes('image/png')) return 'png';
  if (t.includes('image/webp')) return 'webp';
  return '';
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.IMAGES_R2) {
    // Binding missing
    return badRequest('Missing R2 binding IMAGES_R2');
  }

  const ct = request.headers.get('content-type') || '';
  if (!ct.toLowerCase().startsWith('image/')) {
    return badRequest('Invalid Content-Type (must be image/*)');
  }

  const ext = extFromContentType(ct);
  if (!ext) {
    return badRequest('Only JPG, PNG or WebP are allowed');
  }

  const buf = await request.arrayBuffer();
  if (buf.byteLength === 0) return badRequest('Empty body');
  if (buf.byteLength > MAX_BYTES) return badRequest('Image too large (max 5MB)');

  const key = `ads/${crypto.randomUUID()}.${ext}`;

  await env.IMAGES_R2.put(key, buf, {
    httpMetadata: { contentType: ct },
  });

  // Served via our own function (no public bucket needed)
  const url = `/api/image/${encodeURIComponent(key)}`;
  return json({ ok: true, key, url });
}
