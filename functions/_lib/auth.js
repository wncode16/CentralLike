export function requireAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const expected = `Bearer ${env.ADMIN_KEY}`;
  if (!env.ADMIN_KEY) {
    return { ok: false, error: 'Missing ADMIN_KEY secret on server' };
  }
  if (auth !== expected) {
    return { ok: false, error: 'Unauthorized' };
  }
  return { ok: true };
}
