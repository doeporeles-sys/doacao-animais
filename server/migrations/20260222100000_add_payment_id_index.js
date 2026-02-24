/**
 * Índice em donations.payment_id para consultas idempotentes do webhook
 * SQLite requer CREATE INDEX (não suporta ALTER TABLE ADD INDEX)
 */

exports.up = function (knex) {
  return knex.raw('CREATE INDEX IF NOT EXISTS idx_donations_payment_id ON donations(payment_id)');
};

exports.down = function (knex) {
  return knex.raw('DROP INDEX IF EXISTS idx_donations_payment_id');
};
