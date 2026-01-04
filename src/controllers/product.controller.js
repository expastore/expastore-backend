const { Product, Category, ProductImage, ProductVariant } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const cloudinaryService = require('../services/cloudinary.service');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * @route   GET /api/v1/products
 * @desc    Listar productos con filtros y paginación
 * @access  Public
 */
const listProducts = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    isOnSale,
    isFeatured,
    isNew,
    search,
    sortBy = 'created_at',
    order = 'DESC'
  } = req.query;

  const offset = (page - 1) * limit;
  const where = { is_active: true };

  // Filtros
  if (category) where.category_id = category;
  if (isOnSale === 'true') where.is_on_sale = true;
  if (isFeatured === 'true') where.is_featured = true;
  if (isNew === 'true') where.is_new = true;

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
    if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { tags: { [Op.contains]: [search] } }
    ];
  }

  const { count, rows: products } = await Product.findAndCountAll({
    where,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'slug']
      },
      {
        model: ProductImage,
        as: 'images',
        where: { is_primary: true },
        required: false,
        limit: 1
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortBy, order.toUpperCase()]],
    distinct: true
  });

  res.status(200).json({
    success: true,
    data: {
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

/**
 * @route   GET /api/v1/products/:id
 * @desc    Obtener producto por ID o slug
 * @access  Public
 */
const getProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const where = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    ? { id }
    : { slug: id };

  const product = await Product.findOne({
    where,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'slug']
      },
      {
        model: ProductImage,
        as: 'images',
        order: [['display_order', 'ASC']]
      },
      {
        model: ProductVariant,
        as: 'variants',
        where: { is_active: true },
        required: false,
        order: [['display_order', 'ASC']]
      }
    ]
  });

  if (!product) {
    throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
  }

  // Incrementar contador de vistas
  await product.increment('views_count');

  res.status(200).json({
    success: true,
    data: {
      product: {
        ...product.toPublic(),
        images: product.images || [],
        variants: product.variants?.map(v => v.toPublic()) || []
      }
    }
  });
});

/**
 * @route   POST /api/v1/products
 * @desc    Crear nuevo producto
 * @access  Private (Admin)
 */
const createProduct = catchAsync(async (req, res) => {
  const {
    categoryId,
    name,
    slug,
    sku,
    description,
    longDescription,
    price,
    comparePrice,
    costPrice,
    stockQuantity,
    weight,
    dimensions,
    isFeatured,
    isNew,
    isOnSale,
    allowBackorder,
    tags,
    attributes,
    metaTitle,
    metaDescription
  } = req.body;

  // Verificar que la categoría existe
  const category = await Category.findByPk(categoryId);
  if (!category) {
    throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
  }

  const product = await Product.create({
    category_id: categoryId,
    name,
    slug,
    sku,
    description,
    long_description: longDescription,
    price,
    compare_price: comparePrice,
    cost_price: costPrice,
    stock_quantity: stockQuantity || 0,
    weight,
    dimensions,
    is_featured: isFeatured || false,
    is_new: isNew || false,
    is_on_sale: isOnSale || false,
    allow_backorder: allowBackorder || false,
    tags: tags || [],
    attributes: attributes || {},
    meta_title: metaTitle,
    meta_description: metaDescription
  });

  logger.info('Producto creado', { productId: product.id, userId: req.user.id });

  res.status(201).json({
    success: true,
    message: 'Producto creado exitosamente',
    data: { product: product.toPublic() }
  });
});

/**
 * @route   PATCH /api/v1/products/:id
 * @desc    Actualizar producto
 * @access  Private (Admin)
 */
const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);
  if (!product) {
    throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
  }

  const allowedFields = [
    'category_id', 'name', 'slug', 'sku', 'description', 'long_description',
    'price', 'compare_price', 'cost_price', 'stock_quantity', 'weight',
    'dimensions', 'is_active', 'is_featured', 'is_new', 'is_on_sale',
    'allow_backorder', 'tags', 'attributes', 'meta_title', 'meta_description'
  ];

  const updateData = {};
  Object.keys(req.body).forEach(key => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (allowedFields.includes(snakeKey)) {
      updateData[snakeKey] = req.body[key];
    }
  });

  await product.update(updateData);

  logger.info('Producto actualizado', { productId: product.id, userId: req.user.id });

  res.status(200).json({
    success: true,
    message: 'Producto actualizado exitosamente',
    data: { product: product.toPublic() }
  });
});

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Eliminar producto (soft delete)
 * @access  Private (Admin)
 */
const deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);
  if (!product) {
    throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
  }

  await product.destroy();

  logger.info('Producto eliminado', { productId: id, userId: req.user.id });

  res.status(200).json({
    success: true,
    message: 'Producto eliminado exitosamente'
  });
});

/**
 * @route   POST /api/v1/products/:id/images
 * @desc    Subir imágenes del producto
 * @access  Private (Admin)
 */
const uploadProductImages = catchAsync(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);
  if (!product) {
    throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
  }

  if (!req.files || req.files.length === 0) {
    throw new AppError('No se proporcionaron imágenes', 400, 'NO_IMAGES');
  }

  const uploadedImages = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    
    // Subir a Cloudinary
    const result = await cloudinaryService.uploadProductImage(file, product.id, i);
    
    // Crear registro en BD
    const image = await ProductImage.create({
      product_id: product.id,
      image_url: result.url,
      cloudinary_public_id: result.publicId,
      display_order: i,
      is_primary: i === 0 && !product.main_image_url,
      width: result.width,
      height: result.height,
      size_bytes: result.bytes
    });

    uploadedImages.push(image);

    // Si es la primera imagen, actualizar main_image_url del producto
    if (i === 0 && !product.main_image_url) {
      await product.update({ main_image_url: result.url });
    }
  }

  logger.info('Imágenes subidas', { 
    productId: product.id, 
    count: uploadedImages.length,
    userId: req.user.id 
  });

  res.status(200).json({
    success: true,
    message: `${uploadedImages.length} imagen(es) subida(s) exitosamente`,
    data: { images: uploadedImages }
  });
});

/**
 * @route   DELETE /api/v1/products/:productId/images/:imageId
 * @desc    Eliminar imagen del producto
 * @access  Private (Admin)
 */
const deleteProductImage = catchAsync(async (req, res) => {
  const { productId, imageId } = req.params;

  const image = await ProductImage.findOne({
    where: { id: imageId, product_id: productId }
  });

  if (!image) {
    throw new AppError('Imagen no encontrada', 404, 'IMAGE_NOT_FOUND');
  }

  // Eliminar de Cloudinary
  if (image.cloudinary_public_id) {
    await cloudinaryService.deleteImage(image.cloudinary_public_id);
  }

  // Eliminar de BD
  await image.destroy();

  logger.info('Imagen eliminada', { imageId, productId, userId: req.user.id });

  res.status(200).json({
    success: true,
    message: 'Imagen eliminada exitosamente'
  });
});

/**
 * @route   POST /api/v1/products/:id/variants
 * @desc    Crear variante de producto
 * @access  Private (Admin)
 */
const createProductVariant = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { sku, name, options, price, comparePrice, stockQuantity, weight, imageUrl } = req.body;

  const product = await Product.findByPk(id);
  if (!product) {
    throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
  }

  const variant = await ProductVariant.create({
    product_id: id,
    sku,
    name,
    options,
    price,
    compare_price: comparePrice,
    stock_quantity: stockQuantity || 0,
    weight,
    image_url: imageUrl
  });

  logger.info('Variante creada', { variantId: variant.id, productId: id, userId: req.user.id });

  res.status(201).json({
    success: true,
    message: 'Variante creada exitosamente',
    data: { variant: variant.toPublic() }
  });
});

/**
 * @route   GET /api/v1/products/featured
 * @desc    Obtener productos destacados
 * @access  Public
 */
const getFeaturedProducts = catchAsync(async (req, res) => {
  const { limit = 8 } = req.query;

  const products = await Product.findAll({
    where: { 
      is_active: true,
      is_featured: true
    },
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'slug']
      },
      {
        model: ProductImage,
        as: 'images',
        where: { is_primary: true },
        required: false,
        limit: 1
      }
    ],
    limit: parseInt(limit),
    order: [['created_at', 'DESC']]
  });

  res.status(200).json({
    success: true,
    data: { products: products.map(p => p.toPublic()) }
  });
});

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  createProductVariant,
  getFeaturedProducts
};