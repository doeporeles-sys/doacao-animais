/**
 * Diagnóstico do knexfile — imprime keys e client para debug (Render)
 */
try {
  var cfg = require('../knexfile.cjs');
  console.log('KNEXFILE_KEYS', Object.keys(cfg));
  console.log('DEV_CLIENT', cfg.development && cfg.development.client);
  console.log('DEV_FILENAME', cfg.development && cfg.development.connection && cfg.development.connection.filename);
  console.log('PROD_CLIENT', cfg.production && cfg.production.client);
} catch (e) {
  console.error('KNEX_DIAG_ERROR', e.message);
  process.exit(1);
}
