// ========================================
// src/routes/order.routes.js
// ========================================
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const paymentController = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/authenticate');
const {
  createOrderValidator,
  cancelOrderValidator,
  shippingOptionsValidator,
  updateOrderStatusValidator,
  refundValidator,
  manualPaymentValidator
} = require('../middleware/validators/order.validator');

// ===== RUTAS DE ÓRDENES (USUARIO) =====

/**
 * @route   POST /api/v1/orders
 * @desc    Crear nueva orden desde el carrito
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  createOrderValidator,
  orderController.createOrder
);

/**
 * @route   GET /api/v1/orders
 * @desc    Obtener órdenes del usuario
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  orderController.getOrders
);

/**
 * @route   GET /api/v1/orders/summary
 * @desc    Obtener resumen de órdenes
 * @access  Private
 */
router.get(
  '/summary',
  authenticate,
  orderController.getOrdersSummary
);

/**
 * @route   GET /api/v1/orders/:orderId
 * @desc    Obtener orden por ID
 * @access  Private
 */
router.get(
  '/:orderId',
  authenticate,
  orderController.getOrderById
);

/**
 * @route   POST /api/v1/orders/:orderId/cancel
 * @desc    Cancelar orden
 * @access  Private
 */
router.post(
  '/:orderId/cancel',
  authenticate,
  cancelOrderValidator,
  orderController.cancelOrder
);

/**
 * @route   POST /api/v1/orders/shipping-options
 * @desc    Obtener opciones de envío disponibles
 * @access  Private
 */
router.post(
  '/shipping-options',
  authenticate,
  shippingOptionsValidator,
  orderController.getShippingOptions
);

// ===== RUTAS DE PAGOS (USUARIO) =====

/**
 * @route   POST /api/v1/payments/paypal/:paypalOrderId/capture
 * @desc    Capturar pago de PayPal después de aprobación
 * @access  Private
 */
router.post(
  '/payments/paypal/:paypalOrderId/capture',
  authenticate,
  paymentController.capturePayPalPayment
);

/**
 * @route   GET /api/v1/payments/paypal/:paypalOrderId
 * @desc    Obtener detalles de orden PayPal
 * @access  Private
 */
router.get(
  '/payments/paypal/:paypalOrderId',
  authenticate,
  paymentController.getPayPalOrderDetails
);

/**
 * @route   GET /api/v1/payments/order/:orderId
 * @desc    Obtener historial de pagos de una orden
 * @access  Private
 */
router.get(
  '/payments/order/:orderId',
  authenticate,
  paymentController.getOrderPayments
);

// ===== RUTAS ADMIN =====

/**
 * @route   GET /api/v1/admin/orders
 * @desc    Obtener todas las órdenes (Admin)
 * @access  Private/Admin
 */
router.get(
  '/admin/orders',
  authenticate,
  authorize('admin'),
  orderController.getAllOrders
);

/**
 * @route   PATCH /api/v1/admin/orders/:orderId/status
 * @desc    Actualizar estado de orden (Admin)
 * @access  Private/Admin
 */
router.patch(
  '/admin/orders/:orderId/status',
  authenticate,
  authorize('admin'),
  updateOrderStatusValidator,
  orderController.updateOrderStatus
);

/**
 * @route   POST /api/v1/admin/orders/:orderId/refund
 * @desc    Procesar reembolso (Admin)
 * @access  Private/Admin
 */
router.post(
  '/admin/orders/:orderId/refund',
  authenticate,
  authorize('admin'),
  refundValidator,
  orderController.processRefund
);

/**
 * @route   POST /api/v1/admin/payments/manual
 * @desc    Registrar pago manual (Admin)
 * @access  Private/Admin
 */
router.post(
  '/admin/payments/manual',
  authenticate,
  authorize('admin'),
  manualPaymentValidator,
  paymentController.createManualPayment
);

module.exports = router;
