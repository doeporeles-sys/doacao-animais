/**
 * Rotas administrativas — login, donations, stats (somente leitura)
 */

var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var knex = require('../db');
var auth = require('../middlewares/auth');

var router = express.Router();
var JWT_SECRET = process.env.JWT_SECRET;

/**
 * POST /api/admin/login
 * Autentica admin e retorna JWT
 */
router.post('/login', async function (req, res) {
  var email = req.body.email;
  var password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    var admin = await knex('admins').where('email', email).first();
    if (!admin) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    var match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    var token = jwt.sign(
      { sub: admin.id, role: admin.role || 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token: token });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao autenticar' });
  }
});

/**
 * GET /api/admin/stats
 * Protegido — retorna métricas agregadas
 */
router.get('/stats', auth, async function (req, res) {
  try {
    var confirmed = await knex('donations')
      .whereIn('status', ['approved', 'confirmed'])
      .select(knex.raw('COUNT(*) as total'), knex.raw('COALESCE(SUM(amount), 0) as amount'))
      .first();
    var refundedRow = await knex('donations').where('status', 'refunded').count('*').first();
    var totalRefunded = refundedRow['count(*)'] ?? refundedRow.total ?? 0;
    var campaign = await knex('campaign').where('id', 1).first();

    res.json({
      total_confirmed: parseInt(confirmed.total || 0, 10),
      total_refunded: parseInt(totalRefunded, 10),
      amount_confirmed: parseInt(confirmed.amount || 0, 10),
      goal: campaign ? parseInt(campaign.goal, 10) : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar estatísticas' });
  }
});

/**
 * GET /api/admin/donations
 * Protegido — retorna lista paginada de doações
 */
router.get('/donations', auth, async function (req, res) {
  var limit = Math.min(parseInt(req.query.limit, 10) || 100, 100);
  var offset = parseInt(req.query.offset, 10) || 0;

  try {
    var rows = await knex('donations')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({ donations: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar doações' });
  }
});

module.exports = router;
