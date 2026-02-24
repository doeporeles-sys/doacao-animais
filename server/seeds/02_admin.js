/**
 * Seed admin inicial — email: admin@doeporeles.local, senha: ChangeMe123!
 * Idempotente: upsert por email
 */

var bcrypt = require('bcryptjs');

exports.seed = function (knex) {
  var email = 'admin@doeporeles.local';
  var password = 'ChangeMe123!';
  var passwordHash = bcrypt.hashSync(password, 10);

  return knex.transaction(function (trx) {
    return trx('admins').where('email', email).first()
      .then(function (existing) {
        if (existing) {
          return trx('admins').where('email', email).update({
            password_hash: passwordHash,
            updated_at: new Date().toISOString()
          });
        }
        return trx('admins').insert({
          email: email,
          password_hash: passwordHash,
          role: 'admin'
        });
      });
  });
};
