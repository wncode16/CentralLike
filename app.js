(() => {
  "use strict";

  const { cfg, escapeHtml, fmt, waLink, categories } = window.CL;

  const el = {
    siteName: document.getElementById("siteName"),
    siteCity: document.getElementById("siteCity"),
    heroTitle: document.getElementById("heroTitle"),
    year: document.getElementById("year"),
    footerName: document.getElementById("footerName"),
    waHelp: document.getElementById("waHelp"),

    q: document.getElementById("q"),
    category: document.getElementById("category"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnMore: document.getElementById("btnMore"),
    status: document.getElementById("status"),
    featuredGrid: document.getElementById("featuredGrid"),
    featuredStatus: document.getElementById("featuredStatus"),
    grid: document.getElementById("grid"),
    listStatus: document.getElementById("listStatus"),

    modal: document.getElementById("modal"),
    mImg: document.getElementById("mImg"),
    mTitle: document.getElementById("mTitle"),
    mMeta: document.getElementById("mMeta"),
    mDesc: document.getElementById("mDesc"),
    mWhats: document.getElementById("mWhats"),
  };

  const PAGE_SIZE = Number(cfg.PAGE_SIZE || 12);

  const state = {
    all: [],
    list: [],
    cursor: 0,
  };

  function setHeader() {
    const name = cfg.SITE_NAME || "Central Like";
    const city = cfg.CITY_NAME || "Sua cidade";
    document.title = `${name} — Anúncios em ${city}`;
    el.siteName.textContent = name;
    el.footerName.textContent = name;
    el.siteCity.textContent = `Anúncios pagos • ${city}`;
    el.heroTitle.textContent = `Anúncios pagos em ${city}`;
    el.year.textContent = String(new Date().getFullYear());
    el.waHelp.href = waLink(`Olá! Quero anunciar na ${name} (${city}).`);

    // categorias
    el.category.insertAdjacentHTML(
      "beforeend",
      categories().map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`).join("")
    );
  }

  function cardHtml(ad) {
    const img = (ad.image || "").trim();
    const cat = escapeHtml(ad.category || "outros");
    const featured = ad.featured ? " featured" : "";
    const title = escapeHtml(ad.title || "—");
    const desc = escapeHtml(ad.description || "");
    const price = escapeHtml(ad.price || "");
    const bairro = escapeHtml(ad.neighborhood || "");
    const time = ad.createdAt ? fmt(ad.createdAt) : "";

    const metaBits = [bairro, price, time].filter(Boolean).join(" • ");

    return `
      <article class="card" tabindex="0" role="button" data-id="${escapeHtml(ad.id)}">
        <div class="card__img" style="background-image:${img ? `url('${img.replaceAll("'","%27")}')` : "none"}"></div>
        <div class="card__body">
          <div class="badge${featured}">${ad.featured ? "⭐ Destaque" : "📌"} ${cat}</div>
          <h4 class="card__title">${title}</h4>
          <div class="card__meta">${escapeHtml(metaBits)}</div>
          <p class="card__desc">${desc || "Sem descrição."}</p>
        </div>
      </article>
    `;
  }

  function bindCardClicks(container) {
    container.querySelectorAll('.card[data-id]').forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = "1";
      const open = () => {
        const id = card.getAttribute('data-id');
        const ad = state.all.find(a => String(a.id) === String(id));
        if (ad) openModal(ad);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function openModal(ad) {
    el.mTitle.textContent = ad.title || "—";

    const parts = [
      ad.category ? String(ad.category) : "",
      ad.neighborhood ? String(ad.neighborhood) : "",
      ad.price ? String(ad.price) : "",
      ad.createdAt ? fmt(ad.createdAt) : ""
    ].filter(Boolean);

    el.mMeta.textContent = parts.join(" • ");
    el.mDesc.textContent = ad.description || "";

    const img = (ad.image || "").trim();
    if (img) {
      el.mImg.src = img;
      el.mImg.style.display = "block";
    } else {
      el.mImg.removeAttribute('src');
      el.mImg.style.display = "none";
    }

    const phone = String(ad.whatsapp || "").replace(/\D/g, "");
    if (phone) {
      const msg = encodeURIComponent(`Olá! Tenho interesse no anúncio: ${ad.title || ""}`);
      el.mWhats.href = `https://wa.me/55${phone}?text=${msg}`;
      el.mWhats.style.display = "";
    } else {
      el.mWhats.href = waLink(`Olá! Tenho interesse no anúncio: ${ad.title || ""}`);
      el.mWhats.style.display = "";
    }

    el.modal.classList.add('is-open');
    el.modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    el.modal.classList.remove('is-open');
    el.modal.setAttribute('aria-hidden', 'true');
  }

  function applyFilters() {
    const q = (el.q.value || "").trim().toLowerCase();
    const cat = (el.category.value || "").trim().toLowerCase();

    let list = [...state.all];

    // remove expirados (se o admin definir expiryAt)
    const now = Date.now();
    list = list.filter(a => {
      if (!a.expiryAt) return true;
      const t = new Date(a.expiryAt).getTime();
      return Number.isNaN(t) ? true : t > now;
    });

    if (cat) list = list.filter(a => String(a.category || "").toLowerCase() === cat);

    if (q) {
      list = list.filter(a => {
        const hay = `${a.title||""} ${a.description||""} ${a.neighborhood||""} ${a.price||""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // featured first
    list.sort((a,b) => {
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      if (fb !== fa) return fb - fa;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    state.list = list;
    state.cursor = 0;
  }

  function renderFeatured() {
    const featured = state.all.filter(a => a.featured);
    featured.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));

    el.featuredGrid.innerHTML = featured.slice(0, 6).map(cardHtml).join("");
    bindCardClicks(el.featuredGrid);

    el.featuredStatus.textContent = featured.length
      ? `Mostrando ${Math.min(6, featured.length)} de ${featured.length} destaques.`
      : "Nenhum destaque no momento.";
  }

  function renderNextPage() {
    const slice = state.list.slice(state.cursor, state.cursor + PAGE_SIZE);
    state.cursor += PAGE_SIZE;

    if (state.cursor <= PAGE_SIZE) el.grid.innerHTML = "";

    el.grid.insertAdjacentHTML('beforeend', slice.map(cardHtml).join(""));
    bindCardClicks(el.grid);

    const total = state.list.length;
    const shown = Math.min(state.cursor, total);

    el.listStatus.textContent = total ? `Mostrando ${shown} de ${total} anúncios.` : "Nenhum anúncio encontrado.";
    el.btnMore.style.display = state.cursor < total ? "" : "none";
  }

  async function load() {
    el.status.textContent = "Carregando…";
    try {
      const res = await fetch(`/api/ads?city=${encodeURIComponent(cfg.CITY_NAME || "")}`, { cache: "no-store" });
      const data = await res.json();
      state.all = Array.isArray(data) ? data : [];

      renderFeatured();
      applyFilters();
      renderNextPage();

      el.status.textContent = `Atualizado. ${state.all.length} anúncio(s) ativo(s).`;
    } catch (e) {
      console.error(e);
      el.status.textContent = `⚠️ Falha ao carregar anúncios: ${e?.message || "erro"}`;
      el.listStatus.textContent = "";
      el.featuredStatus.textContent = "";
      el.btnMore.style.display = "none";
    }
  }

  // events
  el.btnRefresh.addEventListener('click', () => load());
  el.btnMore.addEventListener('click', () => renderNextPage());
  el.q.addEventListener('input', () => { applyFilters(); renderNextPage(); });
  el.category.addEventListener('change', () => { applyFilters(); renderNextPage(); });

  el.modal.querySelectorAll('[data-close="1"]').forEach(x => x.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  setHeader();
  load();
})();
