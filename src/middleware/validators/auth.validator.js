const { body, validationResult } = require('express-validator');
const { AppError } = require('../errorHandler');

/**
 * Middleware para manejar errores de validación
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return next(new AppError(
      'Errores de validación',
      400,
      'VALIDATION_ERROR',
      formattedErrors
    ));
  }
  
  next();
};

/**
 * Validación para registro
 */
const validateRegister = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('El apellido es requerido')
    .isLength({ min: 2, max: 50 }).withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El apellido solo puede contener letras'),

  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('El email es demasiado largo'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9\-\+\(\)\s]{9,20}$/).withMessage('Formato de teléfono inválido'),

  handleValidationErrors
];

/**
 * Validación para activación de cuenta
 */
const validateActivation = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),

  body('pin')
    .trim()
    .notEmpty().withMessage('El PIN es requerido')
    .isLength({ min: 6, max: 6 }).withMessage('El PIN debe tener 6 dígitos')
    .isNumeric().withMessage('El PIN solo puede contener números'),

  handleValidationErrors
];

/**
 * Validación para solicitar PIN de login
 */
const validateRequestLoginPin = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),

  handleValidationErrors
];

/**
 * Validación para verificar PIN de login
 */
const validateVerifyLoginPin = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),

  body('pin')
    .trim()
    .notEmpty().withMessage('El PIN es requerido')
    .isLength({ min: 6, max: 6 }).withMessage('El PIN debe tener 6 dígitos')
    .isNumeric().withMessage('El PIN solo puede contener números'),

  handleValidationErrors
];

/**
 * Validación para actualizar perfil
 */
const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El apellido solo puede contener letras'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9\-\+\(\)\s]{9,20}$/).withMessage('Formato de teléfono inválido'),

  body('preferences')
    .optional()
    .isObject().withMessage('Preferences debe ser un objeto'),

  body('preferences.newsletter')
    .optional()
    .isBoolean().withMessage('newsletter debe ser booleano'),

  body('preferences.notifications')
    .optional()
    .isBoolean().withMessage('notifications debe ser booleano'),

  body('preferences.language')
    .optional()
    .isIn(['es', 'en']).withMessage('Idioma no soportado'),

  body('preferences.currency')
    .optional()
    .isIn(['USD', 'EUR']).withMessage('Moneda no soportada'),

  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark']).withMessage('Tema no soportado'),

  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateActivation,
  validateRequestLoginPin,
  validateVerifyLoginPin,
  validateUpdateProfile,
  handleValidationErrors
};