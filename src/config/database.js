const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Cargar variables de entorno
require('dotenv').config();

// Obtener configuración
const env = process.env.NODE_ENV || 'development';
const config = require('./database.config')[env];

// Validar que la configuración existe
if (!config) {
  console.error(`❌ No se encontró configuración para el ambiente: ${env}`);
  console.error('Verifica tu archivo database.config.js');
  process.exit(1);
}

// Validar variables requeridas
if (!config.database || !config.username) {
  console.error('❌ Variables de base de datos faltantes en .env:');
  console.error('  - DB_NAME');
  console.error('  - DB_USER');
  console.error('  - DB_PASSWORD');
  console.error('  - DB_HOST');
  process.exit(1);
}

// Crear instancia de Sequelize
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    dialectOptions: config.dialectOptions,
    pool: config.pool,
    define: config.define
  }
);

// Función para probar la conexión
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL: Conexión establecida correctamente');
    return true;
  } catch (error) {
    logger.error('❌ PostgreSQL: Error al conectar', { error: error.message });
    throw error;
  }
}

// Función para sincronizar base de datos (solo desarrollo)
async function syncDatabase(options = {}) {
  if (process.env.NODE_ENV === 'development') {
    try {
      await sequelize.sync(options);
      logger.info('✅ PostgreSQL: Base de datos sincronizada');
    } catch (error) {
      logger.error('❌ PostgreSQL: Error sincronizando base de datos', { 
        error: error.message 
      });
      throw error;
    }
  } else {
    logger.warn('⚠️ PostgreSQL: Sync deshabilitado en producción. Usa migraciones.');
  }
}

// Función para cerrar conexión
async function closeConnection() {
  try {
    await sequelize.close();
    logger.info('👋 PostgreSQL: Conexión cerrada correctamente');
  } catch (error) {
    logger.error('❌ PostgreSQL: Error cerrando conexión', { error: error.message });
  }
}

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  closeConnection,
  Sequelize
};