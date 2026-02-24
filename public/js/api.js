/**
 * Cliente API — campanha (metas e arrecadação)
 * Preparado para backend Node ou PHP.
 */

(function (global) {
  'use strict';

  /**
   * Busca dados da campanha (goal, goalExtended, collected).
   * Se API_BASE estiver vazio, usa o mesmo host (CORS não é problema).
   * @returns {Promise<{goal: number, goalExtended: number, collected: number}>}
   */
  function fetchCampaign() {
    var base = (global.CONFIG && global.CONFIG.API_BASE) ? global.CONFIG.API_BASE : '';
    var path = (global.CONFIG && global.CONFIG.API_CAMPAIGN) ? global.CONFIG.API_CAMPAIGN : '/api/campaign';
    var url = base + path;

    return fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Falha ao carregar campanha: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        return {
          goal: Number(data.goal) || 50000,
          goalExtended: Number(data.goalExtended) || 200000,
          collected: Number(data.collected) || 0
        };
      })
      .catch(function (err) {
        console.warn('API campaign:', err.message, '- usando valores padrão.');
        return {
          goal: 50000,
          goalExtended: 200000,
          collected: 0
        };
      });
  }

  global.fetchCampaign = fetchCampaign;
})(typeof window !== 'undefined' ? window : this);
