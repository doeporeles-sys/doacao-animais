/**
 * Doe por Eles — Aplicação principal
 * Orquestra: carrega dados da API (endpoint simulado) e atualiza progresso.
 */

(function (global) {
  'use strict';

  function boot() {
    var fetchCampaign = global.fetchCampaign;
    var ProgressComponent = global.ProgressComponent;

    if (fetchCampaign && ProgressComponent) {
      fetchCampaign()
        .then(function (data) {
          ProgressComponent.setCampaign(data);
        });
    } else {
      if (ProgressComponent) ProgressComponent.updateProgress();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.APP = { boot: boot };
})(typeof window !== 'undefined' ? window : this);
