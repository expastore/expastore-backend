// src/middleware/validators/order.validator.js
const Joi = require('joi');

/**
 * Validador para crear orden
 */
const createOrderValidator = (req, res, next) => {
  const schema = Joi.object({
    shippingAddressId: Joi.string().uuid().optional(),
    customerPhone: Joi.string()
      .pattern(/^[0-9\-\+\(\)\s]{9,20}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Formato de teléfono inválido'
      }),
    paymentMethod: Joi.string()
      .valid('paypal', 'stripe', 'bank_transfer', 'cash')
      .default('paypal'),
    shippingMethod: Joi.string().max(100).optional(),
    customerNotes: Joi.string().max(500).optional().allow('')
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Datos de orden inválidos',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  next();
};

/**
 * Validador para cancelar orden
 */
const cancelOrderValidator = (req, res, next) => {
  const schema = Joi.object({
    reason: Joi.string().max(500).required().messages({
      'string.empty': 'Debe proporcionar una razón para la cancelación',
      'any.required': 'La razón es obligatoria'
    })
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  next();
};

/**
 * Validador para obtener opciones de envío
 */
const shippingOptionsValidator = (req, res, next) => {
  const schema = Joi.object({
    province: Joi.string().required().messages({
      'string.empty': 'La provincia es obligatoria',
      'any.required': 'La provincia es obligatoria'
    }),
    subtotal: Joi.number().positive().required().messages({
      'number.base': 'El subtotal debe ser un número',
      'number.positive': 'El subtotal debe ser positivo',
      'any.required': 'El subtotal es obligatorio'
    }),
    totalWeight: Joi.number().positive().optional().default(0)
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  next();
};

/**
 * Validador para actualizar estado (Admin)
 */
const updateOrderStatusValidator = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
      .required(),
    trackingNumber: Joi.string().max(100).optional().allow(''),
    carrier: Joi.string().max(100).optional().allow(''),
    adminNotes: Joi.string().max(1000).optional().allow('')
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  next();
};

/**
 * Validador para reembolso (Admin)
 */
const refundValidator = (req, res, next) => {
  const schema = Joi.object({
    amount: Joi.number().positive().optional(),
    reason: Joi.string().max(500).required().messages({
      'string.empty': 'Debe proporcionar una razón para el reembolso',
      'any.required': 'La razón es obligatoria'
    })
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  next();
};

/**
 * Validador para pago manual (Admin)
 */
const manualPaymentValidator = (req, res, next) => {
  const schema = Joi.object({
    orderId: Joi.string().uuid().required(),
    amount: Joi.number().positive().required(),
    method: Joi.string()
      .valid('bank_transfer', 'cash', 'check')
      .default('bank_transfer'),
    notes: Joi.string().max(1000).optional().allow('')
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  next();
};

module.exports = {
  createOrderValidator,
  cancelOrderValidator,
  shippingOptionsValidator,
  updateOrderStatusValidator,
  refundValidator,
  manualPaymentValidator
};