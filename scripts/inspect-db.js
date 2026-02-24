/**
 * Script temporário para inspecionar estrutura do banco SQLite
 * Uso: node scripts/inspect-db.js
 */
require('dotenv').config();
var path = require('path');
var dbPath = path.resolve(__dirname, '..', 'data', 'doacao.db');

console.log('Banco:', dbPath);
console.log('---');

try {
  var db = require('better-sqlite3')(dbPath);

  // Listar tabelas
  var tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all();
  console.log('Tabelas:', tables.map(function (t) { return t.name; }).join(', '));
  console.log('');

  tables.forEach(function (t) {
    if (t.name === 'sqlite_sequence') return;
    var info = db.prepare('PRAGMA table_info(' + t.name + ')').all();
    console.log('Tabela:', t.name);
    info.forEach(function (col) {
      console.log('  -', col.name, col.type, col.notnull ? 'NOT NULL' : '', col.dflt_value ? 'DEFAULT ' + col.dflt_value : '');
    });
    var idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL").all(t.name);
    if (idx.length) {
      console.log('  Índices:', idx.map(function (i) { return i.name; }).join(', '));
    }
    console.log('');
  });

  db.close();
  console.log('Inspeção concluída.');
} catch (err) {
  console.error('Erro:', err.message);
  console.error('Verifique se o banco existe e as migrations foram executadas.');
  process.exit(1);
}
