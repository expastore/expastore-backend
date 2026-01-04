const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middleware/authenticate');
const deviceFingerprint = require('../middleware/deviceFingerprint');

/**
 * RUTAS PÚBLICAS
 */

/**
 * @route   GET /api/v1/categories
 * @desc    Listar categorías jerárquicas
 * @access  Public
 */
router.get('/', categoryController.listCategories);

/**
 * @route   GET /api/v1/categories/flat
 * @desc    Listar categorías planas
 * @access  Public
 */
router.get('/flat', categoryController.listCategoriesFlat);

/**
 * @route   GET /api/v1/categories/featured
 * @desc    Obtener categorías destacadas
 * @access  Public
 */
router.get('/featured', categoryController.getFeaturedCategories);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Obtener categoría por ID o slug
 * @access  Public
 */
router.get('/:id', categoryController.getCategory);

/**
 * @route   GET /api/v1/categories/:id/products
 * @desc    Obtener productos de una categoría
 * @access  Public
 */
router.get('/:id/products', categoryController.getCategoryProducts);

/**
 * RUTAS PRIVADAS (ADMIN)
 */

/**
 * @route   POST /api/v1/categories
 * @desc    Crear nueva categoría
 * @access  Private (Admin)
 */
router.post(
  '/',
  deviceFingerprint,
  authenticate,
  authorize('admin'),
  categoryController.createCategory
);

/**
 * @route   PATCH /api/v1/categories/:id
 * @desc    Actualizar categoría
 * @access  Private (Admin)
 */
router.patch(
  '/:id',
  deviceFingerprint,
  authenticate,
  authorize('admin'),
  categoryController.updateCategory
);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Eliminar categoría
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  deviceFingerprint,
  authenticate,
  authorize('admin'),
  categoryController.deleteCategory
);

module.exports = router;