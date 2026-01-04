// src/controllers/order.controller.js
const orderService = require('../services/order.service');
const paypalService = require('../services/paypal.service');
const logger = require('../utils/logger');

class OrderController {
  /**
   * Crear orden desde el carrito
   * POST /api/v1/orders
   */
  async createOrder(req, res, next) {
    try {
      const userId = req.user.userId;
      const orderData = {
        shippingAddressId: req.body.shippingAddressId,
        customerPhone: req.body.customerPhone,
        paymentMethod: req.body.paymentMethod || 'paypal',
        shippingMethod: req.body.shippingMethod,
        customerNotes: req.body.customerNotes
      };

      // Crear orden
      const order = await orderService.createOrderFromCart(userId, orderData);

      // Si el método de pago es PayPal, crear orden en PayPal
      let paypalData = null;
      if (orderData.paymentMethod === 'paypal') {
        paypalData = await paypalService.createPayPalOrder(order.id);
      }

      res.status(201).json({
        success: true,
        message: 'Orden creada exitosamente',
        data: {
          order,
          paypal: paypalData
        }
      });

    } catch (error) {
      logger.error('Error in createOrder', { error: error.message });
      next(error);
    }
  }

  /**
   * Obtener órdenes del usuario
   * GET /api/v1/orders
   */
  async getOrders(req, res, next) {
    try {
      const userId = req.user.userId;
      const filters = {
        status: req.query.status,
        paymentStatus: req.query.paymentStatus,
        fromDate: req.query.fromDate,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0
      };

      const orders = await orderService.getUserOrders(userId, filters);

      res.json({
        success: true,
        data: orders,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: orders.length
        }
      });

    } catch (error) {
      logger.error('Error in getOrders', { error: error.message });
      next(error);
    }
  }

  /**
   * Obtener orden por ID
   * GET /api/v1/orders/:orderId
   */
  async getOrderById(req, res, next) {
    try {
      const userId = req.user.userId;
      const { orderId } = req.params;

      const order = await orderService.getOrderById(userId, orderId);

      res.json({
        success: true,
        data: order
      });

    } catch (error) {
      logger.error('Error in getOrderById', { error: error.message });
      next(error);
    }
  }

  /**
   * Cancelar orden
   * POST /api/v1/orders/:orderId/cancel
   */
  async cancelOrder(req, res, next) {
    try {
      const userId = req.user.userId;
      const { orderId } = req.params;
      const { reason } = req.body;

      const order = await orderService.cancelOrder(userId, orderId, reason);

      res.json({
        success: true,
        message: 'Orden cancelada exitosamente',
        data: order
      });

    } catch (error) {
      logger.error('Error in cancelOrder', { error: error.message });
      next(error);
    }
  }

  /**
   * Obtener resumen de órdenes
   * GET /api/v1/orders/summary
   */
  async getOrdersSummary(req, res, next) {
    try {
      const userId = req.user.userId;
      const summary = await orderService.getOrdersSummary(userId);

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      logger.error('Error in getOrdersSummary', { error: error.message });
      next(error);
    }
  }

  /**
   * Obtener opciones de envío disponibles
   * POST /api/v1/orders/shipping-options
   */
  async getShippingOptions(req, res, next) {
    try {
      const { province, subtotal, totalWeight } = req.body;
      const { ShippingRate } = require('../models');

      const options = await ShippingRate.calculateShippingCost(
        province,
        parseFloat(subtotal),
        parseFloat(totalWeight || 0)
      );

      res.json({
        success: true,
        data: options
      });

    } catch (error) {
      logger.error('Error in getShippingOptions', { error: error.message });
      next(error);
    }
  }

  // ===== MÉTODOS ADMIN =====

  /**
   * Obtener todas las órdenes (Admin)
   * GET /api/v1/admin/orders
   */
  async getAllOrders(req, res, next) {
    try {
      const { Order, OrderItem, User } = require('../models');
      const { Op } = require('sequelize');

      const where = {};
      
      if (req.query.status) {
        where.status = req.query.status;
      }
      if (req.query.paymentStatus) {
        where.payment_status = req.query.paymentStatus;
      }
      if (req.query.search) {
        where[Op.or] = [
          { order_number: { [Op.iLike]: `%${req.query.search}%` } },
          { customer_email: { [Op.iLike]: `%${req.query.search}%` } }
        ];
      }

      const orders = await Order.findAll({
        where,
        include: [
          {
            model: OrderItem,
            as: 'items',
            limit: 3
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      });

      res.json({
        success: true,
        data: orders.map(order => orderService.formatOrderResponse(order, false))
      });

    } catch (error) {
      logger.error('Error in getAllOrders', { error: error.message });
      next(error);
    }
  }

  /**
   * Actualizar estado de orden (Admin)
   * PATCH /api/v1/admin/orders/:orderId/status
   */
  async updateOrderStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const { status, trackingNumber, carrier, adminNotes } = req.body;

      const { Order } = require('../models');
      const order = await Order.findByPk(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      await order.update({
        status,
        tracking_number: trackingNumber || order.tracking_number,
        carrier: carrier || order.carrier,
        admin_notes: adminNotes || order.admin_notes
      });

      res.json({
        success: true,
        message: 'Estado de orden actualizado',
        data: order.toPublic()
      });

    } catch (error) {
      logger.error('Error in updateOrderStatus', { error: error.message });
      next(error);
    }
  }

  /**
   * Procesar reembolso (Admin)
   * POST /api/v1/admin/orders/:orderId/refund
   */
  async processRefund(req, res, next) {
    try {
      const { orderId } = req.params;
      const { amount, reason } = req.body;

      const result = await paypalService.refundPayment(
        orderId,
        amount ? parseFloat(amount) : null,
        reason
      );

      res.json({
        success: true,
        message: 'Reembolso procesado exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error in processRefund', { error: error.message });
      next(error);
    }
  }
}

module.exports = new OrderController();