/**
 * Conexão com SQLite via Knex.
 * Exporta uma instância única para uso nas rotas.
 */

var fs = require('fs');
var path = require('path');
var knexFactory = require('knex');

// Ambiente padrão: development
var env = process.env.NODE_ENV || 'development';

// Caminho robusto para <repo_root>/data/doacao.db (__dirname = server/node)
var dbPath = path.join(__dirname, '..', '..', 'data', 'doacao.db');
var dataDir = path.dirname(dbPath);

// Garante que a pasta data/ exista (local/Render com disk mount)
try {
  fs.mkdirSync(dataDir, { recursive: true });
} catch (e) {
  // Se falhar por permissão, o erro real aparecerá ao abrir o DB
}

var config;
try {
  config = require(path.join(__dirname, '..', '..', 'knexfile.cjs'));
} catch (e) {
  try {
    config = require(path.join(__dirname, '..', '..', 'knexfile.js'));
  } catch (e2) {
    config = null;
  }
}

var selected = (config && config[env]) ? config[env] : {
  client: 'better-sqlite3',
  connection: { filename: dbPath },
  useNullAsDefault: true,
  migrations: { directory: path.join(__dirname, '..', '..', 'migrations') },
  seeds: { directory: path.join(__dirname, '..', '..', 'seeds') }
};

// Força o arquivo do DB para evitar qualquer divergência de path
selected.connection = selected.connection || {};
selected.connection.filename = dbPath;

module.exports = knexFactory(selected);

