/**
 * Doe por Eles — Landing page única
 * Estrutura preparada para futura integração com API:
 * - Atualizar `collected` via API e chamar updateProgress().
 */

// ----- Variáveis de meta e arrecadação (podem vir de API no futuro) -----
var goal = 50000;           // Meta inicial em reais
var goalExtended = 200000;  // Meta estendida em reais
var collected = 0;          // Valor arrecadado em reais — atualizar aqui ou via API

// URL do checkout externo (redirecionamento com ?amount=VALOR)
var checkoutBaseUrl = 'https://exemplo-checkout.com/doar';

// ----- Formatação para moeda brasileira -----
/**
 * Formata um número como moeda em Real (Brasil).
 * @param {number} value - Valor numérico
 * @returns {string} Valor formatado, ex: "R$ 1.500,00"
 */
function formatCurrency(value) {
  var num = Number(value);
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

// ----- Carregamento de dados da API /api/campaign -----
var currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

/**
 * Carrega dados da campanha via API e atualiza a barra de progresso.
 */
async function loadCampaignData() {
  try {
    var res = await fetch('/api/campaign');
    var data = await res.json();

    // API retorna valores em centavos — converter para reais
    var goalApi = (data.goal || 0) / 100;
    var goalExtendedApi = (data.goalExtended || 0) / 100;
    var collectedApi = (data.collected || 0) / 100;

    goal = goalApi;
    goalExtended = goalExtendedApi;
    collected = collectedApi;

    var percentage = goal > 0 ? (collected / goal) * 100 : 0;
    if (percentage > 100) percentage = 100;

    var elCollected = document.getElementById('campaign-collected');
    var elGoal = document.getElementById('campaign-goal');
    var elGoalExtended = document.getElementById('campaign-goal-extended');
    var elPercentage = document.getElementById('campaign-percentage');
    var elBar = document.querySelector('.progress-bar-fill');

    if (elCollected) elCollected.textContent = currencyFormatter.format(collectedApi);
    if (elGoal) elGoal.textContent = 'Meta inicial: ' + currencyFormatter.format(goalApi);
    if (elGoalExtended) elGoalExtended.textContent = 'Meta estendida: ' + currencyFormatter.format(goalExtendedApi);
    if (elPercentage) elPercentage.textContent = ' (' + percentage.toFixed(1) + '%)';
    if (elBar) elBar.style.width = percentage + '%';

    var elStatus = document.getElementById('progress-status');
    if (elStatus) {
      if (collected >= goalExtended) {
        elStatus.textContent = 'Meta estendida atingida! Obrigado a todos os doadores.';
      } else if (collected >= goal) {
        elStatus.textContent = 'Meta inicial batida! Rumo à meta estendida de ' + currencyFormatter.format(goalExtended) + '.';
      } else {
        elStatus.textContent = 'Apoie nossa causa com qualquer valor.';
      }
    }

    if (elBar) {
      elBar.setAttribute('aria-valuenow', collected);
      elBar.setAttribute('aria-valuemax', goalExtended);
    }
  } catch (error) {
    console.error('Erro ao carregar campanha:', error);
  }
}

// ----- Atualização da barra de progresso (fallback local) -----
/**
 * Atualiza a barra de progresso e os textos com base em `collected`.
 * Chamar após alterar `collected` (manual ou via API).
 */
function updateProgress() {
  var elValor = document.getElementById('campaign-collected');
  var elBar = document.querySelector('.progress-bar-fill');
  var elStatus = document.getElementById('progress-status');

  if (elValor) elValor.textContent = formatCurrency(collected);

  if (elBar) {
    var percent = goalExtended > 0 ? Math.min(100, (collected / goalExtended) * 100) : 0;
    elBar.style.width = percent + '%';
    elBar.setAttribute('aria-valuenow', collected);
    elBar.setAttribute('aria-valuemax', goalExtended);
  }

  if (elStatus) {
    if (collected >= goalExtended) {
      elStatus.textContent = 'Meta estendida atingida! Obrigado a todos os doadores.';
    } else if (collected >= goal) {
      elStatus.textContent = 'Meta inicial batida! Rumo à meta estendida de R$ 200.000.';
    } else {
      elStatus.textContent = 'Apoie nossa causa com qualquer valor.';
    }
  }
}

// ----- Checkout Mercado Pago (POST /api/payments/create) -----
/**
 * Cria checkout no Mercado Pago e redireciona para pagamento.
 * @param {number} amount - Valor da doação em reais
 */
function createCheckout(amount) {
  var valorReais = Number(amount) || 50;
  if (valorReais < 10) {
    alert('Valor mínimo para doação é R$ 10,00.');
    return;
  }
  var valorCentavos = Math.round(valorReais * 100);

  var btn = document.getElementById('btn-doar');
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecionando...'; }

  fetch('/api/payments/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: valorCentavos,
      description: 'Doação Doe Por Eles'
    })
  })
    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (result) {
      if (result.ok && result.data.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else {
        throw new Error(result.data.error || 'Erro ao criar checkout');
      }
    })
    .catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar e doar'; }
      alert('Erro: ' + (err.message || 'Não foi possível processar. Tente novamente.'));
    });
}

// ----- PIX QR (POST /api/payments/create-pix) -----
var currentPixData = null;
var pixModalEscapeHandler = null;

function createPixCheckout(amount) {
  var valorReais = Number(amount) || 50;
  if (valorReais < 10) {
    alert('Valor mínimo para doação é R$ 10,00.');
    return;
  }
  var valorCentavos = Math.round(valorReais * 100);

  var btnPix = document.getElementById('btn-pix');
  if (btnPix) { btnPix.disabled = true; btnPix.textContent = 'Gerando QR...'; }

  fetch('/api/payments/create-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: valorCentavos })
  })
    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; }); })
    .then(function (result) {
      if (btnPix) { btnPix.disabled = false; btnPix.textContent = 'Pagar com Pix'; }
      if (result.ok) {
        currentPixData = result.data;
        showPixModal(result.data);
      } else {
        throw new Error(result.data.error || 'Não foi possível gerar o QR Pix.');
      }
    })
    .catch(function (err) {
      if (btnPix) { btnPix.disabled = false; btnPix.textContent = 'Pagar com Pix'; }
      alert('Erro: ' + (err.message || 'Não foi possível processar. Verifique se BASE_URL está em HTTPS (ngrok).'));
    });
}

function showPixModal(data) {
  var modal = document.getElementById('modal-pix');
  var qrWrap = document.getElementById('modal-pix-qr-wrap');
  var btnCopy = document.getElementById('btn-copy-pix');
  var btnOpen = document.getElementById('btn-open-pix');
  var btnVerify = document.getElementById('btn-verify-pix');
  var btnClose = document.getElementById('btn-close-pix');
  var expiresEl = document.getElementById('modal-pix-expires');

  if (!modal) return;

  qrWrap.innerHTML = '';
  if (data.qr_code_base64) {
    var img = document.createElement('img');
    img.src = data.qr_code_base64;
    img.alt = 'QR Code Pix';
    qrWrap.appendChild(img);
  } else {
    qrWrap.textContent = 'QR Code não disponível. Use o link abaixo.';
  }

  btnOpen.href = data.ticket_url || '#';
  btnOpen.style.display = data.ticket_url ? '' : 'none';

  if (data.expires_at) {
    try {
      var exp = new Date(data.expires_at);
      expiresEl.textContent = 'Válido até: ' + exp.toLocaleString('pt-BR');
    } catch (e) {
      expiresEl.textContent = '';
    }
  } else {
    expiresEl.textContent = 'O código expira em aproximadamente 24 horas.';
  }

  btnCopy.onclick = function () {
    if (data.qr_code && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(data.qr_code).then(function () {
        btnCopy.textContent = 'Copiado!';
        setTimeout(function () { btnCopy.textContent = 'Copiar código Pix'; }, 2000);
      }).catch(function () {
        fallbackCopy(data.qr_code, btnCopy);
      });
    } else {
      fallbackCopy(data.qr_code, btnCopy);
    }
  };

  btnVerify.onclick = function () {
    if (!data.payment_id) return;
    fetch('/api/payments/status?payment_id=' + data.payment_id)
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (result.status === 'approved') {
          loadCampaignData();
          closePixModal();
          showDonationFeedback('Pagamento confirmado! Obrigado pela sua doação.');
        } else {
          alert('Pagamento ainda não confirmado. Status: ' + (result.status || 'pendente') + '. Tente novamente em alguns segundos.');
        }
      })
      .catch(function () {
        alert('Não foi possível verificar o status.');
      });
  };

  btnClose.onclick = closePixModal;

  if (pixModalEscapeHandler) document.removeEventListener('keydown', pixModalEscapeHandler);
  pixModalEscapeHandler = function (e) {
    if (e.key === 'Escape') closePixModal();
  };
  document.addEventListener('keydown', pixModalEscapeHandler);

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function fallbackCopy(text, btn) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    btn.textContent = 'Copiado!';
    setTimeout(function () { btn.textContent = 'Copiar código Pix'; }, 2000);
  } catch (e) {
    alert('Copie manualmente: ' + text.slice(0, 50) + '...');
  }
  document.body.removeChild(ta);
}

function closePixModal() {
  var modal = document.getElementById('modal-pix');
  if (modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
  }
  if (pixModalEscapeHandler) {
    document.removeEventListener('keydown', pixModalEscapeHandler);
    pixModalEscapeHandler = null;
  }
}

/**
 * Exibe mensagem temporária de feedback (não altera layout).
 */
function showDonationFeedback(msg) {
  var el = document.createElement('p');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);background:#2d6a4f;color:#fff;padding:.5rem 1rem;border-radius:8px;font-size:.9rem;z-index:9999;';
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 3000);
}

// ----- Redirecionamento para checkout (futuro gateway real) -----
/**
 * Redireciona para a URL do checkout externo com o valor na querystring.
 * @param {number} amount - Valor da doação em reais
 */
function redirectToCheckout(amount) {
  var value = Number(amount);
  if (isNaN(value) || value < 10) {
    alert('Por favor, informe um valor válido (mínimo R$ 10).');
    return;
  }
  var separator = checkoutBaseUrl.indexOf('?') >= 0 ? '&' : '?';
  var url = checkoutBaseUrl + separator + 'amount=' + value;
  window.location.href = url;
}

// ----- Inicialização: doação e progresso -----
(function init() {
  var valorSelecionado = null;
  var btnDoar = document.getElementById('btn-doar');
  var valorCustom = document.getElementById('valor-custom');
  var botoesValor = document.querySelectorAll('.btn-valor');

  // Botões de valor sugerido
  botoesValor.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = Number(btn.getAttribute('data-valor'));
      valorSelecionado = v;
      botoesValor.forEach(function (b) { b.classList.remove('ativo'); });
      btn.classList.add('ativo');
      if (valorCustom) valorCustom.value = v;
    });
  });

  // Campo valor personalizado: desmarca botões
  if (valorCustom) {
    valorCustom.addEventListener('input', function () {
      botoesValor.forEach(function (b) { b.classList.remove('ativo'); });
      valorSelecionado = Number(valorCustom.value) || null;
    });
  }

  // Botão "Confirmar e doar" — checkout Mercado Pago
  if (btnDoar) {
    btnDoar.addEventListener('click', function () {
      var valor = valorSelecionado;
      if (valorCustom && Number(valorCustom.value) >= 10) {
        valor = Number(valorCustom.value);
      }
      createCheckout(valor || 50);
    });
  }

  // Botão "Pagar com Pix"
  var btnPix = document.getElementById('btn-pix');
  if (btnPix) {
    btnPix.addEventListener('click', function () {
      var valor = valorSelecionado;
      if (valorCustom && Number(valorCustom.value) >= 10) {
        valor = Number(valorCustom.value);
      }
      createPixCheckout(valor || 50);
    });
  }

  // Menu móvel
  var menuToggle = document.getElementById('menu-toggle');
  var nav = document.getElementById('nav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', open);
    });
  }

  // Carrega dados da API e atualiza a barra na carga da página
  function initCampaign() {
    loadCampaignData();
    var params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      showDonationFeedback('Obrigado pela sua doação! O pagamento foi confirmado.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCampaign);
  } else {
    initCampaign();
  }
})();
