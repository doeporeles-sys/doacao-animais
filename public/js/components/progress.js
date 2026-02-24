/**
 * Componente: Barra de progresso (metas e arrecadação)
 * Depende de: formatCurrency, variáveis goal, goalExtended, collected no APP
 */

(function (global) {
  'use strict';

  var goal = 50000;
  var goalExtended = 200000;
  var collected = 0;

  /**
   * Atualiza a barra e os textos com base em collected/goalExtended.
   * Chamado após carregar dados da API ou alterar collected.
   */
  function updateProgress() {
    var elValor = document.getElementById('valor-arrecadado');
    var elBar = document.getElementById('progress-bar');
    var elStatus = document.getElementById('progress-status');
    var formatCurrency = global.formatCurrency;

    if (elValor && formatCurrency) {
      elValor.textContent = formatCurrency(collected);
    }

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

  /**
   * Aplica dados da campanha (ex.: retorno da API) e atualiza a UI.
   */
  function setCampaign(data) {
    if (data && typeof data.goal === 'number') goal = data.goal;
    if (data && typeof data.goalExtended === 'number') goalExtended = data.goalExtended;
    if (data && typeof data.collected === 'number') collected = data.collected;
    updateProgress();
  }

  function getGoal() { return goal; }
  function getGoalExtended() { return goalExtended; }
  function getCollected() { return collected; }
  function setCollected(value) {
    collected = Number(value) || 0;
    updateProgress();
  }

  global.ProgressComponent = {
    updateProgress: updateProgress,
    setCampaign: setCampaign,
    getGoal: getGoal,
    getGoalExtended: getGoalExtended,
    getCollected: getCollected,
    setCollected: setCollected
  };
})(typeof window !== 'undefined' ? window : this);
