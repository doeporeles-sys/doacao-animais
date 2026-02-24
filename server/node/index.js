/**
 * DOE POR ELES — Servidor Express
 * API + arquivos estáticos + SPA fallback
 */

require('dotenv').config();

var path = require('path');
var express = require('express');
var helmet = require('helmet');
var cors = require('cors');
var rateLimit = require('express-rate-limit');

var publicRoutes = require('./routes/public');
var errorHandler = require('./middlewares/errorHandler');
var logger = require('./lib/logger');

var BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').trim().replace(/\/$/, '');
var IS_PROD = process.env.NODE_ENV === 'production';

var app = express();

app.disable('x-powered-by');

// Helmet — segurança
var helmetOpts = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.mercadopago.com'],
      frameSrc: ['https://www.mercadopago.com']
    }
  }
};
if (IS_PROD) {
  helmetOpts.hsts = { maxAge: 31536000, includeSubDomains: true, preload: true };
} else {
  helmetOpts.hsts = false;
}
app.use(helmet(helmetOpts));

// CORS — restritivo
var corsOrigins = [];
if (BASE_URL && (BASE_URL.startsWith('http://') || BASE_URL.startsWith('https://'))) {
  corsOrigins.push(BASE_URL);
}
if (!IS_PROD) {
  corsOrigins.push('http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:8080');
}
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  methods: ['GET', 'POST', 'OPTIONS'],
  optionsSuccessStatus: 200
}));

// JSON body parser
app.use(express.json({ limit: '64kb' }));

// Rate limit global — 100 req / 15 min
var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// Rate limit webhook — 30 req / min
var webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Limite de requisições excedido.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/payments/webhook', webhookLimiter);

// Logger middleware
app.use(function (req, res, next) {
  logger.logInfo(req, 'request');
  next();
});

// Health check
app.get('/health', function (req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas da API
app.use('/api', publicRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payments', require('./routes/payments'));

// Arquivos estáticos
var publicDir = path.resolve(__dirname, '..', '..', 'public');
app.use(express.static(publicDir));

// Admin e fallback
app.get('/admin', function (req, res) {
  res.sendFile(path.join(publicDir, 'admin.html'));
});
app.get('*', function (req, res) {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Middleware global de erro (deve ser o último)
app.use(errorHandler);

var port = process.env.PORT || 8080;
app.listen(port, function () {
  console.log('Doe por Eles — servidor em http://localhost:' + port);
});
