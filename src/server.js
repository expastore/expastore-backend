require('dotenv').config();
const initFolders = require('./utils/initFolders');
const app = require('./app');
const { testConnection, closeConnection } = require('./config/database');
const { connectRedis, closeRedis } = require('./config/redis');
const logger = require('./utils/logger');

// Crear carpetas necesarias
initFolders();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    logger.info('🚀 Iniciando servidor Expastore...');
    
    // 1. Conectar a PostgreSQL
    await testConnection();
    
    // 2. Conectar a Redis (opcional - no bloquea el inicio)
    try {
      await connectRedis();
      logger.info('✅ Redis: Conectado correctamente');
    } catch (error) {
      logger.warn('⚠️ Redis no disponible, continuando sin cache', {
        error: error.message
      });
      logger.info('ℹ️ Para usar Redis: instala y ejecuta redis-server');
    }
    
    // 3. TODO: Iniciar trabajos cron cuando estén listos
    // const { startCronJobs } = require('./jobs/cron');
    // startCronJobs();
    
    // 4. Iniciar servidor HTTP
    server = app.listen(PORT, () => {
      logger.info('✅ Servidor iniciado correctamente', {
        port: PORT,
        environment: NODE_ENV,
        url: process.env.APP_URL,
        pid: process.pid
      });
      
      console.log('\n');
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║                                                   ║');
      console.log('║          🛍️  EXPASTORE API RUNNING  🛍️           ║');
      console.log('║                                                   ║');
      console.log('╠═══════════════════════════════════════════════════╣');
      console.log(`║  📍 URL:          ${process.env.APP_URL.padEnd(29)} ║`);
      console.log(`║  🌍 Environment:  ${NODE_ENV.padEnd(29)} ║`);
      console.log(`║  🔌 Port:         ${PORT.toString().padEnd(29)} ║`);
      console.log(`║  📚 Health:       ${(process.env.APP_URL + '/health').padEnd(29)} ║`);
      console.log('║                                                   ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log('\n');
    });

    // Manejar errores del servidor
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Puerto ${PORT} ya está en uso`);
        process.exit(1);
      } else {
        logger.error('❌ Error del servidor', { error: error.message });
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('❌ Error fatal al iniciar servidor', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Función para cerrar el servidor limpiamente
const gracefulShutdown = async (signal) => {
  logger.info(`\n👋 Señal ${signal} recibida. Cerrando servidor...`);
  
  if (server) {
    server.close(async () => {
      logger.info('✅ Servidor HTTP cerrado');
      
      try {
        // Cerrar conexiones
        await closeConnection();
        await closeRedis();
        
        logger.info('✅ Todas las conexiones cerradas correctamente');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error cerrando conexiones', { error: error.message });
        process.exit(1);
      }
    });

    // Forzar cierre después de 10 segundos
    setTimeout(() => {
      logger.error('⚠️ Forzando cierre del servidor después de 10s');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Manejar señales de terminación
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('❌ UNCAUGHT EXCEPTION! Cerrando servidor...', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ UNHANDLED REJECTION! Cerrando servidor...', {
    reason,
    promise
  });
  process.exit(1);
});

// Iniciar servidor
startServer();