const redis = require('redis');
const logger = require('../utils/logger');

// Crear cliente Redis con configuración mejorada
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    connectTimeout: 5000, // Timeout de 5 segundos
    reconnectStrategy: (retries) => {
      // Limitar a 3 intentos
      if (retries > 3) {
        logger.warn('❌ Redis: No se pudo conectar después de 3 intentos');
        return false; // No reconectar más
      }
      // Esperar 1 segundo entre reintentos
      return 1000;
    }
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB) || 0
});

// Event listeners
redisClient.on('connect', () => {
  logger.info('🔄 Redis: Conectando...');
});

redisClient.on('ready', () => {
  logger.info('✅ Redis: Conexión establecida y lista');
});

redisClient.on('error', (err) => {
  // Solo log en debug, no saturar la consola
  if (process.env.LOG_LEVEL === 'debug') {
    logger.debug('Redis: Error de conexión', { error: err.message });
  }
});

redisClient.on('reconnecting', () => {
  // Solo log en debug
  if (process.env.LOG_LEVEL === 'debug') {
    logger.debug('Redis: Reconectando...');
  }
});

redisClient.on('end', () => {
  logger.info('👋 Redis: Conexión cerrada');
});

// Función para conectar
async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    return true;
  } catch (error) {
    logger.error('❌ Redis: Error al conectar', { error: error.message });
    throw error;
  }
}

// Función para cerrar conexión
async function closeRedis() {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (error) {
    logger.error('❌ Redis: Error al cerrar conexión', { error: error.message });
  }
}

// Set con expiración
async function setEx(key, seconds, value) {
  try {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await redisClient.setEx(key, seconds, stringValue);
    return true;
  } catch (error) {
    logger.error('Redis: Error en setEx', { key, error: error.message });
    return false;
  }
}

// Get con parse automático
async function get(key) {
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    logger.error('Redis: Error en get', { key, error: error.message });
    return null;
  }
}

// Delete
async function del(key) {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Redis: Error en del', { key, error: error.message });
    return false;
  }
}

// Delete múltiples keys por patrón
async function delPattern(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return keys.length;
  } catch (error) {
    logger.error('Redis: Error en delPattern', { pattern, error: error.message });
    return 0;
  }
}

// Increment
async function incr(key) {
  try {
    return await redisClient.incr(key);
  } catch (error) {
    logger.error('Redis: Error en incr', { key, error: error.message });
    return null;
  }
}

// Decrement
async function decr(key) {
  try {
    return await redisClient.decr(key);
  } catch (error) {
    logger.error('Redis: Error en decr', { key, error: error.message });
    return null;
  }
}

// Set expiration
async function expire(key, seconds) {
  try {
    await redisClient.expire(key, seconds);
    return true;
  } catch (error) {
    logger.error('Redis: Error en expire', { key, error: error.message });
    return false;
  }
}

// Check if key exists
async function exists(key) {
  try {
    return await redisClient.exists(key) === 1;
  } catch (error) {
    logger.error('Redis: Error en exists', { key, error: error.message });
    return false;
  }
}

// Get TTL
async function ttl(key) {
  try {
    return await redisClient.ttl(key);
  } catch (error) {
    logger.error('Redis: Error en ttl', { key, error: error.message });
    return -2;
  }
}

module.exports = {
  redisClient,
  connectRedis,
  closeRedis,
  setEx,
  get,
  del,
  delPattern,
  incr,
  decr,
  expire,
  exists,
  ttl
};