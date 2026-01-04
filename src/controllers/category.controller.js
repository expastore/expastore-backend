const { Category, Product } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/categories
 * @desc    Listar todas las categorías (con estructura jerárquica)
 * @access  Public
 */
const listCategories = catchAsync(async (req, res) => {
  const { includeInactive = false } = req.query;

  const where = {};
  if (!includeInactive) where.is_active = true;

  const categories = await Category.findAll({
    where: { ...where, parent_id: null },
    include: [{
      model: Category,
      as: 'children',
      where: where,
      required: false,
      include: [{
        model: Category,
        as: 'children',
        where: where,
        required: false
      }]
    }],
    order: [
      ['display_order', 'ASC'],
      ['name', 'ASC'],
      [{ model: Category, as: 'children' }, 'display_order', 'ASC'],
      [{ model: Category, as: 'children' }, 'name', 'ASC']
    ]
  });

  res.status(200).json({
    success: true,
    data: { categories: categories.map(c => c.toPublic()) }
  });
});

/**
 * @route   GET /api/v1/categories/flat
 * @desc    Listar categorías en formato plano (sin jerarquía)
 * @access  Public
 */
const listCategoriesFlat = catchAsync(async (req, res) => {
  const { includeInactive = false } = req.query;

  const where = {};
  if (!includeInactive) where.is_active = true;

  const categories = await Category.findAll({
    where,
    order: [['display_order', 'ASC'], ['name', 'ASC']]
  });

  res.status(200).json({
    success: true,
    data: { categories: categories.map(c => c.toPublic()) }
  });
});

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Obtener categoría por ID o slug
 * @access  Public
 */
const getCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const where = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    ? { id }
    : { slug: id };

  const category = await Category.findOne({
    where,
    include: [
      {
        model: Category,
        as: 'parent',
        attributes: ['id', 'name', 'slug']
      },
      {
        model: Category,
        as: 'children',
        where: { is_active: true },
        required: false,
        attributes: ['id', 'name', 'slug', 'image_url', 'icon']
      }
    ]
  });

  if (!category) {
    throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
  }

  // Contar productos en la categoría
  const productsCount = await Product.count({
    where: { 
      category_id: category.id,
      is_active: true
    }
  });

  res.status(200).json({
    success: true,
    data: {
      category: {
        ...category.toPublic(),
        productsCount
      }
    }
  });
});

/**
 * @route   POST /api/v1/categories
 * @desc    Crear nueva categoría
 * @access  Private (Admin)
 */
const createCategory = catchAsync(async (req, res) => {
  const {
    name,
    slug,
    description,
    parentId,
    imageUrl,
    icon,
    displayOrder,
    isFeatured,
    metaTitle,
    metaDescription,
    metaKeywords
  } = req.body;

  // Verificar que la categoría padre existe (si se proporciona)
  if (parentId) {
    const parentCategory = await Category.findByPk(parentId);
    if (!parentCategory) {
      throw new AppError('Categoría padre no encontrada', 404, 'PARENT_NOT_FOUND');
    }
  }

  const category = await Category.create({
    name,
    slug,
    description,
    parent_id: parentId,
    image_url: imageUrl,
    icon,
    display_order: displayOrder || 0,
    is_featured: isFeatured || false,
    meta_title: metaTitle,
    meta_description: metaDescription,
    meta_keywords: metaKeywords
  });

  logger.info('Categoría creada', { categoryId: category.id, userId: req.user.id });

  res.status(201).json({
    success: true,
    message: 'Categoría creada exitosamente',
    data: { category: category.toPublic() }
  });
});

/**
 * @route   PATCH /api/v1/categories/:id
 * @desc    Actualizar categoría
 * @access  Private (Admin)
 */
const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
  }

  // Prevenir que una categoría sea su propio padre
  if (req.body.parentId === id) {
    throw new AppError(
      'Una categoría no puede ser su propio padre',
      400,
      'INVALID_PARENT'
    );
  }

  const allowedFields = [
    'name', 'slug', 'description', 'parent_id', 'image_url', 'icon',
    'display_order', 'is_active', 'is_featured', 'meta_title',
    'meta_description', 'meta_keywords'
  ];

  const updateData = {};
  Object.keys(req.body).forEach(key => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (allowedFields.includes(snakeKey)) {
      updateData[snakeKey] = req.body[key];
    }
  });

  await category.update(updateData);

  logger.info('Categoría actualizada', { categoryId: id, userId: req.user.id });

  res.status(200).json({
    success: true,
    message: 'Categoría actualizada exitosamente',
    data: { category: category.toPublic() }
  });
});

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Eliminar categoría (soft delete)
 * @access  Private (Admin)
 */
const deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
  }

  // Verificar si tiene productos
  const productsCount = await Product.count({
    where: { category_id: id }
  });

  if (productsCount > 0) {
    throw new AppError(
      `No se puede eliminar. La categoría tiene ${productsCount} producto(s)`,
      400,
      'CATEGORY_HAS_PRODUCTS'
    );
  }

  // Verificar si tiene subcategorías
  const childrenCount = await Category.count({
    where: { parent_id: id }
  });

  if (childrenCount > 0) {
    throw new AppError(
      `No se puede eliminar. La categoría tiene ${childrenCount} subcategoría(s)`,
      400,
      'CATEGORY_HAS_CHILDREN'
    );
  }

  await category.destroy();

  logger.info('Categoría eliminada', { categoryId: id, userId: req.user.id });

  res.status(200).json({
    success: true,
    message: 'Categoría eliminada exitosamente'
  });
});

/**
 * @route   GET /api/v1/categories/featured
 * @desc    Obtener categorías destacadas
 * @access  Public
 */
const getFeaturedCategories = catchAsync(async (req, res) => {
  const { limit = 6 } = req.query;

  const categories = await Category.findAll({
    where: {
      is_active: true,
      is_featured: true
    },
    limit: parseInt(limit),
    order: [['display_order', 'ASC'], ['name', 'ASC']]
  });

  res.status(200).json({
    success: true,
    data: { categories: categories.map(c => c.toPublic()) }
  });
});

/**
 * @route   GET /api/v1/categories/:id/products
 * @desc    Obtener productos de una categoría
 * @access  Public
 */
const getCategoryProducts = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
  }

  const offset = (page - 1) * limit;

  const { count, rows: products } = await Product.findAndCountAll({
    where: {
      category_id: id,
      is_active: true
    },
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']]
  });

  res.status(200).json({
    success: true,
    data: {
      category: category.toPublic(),
      products: products.map(p => p.toPublic()),
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      }
    }
  });
});

module.exports = {
  listCategories,
  listCategoriesFlat,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getFeaturedCategories,
  getCategoryProducts
};