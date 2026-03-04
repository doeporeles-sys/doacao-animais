/**
 * Knex config — Doe por Eles (SQLite/better-sqlite3)
 * CommonJS puro — compatível com Render e Node LTS
 */

const path = require('path');

const base = {
  client: 'better-sqlite3',
  connection: {
    filename: path.join(__dirname, 'data', 'doacao.db')
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'server', 'migrations')
  },
  seeds: {
    directory: path.join(__dirname, 'server', 'seeds')
  }
};

module.exports = {
  development: base,
  production: base,
  test: base
};
