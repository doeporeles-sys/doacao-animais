/**
 * Middleware de autenticação JWT
 */

var jwt = require('jsonwebtoken');

var JWT_SECRET = process.env.JWT_SECRET;

function auth(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET não configurado' });
  }
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token ausente ou inválido' });
  }

  var token = authHeader.slice(7);
  try {
    var decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = auth;
