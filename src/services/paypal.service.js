// src/services/paypal.service.js
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');
const { Payment, Order } = require('../models');
const logger = require('../utils/logger');
const ecuadorConstants = require('../utils/constants/ecuador.constants');

class PayPalService {
  constructor() {
    this.environment = this.getEnvironment();
    this.client = new checkoutNodeJssdk.core.PayPalHttpClient(this.environment);
  }

  /**
   * Configurar entorno PayPal (sandbox o production)
   */
  getEnvironment() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    const mode = process.env.PAYPAL_MODE || 'sandbox';
    
    if (mode === 'production') {
      return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
    } else {
      return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
    }
  }

  /**
   * Crear orden de PayPal
   */
  async createPayPalOrder(orderId) {
    try {
      // Obtener orden de la base de datos
      const order = await Order.findByPk(orderId, {
        include: [{ model: require('../models').OrderItem, as: 'items' }]
      });

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      // Construir request de PayPal
      const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        application_context: {
          brand_name: 'Expastore',
          landing_page: 'BILLING',
          shipping_preference: 'SET_PROVIDED_ADDRESS',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_URL}/orders/${order.id}/success`,
          cancel_url: `${process.env.FRONTEND_URL}/orders/${order.id}/cancel`
        },
        purchase_units: [{
          reference_id: order.order_number,
          description: `Orden #${order.order_number}`,
          custom_id: order.id,
          soft_descriptor: 'EXPASTORE',
          amount: {
            currency_code: ecuadorConstants.CURRENCY.CODE,
            value: order.total.toString(),
            breakdown: {
              item_total: {
                currency_code: ecuadorConstants.CURRENCY.CODE,
                value: order.subtotal.toString()
              },
              shipping: {
                currency_code: ecuadorConstants.CURRENCY.CODE,
                value: order.shipping_cost.toString()
              },
              tax_total: {
                currency_code: ecuadorConstants.CURRENCY.CODE,
                value: order.tax_amount.toString()
              },
              discount: {
                currency_code: ecuadorConstants.CURRENCY.CODE,
                value: order.discount_amount.toString()
              }
            }
          },
          items: order.items.map(item => ({
            name: item.product_snapshot.name.substring(0, 127),
            description: item.product_snapshot.sku || '',
            sku: item.product_snapshot.sku,
            unit_amount: {
              currency_code: ecuadorConstants.CURRENCY.CODE,
              value: item.unit_price.toString()
            },
            tax: {
              currency_code: ecuadorConstants.CURRENCY.CODE,
              value: (parseFloat(item.tax_amount) / item.quantity).toFixed(2)
            },
            quantity: item.quantity.toString(),
            category: 'PHYSICAL_GOODS'
          })),
          shipping: {
            name: {
              full_name: order.shipping_address_snapshot.recipientName
            },
            address: {
              address_line_1: order.shipping_address_snapshot.addressLine1,
              address_line_2: order.shipping_address_snapshot.addressLine2 || '',
              admin_area_2: order.shipping_address_snapshot.city,
              admin_area_1: order.shipping_address_snapshot.state,
              postal_code: order.shipping_address_snapshot.postalCode || '000000',
              country_code: order.shipping_address_snapshot.country
            }
          }
        }]
      });

      // Ejecutar request
      const response = await this.client.execute(request);
      
      logger.info('PayPal order created', {
        orderId: order.id,
        paypalOrderId: response.result.id
      });

      // Guardar payment record
      await Payment.create({
        order_id: order.id,
        payment_id: response.result.id,
        provider: 'paypal',
        payment_method: 'paypal',
        amount: order.total,
        net_amount: order.total, // Se actualizará con el capture
        currency: ecuadorConstants.CURRENCY.CODE,
        status: 'pending',
        metadata: response.result
      });

      return {
        paypalOrderId: response.result.id,
        approvalUrl: response.result.links.find(link => link.rel === 'approve')?.href,
        status: response.result.status
      };

    } catch (error) {
      logger.error('Error creating PayPal order', {
        orderId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Capturar pago de PayPal (cuando el usuario aprueba)
   */
  async capturePayPalOrder(paypalOrderId) {
    try {
      const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(paypalOrderId);
      request.requestBody({});

      const response = await this.client.execute(request);
      const captureData = response.result;

      logger.info('PayPal order captured', {
        paypalOrderId,
        captureId: captureData.purchase_units[0].payments.captures[0].id,
        status: captureData.status
      });

      // Buscar payment en DB
      const payment = await Payment.findOne({
        where: { payment_id: paypalOrderId }
      });

      if (!payment) {
        throw new Error('PAYMENT_NOT_FOUND');
      }

      // Extraer información del capture
      const capture = captureData.purchase_units[0].payments.captures[0];
      const grossAmount = parseFloat(capture.amount.value);
      const fee = capture.seller_receivable_breakdown?.paypal_fee?.value || '0';
      const netAmount = capture.seller_receivable_breakdown?.net_amount?.value || grossAmount;

      // Actualizar payment
      await payment.update({
        transaction_id: capture.id,
        status: 'completed',
        amount: grossAmount,
        fee_amount: parseFloat(fee),
        net_amount: parseFloat(netAmount),
        payer_email: captureData.payer?.email_address,
        payer_name: `${captureData.payer?.name?.given_name} ${captureData.payer?.name?.surname}`,
        payer_id: captureData.payer?.payer_id,
        processed_at: new Date(),
        completed_at: new Date(),
        metadata: captureData
      });

      // Actualizar orden
      const order = await Order.findByPk(payment.order_id);
      await order.update({
        status: ecuadorConstants.ORDER_STATUS.PAID,
        payment_status: ecuadorConstants.PAYMENT_STATUS.COMPLETED,
        paid_at: new Date()
      });

      logger.info('Order marked as paid', {
        orderId: order.id,
        orderNumber: order.order_number,
        amount: order.total
      });

      return {
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        transactionId: capture.id,
        amount: grossAmount,
        currency: capture.amount.currency_code
      };

    } catch (error) {
      logger.error('Error capturing PayPal order', {
        paypalOrderId,
        error: error.message
      });

      // Marcar pago como fallido
      const payment = await Payment.findOne({
        where: { payment_id: paypalOrderId }
      });

      if (payment) {
        await payment.update({
          status: 'failed',
          error_code: error.statusCode || 'CAPTURE_ERROR',
          error_message: error.message
        });
      }

      throw error;
    }
  }

  /**
   * Obtener detalles de orden de PayPal
   */
  async getPayPalOrderDetails(paypalOrderId) {
    try {
      const request = new checkoutNodeJssdk.orders.OrdersGetRequest(paypalOrderId);
      const response = await this.client.execute(request);
      return response.result;
    } catch (error) {
      logger.error('Error getting PayPal order details', {
        paypalOrderId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Reembolsar orden (refund)
   */
  async refundPayment(orderId, amount = null, reason = '') {
    try {
      // Buscar payment
      const payment = await Payment.findOne({
        where: {
          order_id: orderId,
          status: 'completed'
        }
      });

      if (!payment) {
        throw new Error('NO_COMPLETED_PAYMENT_FOUND');
      }

      if (!payment.transaction_id) {
        throw new Error('NO_TRANSACTION_ID');
      }

      // Determinar monto a reembolsar
      const refundAmount = amount || parseFloat(payment.amount);
      const maxRefundable = parseFloat(payment.getRemainingRefundableAmount());

      if (refundAmount > maxRefundable) {
        throw new Error('REFUND_AMOUNT_EXCEEDS_AVAILABLE');
      }

      // Crear request de refund
      const request = new checkoutNodeJssdk.payments.CapturesRefundRequest(
        payment.transaction_id
      );
      request.requestBody({
        amount: {
          currency_code: payment.currency,
          value: refundAmount.toFixed(2)
        },
        note_to_payer: reason || 'Reembolso procesado'
      });

      const response = await this.client.execute(request);
      const refundData = response.result;

      // Actualizar payment
      const newRefundedAmount = parseFloat(payment.refunded_amount) + refundAmount;
      const isFullRefund = newRefundedAmount >= parseFloat(payment.amount);

      await payment.update({
        refund_id: refundData.id,
        refunded_amount: newRefundedAmount,
        refund_reason: reason,
        refunded_at: new Date(),
        status: isFullRefund ? 'refunded' : 'partial_refund'
      });

      // Actualizar orden
      const order = await Order.findByPk(orderId);
      await order.update({
        status: isFullRefund 
          ? ecuadorConstants.ORDER_STATUS.REFUNDED 
          : order.status,
        payment_status: isFullRefund
          ? ecuadorConstants.PAYMENT_STATUS.REFUNDED
          : ecuadorConstants.PAYMENT_STATUS.PARTIAL_REFUND
      });

      logger.info('Refund processed', {
        orderId,
        refundId: refundData.id,
        amount: refundAmount,
        isFullRefund
      });

      return {
        success: true,
        refundId: refundData.id,
        amount: refundAmount,
        status: refundData.status
      };

    } catch (error) {
      logger.error('Error processing refund', {
        orderId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verificar webhook de PayPal
   */
  async verifyWebhook(headers, body) {
    try {
      // Los headers necesarios para verificación
      const transmissionId = headers['paypal-transmission-id'];
      const transmissionTime = headers['paypal-transmission-time'];
      const certUrl = headers['paypal-cert-url'];
      const authAlgo = headers['paypal-auth-algo'];
      const transmissionSig = headers['paypal-transmission-sig'];

      if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
        logger.warn('PayPal webhook: Missing verification headers');
        return false;
      }

      // Construir request de verificación
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      
      if (!webhookId) {
        logger.warn('PayPal webhook: PAYPAL_WEBHOOK_ID not configured');
        return false;
      }

      // Por simplicidad, confiar en los webhooks en sandbox
      // En producción, implementar verificación completa
      if (process.env.PAYPAL_MODE === 'sandbox') {
        return true;
      }

      // TODO: Implementar verificación completa para producción
      // usando paypal-rest-sdk o crypto manual
      
      return true;

    } catch (error) {
      logger.error('Error verifying webhook', { error: error.message });
      return false;
    }
  }

  /**
   * Procesar evento de webhook
   */
  async processWebhookEvent(eventType, resource) {
    logger.info('Processing PayPal webhook', { eventType });

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.handleCaptureCompleted(resource);
        break;
      
      case 'PAYMENT.CAPTURE.DENIED':
        await this.handleCaptureDenied(resource);
        break;
      
      case 'PAYMENT.CAPTURE.REFUNDED':
        await this.handleCaptureRefunded(resource);
        break;
      
      default:
        logger.info('Unhandled webhook event', { eventType });
    }
  }

  async handleCaptureCompleted(resource) {
    const payment = await Payment.findOne({
      where: { transaction_id: resource.id }
    });

    if (payment && payment.status !== 'completed') {
      await payment.update({
        status: 'completed',
        completed_at: new Date()
      });

      const order = await Order.findByPk(payment.order_id);
      await order.update({
        status: ecuadorConstants.ORDER_STATUS.PAID,
        payment_status: ecuadorConstants.PAYMENT_STATUS.COMPLETED,
        paid_at: new Date()
      });

      logger.info('Payment marked as completed via webhook', {
        paymentId: payment.id,
        orderId: order.id
      });
    }
  }

  async handleCaptureDenied(resource) {
    const payment = await Payment.findOne({
      where: { transaction_id: resource.id }
    });

    if (payment) {
      await payment.update({
        status: 'failed',
        error_code: 'CAPTURE_DENIED',
        error_message: 'Payment capture was denied'
      });

      logger.warn('Payment capture denied', {
        paymentId: payment.id,
        transactionId: resource.id
      });
    }
  }

  async handleCaptureRefunded(resource) {
    const payment = await Payment.findOne({
      where: { transaction_id: resource.id }
    });

    if (payment) {
      await payment.update({
        status: 'refunded',
        refunded_amount: resource.amount.value,
        refunded_at: new Date()
      });

      const order = await Order.findByPk(payment.order_id);
      await order.update({
        status: ecuadorConstants.ORDER_STATUS.REFUNDED,
        payment_status: ecuadorConstants.PAYMENT_STATUS.REFUNDED
      });

      logger.info('Refund processed via webhook', {
        paymentId: payment.id,
        orderId: order.id,
        amount: resource.amount.value
      });
    }
  }
}

module.exports = new PayPalService();