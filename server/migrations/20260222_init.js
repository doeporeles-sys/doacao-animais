/**
 * Migration inicial — tabelas campaign, donations, admins
 */

exports.up = function (knex) {
  return knex.schema
    .createTable('campaign', function (table) {
      table.increments('id').primary();
      table.integer('goal').notNullable();
      table.integer('goalExtended').notNullable();
      table.integer('collected').notNullable().defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('donations', function (table) {
      table.increments('id').primary();
      table.integer('campaign_id').unsigned().references('id').inTable('campaign');
      table.integer('amount').notNullable();
      table.string('method').nullable();
      table.string('donor_name').nullable();
      table.string('status').notNullable().defaultTo('confirmed');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('admins', function (table) {
      table.increments('id').primary();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('role').defaultTo('admin');
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('admins')
    .dropTableIfExists('donations')
    .dropTableIfExists('campaign');
};
