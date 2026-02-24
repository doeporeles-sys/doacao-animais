/**
 * Seed inicial da campanha — valores em centavos
 * Idempotente: ordem de limpeza respeita FK (donations -> campaign)
 */

exports.seed = function (knex) {
  return knex.transaction(function (trx) {
    return trx('donations').del()
      .then(function () {
        return trx('campaign').del();
      })
      .then(function () {
        return trx('campaign').insert([
          {
            id: 1,
            goal: 5000000,        // R$ 50.000,00
            goalExtended: 20000000, // R$ 200.000,00
            collected: 4250000    // R$ 42.500,00
          }
        ]);
      });
  });
};
