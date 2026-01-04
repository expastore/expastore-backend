const logger = require('../utils/logger');

/**
 * Middleware para manejar rutas no encontradas (404)
 * Este middleware se ejecuta cuando ninguna ruta anterior coincide
 */
const notFoundHandler = (req, res, next) => {
  // Registrar en logs
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Respuesta 404
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `No se encontró la ruta: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      health: 'GET /health',
      api: 'GET /api/v1',
      home: 'GET /'
    }
  });
};

module.exports = notFoundHandler;