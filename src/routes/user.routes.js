const express = require('express');
const router = express.Router();

// Controladores
const userController = require('../controllers/user.controller');

// Middlewares
const deviceFingerprint = require('../middleware/deviceFingerprint');
const { authenticate } = require('../middleware/authenticate');
const { validateUpdateProfile } = require('../middleware/validators/auth.validator');

// Todas las rutas requieren autenticación
router.use(deviceFingerprint);
router.use(authenticate);

/**
 * @route   GET /api/v1/users/me
 * @desc    Obtener perfil del usuario actual
 * @access  Private
 */
router.get('/me', userController.getProfile);

/**
 * @route   PATCH /api/v1/users/me
 * @desc    Actualizar perfil del usuario
 * @access  Private
 */
router.patch(
  '/me',
  validateUpdateProfile,
  userController.updateProfile
);

/**
 * @route   DELETE /api/v1/users/me
 * @desc    Eliminar cuenta del usuario
 * @access  Private
 */
router.delete('/me', userController.deleteAccount);

/**
 * DIRECCIONES
 */

/**
 * @route   GET /api/v1/users/me/addresses
 * @desc    Obtener direcciones del usuario
 * @access  Private
 */
router.get('/me/addresses', userController.getAddresses);

/**
 * @route   POST /api/v1/users/me/addresses
 * @desc    Crear nueva dirección
 * @access  Private
 */
router.post('/me/addresses', userController.createAddress);

/**
 * @route   PATCH /api/v1/users/me/addresses/:id
 * @desc    Actualizar dirección
 * @access  Private
 */
router.patch('/me/addresses/:id', userController.updateAddress);

/**
 * @route   DELETE /api/v1/users/me/addresses/:id
 * @desc    Eliminar dirección
 * @access  Private
 */
router.delete('/me/addresses/:id', userController.deleteAddress);

/**
 * INFORMACIÓN DE FACTURACIÓN
 */

/**
 * @route   GET /api/v1/users/me/billing-info
 * @desc    Obtener información de facturación
 * @access  Private
 */
router.get('/me/billing-info', userController.getBillingInfo);

/**
 * @route   PUT /api/v1/users/me/billing-info
 * @desc    Crear o actualizar información de facturación
 * @access  Private
 */
router.put('/me/billing-info', userController.upsertBillingInfo);

module.exports = router;