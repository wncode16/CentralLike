// functions/api/image.js
export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders(),
    });
  }

  if (!env.IMAGES_R2) {
    return new Response(
      JSON.stringify({ ok: false, error: "R2 binding IMAGES_R2 not configured" }),
      { status: 500, headers: jsonHeaders() }
    );
  }

  const url = new URL(request.url);
  const key = (url.searchParams.get("key") || "").trim();

  if (!key) {
    return new Response("Missing key", {
      status: 400,
      headers: corsHeaders(),
    });
  }

  const obj = await env.IMAGES_R2.get(key);
  if (!obj) {
    return new Response("Not found", {
      status: 404,
      headers: corsHeaders(),
    });
  }

  // Headers (tipo/caching/etag)
  const headers = new Headers(corsHeaders());
  obj.writeHttpMetadata(headers);

  // ETag (para cache e revalidação)
  if (obj.httpEtag) headers.set("etag", obj.httpEtag);

  // Cache forte (imagens são imutáveis pois o nome é UUID)
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(obj.body, { headers });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonHeaders() {
  return {
    ...corsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
  };
}
