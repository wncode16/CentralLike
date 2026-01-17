(async () => {
  const listEl = document.getElementById("list");
  const qEl = document.getElementById("q");
  const catEl = document.getElementById("cat");

  let ads = [];

  async function load() {
    const res = await fetch("./ads.json", { cache: "no-store" });
    ads = await res.json();
    render();
  }

  function norm(s) {
    return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  }

  function render() {
    const q = norm(qEl.value);
    const cat = catEl.value;

    const filtered = ads.filter(a => {
      const okCat = (cat === "all") || a.category === cat;
      const hay = norm(`${a.title} ${a.description} ${a.city}`);
      const okQ = !q || hay.includes(q);
      return okCat && okQ;
    });

    listEl.innerHTML = filtered.length ? "" : "<p>Nenhum anúncio encontrado.</p>";
    filtered.forEach(a => {
      const div = document.createElement("div");
      div.className = "ad";
      div.innerHTML = `
        <h3>${escapeHtml(a.title)}</h3>
        <div class="meta">${escapeHtml(a.city)} • <b>${escapeHtml(a.price)}</b></div>
        <p>${escapeHtml(a.description)}</p>
        <div class="meta">Contato: ${escapeHtml(a.phone)}</div>
      `;
      listEl.appendChild(div);
    });
  }

  function escapeHtml(s){
    return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  }

  qEl.addEventListener("input", render);
  catEl.addEventListener("change", render);

  load();
})();
