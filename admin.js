(() => {
  "use strict";

  const { cfg, escapeHtml, fmt } = window.CL;

  document.getElementById('siteName').textContent = cfg.SITE_NAME || 'Central Like';
  document.getElementById('footerName').textContent = cfg.SITE_NAME || 'Central Like';
  document.getElementById('siteCity').textContent = `Admin • ${cfg.CITY_NAME || ''}`;
  document.getElementById('year').textContent = String(new Date().getFullYear());

  const el = {
    key: document.getElementById('key'),
    btnSaveKey: document.getElementById('btnSaveKey'),
    btnClearKey: document.getElementById('btnClearKey'),
    keyStatus: document.getElementById('keyStatus'),

    filterStatus: document.getElementById('filterStatus'),
    filterQ: document.getElementById('filterQ'),
    btnReload: document.getElementById('btnReload'),
    adStatus: document.getElementById('adStatus'),
    tableAds: document.getElementById('tableAds'),

    btnLoadMsgs: document.getElementById('btnLoadMsgs'),
    msgStatus: document.getElementById('msgStatus'),
    tableMsgs: document.getElementById('tableMsgs')
  };

  const KEY_STORAGE = 'cl_admin_key_session';

  function getKey(){
    return sessionStorage.getItem(KEY_STORAGE) || '';
  }
  function setKey(v){
    sessionStorage.setItem(KEY_STORAGE, v);
  }
  function clearKey(){
    sessionStorage.removeItem(KEY_STORAGE);
  }

  function setStatus(which, t){
    which.textContent = t || '';
  }

  function authHeaders(){
    const k = getKey();
    return { 'Authorization': `Bearer ${k}` };
  }

  async function api(path, opts = {}){
    const res = await fetch(path, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        ...authHeaders(),
      }
    });

    const text = await res.text().catch(() => '');
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
      throw new Error(data?.error || text || res.statusText);
    }
    return data;
  }

  function adsTableHtml(list){
    const head = `
      <tr>
        <th>ID</th>
        <th>Status</th>
        <th>Título</th>
        <th>Categoria</th>
        <th>WhatsApp</th>
        <th>Destaque</th>
        <th>Expira</th>
        <th>Ações</th>
      </tr>
    `;

    const rows = list.map(a => {
      const id = escapeHtml(a.id);
      const status = escapeHtml(a.status || 'pending');
      const title = escapeHtml(a.title || '—');
      const cat = escapeHtml(a.category || 'outros');
      const wa = escapeHtml(a.whatsapp || '');
      const feat = a.featured ? 'Sim' : 'Não';
      const exp = a.expiryAt ? fmt(a.expiryAt) : '';

      return `
        <tr data-id="${id}">
          <td class="mono">${id.slice(0, 8)}…</td>
          <td>${status}</td>
          <td>${title}</td>
          <td>${cat}</td>
          <td class="mono">${wa}</td>
          <td>${feat}</td>
          <td>${escapeHtml(exp)}</td>
          <td>
            <div class="row" style="gap:8px">
              <button class="btn small" data-act="approve">Aprovar</button>
              <button class="btn small" data-act="reject">Rejeitar</button>
              <button class="btn small" data-act="toggleFeatured">⭐</button>
              <button class="btn small" data-act="setExpiry">⏳</button>
              <button class="btn small" data-act="delete">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return head + rows;
  }

  function messagesTableHtml(list){
    const head = `
      <tr>
        <th>Data</th>
        <th>Nome</th>
        <th>WhatsApp</th>
        <th>Assunto</th>
        <th>Mensagem</th>
      </tr>
    `;
    const rows = list.map(m => `
      <tr>
        <td>${escapeHtml(fmt(m.createdAt))}</td>
        <td>${escapeHtml(m.name || '')}</td>
        <td class="mono">${escapeHtml(m.phone || '')}</td>
        <td>${escapeHtml(m.subject || '')}</td>
        <td>${escapeHtml(m.message || '')}</td>
      </tr>
    `).join('');
    return head + rows;
  }

  let allAds = [];

  function applyLocalFilter(){
    const s = el.filterStatus.value;
    const q = (el.filterQ.value || '').trim().toLowerCase();

    let list = [...allAds];
    if (s !== 'all') list = list.filter(a => (a.status || 'pending') === s);
    if (q) {
      list = list.filter(a => {
        const hay = `${a.title||''} ${a.whatsapp||''} ${a.category||''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    el.tableAds.innerHTML = adsTableHtml(list);

    // bind actions
    el.tableAds.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const id = tr.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        await doAction(id, act);
      });
    });

    setStatus(el.adStatus, `Mostrando ${list.length} anúncio(s) (total: ${allAds.length}).`);
  }

  async function loadAds(){
    const k = getKey();
    if (!k) { setStatus(el.keyStatus, '⚠️ Cole a ADMIN_KEY para usar o painel.'); return; }

    setStatus(el.adStatus, 'Carregando anúncios…');
    try {
      const data = await api('/api/admin/ads');
      allAds = Array.isArray(data) ? data : [];
      applyLocalFilter();
    } catch (e) {
      console.error(e);
      setStatus(el.adStatus, `⚠️ ${e?.message || 'Erro ao carregar'}`);
    }
  }

  async function doAction(id, act){
    const k = getKey();
    if (!k) { setStatus(el.keyStatus, '⚠️ Cole a ADMIN_KEY.'); return; }

    try {
      if (act === 'approve') {
        await api(`/api/admin/ads/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ status: 'active' })
        });
      }

      if (act === 'reject') {
        await api(`/api/admin/ads/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ status: 'rejected' })
        });
      }

      if (act === 'toggleFeatured') {
        const current = allAds.find(a => a.id === id);
        const next = !(current && current.featured);
        await api(`/api/admin/ads/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ featured: next })
        });
      }

      if (act === 'setExpiry') {
        const iso = prompt('Defina expiryAt em ISO (ex: 2026-02-01T00:00:00.000Z) ou deixe vazio para remover:');
        await api(`/api/admin/ads/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ expiryAt: iso ? String(iso).trim() : null })
        });
      }

      if (act === 'delete') {
        if (!confirm('Excluir anúncio?')) return;
        await api(`/api/admin/ads/${encodeURIComponent(id)}`, { method: 'DELETE' });
      }

      await loadAds();
    } catch (e) {
      console.error(e);
      alert(`Erro: ${e?.message || 'falhou'}`);
    }
  }

  async function loadMessages(){
    const k = getKey();
    if (!k) { setStatus(el.keyStatus, '⚠️ Cole a ADMIN_KEY.'); return; }

    setStatus(el.msgStatus, 'Carregando mensagens…');
    try {
      const data = await api('/api/admin/messages');
      const list = Array.isArray(data) ? data : [];
      el.tableMsgs.innerHTML = messagesTableHtml(list);
      setStatus(el.msgStatus, `Mostrando ${list.length} mensagem(ns).`);
    } catch (e) {
      console.error(e);
      setStatus(el.msgStatus, `⚠️ ${e?.message || 'Erro ao carregar'}`);
    }
  }

  // key actions
  const saved = getKey();
  if (saved) { el.key.value = saved; setStatus(el.keyStatus, '✅ Chave carregada desta sessão.'); }

  el.btnSaveKey.addEventListener('click', () => {
    const k = el.key.value.trim();
    if (!k) { setStatus(el.keyStatus, '⚠️ Cole a ADMIN_KEY.'); return; }
    setKey(k);
    setStatus(el.keyStatus, '✅ Salvo nesta sessão (não fica no servidor).');
    loadAds();
  });

  el.btnClearKey.addEventListener('click', () => {
    clearKey();
    el.key.value = '';
    setStatus(el.keyStatus, 'Chave removida.');
  });

  el.btnReload.addEventListener('click', loadAds);
  el.filterStatus.addEventListener('change', applyLocalFilter);
  el.filterQ.addEventListener('input', applyLocalFilter);

  el.btnLoadMsgs.addEventListener('click', loadMessages);

  // init
  setStatus(el.keyStatus, 'Cole a ADMIN_KEY para começar.');
})();
