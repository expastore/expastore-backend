const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/authenticate');
const deviceFingerprint = require('../middleware/deviceFingerprint');

// Todas las rutas del carrito requieren autenticación
router.use(deviceFingerprint);
router.use(authenticate);

/**
 * @route   GET /api/v1/cart
 * @desc    Obtener carrito del usuario
 * @access  Private
 */
router.get('/', cartController.getCart);

/**
 * @route   GET /api/v1/cart/count
 * @desc    Obtener cantidad de items
 * @access  Private
 */
router.get('/count', cartController.getCartCount);

/**
 * @route   POST /api/v1/cart/items
 * @desc    Agregar producto al carrito
 * @access  Private
 */
router.post('/items', cartController.addItem);

/**
 * @route   PATCH /api/v1/cart/items/:itemId
 * @desc    Actualizar cantidad de un item
 * @access  Private
 */
router.patch('/items/:itemId', cartController.updateItemQuantity);

/**
 * @route   DELETE /api/v1/cart/items/:itemId
 * @desc    Eliminar item del carrito
 * @access  Private
 */
router.delete('/items/:itemId', cartController.removeItem);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Limpiar todo el carrito
 * @access  Private
 */
router.delete('/', cartController.clearCart);

/**
 * @route   POST /api/v1/cart/validate
 * @desc    Validar disponibilidad de items
 * @access  Private
 */
router.post('/validate', cartController.validateCart);

/**
 * @route   POST /api/v1/cart/merge
 * @desc    Fusionar carrito temporal
 * @access  Private
 */
router.post('/merge', cartController.mergeCart);

/**
 * @route   POST /api/v1/cart/coupon
 * @desc    Aplicar cupón
 * @access  Private
 */
router.post('/coupon', cartController.applyCoupon);

/**
 * @route   DELETE /api/v1/cart/coupon
 * @desc    Remover cupón
 * @access  Private
 */
router.delete('/coupon', cartController.removeCoupon);

module.exports = router;