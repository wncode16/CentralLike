(() => {
  "use strict";
  const { cfg, waLink } = window.CL;

  document.getElementById('siteName').textContent = cfg.SITE_NAME || 'Central Like';
  document.getElementById('footerName').textContent = cfg.SITE_NAME || 'Central Like';
  document.getElementById('siteCity').textContent = `Anúncios pagos • ${cfg.CITY_NAME || ''}`;
  document.getElementById('year').textContent = String(new Date().getFullYear());

  const el = {
    name: document.getElementById('name'),
    phone: document.getElementById('phone'),
    email: document.getElementById('email'),
    subject: document.getElementById('subject'),
    message: document.getElementById('message'),
    btnSend: document.getElementById('btnSend'),
    btnWa: document.getElementById('btnWa'),
    status: document.getElementById('status')
  };

  el.btnWa.href = waLink(`Olá! Quero falar com a ${cfg.SITE_NAME || 'Central Like'} (${cfg.CITY_NAME || ''}).`);

  function setStatus(t){ el.status.textContent = t || ''; }

  async function send(){
    const payload = {
      city: cfg.CITY_NAME || 'Brusque',
      name: el.name.value.trim(),
      phone: el.phone.value.replace(/\D/g, ''),
      email: el.email.value.trim(),
      subject: el.subject.value.trim(),
      message: el.message.value.trim()
    };

    if (!payload.name || !payload.message) {
      setStatus('⚠️ Informe seu nome e a mensagem.');
      return;
    }

    el.btnSend.disabled = true;
    setStatus('Enviando…');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      if (!res.ok) throw new Error(data?.error || text || res.statusText);

      setStatus('✅ Mensagem enviada!');
      el.name.value = '';
      el.phone.value = '';
      el.email.value = '';
      el.subject.value = '';
      el.message.value = '';
    } catch (e) {
      console.error(e);
      setStatus(`⚠️ Falha ao enviar: ${e?.message || 'erro'}`);
    } finally {
      el.btnSend.disabled = false;
    }
  }

  el.btnSend.addEventListener('click', send);
})();
