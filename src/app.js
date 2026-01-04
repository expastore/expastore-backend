const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');

const logger = require('./utils/logger');

// Middlewares personalizados
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');

const app = express();

// ===== TRUST PROXY =====
// Importante para obtener la IP real detrás de proxies/load balancers
app.set('trust proxy', 1);

// ===== SEGURIDAD: HELMET =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.paypal.com", "https://api.sandbox.paypal.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.paypal.com", "https://www.sandbox.paypal.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ===== RATE LIMITING =====
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS_REQUESTS === 'true',
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas solicitudes. Por favor, intente más tarde.'
    });
  }
});

// Aplicar rate limiting a todas las rutas /api
app.use('/api', limiter);

// Rate limiting más estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      error: 'TOO_MANY_AUTH_ATTEMPTS',
      message: 'Demasiados intentos de autenticación. Intente en 15 minutos.'
    });
  }
});

app.use('/api/v1/auth', authLimiter);

// ===== CORS =====
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3001'];
    
    // Permitir requests sin origin (como mobile apps o Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS: Origin not allowed', { origin });
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 600 // 10 minutos
};

app.use(cors(corsOptions));

// ===== SEGURIDAD ADICIONAL =====
app.use(xss()); // Prevenir XSS attacks
app.use(hpp()); // Prevenir HTTP Parameter Pollution

// ===== COMPRESIÓN =====
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// ===== BODY PARSERS =====
app.use(express.json({ 
  limit: '10kb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10kb' 
}));

// ===== COOKIES =====
app.use(cookieParser(process.env.COOKIE_SECRET));

// ===== LOGGING HTTP =====
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// ===== ARCHIVOS ESTÁTICOS =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true
}));
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true
}));

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// ===== API INFO =====
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Expastore API',
    version: '1.0.0',
    description: 'Backend E-commerce con autenticación PIN',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      docs: '/api/docs'
    }
  });
});

// ===== RUTAS =====
const apiRoutes = require('./routes');
app.use('/api/v1', apiRoutes);

// Placeholder para webhooks (TODO: implementar en módulo de pagos)
app.post('/webhooks/paypal', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Webhook endpoint - implementar en módulo de pagos' 
  });
});

// ===== MANEJO DE ERRORES =====
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;