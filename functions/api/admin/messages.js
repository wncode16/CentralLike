import { json } from '../../_lib/http.js';
import { readJson } from '../../_lib/store.js';
import { requireAdmin } from '../../_lib/auth.js';

const KEY_MSGS = 'messages';

export async function onRequestGet(context) {
  // Protege com login/senha (ADMIN_USER / ADMIN_PASS) ou fallback X-Admin-Key
  const deny = requireAdmin(context);
  if (deny) return deny;

  const { env } = context;

  // Lê mensagens do KV
  const msgs = await readJson(env.MSG_KV, KEY_MSGS, []);

  // Ordena mais recentes primeiro
  msgs.sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });

  return json(msgs);
}
