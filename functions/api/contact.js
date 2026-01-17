import { json, badRequest } from './_lib/http.js';
import { readJson, writeJson, nowIso } from './_lib/store.js';

const KEY_MSGS = 'messages';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return badRequest('Invalid JSON'); }

  const name = String(body.name || '').trim();
  const message = String(body.message || '').trim();
  if (!name) return badRequest('Missing name');
  if (!message) return badRequest('Missing message');

  const entry = {
    id: crypto.randomUUID(),
    city: String(body.city || '').trim(),
    name,
    phone: String(body.phone || '').replace(/\D/g, ''),
    email: String(body.email || '').trim(),
    subject: String(body.subject || '').trim(),
    message,
    createdAt: nowIso()
  };

  const msgs = await readJson(env.MSG_KV, KEY_MSGS, []);
  msgs.unshift(entry);
  await writeJson(env.MSG_KV, KEY_MSGS, msgs);

  return json({ ok: true, id: entry.id });
}
