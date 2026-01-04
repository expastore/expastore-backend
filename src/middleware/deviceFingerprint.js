const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Middleware para crear fingerprint único del dispositivo
 * Combina IP, User-Agent y otros headers para identificar dispositivos
 */
const deviceFingerprint = (req, res, next) => {
  try {
    // Obtener información del dispositivo
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // Crear string único del dispositivo
    const deviceString = [
      ip,
      userAgent,
      acceptLanguage,
      acceptEncoding
    ].join('|');

    // Generar hash SHA-256
    const deviceHash = crypto
      .createHash('sha256')
      .update(deviceString)
      .digest('hex');

    // Extraer nombre del dispositivo del User-Agent
    const deviceName = extractDeviceName(userAgent);

    // Adjuntar información del dispositivo al request
    req.deviceInfo = {
      deviceHash,
      deviceName,
      ip,
      userAgent,
      acceptLanguage,
      acceptEncoding
    };

    logger.debug('Device fingerprint creado', { 
      deviceHash: deviceHash.substring(0, 8) + '...',
      deviceName,
      ip 
    });

    next();
  } catch (error) {
    logger.error('Error creando device fingerprint', { error: error.message });
    next(error);
  }
};

/**
 * Extraer nombre descriptivo del dispositivo desde User-Agent
 */
function extractDeviceName(userAgent) {
  if (!userAgent) return 'Unknown Device';

  // Detectar sistema operativo
  let os = 'Unknown OS';
  if (/Windows NT 10.0/.test(userAgent)) os = 'Windows 10';
  else if (/Windows NT 11.0/.test(userAgent)) os = 'Windows 11';
  else if (/Mac OS X/.test(userAgent)) os = 'macOS';
  else if (/Android/.test(userAgent)) os = 'Android';
  else if (/iPhone/.test(userAgent)) os = 'iPhone';
  else if (/iPad/.test(userAgent)) os = 'iPad';
  else if (/Linux/.test(userAgent)) os = 'Linux';

  // Detectar navegador
  let browser = 'Unknown Browser';
  if (/Edg\//.test(userAgent)) browser = 'Edge';
  else if (/Chrome\//.test(userAgent) && !/Edg/.test(userAgent)) browser = 'Chrome';
  else if (/Firefox\//.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'Safari';
  else if (/OPR\//.test(userAgent)) browser = 'Opera';

  return `${browser} on ${os}`;
}

module.exports = deviceFingerprint;