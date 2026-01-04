const logger = require('../utils/logger');

// Clase de error personalizada
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Manejador de errores de Sequelize
const handleSequelizeError = (err) => {
  let message = err.message;
  let statusCode = 400;
  let errorCode = 'DATABASE_ERROR';

  // ValidationError
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return new AppError(
      'Error de validación en los datos',
      400,
      'VALIDATION_ERROR'
    );
  }

  // UniqueConstraintError
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'campo';
    return new AppError(
      `El ${field} ya está en uso`,
      409,
      'DUPLICATE_ENTRY'
    );
  }

  // ForeignKeyConstraintError
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return new AppError(
      'Error de referencia en la base de datos',
      400,
      'FOREIGN_KEY_ERROR'
    );
  }

  // ConnectionError
  if (err.name === 'SequelizeConnectionError') {
    return new AppError(
      'Error de conexión a la base de datos',
      503,
      'DB_CONNECTION_ERROR'
    );
  }

  return new AppError(message, statusCode, errorCode);
};

// Manejador de errores de JWT
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Token inválido', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return new AppError('Token expirado', 401, 'TOKEN_EXPIRED');
  }
  return err;
};

// Manejador de errores de Multer
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError(
      'Archivo demasiado grande',
      400,
      'FILE_TOO_LARGE'
    );
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError(
      'Demasiados archivos',
      400,
      'TOO_MANY_FILES'
    );
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(
      'Campo de archivo inesperado',
      400,
      'UNEXPECTED_FILE'
    );
  }
  return new AppError(err.message, 400, 'UPLOAD_ERROR');
};

// Función para enviar error en desarrollo
const sendErrorDev = (err, res) => {
  const response = {
    success: false,
    status: err.status,
    error: err.errorCode || 'ERROR',
    message: err.message,
    stack: err.stack
  };

  if (err.details) {
    response.details = err.details;
  }

  res.status(err.statusCode).json(response);
};

// Función para enviar error en producción
const sendErrorProd = (err, res) => {
  // Error operacional, enviar mensaje al cliente
  if (err.isOperational) {
    const response = {
      success: false,
      error: err.errorCode || 'ERROR',
      message: err.message
    };

    if (err.details) {
      response.details = err.details;
    }

    res.status(err.statusCode).json(response);
  } else {
    // Error de programación, no filtrar detalles al cliente
    logger.error('ERROR NO OPERACIONAL', {
      error: err.message,
      stack: err.stack
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Algo salió mal. Por favor, intente más tarde.'
    });
  }
};

// Middleware principal de manejo de errores
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log del error
  logger.logError(err, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id
  });

  // Manejar diferentes tipos de errores
  if (err.name && err.name.startsWith('Sequelize')) {
    error = handleSequelizeError(err);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }

  if (err.name === 'MulterError') {
    error = handleMulterError(err);
  }

  if (err.code === 'EBADCSRFTOKEN') {
    error = new AppError('Token CSRF inválido', 403, 'INVALID_CSRF');
  }

  // Enviar respuesta según el ambiente
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Manejador de errores asíncronos
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Exportar como default el errorHandler principal
module.exports = errorHandler;

// Exportar también las utilidades
module.exports.AppError = AppError;
module.exports.catchAsync = catchAsync;