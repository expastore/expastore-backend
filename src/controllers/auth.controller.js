const authService = require('../services/auth.service');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Public
 */
const register = catchAsync(async (req, res) => {
  const { firstName, lastName, email, phone } = req.body;

  const result = await authService.register({
    firstName,
    lastName,
    email,
    phone
  });

  res.status(201).json({
    success: true,
    message: result.message,
    data: {
      userId: result.userId
    }
  });
});

/**
 * @route   POST /api/v1/auth/activate
 * @desc    Activar cuenta con PIN
 * @access  Public
 */
const activate = catchAsync(async (req, res) => {
  const { email, pin } = req.body;

  const result = await authService.activateAccount(email, pin);

  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      user: result.user
    }
  });
});

/**
 * @route   POST /api/v1/auth/resend-activation-pin
 * @desc    Reenviar PIN de activación
 * @access  Public
 */
const resendActivationPin = catchAsync(async (req, res) => {
  const { email } = req.body;

  const result = await authService.sendActivationPin(email);

  res.status(200).json({
    success: true,
    message: result.message
  });
});

/**
 * @route   POST /api/v1/auth/login/request-pin
 * @desc    Solicitar PIN de login
 * @access  Public
 */
const requestLoginPin = catchAsync(async (req, res) => {
  const { email } = req.body;
  const deviceInfo = req.deviceInfo;

  const result = await authService.requestLoginPin(email, deviceInfo);

  res.status(200).json({
    success: true,
    message: result.message
  });
});

/**
 * @route   POST /api/v1/auth/login/verify-pin
 * @desc    Verificar PIN y realizar login
 * @access  Public
 */
const verifyLoginPin = catchAsync(async (req, res) => {
  const { email, pin } = req.body;
  const deviceInfo = req.deviceInfo;

  const result = await authService.verifyLoginPin(email, pin, deviceInfo);

  // Configuración de cookies seguras
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
  };

  // Access Token - 15 minutos
  res.cookie('accessToken', result.accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 minutos
  });

  // Refresh Token - 7 días
  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/api/v1/auth/refresh' // Solo accesible en ruta de refresh
  });

  // NO enviar tokens en el body
  // Solo enviar datos públicos del usuario
  res.status(200).json({
    success: true,
    message: 'Login exitoso',
    data: {
      user: result.user
    }
  });
});

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refrescar access token usando refresh token
 * @access  Public
 */
const refreshToken = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const deviceInfo = req.deviceInfo;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      error: 'REFRESH_TOKEN_REQUIRED',
      message: 'Refresh token no proporcionado'
    });
  }

  const result = await authService.refreshToken(refreshToken, deviceInfo);

  // Configurar nueva cookie con access token
  res.cookie('accessToken', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/'
  });

  res.status(200).json({
    success: true,
    message: 'Token refrescado exitosamente'
  });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
const logout = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const deviceHash = req.deviceInfo.deviceHash;

  await authService.logout(userId, deviceHash);

  // Limpiar cookies
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });

  res.status(200).json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Cerrar todas las sesiones del usuario
 * @access  Private
 */
const logoutAll = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const result = await authService.logoutAllDevices(userId);

  // Limpiar cookies de esta sesión
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });

  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      sessionsRevoked: result.sessionsRevoked
    }
  });
});

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Obtener sesiones activas del usuario
 * @access  Private
 */
const getSessions = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const sessions = await authService.getActiveSessions(userId);

  res.status(200).json({
    success: true,
    data: {
      sessions,
      currentDeviceHash: req.deviceInfo.deviceHash
    }
  });
});

/**
 * @route   GET /api/v1/auth/check
 * @desc    Verificar si el usuario está autenticado
 * @access  Private
 */
const checkAuth = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      authenticated: true,
      user: req.user.toSafeObject()
    }
  });
});

module.exports = {
  register,
  activate,
  resendActivationPin,
  requestLoginPin,
  verifyLoginPin,
  refreshToken,
  logout,
  logoutAll,
  getSessions,
  checkAuth
};