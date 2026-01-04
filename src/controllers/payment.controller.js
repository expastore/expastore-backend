// src/controllers/payment.controller.js
const paypalService = require('../services/paypal.service');
const logger = require('../utils/logger');

class PaymentController {
  /**
   * Capturar pago de PayPal (cuando el usuario aprueba)
   * POST /api/v1/payments/paypal/:paypalOrderId/capture
   */
  async capturePayPalPayment(req, res, next) {
    try {
      const { paypalOrderId } = req.params;

      const result = await paypalService.capturePayPalOrder(paypalOrderId);

      res.json({
        success: true,
        message: 'Pago capturado exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error in capturePayPalPayment', { 
        error: error.message,
        paypalOrderId: req.params.paypalOrderId 
      });
      
      res.status(400).json({
        success: false,
        message: 'Error al procesar el pago',
        error: error.message
      });
    }
  }

  /**
   * Obtener detalles de orden de PayPal
   * GET /api/v1/payments/paypal/:paypalOrderId
   */
  async getPayPalOrderDetails(req, res, next) {
    try {
      const { paypalOrderId } = req.params;

      const details = await paypalService.getPayPalOrderDetails(paypalOrderId);

      res.json({
        success: true,
        data: details
      });

    } catch (error) {
      logger.error('Error in getPayPalOrderDetails', { error: error.message });
      next(error);
    }
  }

  /**
   * Webhook de PayPal
   * POST /webhooks/paypal
   */
  async handlePayPalWebhook(req, res, next) {
    try {
      const headers = req.headers;
      const body = req.body;

      logger.info('PayPal webhook received', {
        eventType: body.event_type,
        resourceType: body.resource_type
      });

      // Verificar webhook (en producción, esto es MUY importante)
      const isValid = await paypalService.verifyWebhook(headers, body);

      if (!isValid) {
        logger.warn('Invalid PayPal webhook signature');
        return res.status(400).json({
          success: false,
          message: 'Invalid webhook signature'
        });
      }

      // Procesar evento
      await paypalService.processWebhookEvent(
        body.event_type,
        body.resource
      );

      // PayPal espera un 200 OK
      res.status(200).send();

    } catch (error) {
      logger.error('Error in handlePayPalWebhook', { 
        error: error.message,
        body: req.body 
      });
      
      // Aún así devolver 200 para evitar reintentos innecesarios
      res.status(200).send();
    }
  }

  /**
   * Obtener historial de pagos de una orden
   * GET /api/v1/payments/order/:orderId
   */
  async getOrderPayments(req, res, next) {
    try {
      const { orderId } = req.params;
      const { Payment } = require('../models');

      const payments = await Payment.findAll({
        where: { order_id: orderId },
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: payments.map(p => p.toPublic())
      });

    } catch (error) {
      logger.error('Error in getOrderPayments', { error: error.message });
      next(error);
    }
  }

  /**
   * Crear intento de pago manual (Admin)
   * POST /api/v1/admin/payments/manual
   */
  async createManualPayment(req, res, next) {
    try {
      const { Payment, Order } = require('../models');
      const ecuadorConstants = require('../utils/constants/ecuador.constants');
      
      const { orderId, amount, method, notes } = req.body;

      // Verificar orden
      const order = await Order.findByPk(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      // Crear registro de pago
      const payment = await Payment.create({
        order_id: orderId,
        provider: 'manual',
        payment_method: method || 'bank_transfer',
        amount: parseFloat(amount),
        net_amount: parseFloat(amount),
        currency: ecuadorConstants.CURRENCY.CODE,
        status: 'completed',
        completed_at: new Date(),
        metadata: {
          notes,
          created_by: req.user.userId
        }
      });

      // Actualizar orden
      await order.update({
        status: ecuadorConstants.ORDER_STATUS.PAID,
        payment_status: ecuadorConstants.PAYMENT_STATUS.COMPLETED,
        paid_at: new Date()
      });

      logger.info('Manual payment recorded', {
        orderId,
        paymentId: payment.id,
        amount
      });

      res.status(201).json({
        success: true,
        message: 'Pago manual registrado',
        data: payment.toPublic()
      });

    } catch (error) {
      logger.error('Error in createManualPayment', { error: error.message });
      next(error);
    }
  }
}

module.exports = new PaymentController();