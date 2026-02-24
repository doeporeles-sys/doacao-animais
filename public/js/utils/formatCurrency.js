/**
 * Utilitário: formatação de moeda brasileira
 */

(function (global) {
  'use strict';

  /**
   * Formata um número como moeda em Real (Brasil).
   * @param {number} value - Valor numérico
   * @returns {string} Ex: "R$ 1.500,00"
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

  global.formatCurrency = formatCurrency;
})(typeof window !== 'undefined' ? window : this);
