(() => {
  "use strict";

  const CL = window.CL || {};
  const cfg = CL.cfg || window.CENTRAL_LIKE_CONFIG || {};

  // header/footer
  const siteName = cfg.SITE_NAME || 'Central Like';
  const cityName = cfg.CITY_NAME || 'Brusque';
  document.getElementById('siteName').textContent = siteName;
  document.getElementById('footerName').textContent = siteName;
  document.getElementById('siteCity').textContent = `Admin • ${cityName}`;
  document.getElementById('year').textContent = String(new Date().getFullYear());

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

  const SKEY = 'CL_ADMIN_BASIC';

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setLoginStatus(t){ els.loginStatus.textContent = t || ''; }
  function setStatus(t){ els.status.textContent = t || ''; }
  function setMsgsStatus(t){ els.msgsStatus.textContent = t || ''; }

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

    // se você também usa X-Admin-Key em algum lugar, pode manter:
    // if (cfg.ADMIN_KEY) headers.set('x-admin-key', cfg.ADMIN_KEY);

    const res = await fetch(url, { ...opts, headers });
    const text = await res.text().catch(() => '');
    let data;
    try { data = text ? JSON.parse(text) : null; }
    catch { data = { raw: text }; }

    if (!res.ok) {
      const msg = data?.error || data?.message || text || res.statusText;
      throw new Error(msg);
    }
    return data;
  }

  function showPanel(on) {
    els.panel.style.display = on ? '' : 'none';
    els.messagesPanel.style.display = on ? '' : 'none';
    els.btnLogout.style.display = on ? '' : 'none';
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

  function normalizePhone(s) {
    return String(s || '').replace(/\D/g, '');
  }

  function applyFilters(list) {
    const st = els.filterStatus.value;
    const q = (els.q.value || '').trim().toLowerCase();

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

    return out;
  }

  function renderAds() {
    const list = applyFilters(adsCache);

    els.countInfo.textContent = `Mostrando ${list.length} anúncio(s) (total: ${adsCache.length}).`;

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
      btn.addEventListener('click', () => handleAction(btn.getAttribute('data-act'), btn.getAttribute('data-id')));
    });
  }

  async function loadAds() {
    setStatus('Carregando anúncios…');
    try {
      // endpoint admin (precisa existir no seu projeto)
      const data = await apiFetch('/api/admin/ads', { method: 'GET' });
      adsCache = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      renderAds();
      setStatus('');
    } catch (e) {
      console.error(e);
      setStatus(`⚠️ ${e?.message || 'Falha ao carregar anúncios'}`);
    }
  }

  async function loadMessages() {
    setMsgsStatus('Carregando mensagens…');
    try {
      const data = await apiFetch('/api/admin/messages', { method: 'GET' });
      const msgs = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);

      els.msgsBody.innerHTML = msgs.map(m => `
        <tr>
          <td>${escapeHtml(m.createdAt || '')}</td>
          <td>${escapeHtml(m.name || '')}</td>
          <td class="mono">${escapeHtml(m.phone || '')}</td>
          <td>${escapeHtml(m.subject || '')}</td>
          <td>${escapeHtml(m.message || '')}</td>
        </tr>
      `).join('');

      setMsgsStatus('');
    } catch (e) {
      console.error(e);
      setMsgsStatus(`⚠️ ${e?.message || 'Falha ao carregar mensagens'}`);
    }
  }

  function findAd(id) {
    return adsCache.find(a => String(a.id) === String(id));
  }

  async function handleAction(act, id) {
    const ad = findAd(id);
    if (!ad) return;

    try {
      if (act === 'openimg') {
        if (ad.image) window.open(ad.image, '_blank', 'noopener');
        return;
      }

      if (act === 'setExpiry') {
        const days = prompt('Quantos dias de validade? (ex: 30)', '30');
        if (!days) return;
        const n = Number(days);
        if (!Number.isFinite(n) || n <= 0) throw new Error('Dias inválidos');
        const expiryAt = new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

        await apiFetch(`/api/admin/ads/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiryAt })
        });

        await loadAds();
        return;
      }

      if (act === 'approve') {
        await apiFetch(`/api/admin/ads/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' })
        });
        await loadAds();
        return;
      }

      if (act === 'reject') {
        await apiFetch(`/api/admin/ads/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' })
        });
        await loadAds();
        return;
      }

      if (act === 'toggleFeatured') {
        await apiFetch(`/api/admin/ads/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featured: !ad.featured })
        });
        await loadAds();
        return;
      }

      if (act === 'del') {
        if (!confirm('Tem certeza que deseja apagar este anúncio?')) return;
        await apiFetch(`/api/admin/ads/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await loadAds();
        return;
      }
    } catch (e) {
      console.error(e);
      setStatus(`⚠️ ${e?.message || 'Falha na ação'}`);
    }
  }

  async function tryAutoLogin() {
    const auth = getAuthHeader();
    if (!auth) return;

    setLoginStatus('Verificando…');
    try {
      // ping (endpoint admin precisa existir)
      await apiFetch('/api/admin/ads', { method: 'GET' });
      setLoginStatus('');
      showPanel(true);
      await loadAds();
    } catch (e) {
      clearAuth();
      setLoginStatus('⚠️ Sessão expirada. Faça login novamente.');
      showPanel(false);
    }
  }

  async function login() {
    const user = (els.adminUser.value || '').trim();
    const pass = (els.adminPass.value || '').trim();

    if (!user || !pass) {
      setLoginStatus('⚠️ Informe login e senha.');
      return;
    }

    setLoginStatus('Entrando…');
    setAuth(user, pass);

    try {
      await apiFetch('/api/admin/ads', { method: 'GET' });
      setLoginStatus('✅ OK!');
      showPanel(true);
      await loadAds();
    } catch (e) {
      console.error(e);
      clearAuth();
      showPanel(false);
      setLoginStatus(`⚠️ Falha no login: ${e?.message || 'erro'}`);
    }
  }

  function logout() {
    clearAuth();
    showPanel(false);
    setLoginStatus('Você saiu.');
  }

  // events
  els.btnLogin.addEventListener('click', login);
  els.btnLogout.addEventListener('click', logout);
  els.btnReload.addEventListener('click', loadAds);
  els.btnLoadMsgs.addEventListener('click', loadMessages);

  els.btnFeaturedOnly.addEventListener('click', () => {
    featuredOnly = !featuredOnly;
    els.btnFeaturedOnly.classList.toggle('is-active', featuredOnly);
    renderAds();
  });

  els.filterStatus.addEventListener('change', renderAds);
  els.q.addEventListener('input', renderAds);

  // enter submits login
  [els.adminUser, els.adminPass].forEach(i => i.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
  }));

  // init
  tryAutoLogin();
})();
