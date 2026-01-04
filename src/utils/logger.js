const winston = require('winston');
const path = require('path');
const fs = require('fs');
require('winston-daily-rotate-file');

// Crear carpeta de logs si no existe
const logDir = process.env.LOG_FILE_PATH || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Definir niveles de log personalizados
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
  }
};

// Añadir colores a winston
winston.addColors(customLevels.colors);

// Formato personalizado para archivos
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para consola (con colores)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Agregar metadata si existe
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      // Filtrar campos internos de Winston
      const filteredMeta = {};
      metaKeys.forEach(key => {
        if (!['level', 'message', 'timestamp'].includes(key)) {
          filteredMeta[key] = meta[key];
        }
      });
      
      if (Object.keys(filteredMeta).length > 0) {
        msg += ` ${JSON.stringify(filteredMeta, null, 2)}`;
      }
    }
    
    return msg;
  })
);

// Transportes
const transports = [];

// Consola (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'debug'
    })
  );
}

// Archivo de errores (rotación diaria)
transports.push(
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileFormat,
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    zippedArchive: true
  })
);

// Archivo combinado (todos los logs)
transports.push(
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: fileFormat,
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    zippedArchive: true
  })
);

// Crear logger
const logger = winston.createLogger({
  levels: customLevels.levels,
  format: fileFormat,
  transports,
  exitOnError: false
});

// Stream para Morgan (HTTP logging)
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Helper methods adicionales
logger.logRequest = (req, message = 'Request received') => {
  logger.http(message, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
};

logger.logError = (error, context = {}) => {
  logger.error(error.message || error, {
    stack: error.stack,
    ...context
  });
};

logger.logAuth = (message, userId, action) => {
  logger.info(message, {
    userId,
    action,
    category: 'auth'
  });
};

logger.logDatabase = (message, query) => {
  logger.debug(message, {
    query,
    category: 'database'
  });
};

logger.logPayment = (message, orderId, amount) => {
  logger.info(message, {
    orderId,
    amount,
    category: 'payment'
  });
};

module.exports = logger;