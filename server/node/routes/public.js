/**
 * Rotas públicas da API — campaign e donate
 */

var express = require('express');
var { body, validationResult } = require('express-validator');
var pino = require('pino');
var knex = require('../db');

var logger = pino({ level: process.env.LOG_LEVEL || 'info' });

var router = express.Router();

/**
 * GET /api/campaign
 * Retorna a primeira campanha (id=1). Valores em centavos.
 */
router.get('/campaign', async function (req, res) {
  try {
    var row = await knex('campaign').where('id', 1).first();
    if (!row) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }
    res.json({
      id: row.id,
      goal: row.goal,
      goalExtended: row.goalExtended,
      collected: row.collected
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

var donateValidation = [
  body('amount')
    .isInt({ min: 1 })
    .withMessage('amount deve ser um inteiro maior que 0')
    .toInt()
];

/**
 * POST /api/donate
 * Valida amount (centavos), soma ao collected e insere em donations.
 */
router.post('/donate', donateValidation, async function (req, res) {
  var errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  var amount = req.body.amount;
  var method = req.body.method || 'manual';
  var donorName = req.body.donor_name || null;

  try {
    var result = await knex.transaction(async function (trx) {
      var campaign = await trx('campaign').where('id', 1).first();
      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }

      var newCollected = campaign.collected + amount;

      await trx('campaign').where('id', 1).update({
        collected: newCollected,
        updated_at: new Date().toISOString()
      });

      await trx('donations').insert({
        campaign_id: 1,
        amount: amount,
        method: method,
        donor_name: donorName,
        status: 'approved'
      });

      return {
        id: 1,
        goal: campaign.goal,
        goalExtended: campaign.goalExtended,
        collected: newCollected
      };
    });

    logger.info({ amount, method, donor_name: donorName, collected: result.collected }, 'doação processada');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar doação' });
  }
});

module.exports = router;
