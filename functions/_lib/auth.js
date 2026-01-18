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
 * Protege endpoints admin via Basic Auth.
 * - Preferência: env.ADMIN_USER e env.ADMIN_PASS (Secrets do Cloudflare)
 * - Fallback: admin / admin123
 * - Extra (opcional): header x-admin-key comparado com env.ADMIN_KEY
 *
 * Uso esperado:
 *   const auth = requireAdmin(request, env);
 *   if (!auth.ok) return json({ error: auth.error }, 401);
 */
export function requireAdmin(request, env) {
  // 1) Basic Auth (login/senha)
  const basic = parseBasicAuth(request.headers.get('Authorization'));
  const user = (env?.ADMIN_USER || 'admin').trim();
  const pass = (env?.ADMIN_PASS || 'admin123').trim();

  if (basic) {
    if (basic.user === user && basic.pass === pass) {
      return { ok: true };
    }
    return { ok: false, error: 'Login ou senha inválidos' };
  }

  // 2) Fallback opcional: X-Admin-Key (se você usar ADMIN_KEY)
  const key = request.headers.get('x-admin-key') || '';
  if (env?.ADMIN_KEY && key === env.ADMIN_KEY) {
    return { ok: true };
  }

  // não enviou Authorization
  return { ok: false, error: 'Informe login e senha' };
}
