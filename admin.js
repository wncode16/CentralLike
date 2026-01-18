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

    // modal
    adModal: document.getElementById('adModal'),
    adModalBackdrop: document.getElementById('adModalBackdrop'),
    adModalClose: document.getElementById('adModalClose'),
    adModalTitle: document.getElementById('adModalTitle'),
    adModalMeta: document.getElementById('adModalMeta'),
    adModalImg: document.getElementById('adModalImg'),
    adModalImgEmpty: document.getElementById('adModalImgEmpty'),
    adModalOpenImg: document.getElementById('adModalOpenImg'),
    adModalOpenWa: document.getElementById('adModalOpenWa'),
    adModalBadges: document.getElementById('adModalBadges'),
    adModalTitle2: document.getElementById('adModalTitle2'),
    adModalDesc: document.getElementById('adModalDesc'),
    adModalPrice: document.getElementById('adModalPrice'),
    adModalNeighborhood: document.getElementById('adModalNeighborhood'),
    adModalCategory: document.getElementById('adModalCategory'),
    adModalWhatsapp: document.getElementById('adModalWhatsapp'),
    adModalStatus: document.getElementById('adModalStatus'),
    adModalExpiry: document.getElementById('adModalExpiry'),
    adModalApprove: document.getElementById('adModalApprove'),
    adModalReject: document.getElementById('adModalReject'),
    adModalToggleFeatured: document.getElementById('adModalToggleFeatured'),
    adModalSetExpiry: document.getElementById('adModalSetExpiry'),
    adModalStatusLine: document.getElementById('adModalStatusLine'),
  };

  let featuredOnly = false;
  let adsCache = [];
  let modalAdId = null;

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

  function fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) return '—';
    return t.toLocaleDateString('pt-BR');
  }

  function toPhoneDigits(s) {
    return String(s || '').replace(/\D/g, '');
  }

  function waLink(phoneDigits, message) {
    const p = toPhoneDigits(phoneDigits);
    const m = encodeURIComponent(message || '');
    // no Brasil geralmente funciona melhor com wa.me
    return p ? `https://wa.me/${p}?text=${m}` : `https://wa.me/?text=${m}`;
  }

  function setLoginStatus(t){ if (els.loginStatus) els.loginStatus.textContent = t || ''; }
  function setStatus(t){ if (els.status) els.status.textContent = t || ''; }
  function setMsgsStatus(t){ if (els.msgsStatus) els.msgsStatus.textContent = t || ''; }
  function setModalStatus(t){ if (els.adModalStatusLine) els.adModalStatusLine.textContent = t || ''; }

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

  function statusBadge(st) {
    const s = String(st || 'pending').toLowerCase();
    if (s === 'active') return badge('Ativo', 'ok');
    if (s === 'rejected') return badge('Rejeitado', 'warn');
    return badge('Pendente', 'neutral');
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
        const hay = `${a.title||''} ${a.whatsapp||''} ${a.category||''} ${a.neighborhood||''} ${a.price||''} ${a.plan||''}`.toLowerCase();
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
        <tr class="ad-row" data-id="${escapeHtml(ad.id)}" tabindex="0" role="button" aria-label="Abrir anúncio">
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

    // Botões de ação (não abrir modal quando clicar neles)
    els.adsBody.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.getAttribute('data-act');
        const id = btn.getAttribute('data-id');
        handleAction(act, id);
      });
    });

    // Clique na linha abre modal
    els.adsBody.querySelectorAll('tr.ad-row').forEach(row => {
      row.addEventListener('click', () => openModal(row.getAttribute('data-id')));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(row.getAttribute('data-id'));
        }
      });
    });
  }

  async function loadAds() {
    setStatus('Carregando anúncios…');
    try {
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
      if (!els.msgsBody) return;

      els.msgsBody.innerHTML = msgs.map(m => `
        <tr>
          <td>${escapeHtml(fmtDateTime(m.createdAt) || m.createdAt || '')}</td>
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

  // ✅ sem [id].js: usa endpoint único
  async function adsAction(payload) {
    return apiFetch('/api/admin/ads-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
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
        await adsAction({ id, patch: { expiryAt } });
        await loadAds();
        if (els.adModal && !els.adModal.getAttribute('aria-hidden')) openModal(id, true);
        return;
      }

      if (act === 'approve') {
        await adsAction({ id, patch: { status: 'active' } });
        await loadAds();
        if (els.adModal && !els.adModal.getAttribute('aria-hidden')) openModal(id, true);
        return;
      }

      if (act === 'reject') {
        await adsAction({ id, patch: { status: 'rejected' } });
        await loadAds();
        if (els.adModal && !els.adModal.getAttribute('aria-hidden')) openModal(id, true);
        return;
      }

      if (act === 'toggleFeatured') {
        await adsAction({ id, patch: { featured: !ad.featured } });
        await loadAds();
        if (els.adModal && !els.adModal.getAttribute('aria-hidden')) openModal(id, true);
        return;
      }

      if (act === 'del') {
        if (!confirm('Tem certeza que deseja apagar este anúncio?')) return;
        await adsAction({ id, delete: true });
        closeModal();
        await loadAds();
        return;
      }
    } catch (e) {
      console.error(e);
      setStatus(`⚠️ ${e?.message || 'Falha na ação'}`);
      setModalStatus(`⚠️ ${e?.message || 'Falha na ação'}`);
    }
  }

  // ===== MODAL =====
  function openModal(id, refreshFromCache = false) {
    if (!els.adModal) return;

    if (refreshFromCache) {
      // recarregou cache, então pega do cache novo
      modalAdId = id;
    } else {
      modalAdId = id;
    }

    const ad = findAd(modalAdId);
    if (!ad) return;

    els.adModal.setAttribute('aria-hidden', 'false');

    // preencher
    if (els.adModalMeta) {
      els.adModalMeta.textContent = [
        `ID ${ad.id || '—'}`,
        ad.createdAt ? `Criado: ${fmtDateTime(ad.createdAt)}` : '',
        ad.updatedAt ? `Atualizado: ${fmtDateTime(ad.updatedAt)}` : ''
      ].filter(Boolean).join(' • ');
    }

    if (els.adModalTitle2) els.adModalTitle2.textContent = ad.title || '—';
    if (els.adModalDesc) els.adModalDesc.textContent = ad.description || '';

    if (els.adModalPrice) els.adModalPrice.textContent = ad.price || '—';
    if (els.adModalNeighborhood) els.adModalNeighborhood.textContent = ad.neighborhood || '—';
    if (els.adModalCategory) els.adModalCategory.textContent = ad.category || '—';
    if (els.adModalWhatsapp) els.adModalWhatsapp.textContent = ad.whatsapp || '—';
    if (els.adModalStatus) els.adModalStatus.innerHTML = statusBadge(ad.status);
    if (els.adModalExpiry) els.adModalExpiry.textContent = ad.expiryAt ? fmtDate(ad.expiryAt) : '—';

    if (els.adModalBadges) {
      els.adModalBadges.innerHTML = `
        ${planBadge(ad.plan || '—')}
        ${paidBadge(!!ad.paid)}
        ${featuredBadge(!!ad.featured)}
        ${statusBadge(ad.status)}
      `;
    }

    const img = String(ad.image || '').trim();
    if (els.adModalImg && els.adModalImgEmpty) {
      if (img) {
        els.adModalImg.style.display = '';
        els.adModalImg.src = img;
        els.adModalImgEmpty.style.display = 'none';
      } else {
        els.adModalImg.removeAttribute('src');
        els.adModalImg.style.display = 'none';
        els.adModalImgEmpty.style.display = '';
      }
    }

    if (els.adModalOpenImg) {
      if (img) {
        els.adModalOpenImg.href = img;
        els.adModalOpenImg.style.pointerEvents = '';
        els.adModalOpenImg.style.opacity = '';
      } else {
        els.adModalOpenImg.href = '#';
        els.adModalOpenImg.style.pointerEvents = 'none';
        els.adModalOpenImg.style.opacity = '0.6';
      }
    }

    if (els.adModalOpenWa) {
      const msg = `Olá! Sobre o anúncio: "${ad.title || ''}".`;
      els.adModalOpenWa.href = waLink(ad.whatsapp, msg);
    }

    setModalStatus('');
  }

  function closeModal() {
    if (!els.adModal) return;
    els.adModal.setAttribute('aria-hidden', 'true');
    modalAdId = null;
    setModalStatus('');
  }

  // ===== LOGIN =====
  async function tryAutoLogin() {
    const auth = getAuthHeader();
    if (!auth) return;

    setLoginStatus('Verificando…');
    try {
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
    const user = (els.adminUser?.value || '').trim();
    const pass = (els.adminPass?.value || '').trim();

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
  if (els.btnLogin) els.btnLogin.addEventListener('click', login);
  if (els.btnLogout) els.btnLogout.addEventListener('click', logout);
  if (els.btnReload) els.btnReload.addEventListener('click', loadAds);
  if (els.btnLoadMsgs) els.btnLoadMsgs.addEventListener('click', loadMessages);

  if (els.btnFeaturedOnly) {
    els.btnFeaturedOnly.addEventListener('click', () => {
      featuredOnly = !featuredOnly;
      els.btnFeaturedOnly.classList.toggle('is-active', featuredOnly);
      renderAds();
    });
  }

  if (els.filterStatus) els.filterStatus.addEventListener('change', renderAds);
  if (els.q) els.q.addEventListener('input', renderAds);

  // enter submits login
  [els.adminUser, els.adminPass].forEach(i => {
    if (!i) return;
    i.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') login();
    });
  });

  // modal events
  if (els.adModalBackdrop) els.adModalBackdrop.addEventListener('click', closeModal);
  if (els.adModalClose) els.adModalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  if (els.adModalApprove) els.adModalApprove.addEventListener('click', () => modalAdId && handleAction('approve', modalAdId));
  if (els.adModalReject) els.adModalReject.addEventListener('click', () => modalAdId && handleAction('reject', modalAdId));
  if (els.adModalToggleFeatured) els.adModalToggleFeatured.addEventListener('click', () => modalAdId && handleAction('toggleFeatured', modalAdId));
  if (els.adModalSetExpiry) els.adModalSetExpiry.addEventListener('click', () => modalAdId && handleAction('setExpiry', modalAdId));

  // init
  tryAutoLogin();
})();
