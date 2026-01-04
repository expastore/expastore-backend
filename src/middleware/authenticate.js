const tokenService = require('../services/token.service');
const { User, UserSession } = require('../models');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Middleware principal de autenticación
 * Verifica token JWT en cookies HttpOnly
 */
const authenticate = async (req, res, next) => {
  try {
    // Obtener token de la cookie (HttpOnly)
    const token = req.cookies.accessToken;

    if (!token) {
      throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    }

    // Verificar token
    const decoded = tokenService.verifyAccessToken(token);

    // Verificar que el device hash coincida
    if (decoded.deviceHash !== req.deviceInfo?.deviceHash) {
      logger.warn('Device hash mismatch', { 
        userId: decoded.userId,
        expectedHash: decoded.deviceHash.substring(0, 8),
        actualHash: req.deviceInfo?.deviceHash?.substring(0, 8)
      });
      throw new AppError('Sesión inválida', 401, 'INVALID_SESSION');
    }

    // Buscar usuario
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    if (!user.is_active) {
      throw new AppError('Cuenta inactiva', 403, 'ACCOUNT_INACTIVE');
    }

    // Verificar que la sesión esté activa
    const session = await UserSession.findOne({
      where: {
        user_id: user.id,
        device_hash: req.deviceInfo.deviceHash,
        is_active: true
      }
    });

    if (!session) {
      throw new AppError('Sesión no válida', 401, 'SESSION_INVALID');
    }

    // Actualizar última actividad de la sesión
    await session.updateActivity();

    // Adjuntar usuario y sesión al request
    req.user = user;
    req.session = session;

    logger.debug('Usuario autenticado', { 
      userId: user.id, 
      email: user.email 
    });

    next();
  } catch (error) {
    if (error.message === 'TOKEN_EXPIRED') {
      return next(new AppError(
        'Token expirado. Usa el refresh token.',
        401,
        'TOKEN_EXPIRED'
      ));
    }

    if (error.message === 'INVALID_TOKEN') {
      return next(new AppError(
        'Token inválido',
        401,
        'INVALID_TOKEN'
      ));
    }

    next(error);
  }
};

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, solo adjunta user si existe
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return next();
    }

    const decoded = tokenService.verifyAccessToken(token);
    const user = await User.findByPk(decoded.userId);

    if (user && user.is_active) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Si falla, simplemente continuar sin usuario
    next();
  }
};

/**
 * Middleware para verificar roles
 * Uso: authorize('admin', 'vendor')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Acceso denegado por rol', { 
        userId: req.user.id, 
        role: req.user.role,
        requiredRoles: roles 
      });
      return next(new AppError(
        'No tienes permisos para esta acción',
        403,
        'FORBIDDEN'
      ));
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario es el dueño del recurso
 * Uso: authorizeOwner('userId')
 */
const authorizeOwner = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401, 'UNAUTHORIZED'));
    }

    const resourceUserId = req.params[paramName] || req.body[paramName];

    if (req.user.id !== resourceUserId && req.user.role !== 'admin') {
      logger.warn('Intento de acceso no autorizado', { 
        userId: req.user.id,
        targetUserId: resourceUserId 
      });
      return next(new AppError(
        'No tienes permisos para acceder a este recurso',
        403,
        'FORBIDDEN'
      ));
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
  authorizeOwner
};