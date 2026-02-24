/**
 * Padroniza status: confirmed -> approved (alinhado ao Mercado Pago)
 */

exports.up = function (knex) {
  return knex('donations').where('status', 'confirmed').update({ status: 'approved' });
};

exports.down = function (knex) {
  return knex('donations').where('status', 'approved').update({ status: 'confirmed' });
};
