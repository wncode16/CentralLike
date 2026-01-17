// Shared helpers
window.CL = (() => {
  const cfg = window.CENTRAL_LIKE_CONFIG || {};

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function fmt(iso){
    try{
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" });
    } catch { return ""; }
  }

  function waLink(message){
    const phone = String(cfg.WHATSAPP_NUMBER_E164 || "").replace(/[^\d+]/g, "");
    const clean = phone.startsWith("+") ? phone : ("+" + phone);
    const text = encodeURIComponent(message || "Olá! Quero anunciar na Central Like.");
    // wa.me expects country+number without +
    const wa = clean.replace(/^\+/, "");
    return `https://wa.me/${wa}?text=${text}`;
  }

  function categories(){
    return Array.isArray(cfg.CATEGORIES) ? cfg.CATEGORIES : [];
  }

  function planCards(){
    return Array.isArray(cfg.PLANS) ? cfg.PLANS : [];
  }

  return { cfg, escapeHtml, fmt, waLink, categories, planCards };
})();
