/**
 * Rotas de pagamento — Mercado Pago Checkout Pro
 */

var crypto = require('crypto');
var https = require('https');
var rateLimit = require('express-rate-limit');
var knex = require('../db');

var MAX_AMOUNT_CENTAVOS = 100000000; // R$ 1.000.000,00
var EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function sanitizeStr(val, maxLen) {
  if (val == null || typeof val !== 'string') return '';
  return String(val).trim().slice(0, maxLen || 256);
}

function parseAmount(val) {
  var n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

var ACCESS_TOKEN = (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();
var BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').trim().replace(/\/$/, '');
var WEBHOOK_SECRET = (process.env.MERCADO_PAGO_WEBHOOK_SECRET || '').trim();
var WEBHOOK_DEBUG = process.env.WEBHOOK_DEBUG === 'true';
var PAYMENT_DEBUG = process.env.PAYMENT_DEBUG === 'true' || WEBHOOK_DEBUG;
var IS_DEV = process.env.NODE_ENV !== 'production';
var IS_PROD = process.env.NODE_ENV === 'production';

function log(msg, data) {
  if (WEBHOOK_DEBUG) {
    console.log('[Webhook MP]', msg, data !== undefined ? JSON.stringify(data) : '');
  }
}

function logPayment(msg, data) {
  if (PAYMENT_DEBUG) {
    console.log('[PIX]', msg, data !== undefined ? JSON.stringify(data) : '');
  }
}

function generateIdempotencyKey() {
  return 'pix-' + Date.now() + '-' + Math.random().toString(36).slice(2, 15);
}

/**
 * Valida assinatura HMAC SHA256 do webhook Mercado Pago.
 * Header x-signature: t=timestamp,v1=hash
 * Manifesto: id:{data.id};request-id:{x-request-id};ts:{timestamp};
 * @param {object} req - Request Express
 * @returns {{ valid: boolean, skip: boolean }} valid = assinatura OK; skip = pular validação (dev sem secret)
 */
function validateWebhookSignature(req) {
  var hasSecret = WEBHOOK_SECRET.length > 0;
  if (!hasSecret) {
    if (IS_PROD) {
      return { valid: false, skip: false };
    }
    if (WEBHOOK_DEBUG) {
      log('Validação ignorada: MERCADO_PAGO_WEBHOOK_SECRET não definido (dev + WEBHOOK_DEBUG)');
      return { valid: true, skip: true };
    }
    return { valid: false, skip: false };
  }

  var xSignature = (req.headers['x-signature'] || req.headers['X-Signature'] || '').trim();
  var xRequestId = (req.headers['x-request-id'] || req.headers['X-Request-Id'] || '').trim();

  if (!xSignature) {
    log('Rejeitado: header x-signature ausente');
    return { valid: false, skip: false };
  }

  var payload = req.body || {};
  var dataId = (payload.data && payload.data.id != null)
    ? String(payload.data.id)
    : (req.query['data.id'] || '').trim();
  if (/^[a-zA-Z0-9]+$/.test(dataId)) {
    dataId = dataId.toLowerCase();
  }

  var ts = null;
  var hash = null;
  var parts = xSignature.split(',');
  for (var i = 0; i < parts.length; i++) {
    var eq = parts[i].indexOf('=');
    if (eq === -1) continue;
    var key = parts[i].slice(0, eq).trim();
    var val = parts[i].slice(eq + 1).trim();
    if (key === 'ts' || key === 't') ts = val;
    else if (key === 'v1') hash = val;
  }

  if (!ts || !hash) {
    log('Rejeitado: x-signature sem ts ou v1');
    return { valid: false, skip: false };
  }

  var now = Math.floor(Date.now() / 1000);
  var timestamp = parseInt(ts, 10);
  if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
    if (WEBHOOK_DEBUG) {
      log('Rejeitado: timestamp fora da janela permitida', { now: now, ts: timestamp });
    }
    return { valid: false, skip: false };
  }

  var manifest = 'id:' + dataId + ';request-id:' + xRequestId + ';ts:' + ts + ';';
  var hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(manifest);
  var calculated = hmac.digest('hex');

  if (WEBHOOK_DEBUG) {
    log('Assinatura recebida (v1)', hash.substring(0, 16) + '...');
    log('Assinatura calculada', calculated.substring(0, 16) + '...');
    log('Manifesto', manifest);
  }

  if (hash.length !== calculated.length) {
    log('Rejeitado: tamanho do hash difere');
    return { valid: false, skip: false };
  }

  try {
    var equal = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculated, 'hex'));
    if (WEBHOOK_DEBUG) {
      log('Validação', equal ? 'OK' : 'FALHOU');
    }
    if (!equal) {
      log('Tentativa de webhook com assinatura inválida', { data_id: dataId });
    }
    return { valid: equal, skip: false };
  } catch (e) {
    log('Erro ao comparar assinatura', e.message);
    return { valid: false, skip: false };
  }
}

function mpRequest(method, path, body, extraHeaders) {
  extraHeaders = extraHeaders || {};
  return new Promise(function (resolve, reject) {
    var data = body ? JSON.stringify(body) : null;
    var token = ACCESS_TOKEN;
    var opts = {
      hostname: 'api.mercadopago.com',
      path: path,
      method: method,
      headers: Object.assign({
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }, extraHeaders)
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    var req = https.request(opts, function (res) {
      var chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        var text = Buffer.concat(chunks).toString();
        var json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          reject({ status: res.statusCode, message: 'Resposta inválida da API', raw: text });
          return;
        }
        if (res.statusCode >= 400) {
          var msg = json.message || json.error || 'Mercado Pago API error';
          var cause = json.cause ? (Array.isArray(json.cause) ? json.cause[0] : json.cause) : null;
          if (cause && cause.description) msg += ' — ' + cause.description;
          if (IS_DEV) {
            console.error('[MP API]', res.statusCode, msg, cause || json);
          }
          reject({ status: res.statusCode, message: msg, body: json });
        } else {
          resolve(json);
        }
      });
    });
    req.on('error', function (err) {
      if (IS_DEV) console.error('[MP API] Erro de rede:', err.message);
      reject({ status: 0, message: err.message });
    });
    if (data) req.write(data);
    req.end();
  });
}

/**
 * POST /api/payments/create
 * Cria preferência e retorna checkoutUrl (init_point)
 */
async function createPayment(req, res) {
  var body = req.body && typeof req.body === 'object' ? req.body : {};
  var amount = parseAmount(body.amount);
  var description = sanitizeStr(body.description, 256) || 'Doação Doe Por Eles';

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      error: 'Mercado Pago não configurado. Defina MERCADO_PAGO_ACCESS_TOKEN no .env'
    });
  }
  if (amount < 100) {
    return res.status(400).json({ error: 'Valor inválido (mínimo R$ 1,00)' });
  }
  if (amount > MAX_AMOUNT_CENTAVOS) {
    return res.status(400).json({ error: 'Valor excede o limite permitido' });
  }

  var unitPrice = amount / 100;

  // Corpo conforme API — Pix, cartão e boleto habilitados por padrão (MP/Brasil)
  var preference = {
    items: [{
      title: description,
      quantity: 1,
      unit_price: unitPrice
    }],
    back_urls: {
      success: BASE_URL + '/?payment=success',
      failure: BASE_URL + '/?payment=failure',
      pending: BASE_URL + '/?payment=pending'
    },
    auto_return: 'approved',
    payment_methods: {
      excluded_payment_types: [],
      excluded_payment_methods: []
    }
  };

  try {
    var result = await mpRequest('POST', '/checkout/preferences', preference);
    if (!result.init_point) {
      return res.status(500).json({ error: 'Resposta inválida do Mercado Pago' });
    }
    res.json({ checkoutUrl: result.init_point });
  } catch (err) {
    var status = err.status;
    var msg = err.message || 'Erro ao criar checkout';

    if (status === 401 || /UNAUTHORIZED|unauthorized|401/i.test(msg)) {
      return res.status(500).json({
        error: 'Token inválido ou expirado. Verifique MERCADO_PAGO_ACCESS_TOKEN no .env. Use credenciais de teste (sandbox).'
      });
    }
    if (status === 400 && /back_url|invalid_url|http/i.test(msg)) {
      return res.status(500).json({
        error: 'URLs de retorno precisam ser HTTPS. Use ngrok (https://xxx.ngrok.io) e defina BASE_URL no .env.'
      });
    }

    res.status(500).json({ error: msg });
  }
}

/**
 * POST /api/payments/webhook
 * Recebe notificação do Mercado Pago e registra doação.
 * Valida assinatura x-signature antes de processar.
 * Idempotência: payment_id único; se já existir, ignora.
 */
async function webhook(req, res) {
  var sigResult = validateWebhookSignature(req);
  if (!sigResult.valid) {
    if (IS_PROD || !sigResult.skip) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
  }

  res.status(200).send('OK');

  var payload = req.body || {};
  log('Payload recebido', { type: payload.type, data: payload.data });

  var type = payload.type;
  var data = payload.data;

  if (type !== 'payment' || !data || data.id == null) {
    log('Webhook ignorado: type ou data.id ausente');
    return;
  }

  var paymentId = String(data.id).trim();
  if (!paymentId || !/^\d+$/.test(paymentId)) {
    log('Webhook ignorado: payment_id inválido', { paymentId: paymentId });
    return;
  }

  (async function () {
    try {
      var payment = await mpRequest('GET', '/v1/payments/' + paymentId, null);
      log('Pagamento consultado', { id: paymentId, status: payment.status });

      if (payment.status !== 'approved') {
        log('Webhook ignorado: status não é approved', { status: payment.status });
        return;
      }

      var amount = Math.round((payment.transaction_amount || 0) * 100);
      if (amount <= 0) {
        log('Webhook ignorado: amount inválido', { amount: amount });
        return;
      }

      var existing = await knex('donations').where('payment_id', paymentId).first();
      if (existing && (existing.status === 'approved' || existing.status === 'confirmed')) {
        log('Idempotência: doação já confirmada', { payment_id: paymentId });
        return;
      }

      await knex.transaction(async function (trx) {
        if (existing) {
          await trx('donations').where('payment_id', paymentId).update({
            status: 'approved',
            donor_name: payment.payer && payment.payer.email ? payment.payer.email : existing.donor_name
          });
        } else {
          await trx('donations').insert({
            campaign_id: 1,
            amount: amount,
            method: payment.payment_method_id === 'pix' ? 'pix' : 'mercadopago',
            donor_name: payment.payer && payment.payer.email ? payment.payer.email : null,
            status: 'approved',
            payment_id: paymentId
          });
        }

        var campaign = await trx('campaign').where('id', 1).first();
        await trx('campaign').where('id', 1).update({
          collected: (campaign.collected || 0) + amount,
          updated_at: new Date().toISOString()
        });
      });

      log('Doação registrada', { payment_id: paymentId, amount: amount, collected_inc: amount });
    } catch (err) {
      var emsg = err && (err.message || err.status) ? (err.message || 'Status ' + err.status) : String(err);
      console.error('[Webhook MP] Erro:', emsg);
    }
  })();
}

var express = require('express');
var router = express.Router();

var pixLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas. Aguarde um minuto.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/payments/create-pix
 * Cria pagamento PIX via API v1 e retorna QR code
 */
async function createPix(req, res) {
  var body = req.body && typeof req.body === 'object' ? req.body : {};
  var amount = parseAmount(body.amount);
  var payer = body.payer && typeof body.payer === 'object' ? body.payer : {};
  var rawEmail = sanitizeStr(payer.email, 254);
  var email = EMAIL_REGEX.test(rawEmail) ? rawEmail : 'donor@anonymous.local';

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      error: 'Mercado Pago não configurado. Defina MERCADO_PAGO_ACCESS_TOKEN no .env'
    });
  }
  if (amount < 100) {
    return res.status(400).json({ error: 'Valor inválido (mínimo R$ 1,00)' });
  }
  if (amount > MAX_AMOUNT_CENTAVOS) {
    return res.status(400).json({ error: 'Valor excede o limite permitido' });
  }
  if (!BASE_URL || BASE_URL.indexOf('https://') !== 0) {
    return res.status(500).json({
      error: 'BASE_URL deve ser HTTPS (ex: ngrok https://xxx.ngrok.io). Requerido para PIX.'
    });
  }

  var amountReais = amount / 100;
  var body = {
    transaction_amount: amountReais,
    payment_method_id: 'pix',
    description: 'Doação Doe Por Eles',
    notification_url: BASE_URL + '/api/payments/webhook',
    external_reference: generateIdempotencyKey(),
    payer: { email: email }
  };

  logPayment('Criando PIX', { amount: amount, amountReais: amountReais });

  try {
    var result = await mpRequest('POST', '/v1/payments', body, {
      'X-Idempotency-Key': body.external_reference
    });

    var id = result.id;
    var poi = result.point_of_interaction || {};
    var txData = poi.transaction_data || {};
    var qrCode = txData.qr_code || null;
    var qrCodeBase64 = txData.qr_code_base64 || null;
    var ticketUrl = txData.ticket_url || null;
    var dateOfExpiration = result.date_of_expiration || null;

    logPayment('PIX criado', { payment_id: id, status: result.status });

    var paymentId = String(id);

    var existing = await knex('donations').where('payment_id', paymentId).first();
    if (!existing) {
      await knex.transaction(async function (trx) {
        await trx('donations').insert({
          campaign_id: 1,
          amount: amount,
          method: 'pix',
          donor_name: email !== 'donor@anonymous.local' ? email : null,
          status: 'pending',
          payment_id: paymentId
        });
      });
    }

    res.status(201).json({
      payment_id: paymentId,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64 ? 'data:image/png;base64,' + qrCodeBase64 : null,
      ticket_url: ticketUrl,
      expires_at: dateOfExpiration
    });
  } catch (err) {
    var status = err.status;
    var msg = err.message || 'Erro ao criar pagamento PIX';

    if (status === 401 || /UNAUTHORIZED|unauthorized|401/i.test(msg)) {
      return res.status(500).json({
        error: 'Token inválido. Verifique MERCADO_PAGO_ACCESS_TOKEN. Use credenciais de teste.'
      });
    }
    if (status === 400) {
      return res.status(400).json({ error: msg });
    }

    logPayment('Erro', { status: status, message: msg });
    res.status(500).json({ error: msg });
  }
}

/**
 * GET /api/payments/status?payment_id=...
 * Consulta status do pagamento no Mercado Pago
 */
async function paymentStatus(req, res) {
  var paymentId = sanitizeStr(req.query.payment_id, 32);
  if (!paymentId || !/^\d{1,20}$/.test(paymentId)) {
    return res.status(400).json({ error: 'payment_id inválido' });
  }

  try {
    var payment = await mpRequest('GET', '/v1/payments/' + paymentId, null);
    res.json({ status: payment.status, payment_id: paymentId });
  } catch (err) {
    var status = err.status;
    var msg = err.message || 'Erro ao consultar status';

    if (status === 404) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    res.status(status >= 500 ? 500 : 400).json({ error: msg });
  }
}

router.post('/create', createPayment);
router.post('/create-pix', pixLimiter, createPix);
router.get('/status', paymentStatus);
router.post('/webhook', webhook);

module.exports = router;
