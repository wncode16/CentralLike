// GET /api/image/<key>
// Reads from R2 and returns the file.

export async function onRequestGet(context) {
  const { env, params } = context;

  if (!env.IMAGES_R2) {
    return new Response('Missing R2 binding IMAGES_R2', { status: 500 });
  }

  const p = params.key;
  const key = Array.isArray(p) ? p.join('/') : String(p || '');
  if (!key) return new Response('Not Found', { status: 404 });

  const obj = await env.IMAGES_R2.get(key);
  if (!obj) return new Response('Not Found', { status: 404 });

  const headers = new Headers();
  const ct = obj.httpMetadata?.contentType || 'application/octet-stream';
  headers.set('Content-Type', ct);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(obj.body, { headers });
}
