export async function readJson(kv, key, fallback) {
  const raw = await kv.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export async function writeJson(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
}

export function nowIso(){
  return new Date().toISOString();
}
