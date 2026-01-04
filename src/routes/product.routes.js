const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/authenticate');
const deviceFingerprint = require('../middleware/deviceFingerprint');
const upload = require('../middleware/upload.middleware');

/**
 * RUTAS PÚBLICAS
 */

/**
 * @route   GET /api/v1/products
 * @desc    Listar productos con filtros
 * @access  Public
 */
router.get('/', productController.listProducts);

/**
 * @route   GET /api/v1/products/featured
 * @desc    Obtener productos destacados
 * @access  Public
 */
router.get('/featured', productController.getFeaturedProducts);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Obtener producto por ID o slug
 * @access  Public
 */
router.get('/:id', productController.getProduct);

/**
 * RUTAS PRIVADAS (ADMIN)
 */

/**
 * @route   POST /api/v1/products
 * @desc    Crear nuevo producto
 * @access  Private (Admin)
 */
router.post(
  '/',
  deviceFingerprint,
  authenticate,
  authorize('admin'),
  productController.createProduct
);

/**
 * @route   PATCH /api/v1/products/:id
 * @desc    Actualizar producto
 * @access  Private (Admin)
 */
router.patch(
  '/:id',
  deviceFingerprint,
  authenticate,
  authorize('admin'),
  productController.updateProduct
);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Eliminar producto
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  deviceFingerprint,
  authenticate,
  authorize('admin'),
  productController.deleteProduct
);

/**
 * @route   POST /api/v1/products/:id/images
 * @desc    Subir imágenes del producto
 * @access  Private (Admin)
 */
router.post(
  '/:id/images',
  deviceFingerprint,
  authenticate,
  authorize('admin'),
  upload.array('images', 10), // Máximo 10 imágenes
  productController.uploadProductImages
);

/**
 * @route   DELETE /api/v1/products/:productId/images/:imageId
 * @desc    Eliminar imagen del producto
 * @access  Private (Admin)
 */
router.delete(
  '/:productId/images/:imageId',
  deviceFingerprint,
  authenticate,
  authorize('admin'),
  productController.deleteProductImage
);

/**
 * @route   POST /api/v1/products/:id/variants
 * @desc    Crear variante de producto
 * @access  Private (Admin)
 */
router.post(
  '/:id/variants',
  deviceFingerprint,
  authenticate,
  authorize('admin'),
  productController.createProductVariant
);

module.exports = router;