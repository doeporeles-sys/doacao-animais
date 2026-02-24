/**
 * Doe por Eles — Landing institucional
 * O valor arrecadado pode ser atualizado alterando config.valorArrecadado
 * ou futuramente via API (ex.: buscar de backend e chamar atualizarArrecadado(valor)).
 */

(function () {
  'use strict';

  // ========== CONFIGURAÇÃO (editável / futura API) ==========
  var config = {
    valorArrecadado: 0,
    metaInicial: 50000,
    metaEstendida: 200000,
    urlCheckout: 'https://exemplo-checkout.com/doar?valor=' // placeholder — trocar pela URL real
  };

  // ========== ELEMENTOS ==========
  var elValorArrecadado = document.getElementById('valor-arrecadado');
  var elProgressBar = document.getElementById('progress-bar');
  var elProgressStatus = document.getElementById('progress-status');
  var elValorCustom = document.getElementById('valor-custom');
  var elBtnDoar = document.getElementById('btn-doar');
  var botoesValor = document.querySelectorAll('.btn-valor');
  var faqItems = document.querySelectorAll('.faq-item');
  var menuToggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.nav');

  // ========== FORMATAÇÃO ==========
  function formatarMoeda(valor) {
    return 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ========== PROGRESS BAR ==========
  function atualizarProgresso() {
    var valor = config.valorArrecadado;
    var meta = config.metaEstendida;

    if (elValorArrecadado) {
      elValorArrecadado.textContent = formatarMoeda(valor);
    }

    if (elProgressBar) {
      var percent = Math.min(100, (valor / meta) * 100);
      elProgressBar.style.width = percent + '%';
      elProgressBar.setAttribute('aria-valuenow', valor);
      elProgressBar.setAttribute('aria-valuemax', meta);
    }

    if (elProgressStatus) {
      if (valor >= config.metaEstendida) {
        elProgressStatus.textContent = 'Meta estendida atingida! Obrigado a todos os doadores.';
      } else if (valor >= config.metaInicial) {
        elProgressStatus.textContent = 'Meta inicial batida! Vamos em busca da meta estendida de R$ 200.000.';
      } else {
        elProgressStatus.textContent = 'Apoie nossa causa com qualquer valor.';
      }
    }
  }

  /**
   * Atualiza o valor arrecadado exibido na página.
   * Use para sincronizar com API: buscar valor no backend e chamar atualizarArrecadado(valor).
   * @param {number} valor - Valor total arrecadado em reais
   */
  function atualizarArrecadado(valor) {
    config.valorArrecadado = Number(valor) || 0;
    atualizarProgresso();
  }

  // Expor para uso externo (API ou console)
  window.atualizarArrecadado = atualizarArrecadado;

  // ========== DOAÇÃO ==========
  var valorSelecionado = null;

  function escolherValor(valor) {
    valorSelecionado = valor;
    botoesValor.forEach(function (btn) {
      btn.classList.toggle('ativo', Number(btn.getAttribute('data-valor')) === valor);
    });
    if (elValorCustom) {
      elValorCustom.value = valor > 0 ? valor : '';
    }
  }

  botoesValor.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = Number(btn.getAttribute('data-valor'));
      escolherValor(v);
    });
  });

  if (elValorCustom) {
    elValorCustom.addEventListener('input', function () {
      var v = Number(elValorCustom.value) || 0;
      botoesValor.forEach(function (b) {
        b.classList.remove('ativo');
      });
      valorSelecionado = v >= 10 ? v : null;
    });
  }

  if (elBtnDoar) {
    elBtnDoar.addEventListener('click', function () {
      var valor = valorSelecionado;
      if (elValorCustom && Number(elValorCustom.value) >= 10) {
        valor = Number(elValorCustom.value);
      }
      if (!valor || valor < 10) {
        alert('Por favor, escolha um valor (mínimo R$ 10) ou informe outro valor.');
        return;
      }
      var url = (config.urlCheckout || '').replace(/=.*$/, '=') + valor;
      window.open(url, '_blank');
    });
  }

  // ========== FAQ ==========
  faqItems.forEach(function (item) {
    var question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      faqItems.forEach(function (i) {
        i.classList.remove('is-open');
        var q = i.querySelector('.faq-question');
        if (q) q.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('is-open');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ========== MENU MÓVEL ==========
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', open);
    });
  }

  // ========== INICIALIZAÇÃO ==========
  atualizarProgresso();
})();
