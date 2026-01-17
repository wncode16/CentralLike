(() => {
  "use strict";

  const { cfg, escapeHtml, waLink, categories, planCards } = window.CL;

  // header/footer
  document.getElementById('siteName').textContent = cfg.SITE_NAME || 'Central Like';
  document.getElementById('footerName').textContent = cfg.SITE_NAME || 'Central Like';
  document.getElementById('siteCity').textContent = `Anúncios pagos • ${cfg.CITY_NAME || ''}`;
  document.getElementById('year').textContent = String(new Date().getFullYear());

  const els = {
    title: document.getElementById('title'),
    price: document.getElementById('price'),
    category: document.getElementById('category'),
    neighborhood: document.getElementById('neighborhood'),
    whatsapp: document.getElementById('whatsapp'),
    image: document.getElementById('image'),
    description: document.getElementById('description'),
    plan: document.getElementById('plan'),
    btnSubmit: document.getElementById('btnSubmit'),
    status: document.getElementById('status'),

    pixKey: document.getElementById('pixKey'),
    paypal: document.getElementById('paypal'),
    mp: document.getElementById('mp'),
    waProof: document.getElementById('waProof'),
    payInfo: document.getElementById('payInfo'),
  };

  // fill selects
  els.category.innerHTML = categories().map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`).join('');

  const plans = planCards();
  els.plan.innerHTML = plans.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — ${escapeHtml(p.price)} (${escapeHtml(p.duration)})</option>`).join('');

  // preselect plan from query
  const qs = new URLSearchParams(location.search);
  const planFrom = qs.get('plan');
  if (planFrom && plans.some(p => p.id === planFrom)) els.plan.value = planFrom;

  // payment display
  els.pixKey.textContent = cfg.PAYMENT?.PIX_KEY || 'SUA_CHAVE_PIX_AQUI';
  els.paypal.textContent = cfg.PAYMENT?.PAYPAL_LINK || 'https://paypal.me/seulink';
  els.paypal.href = cfg.PAYMENT?.PAYPAL_LINK || '#';
  els.mp.textContent = cfg.PAYMENT?.MERCADO_PAGO_LINK || 'https://link.mercadopago.com.br/seulink';
  els.mp.href = cfg.PAYMENT?.MERCADO_PAGO_LINK || '#';
  els.payInfo.textContent = cfg.PAYMENT?.NOTES || '';

  els.waProof.href = waLink(`Olá! Quero pagar/anunciar na ${cfg.SITE_NAME || 'Central Like'} (${cfg.CITY_NAME || ''}). Segue o comprovante e meu anúncio:`);

  function setStatus(t){
    els.status.textContent = t || '';
  }

  function validate() {
    if (!els.title.value.trim()) return 'Informe um título.';
    if (!els.description.value.trim()) return 'Informe a descrição.';
    const phone = els.whatsapp.value.replace(/\D/g, '');
    if (!phone || phone.length < 10) return 'Informe um WhatsApp válido (DDD + número).';
    return '';
  }

  async function submit() {
    const err = validate();
    if (err) { setStatus(`⚠️ ${err}`); return; }

    els.btnSubmit.disabled = true;
    setStatus('Enviando…');

    const payload = {
      city: cfg.CITY_NAME || 'Brusque',
      title: els.title.value.trim(),
      price: els.price.value.trim(),
      category: els.category.value,
      neighborhood: els.neighborhood.value.trim(),
      whatsapp: els.whatsapp.value.replace(/\D/g, ''),
      image: els.image.value.trim(),
      description: els.description.value.trim(),
      plan: els.plan.value
    };

    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      if (!res.ok) {
        throw new Error(data?.error || text || res.statusText);
      }

      setStatus('✅ Enviado! Agora envie o comprovante no WhatsApp para aprovação.');
      // open whatsapp with a prefilled message including ad id
      const msg = `Olá! Enviei um anúncio (ID ${data.id}). Quero confirmar o pagamento e aprovação.`;
      window.open(waLink(msg), '_blank', 'noopener');

      // clear
      els.title.value = '';
      els.price.value = '';
      els.neighborhood.value = '';
      els.whatsapp.value = '';
      els.image.value = '';
      els.description.value = '';
    } catch (e) {
      console.error(e);
      setStatus(`⚠️ Falha ao enviar: ${e?.message || 'erro'}`);
    } finally {
      els.btnSubmit.disabled = false;
    }
  }

  els.btnSubmit.addEventListener('click', submit);
})();
