
// ========================================
// src/routes/webhook.routes.js
// ========================================
const express = require('express');
const webhookRouter = express.Router();
const paymentController = require('../controllers/payment.controller');

/**
 * @route   POST /webhooks/paypal
 * @desc    Webhook de PayPal para notificaciones de eventos
 * @access  Public (pero verificado por signature)
 * 
 * IMPORTANTE: Esta ruta NO debe tener middleware de autenticación
 * ya que es llamada directamente por PayPal
 */
webhookRouter.post(
  '/paypal',
  express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }),
  paymentController.handlePayPalWebhook
);

module.exports = webhookRouter;