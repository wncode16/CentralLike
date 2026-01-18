(() => {
  "use strict";

  const CL = window.CL || {};
  const cfg = CL.cfg || window.CENTRAL_LIKE_CONFIG || {};

  // header/footer
  const siteName = cfg.SITE_NAME || 'Central Like';
  const cityName = cfg.CITY_NAME || 'Brusque';
  const elSiteName = document.getElementById('siteName');
  const elFooterName = document.getElementById('footerName');
  const elSiteCity = document.getElementById('siteCity');
  const elYear = document.getElementById('year');
  if (elSiteName) elSiteName.textContent = siteName;
  if (elFooterName) elFooterName.textContent = siteName;
  if (elSiteCity) elSiteCity.textContent = `Admin • ${cityName}`;
  if (elYear) elYear.textContent = String(new Date().getFullYear());

  const els = {
    loginBox: document.getElementById('loginBox'),
    panel: document.getElementById('panel'),
    messagesPanel: document.getElementById('messagesPanel'),

    adminUser: document.getElementById('adminUser'),
    adminPass: document.getElementById('adminPass'),
    btnLogin: document.getElementById('btnLogin'),
    btnLogout: document.getElementById('btnLogout'),
    loginStatus: document.getElementById('loginStatus'),

    filterStatus: document.getElementById('filterStatus'),
    btnFeaturedOnly: document.getElementById('btnFeaturedOnly'),
    q: document.getElementById('q'),
    btnReload: document.getElementById('btnReload'),
    adsBody: document.getElementById('adsBody'),
    status: document.getElementById('status'),
    countInfo: document.getElementById('countInfo'),

    btnLoadMsgs: document.getElementById('btnLoadMsgs'),
    msgsBody: document.getElementById('msgsBody'),
    msgsStatus: document.getElementById('msgsStatus'),
  };

  let featuredOnly = false;
  let adsCache = [];

  // session storage key for Basic Auth
  const SKEY = 'CL_ADMIN_BASIC';

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setLoginStatus(t){ if (els.loginStatus) els.loginStatus.textContent = t || ''; }
  function setStatus(t){ if (els.status) els.status.textContent = t || ''; }
  function setMsgsStatus(t){ if (els.msgsStatus) els.msgsStatus.textContent = t || ''; }

  function getAuthHeader() {
    const v = sessionStorage.getItem(SKEY);
    return v ? `Basic ${v}` : '';
  }

  function setAuth(user, pass) {
    const b64 = btoa(`${user}:${pass}`);
    sessionStorage.setItem(SKEY, b64);
  }

  function clearAuth() {
    sessionStorage.removeItem(SKEY);
  }

  async function apiFetch(url, opts = {}) {
    const headers = new Headers(opts.headers || {});
    headers.set('Accept', 'application/json');

    const auth = getAuthHeader();
    if (auth) headers.set('Authorization', auth);

    const res = await fetch(url, { ...opts, headers });

    const text = await res.text().catch(() => '');
    let data = null;
    try { data = text ? JSON.parse(text) : null; }
    catch { data = { raw: text }; }

    if (!res.ok) {
      const msg = data?.error || data?.message || text || res.statusText;
      throw new Error(msg);
    }
    return data;
  }

  function showPanel(on) {
    if (els.panel) els.panel.style.display = on ? '' : 'none';
    if (els.messagesPanel) els.messagesPanel.style.display = on ? '' : 'none';
    if (els.btnLogout) els.btnLogout.style.display = on ? '' : 'none';
  }

  function badge(text, kind='neutral') {
    const cls = `badge badge--${kind}`;
    return `<span class="${cls}">${escapeHtml(text)}</span>`;
  }

  function planBadge(plan) {
    const p = String(plan || '').toLowerCase();
    if (!p) return badge('—', 'neutral');
    if (p.includes('destaque')) return badge(plan, 'hot');
    if (p.includes('premium')) return badge(plan, 'ok');
    return badge(plan, 'neutral');
  }

  function paidBadge(paid) {
    return paid ? badge('Pago', 'ok') : badge('Pendente', 'warn');
  }

  function featuredBadge(featured) {
    return featured ? badge('Sim', 'hot') : badge('Não', 'neutral');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) return '—';
    return t.toLocaleDateString('pt-BR');
  }

  function applyFilters(list) {
    const st = (els.filterStatus?.value || 'all');
    const q = (els.q?.value || '').trim().toLowerCase();

    let out = list.slice();

    if (st !== 'all') out = out.filter(a => String(a.status || '').toLowerCase() === st);

    if (featuredOnly) {
      out = out.filter(a => a.featured && String(a.status || '').toLowerCase() === 'active');
    }

    if (q) {
      out = out.filter(a => {
        const hay = `${a.title||''} ${a.whatsapp||''} ${a.category||''} ${a.neighborhood||''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // destaque primeiro, depois mais novo
    out.sort((a, b) => {
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      if (fb !== fa) return fb - fa;
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });

    return out;
  }

  function renderAds() {
    const list = applyFilters(adsCache);

    if (els.countInfo) {
      els.countInfo.textContent = `Mostrando ${list.length} anúncio(s) (total: ${adsCache.length}).`;
    }

    if (!els.adsBody) return;

    els.adsBody.innerHTML = list.map(ad => {
      const img = String(ad.image || '').trim();
      const thumb = img
        ? `<img class="thumb" src="${escapeHtml(img)}" alt="Imagem" loading="lazy" />`
        : `<div class="thumb thumb--empty">—</div>`;

      const openImgBtn = img
        ? `<button class="btn mini ghost" data-act="openimg" data-id="${escapeHtml(ad.id)}">Abrir imagem</button>`
        : `<button class="btn mini ghost" disabled>Abrir imagem</button>`;

      return `
        <tr data-id="${escapeHtml(ad.id)}">
          <td>${thumb}</td>
          <td class="td-title">
            <div class="t1">${escapeHtml(ad.title || '—')}</div>
            <div class="t2 small">${escapeHtml(ad.description || '').slice(0, 90)}${(ad.description||'').length > 90 ? '…' : ''}</div>
          </td>
          <td>${escapeHtml(ad.category || '—')}</td>
          <td>${planBadge(ad.plan || '—')}</td>
          <td>${paidBadge(!!ad.paid)}</td>
          <td class="mono">${escapeHtml(ad.whatsapp || '—')}</td>
          <td>${featuredBadge(!!ad.featured)}</td>
          <td>${fmtDate(ad.expiryAt)}</td>
          <td class="actions">
            <button class="btn mini" data-act="approve" data-id="${escapeHtml(ad.id)}">Aprovar</button>
            <button class="btn mini ghost" data-act="reject" data-id="${escapeHtml(ad.id)}">Rejeitar</button>
            <button class="btn mini ghost" data-act="toggleFeatured" data-id="${escapeHtml(ad.id)}">⭐</button>
            <button class="btn mini ghost" data-act="setExpiry" data-id="${escapeHtml(ad.id)}">⏳</button>
            ${openImgBtn}
            <button class="btn mini danger" data-act="del" data-id="${escapeHtml(ad.id)}">🗑</button>
          </td>
        </tr>
      `;
    }).join('');

    // wire actions
    els.adsBody.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-act');
        const id = btn.getAttribute('data-id');
        h
