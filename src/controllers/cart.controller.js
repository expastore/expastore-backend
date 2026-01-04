const cartService = require('../services/cart.service');
const { catchAsync, AppError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/v1/cart
 * @desc    Obtener carrito del usuario
 * @access  Private
 */
const getCart = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const cartData = await cartService.getCart(userId);

  res.status(200).json({
    success: true,
    data: cartData
  });
});

/**
 * @route   POST /api/v1/cart/items
 * @desc    Agregar producto al carrito
 * @access  Private
 */
const addItem = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity = 1, variantId } = req.body;

  if (!productId) {
    throw new AppError('productId es requerido', 400, 'PRODUCT_ID_REQUIRED');
  }

  if (quantity < 1 || quantity > 100) {
    throw new AppError(
      'La cantidad debe estar entre 1 y 100',
      400,
      'INVALID_QUANTITY'
    );
  }

  await cartService.addItem(userId, productId, quantity, variantId);

  const cartData = await cartService.getCart(userId);

  res.status(200).json({
    success: true,
    message: 'Producto agregado al carrito',
    data: cartData
  });
});

/**
 * @route   PATCH /api/v1/cart/items/:itemId
 * @desc    Actualizar cantidad de un item
 * @access  Private
 */
const updateItemQuantity = catchAsync(async (req, res) => {

    console.log('=== INICIO DEBUG CART UPDATE ===');
  console.log('📦 req.params:', req.params);
  console.log('📦 req.params.itemId:', req.params.itemId);
  console.log('📦 req.params.itemId type:', typeof req.params.itemId);
  console.log('📦 req.route.path:', req.route.path);
  console.log('📦 req.originalUrl:', req.originalUrl);
  console.log('📦 req.baseUrl:', req.baseUrl);
  console.log('📦 req.url:', req.url);
  console.log('=== FIN DEBUG ===');


  const userId = req.user.id;
  const { itemId } = req.params;
  const { quantity } = req.body;

  // Validación EXTRA fuerte
  if (!itemId || itemId === ':itemId' || itemId === 'itemId') {
    console.error('❌ ERROR CRÍTICO: itemId es inválido:', itemId);
    throw new AppError(`ID del ítem inválido: "${itemId}"`, 400, 'INVALID_ITEM_ID');
  }

  if (!quantity || quantity < 1) {
    throw new AppError('Cantidad inválida', 400, 'INVALID_QUANTITY');
  }

  await cartService.updateItemQuantity(userId, itemId, quantity);

  const cartData = await cartService.getCart(userId);

  res.status(200).json({
    success: true,
    message: 'Cantidad actualizada',
    data: cartData
  });
});

/**
 * @route   DELETE /api/v1/cart/items/:itemId
 * @desc    Eliminar item del carrito
 * @access  Private
 */
const removeItem = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;

  await cartService.removeItem(userId, itemId);

  const cartData = await cartService.getCart(userId);

  res.status(200).json({
    success: true,
    message: 'Producto eliminado del carrito',
    data: cartData
  });
});

/**
 * @route   DELETE /api/v1/cart
 * @desc    Limpiar todo el carrito
 * @access  Private
 */
const clearCart = catchAsync(async (req, res) => {
  const userId = req.user.id;

  await cartService.clearCart(userId);

  res.status(200).json({
    success: true,
    message: 'Carrito limpiado'
  });
});

/**
 * @route   POST /api/v1/cart/validate
 * @desc    Validar disponibilidad de items
 * @access  Private
 */
const validateCart = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const validation = await cartService.validateCart(userId);

  res.status(200).json({
    success: true,
    data: validation
  });
});

/**
 * @route   POST /api/v1/cart/merge
 * @desc    Fusionar carrito temporal con carrito del usuario
 * @access  Private
 */
const mergeCart = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    throw new AppError('items debe ser un array', 400, 'INVALID_ITEMS');
  }

  const cartData = await cartService.mergeCart(userId, items);

  res.status(200).json({
    success: true,
    message: 'Carrito fusionado exitosamente',
    data: cartData
  });
});

/**
 * @route   POST /api/v1/cart/coupon
 * @desc    Aplicar cupón de descuento
 * @access  Private
 */
const applyCoupon = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { couponCode } = req.body;

  if (!couponCode) {
    throw new AppError('Código de cupón requerido', 400, 'COUPON_CODE_REQUIRED');
  }

  await cartService.applyCoupon(userId, couponCode);

  const cartData = await cartService.getCart(userId);

  res.status(200).json({
    success: true,
    message: 'Cupón aplicado',
    data: cartData
  });
});

/**
 * @route   DELETE /api/v1/cart/coupon
 * @desc    Remover cupón aplicado
 * @access  Private
 */
const removeCoupon = catchAsync(async (req, res) => {
  const userId = req.user.id;

  await cartService.removeCoupon(userId);

  const cartData = await cartService.getCart(userId);

  res.status(200).json({
    success: true,
    message: 'Cupón removido',
    data: cartData
  });
});

/**
 * @route   GET /api/v1/cart/count
 * @desc    Obtener cantidad de items en el carrito
 * @access  Private
 */
const getCartCount = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const cart = await cartService.getOrCreateCart(userId);
  const count = await cart.getItemsCount();

  res.status(200).json({
    success: true,
    data: { count }
  });
});

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  validateCart,
  mergeCart,
  applyCoupon,
  removeCoupon,
  getCartCount
};