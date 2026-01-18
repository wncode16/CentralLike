// functions/_lib/auth.js
import { json } from './http.js';

function unauthorized(msg = 'Unauthorized') {
  return json({ ok: false, error: msg }, 401);
}

function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  try {
    const b64 = header.slice(6).trim();
    const raw = atob(b64);
    const i = raw.indexOf(':');
    if (i < 0) return null;
    return { user: raw.slice(0, i), pass: raw.slice(i + 1) };
  } catch {
    return null;
  }
}

/**
 * Protege endpoints admin.
 * Espera:
 *  - Secrets: ADMIN_USER, ADMIN_PASS (recomendado)
 *  - ou fallback: header x-admin-key === env.ADMIN_KEY
 */
export function requireAdmin(context) {
  const { request, env } = context;

  // 1) Basic Auth (login/senha)
  const basic = parseBasicAuth(request.headers.get('Authorization'));
  if (basic && env.ADMIN_USER && env.ADMIN_PASS) {
    if (basic.user === env.ADMIN_USER && basic.pass === env.ADMIN_PASS) return null;
    return unauthorized('Invalid credentials');
  }

  // 2) Fallback: X-Admin-Key
  const key = request.headers.get('x-admin-key') || '';
  if (env.ADMIN_KEY && key === env.ADMIN_KEY) return null;

  return unauthorized('Missing admin auth');
}
