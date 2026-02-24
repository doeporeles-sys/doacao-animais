/**
 * Adiciona payment_id em donations para idempotência do webhook Mercado Pago
 */

exports.up = function (knex) {
  return knex.schema.alterTable('donations', function (table) {
    table.string('payment_id').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('donations', function (table) {
    table.dropColumn('payment_id');
  });
};
