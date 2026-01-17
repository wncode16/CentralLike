(() => {
  "use strict";
  const { cfg, escapeHtml, waLink, planCards } = window.CL;

  document.getElementById('siteName').textContent = cfg.SITE_NAME || 'Central Like';
  document.getElementById('footerName').textContent = cfg.SITE_NAME || 'Central Like';
  document.getElementById('siteCity').textContent = `Anúncios pagos • ${cfg.CITY_NAME || ''}`;
  document.getElementById('year').textContent = String(new Date().getFullYear());

  const plansEl = document.getElementById('plans');
  const noteEl = document.getElementById('planNote');

  const plans = planCards();

  plansEl.innerHTML = plans.map(p => {
    const feats = (p.features || []).map(f => `<li>${escapeHtml(f)}</li>`).join('');
    return `
      <div class="card" style="grid-column: span 4; cursor: default">
        <div class="card__body">
          <div class="badge">${escapeHtml(p.name)}</div>
          <h4 class="card__title">${escapeHtml(p.price)} <span class="small">• ${escapeHtml(p.duration)}</span></h4>
          <ul class="small" style="margin:0 0 10px 18px">${feats}</ul>
          <a class="btn" href="./submit.html?plan=${encodeURIComponent(p.id)}">Escolher</a>
        </div>
      </div>
    `;
  }).join('');

  noteEl.textContent = 'A validade pode ser definida pelo administrador conforme seu critério.';

  const pixKey = document.getElementById('pixKey');
  const paypal = document.getElementById('paypal');
  const mp = document.getElementById('mp');
  const payNotes = document.getElementById('payNotes');
  const waPay = document.getElementById('waPay');

  pixKey.textContent = cfg.PAYMENT?.PIX_KEY || 'SUA_CHAVE_PIX_AQUI';
  paypal.textContent = cfg.PAYMENT?.PAYPAL_LINK || 'https://paypal.me/seulink';
  paypal.href = cfg.PAYMENT?.PAYPAL_LINK || '#';
  mp.textContent = cfg.PAYMENT?.MERCADO_PAGO_LINK || 'https://link.mercadopago.com.br/seulink';
  mp.href = cfg.PAYMENT?.MERCADO_PAGO_LINK || '#';
  payNotes.textContent = cfg.PAYMENT?.NOTES || '';

  waPay.href = waLink(`Olá! Quero pagar um anúncio na ${cfg.SITE_NAME || 'Central Like'} (${cfg.CITY_NAME || ''}). Segue o comprovante:`);
})();
