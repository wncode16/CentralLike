(() => {
  "use strict";

  const PAGE_SIZE = 9;

  const el = {
    year: document.getElementById("year"),
    grid: document.getElementById("grid"),
    statusText: document.getElementById("statusText"),
    q: document.getElementById("q"),
    category: document.getElementById("category"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnMore: document.getElementById("btnMore"),

    modal: document.getElementById("modal"),
    mImg: document.getElementById("mImg"),
    mTitle: document.getElementById("mTitle"),
    mMeta: document.getElementById("mMeta"),
    mDesc: document.getElementById("mDesc"),
    mWhats: document.getElementById("mWhats"),

    adminModal: document.getElementById("adminModal"),
    btnAdmin: document.getElementById("btnAdmin"),
    btnPublish: document.getElementById("btnPublish"),
    adminStatus: document.getElementById("adminStatus"),

    aTitle: document.getElementById("aTitle"),
    aPrice: document.getElementById("aPrice"),
    aCity: document.getElementById("aCity"),
    aPhone: document.getElementById("aPhone"),
    aCategory: document.getElementById("aCategory"),
    aImage: document.getElementById("aImage"),
    aDesc: document.getElementById("aDesc"),
    aKey: document.getElementById("aKey"),
  };

  const state = {
    all: [],
    filtered: [],
    cursor: 0,
    loading: false,
  };

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmt(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "";
    }
  }

  function setStatus(t) { el.statusText.textContent = t || ""; }

  function setLoading(v) {
    state.loading = v;
    el.btnRefresh.disabled = v;
    el.btnMore.disabled = v;
  }

  async function fetchAds() {
    const qs = new URLSearchParams();
    const q = el.q.value.trim();
    const cat = el.category.value;

    if (q) qs.set("q", q);
    if (cat) qs.set("category", cat);

    const url = `/api/ads?${qs.toString()}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Erro ${res.status}: ${text || res.statusText}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  function renderReset() {
    el.grid.innerHTML = "";
    state.cursor = 0;
  }

  function renderMore() {
    const slice = state.filtered.slice(state.cursor, state.cursor + PAGE_SIZE);
    state.cursor += PAGE_SIZE;

    slice.forEach(ad => el.grid.insertAdjacentHTML("beforeend", cardHtml(ad)));

    const total = state.filtered.length;
    const shown = Math.min(state.cursor, total);
    setStatus(total ? `Mostrando ${shown} de ${total} anúncios.` : "Nenhum anúncio encontrado.");

    el.btnMore.style.display = state.cursor < total ? "" : "none";

    // attach click handlers
    el.grid.querySelectorAll(".card[data-id]").forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = "1";
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        const ad = state.all.find(x => String(x.id) === String(id));
        if (ad) openModal(ad);
      });
    });
  }

  function cardHtml(ad) {
    const title = escapeHtml(ad.title || "—");
    const desc = escapeHtml(ad.description || "");
    const city = escapeHtml(ad.city || "");
    const price = escapeHtml(ad.price || "");
    const cat = escapeHtml(ad.category || "outros");
    const time = fmt(ad.createdAt);
    const img = (ad.image || "").trim();

    return `
      <article class="card" tabindex="0" role="button" data-id="${escapeHtml(ad.id)}">
        <div class="card__img" style="background-image:${img ? `url('${img.replaceAll("'", "%27")}')` : "none"}"></div>
        <div class="card__body">
          <div class="badge">${cat}</div>
          <h3 class="card__title">${title}</h3>
          <div class="card__meta">
            ${city ? `<span>${city}</span>` : ""}
            ${price ? `<span><b>${price}</b></span>` : ""}
            ${time ? `<span>${escapeHtml(time)}</span>` : ""}
          </div>
          ${desc ? `<p class="card__desc">${desc}</p>` : `<p class="card__desc">Sem descrição.</p>`}
        </div>
      </article>
    `;
  }

  function openModal(ad) {
    el.mTitle.textContent = ad.title || "—";

    const meta = [
      ad.category ? String(ad.category) : "",
      ad.city ? String(ad.city) : "",
      ad.price ? String(ad.price) : "",
      ad.createdAt ? fmt(ad.createdAt) : "",
    ].filter(Boolean).join(" • ");
    el.mMeta.textContent = meta;

    el.mDesc.textContent = ad.description || "";

    const img = (ad.image || "").trim();
    if (img) {
      el.mImg.src = img;
      el.mImg.style.display = "block";
    } else {
      el.mImg.removeAttribute("src");
      el.mImg.style.display = "none";
    }

    // WhatsApp
    const phone = String(ad.phone || "").replace(/\D/g, "");
    if (phone) {
      const msg = encodeURIComponent(`Olá! Tenho interesse no anúncio: ${ad.title || ""}`);
      el.mWhats.href = `https://wa.me/55${phone}?text=${msg}`;
      el.mWhats.style.display = "";
    } else {
      el.mWhats.href = "#";
      el.mWhats.style.display = "none";
    }

    el.modal.classList.add("is-open");
    el.modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    el.modal.classList.remove("is-open");
    el.modal.setAttribute("aria-hidden", "true");
  }

  function openAdmin() {
    el.adminStatus.textContent = "";
    el.adminModal.classList.add("is-open");
    el.adminModal.setAttribute("aria-hidden", "false");
  }

  function closeAdmin() {
    el.adminModal.classList.remove("is-open");
    el.adminModal.setAttribute("aria-hidden", "true");
  }

  async function load({ reset }) {
    if (state.loading) return;
    setLoading(true);

    try {
      if (reset) {
        setStatus("Carregando…");
        renderReset();
        state.all = await fetchAds();
        state.filtered = state.all;
        renderMore();
      } else {
        renderMore();
      }
    } catch (e) {
      console.error(e);
      setStatus(`⚠️ ${e?.message || "Falha ao carregar anúncios"}`);
      el.btnMore.style.display = "none";
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    const key = el.aKey.value.trim();
    if (!key) {
      el.adminStatus.textContent = "⚠️ Digite a ADMIN_KEY para publicar.";
      return;
    }

    const payload = {
      title: el.aTitle.value.trim(),
      price: el.aPrice.value.trim(),
      city: el.aCity.value.trim(),
      phone: el.aPhone.value.trim(),
      category: el.aCategory.value,
      image: el.aImage.value.trim(),
      description: el.aDesc.value.trim(),
    };

    if (!payload.title || !payload.description) {
      el.adminStatus.textContent = "⚠️ Preencha pelo menos Título e Descrição.";
      return;
    }

    el.adminStatus.textContent = "Publicando…";

    const res = await fetch("/api/ads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      el.adminStatus.textContent = `⚠️ Erro ${res.status}: ${text || "Falha ao publicar"}`;
      return;
    }

    el.adminStatus.textContent = "✅ Publicado! Atualizando lista…";

    // limpa campos (menos a key)
    el.aTitle.value = "";
    el.aPrice.value = "";
    el.aCity.value = "";
    el.aPhone.value = "";
    el.aImage.value = "";
    el.aDesc.value = "";
    el.aCategory.value = "outros";

    await load({ reset: true });
  }

  // Eventos
  el.year.textContent = String(new Date().getFullYear());

  el.btnRefresh.addEventListener("click", () => load({ reset: true }));
  el.btnMore.addEventListener("click", () => load({ reset: false }));

  el.q.addEventListener("input", () => load({ reset: true }));
  el.category.addEventListener("change", () => load({ reset: true }));

  // Modal close
  el.modal.querySelectorAll("[data-close='1']").forEach(x => x.addEventListener("click", closeModal));
  el.adminModal.querySelectorAll("[data-close-admin='1']").forEach(x => x.addEventListener("click", closeAdmin));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(); closeAdmin(); }
  });

  el.btnAdmin.addEventListener("click", openAdmin);
  el.btnPublish.addEventListener("click", publish);

  // Init
  load({ reset: true });
})();
