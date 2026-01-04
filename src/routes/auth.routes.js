const express = require('express');
const router = express.Router();

// Controladores
const authController = require('../controllers/auth.controller');

// Middlewares
const deviceFingerprint = require('../middleware/deviceFingerprint');
const { authenticate } = require('../middleware/authenticate');
const {
  validateRegister,
  validateActivation,
  validateRequestLoginPin,
  validateVerifyLoginPin
} = require('../middleware/validators/auth.validator');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Public
 */
router.post(
  '/register',
  deviceFingerprint,
  validateRegister,
  authController.register
);

/**
 * @route   POST /api/v1/auth/activate
 * @desc    Activar cuenta con PIN
 * @access  Public
 */
router.post(
  '/activate',
  deviceFingerprint,
  validateActivation,
  authController.activate
);

/**
 * @route   POST /api/v1/auth/resend-activation-pin
 * @desc    Reenviar PIN de activación
 * @access  Public
 */
router.post(
  '/resend-activation-pin',
  deviceFingerprint,
  validateRequestLoginPin, // Usa misma validación (solo email)
  authController.resendActivationPin
);

/**
 * @route   POST /api/v1/auth/login/request-pin
 * @desc    Solicitar PIN de login
 * @access  Public
 */
router.post(
  '/login/request-pin',
  deviceFingerprint,
  validateRequestLoginPin,
  authController.requestLoginPin
);

/**
 * @route   POST /api/v1/auth/login/verify-pin
 * @desc    Verificar PIN y realizar login
 * @access  Public
 */
router.post(
  '/login/verify-pin',
  deviceFingerprint,
  validateVerifyLoginPin,
  authController.verifyLoginPin
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refrescar access token
 * @access  Public (requiere refresh token en cookie)
 */
router.post(
  '/refresh',
  deviceFingerprint,
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Cerrar sesión actual
 * @access  Private
 */
router.post(
  '/logout',
  deviceFingerprint,
  authenticate,
  authController.logout
);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Cerrar todas las sesiones
 * @access  Private
 */
router.post(
  '/logout-all',
  deviceFingerprint,
  authenticate,
  authController.logoutAll
);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Obtener sesiones activas
 * @access  Private
 */
router.get(
  '/sessions',
  deviceFingerprint,
  authenticate,
  authController.getSessions
);

/**
 * @route   GET /api/v1/auth/check
 * @desc    Verificar autenticación
 * @access  Private
 */
router.get(
  '/check',
  deviceFingerprint,
  authenticate,
  authController.checkAuth
);

module.exports = router;