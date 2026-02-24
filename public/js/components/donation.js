/**
 * Componente: Doação (valores sugeridos, campo custom, redirecionamento)
 * Redireciona para CHECKOUT_BASE_URL?amount=VALOR
 */

(function (global) {
  'use strict';

  function getCheckoutUrl() {
    return (global.CONFIG && global.CONFIG.CHECKOUT_BASE_URL) || 'https://exemplo-checkout.com/doar';
  }

  function getMinAmount() {
    return (global.CONFIG && global.CONFIG.MIN_AMOUNT) || 10;
  }

  /**
   * Redireciona para checkout externo com ?amount=VALOR
   */
  function redirectToCheckout(amount) {
    var value = Number(amount);
    var min = getMinAmount();
    if (isNaN(value) || value < min) {
      alert('Por favor, informe um valor válido (mínimo R$ ' + min + ').');
      return;
    }
    var base = getCheckoutUrl();
    var separator = base.indexOf('?') >= 0 ? '&' : '?';
    var url = base + separator + 'amount=' + value;
    window.location.href = url;
  }

  function init() {
    var valorSelecionado = null;
    var btnDoar = document.getElementById('btn-doar');
    var valorCustom = document.getElementById('valor-custom');
    var botoesValor = document.querySelectorAll('.btn-valor');

    botoesValor.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = Number(btn.getAttribute('data-valor'));
        valorSelecionado = v;
        botoesValor.forEach(function (b) { b.classList.remove('ativo'); });
        btn.classList.add('ativo');
        if (valorCustom) valorCustom.value = v;
      });
    });

    if (valorCustom) {
      valorCustom.addEventListener('input', function () {
        botoesValor.forEach(function (b) { b.classList.remove('ativo'); });
        valorSelecionado = Number(valorCustom.value) || null;
      });
    }

    if (btnDoar) {
      btnDoar.addEventListener('click', function () {
        var valor = valorSelecionado;
        if (valorCustom && Number(valorCustom.value) >= getMinAmount()) {
          valor = Number(valorCustom.value);
        }
        redirectToCheckout(valor || 0);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.DonationComponent = {
    init: init,
    redirectToCheckout: redirectToCheckout
  };
})(typeof window !== 'undefined' ? window : this);
