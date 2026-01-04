const { User, Address, BillingInfo } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/users/me
 * @desc    Obtener perfil del usuario actual
 * @access  Private
 */
const getProfile = catchAsync(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    include: [
      {
        model: Address,
        as: 'addresses',
        where: { deleted_at: null },
        required: false
      },
      {
        model: BillingInfo,
        as: 'billingInfo',
        required: false
      }
    ]
  });

  res.status(200).json({
    success: true,
    data: {
      user: user.toSafeObject(),
      addresses: user.addresses || [],
      billingInfo: user.billingInfo || null
    }
  });
});

/**
 * @route   PATCH /api/v1/users/me
 * @desc    Actualizar perfil del usuario
 * @access  Private
 */
const updateProfile = catchAsync(async (req, res) => {
  const { firstName, lastName, phone, preferences } = req.body;

  const updateData = {};
  if (firstName) updateData.first_name = firstName;
  if (lastName) updateData.last_name = lastName;
  if (phone) updateData.phone = phone;
  if (preferences) {
    updateData.preferences = {
      ...req.user.preferences,
      ...preferences
    };
  }

  await req.user.update(updateData);

  logger.info('Perfil actualizado', { userId: req.user.id });

  res.status(200).json({
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: {
      user: req.user.toSafeObject()
    }
  });
});

/**
 * @route   DELETE /api/v1/users/me
 * @desc    Eliminar cuenta del usuario (soft delete)
 * @access  Private
 */
const deleteAccount = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Soft delete del usuario
  await req.user.destroy();

  // Cerrar todas las sesiones
  const authService = require('../services/auth.service');
  await authService.logoutAllDevices(userId);

  // Limpiar cookies
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });

  logger.info('Cuenta eliminada', { userId });

  res.status(200).json({
    success: true,
    message: 'Cuenta eliminada exitosamente'
  });
});

/**
 * @route   GET /api/v1/users/me/addresses
 * @desc    Obtener direcciones del usuario
 * @access  Private
 */
const getAddresses = catchAsync(async (req, res) => {
  const addresses = await Address.findAll({
    where: { user_id: req.user.id },
    order: [['is_default', 'DESC'], ['created_at', 'DESC']]
  });

  res.status(200).json({
    success: true,
    data: { addresses }
  });
});

/**
 * @route   POST /api/v1/users/me/addresses
 * @desc    Crear nueva dirección
 * @access  Private
 */
const createAddress = catchAsync(async (req, res) => {
  const {
    label,
    recipientName,
    recipientPhone,
    addressLine1,
    addressLine2,
    city,
    state,
    country,
    postalCode,
    isDefault,
    latitude,
    longitude,
    notes
  } = req.body;

  const address = await Address.create({
    user_id: req.user.id,
    label,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    address_line1: addressLine1,
    address_line2: addressLine2,
    city,
    state,
    country: country || 'EC',
    postal_code: postalCode,
    is_default: isDefault || false,
    latitude,
    longitude,
    notes
  });

  logger.info('Dirección creada', { userId: req.user.id, addressId: address.id });

  res.status(201).json({
    success: true,
    message: 'Dirección creada exitosamente',
    data: { address }
  });
});

/**
 * @route   PATCH /api/v1/users/me/addresses/:id
 * @desc    Actualizar dirección
 * @access  Private
 */
const updateAddress = catchAsync(async (req, res) => {
  const { id } = req.params;

  const address = await Address.findOne({
    where: { id, user_id: req.user.id }
  });

  if (!address) {
    throw new AppError('Dirección no encontrada', 404, 'ADDRESS_NOT_FOUND');
  }

  await address.update(req.body);

  logger.info('Dirección actualizada', { userId: req.user.id, addressId: id });

  res.status(200).json({
    success: true,
    message: 'Dirección actualizada exitosamente',
    data: { address }
  });
});

/**
 * @route   DELETE /api/v1/users/me/addresses/:id
 * @desc    Eliminar dirección
 * @access  Private
 */
const deleteAddress = catchAsync(async (req, res) => {
  const { id } = req.params;

  const address = await Address.findOne({
    where: { id, user_id: req.user.id }
  });

  if (!address) {
    throw new AppError('Dirección no encontrada', 404, 'ADDRESS_NOT_FOUND');
  }

  await address.destroy();

  logger.info('Dirección eliminada', { userId: req.user.id, addressId: id });

  res.status(200).json({
    success: true,
    message: 'Dirección eliminada exitosamente'
  });
});

/**
 * @route   GET /api/v1/users/me/billing-info
 * @desc    Obtener información de facturación
 * @access  Private
 */
const getBillingInfo = catchAsync(async (req, res) => {
  const billingInfo = await BillingInfo.findOne({
    where: { user_id: req.user.id }
  });

  res.status(200).json({
    success: true,
    data: { billingInfo }
  });
});

/**
 * @route   PUT /api/v1/users/me/billing-info
 * @desc    Crear o actualizar información de facturación
 * @access  Private
 */
const upsertBillingInfo = catchAsync(async (req, res) => {
  const {
    taxId,
    companyName,
    billingAddress,
    billingCity,
    billingState,
    billingCountry,
    billingPostalCode
  } = req.body;

  const [billingInfo, created] = await BillingInfo.findOrCreate({
    where: { user_id: req.user.id },
    defaults: {
      tax_id: taxId,
      company_name: companyName,
      billing_address: billingAddress,
      billing_city: billingCity,
      billing_state: billingState,
      billing_country: billingCountry || 'EC',
      billing_postal_code: billingPostalCode
    }
  });

  if (!created) {
    await billingInfo.update({
      tax_id: taxId,
      company_name: companyName,
      billing_address: billingAddress,
      billing_city: billingCity,
      billing_state: billingState,
      billing_country: billingCountry || 'EC',
      billing_postal_code: billingPostalCode
    });
  }

  logger.info('Información de facturación actualizada', { userId: req.user.id });

  res.status(200).json({
    success: true,
    message: created ? 'Información creada exitosamente' : 'Información actualizada exitosamente',
    data: { billingInfo }
  });
});

module.exports = {
  getProfile,
  updateProfile,
  deleteAccount,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getBillingInfo,
  upsertBillingInfo
};