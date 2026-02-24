/**
 * Configuração global da aplicação
 * Ajuste API_BASE conforme o backend (Node ou PHP) em uso.
 */

var CONFIG = {
  // Base da API (vazio = mesma origem; ou ex: 'http://localhost:3000')
  API_BASE: '',
  // Endpoint que retorna { goal, goalExtended, collected }
  API_CAMPAIGN: '/api/campaign',
  // URL do checkout externo (redirecionamento com ?amount=VALOR)
  CHECKOUT_BASE_URL: 'https://exemplo-checkout.com/doar',
  // Valores sugeridos de doação (R$)
  SUGGESTED_AMOUNTS: [25, 50, 100, 500],
  // Doação mínima (R$)
  MIN_AMOUNT: 10
};
