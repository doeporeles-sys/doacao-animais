/**
 * Logger centralizado — formato JSON estruturado
 * Produção: compacto | Desenvolvimento: detalhado
 */

var IS_PROD = process.env.NODE_ENV === 'production';

function basePayload(req, extras) {
  var out = {
    level: extras.level || 'info',
    message: extras.message || '',
    timestamp: new Date().toISOString()
  };
  if (req) {
    out.route = req.method + ' ' + (req.route ? req.route.path : req.path || req.url);
    out.ip = req.ip || req.connection?.remoteAddress || req.headers?.['x-forwarded-for']?.split(',')[0] || 'unknown';
  }
  return Object.assign(out, extras);
}

function logInfo(req, message, data) {
  var payload = basePayload(req, { level: 'info', message: message });
  if (data && !IS_PROD) payload.data = data;
  console.log(JSON.stringify(payload));
}

function logWarn(req, message, data) {
  var payload = basePayload(req, { level: 'warn', message: message });
  if (data) payload.data = data;
  console.warn(JSON.stringify(payload));
}

function logError(req, message, data) {
  var payload = basePayload(req, { level: 'error', message: message });
  if (data) payload.data = data;
  if (!IS_PROD && data && data.stack) payload.stack = data.stack;
  console.error(JSON.stringify(payload));
}

module.exports = { logInfo, logWarn, logError };
