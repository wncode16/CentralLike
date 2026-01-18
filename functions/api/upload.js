// functions/api/upload.js
export async function onRequest(context) {
  const { request, env } = context;

  // CORS (para permitir chamadas do seu próprio site e também testes)
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders(),
    });
  }

  // Confere se o binding do R2 existe
  if (!env.IMAGES_R2) {
    return new Response(
      JSON.stringify({ ok: false, error: "R2 binding IMAGES_R2 not configured" }),
      { status: 500, headers: jsonHeaders() }
    );
  }

  // Tipo do arquivo vem do header
  const contentType = (request.headers.get("Content-Type") || "").toLowerCase();

  // Extensão suportada
  const ext = extFromContentType(contentType);
  if (!ext) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Invalid Content-Type. Use image/jpeg, image/png or image/webp",
      }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  // Lê o corpo como bytes
  const bytes = await request.arrayBuffer();

  // Limite 5MB
  const maxBytes = 5 * 1024 * 1024;
  if (bytes.byteLength <= 0) {
    return new Response(
      JSON.stringify({ ok: false, error: "Empty body" }),
      { status: 400, headers: jsonHeaders() }
    );
  }
  if (bytes.byteLength > maxBytes) {
    return new Response(
      JSON.stringify({ ok: false, error: "Image too large (max 5MB)" }),
      { status: 413, headers: jsonHeaders() }
    );
  }

  // Gera key
  const id = crypto.randomUUID();
  const key = `ads/${id}.${ext}`;

  // Salva no R2
  await env.IMAGES_R2.put(key, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  // URL para acessar via Function /api/image
  const url = `/api/image?key=${encodeURIComponent(key)}`;

  return new Response(
    JSON.stringify({ ok: true, key, url }),
    { status: 200, headers: jsonHeaders() }
  );
}

function extFromContentType(ct) {
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return "jpg";
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/webp")) return "webp";
  return "";
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonHeaders() {
  return {
    ...corsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
  };
}
