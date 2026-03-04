/**
 * Knex config — Doe por Eles (SQLite/better-sqlite3)
 */

const path = require('path');

const rootDir = __dirname;
const dbPath = path.resolve(rootDir, 'data', 'doacao.db');

const migrationsDir = path.resolve(rootDir, 'server', 'migrations');
const seedsDir = path.resolve(rootDir, 'server', 'seeds');

/** @type {import('knex').Knex.Config} */
const base = {
  client: 'better-sqlite3',
  connection: {
    filename: dbPath
  },
  useNullAsDefault: true,
  migrations: {
    directory: migrationsDir
  },
  seeds: {
    directory: seedsDir
  }
};

module.exports = {
  development: base,
  production: base,
  test: base
};

