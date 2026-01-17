export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors() });
  }

  // GET /api/ads?category=...&q=...
  if (request.method === "GET") {
    const raw = (await env.ADS_KV.get("ads")) || "[]";
    let ads = [];
    try { ads = JSON.parse(raw); } catch { ads = []; }

    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const category = (url.searchParams.get("category") || "all").trim().toLowerCase();

    if (category !== "all") {
      ads = ads.filter(a => String(a.category || "").toLowerCase() === category);
    }

    if (q) {
      ads = ads.filter(a => {
        const hay = `${a.title||""} ${a.description||""} ${a.city||""} ${a.price||""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // Ordena por data desc
    ads.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return json(ads);
  }

  // POST /api/ads  (admin)
  if (request.method === "POST") {
    const auth = request.headers.get("Authorization") || "";
    if (auth !== `Bearer ${env.ADMIN_KEY}`) return json({ error: "Unauthorized" }, 401);

    const body = await request.json();

    const now = new Date().toISOString();
    const raw = (await env.ADS_KV.get("ads")) || "[]";
    let ads = [];
    try { ads = JSON.parse(raw); } catch { ads = []; }

    const ad = {
      id: crypto.randomUUID(),
      title: String(body.title || "").trim() || "Sem título",
      price: String(body.price || "").trim(),
      city: String(body.city || "").trim(),
      phone: String(body.phone || "").trim(),
      category: String(body.category || "outros").trim().toLowerCase(),
      image: String(body.image || "").trim(),
      description: String(body.description || "").trim(),
      createdAt: now
    };

    ads.unshift(ad);
    await env.ADS_KV.put("ads", JSON.stringify(ads));

    return json(ad, 201);
  }

  return new Response("Not found", { status: 404, headers: cors() });
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}
