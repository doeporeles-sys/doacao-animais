/**
 * Middleware global de erro — não vaza stack em produção
 */

var IS_PROD = process.env.NODE_ENV === 'production';

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  var status = err.status || err.statusCode || 500;
  var message = err.message || 'Erro interno do servidor';

  if (IS_PROD) {
    res.status(status).json({ error: 'Erro interno do servidor' });
  } else {
    res.status(status).json({
      error: message,
      stack: err.stack
    });
  }
}

module.exports = errorHandler;
