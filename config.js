// Central Like - Brusque (Config)
// Edite aqui sem mexer no resto do código.
window.CENTRAL_LIKE_CONFIG = {
  SITE_NAME: "Central Like",
  CITY_NAME: "Brusque",

  // Contatos
  WHATSAPP_NUMBER_E164: "+5547999999999", // <-- troque pelo seu WhatsApp (com +55)
  CONTACT_EMAIL: "contato@exemplo.com",  // opcional (só exibição)

  // Instruções de pagamento (exibição)
  PAYMENT: {
    PIX_KEY: "SUA_CHAVE_PIX_AQUI",
    PAYPAL_LINK: "https://paypal.me/seulink",
    MERCADO_PAGO_LINK: "https://link.mercadopago.com.br/seulink",
    NOTES: "Após enviar o anúncio, você receberá instruções pelo WhatsApp para pagamento e aprovação."
  },

  // Planos (exibição)
  PLANS: [
    { id: "basico",  name: "Básico",  price: "R$ 15", duration: "7 dias",  features: ["1 foto", "Aparece na categoria", "Suporte via WhatsApp"] },
    { id: "pro",     name: "Pro",     price: "R$ 25", duration: "15 dias", features: ["Até 3 fotos", "Destaque na categoria", "Suporte via WhatsApp"] },
    { id: "destaque",name: "Destaque",price: "R$ 39", duration: "30 dias", features: ["Até 5 fotos", "Destaque no topo", "Selo de destaque", "Suporte via WhatsApp"] }
  ],

  // Categorias
  CATEGORIES: [
    { id: "geral", label: "Geral" },
    { id: "imoveis", label: "Imóveis" },
    { id: "veiculos", label: "Veículos" },
    { id: "empregos", label: "Empregos" },
    { id: "servicos", label: "Serviços" },
    { id: "eletronicos", label: "Eletrônicos" },
    { id: "moda", label: "Moda" },
    { id: "outros", label: "Outros" }
  ],

  PAGE_SIZE: 12
};
