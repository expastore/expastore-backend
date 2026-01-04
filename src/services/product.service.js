const { Product, Category, ProductImage, ProductVariant } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class ProductService {
  /**
   * Buscar productos con filtros avanzados
   */
  async searchProducts(filters = {}) {
    const {
      search,
      categoryId,
      categorySlug,
      minPrice,
      maxPrice,
      tags,
      isOnSale,
      isFeatured,
      isNew,
      inStock,
      sortBy = 'created_at',
      order = 'DESC',
      page = 1,
      limit = 20
    } = filters;

    const where = { is_active: true };
    const offset = (page - 1) * limit;

    // Filtro de categoría
    if (categoryId) {
      where.category_id = categoryId;
    } else if (categorySlug) {
      const category = await Category.findOne({ where: { slug: categorySlug } });
      if (category) where.category_id = category.id;
    }

    // Filtro de precio
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    // Filtros booleanos
    if (isOnSale === true || isOnSale === 'true') where.is_on_sale = true;
    if (isFeatured === true || isFeatured === 'true') where.is_featured = true;
    if (isNew === true || isNew === 'true') where.is_new = true;

    // Filtro de stock
    if (inStock === true || inStock === 'true') {
      where.stock_quantity = { [Op.gt]: 0 };
    }

    // Filtro de tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.tags = { [Op.overlap]: tagArray };
    }

    // Búsqueda por texto
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Product.findAndCountAll({
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

    return {
      products: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      }
    };
  }

  /**
   * Obtener producto con todas sus relaciones
   */
  async getProductDetails(idOrSlug) {
    const where = idOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      ? { id: idOrSlug }
      : { slug: idOrSlug };

    const product = await Product.findOne({
      where,
      include: [
        {
          model: Category,
          as: 'category'
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

    return product;
  }

  /**
   * Verificar disponibilidad de stock
   */
  async checkStockAvailability(productId, quantity = 1, variantId = null) {
    if (variantId) {
      const variant = await ProductVariant.findByPk(variantId);
      if (!variant) return { available: false, reason: 'VARIANT_NOT_FOUND' };
      if (!variant.is_active) return { available: false, reason: 'VARIANT_INACTIVE' };
      if (variant.stock_quantity < quantity) {
        return {
          available: false,
          reason: 'INSUFFICIENT_STOCK',
          available_quantity: variant.stock_quantity
        };
      }
      return { available: true, stock: variant.stock_quantity };
    }

    const product = await Product.findByPk(productId);
    if (!product) return { available: false, reason: 'PRODUCT_NOT_FOUND' };
    if (!product.is_active) return { available: false, reason: 'PRODUCT_INACTIVE' };

    if (!product.manage_stock) return { available: true };
    if (product.allow_backorder) return { available: true };

    if (product.stock_quantity < quantity) {
      return {
        available: false,
        reason: 'INSUFFICIENT_STOCK',
        available_quantity: product.stock_quantity
      };
    }

    return { available: true, stock: product.stock_quantity };
  }

  /**
   * Reducir stock después de una venta
   */
  async reduceStock(productId, quantity, variantId = null) {
    if (variantId) {
      const variant = await ProductVariant.findByPk(variantId);
      if (!variant) throw new Error('VARIANT_NOT_FOUND');

      await variant.decrement('stock_quantity', { by: quantity });
      
      logger.info('Stock de variante reducido', {
        variantId,
        quantity,
        newStock: variant.stock_quantity - quantity
      });

      return variant;
    }

    const product = await Product.findByPk(productId);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    if (product.manage_stock) {
      await product.decrement('stock_quantity', { by: quantity });
      
      logger.info('Stock de producto reducido', {
        productId,
        quantity,
        newStock: product.stock_quantity - quantity
      });
    }

    await product.increment('sales_count', { by: quantity });

    return product;
  }

  /**
   * Incrementar stock (devolución/reabastecimiento)
   */
  async increaseStock(productId, quantity, variantId = null) {
    if (variantId) {
      const variant = await ProductVariant.findByPk(variantId);
      if (!variant) throw new Error('VARIANT_NOT_FOUND');

      await variant.increment('stock_quantity', { by: quantity });
      
      logger.info('Stock de variante incrementado', {
        variantId,
        quantity
      });

      return variant;
    }

    const product = await Product.findByPk(productId);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    if (product.manage_stock) {
      await product.increment('stock_quantity', { by: quantity });
      
      logger.info('Stock de producto incrementado', {
        productId,
        quantity
      });
    }

    return product;
  }

  /**
   * Obtener productos relacionados
   */
  async getRelatedProducts(productId, limit = 4) {
    const product = await Product.findByPk(productId);
    if (!product) return [];

    const related = await Product.findAll({
      where: {
        category_id: product.category_id,
        id: { [Op.ne]: productId },
        is_active: true
      },
      include: [
        {
          model: ProductImage,
          as: 'images',
          where: { is_primary: true },
          required: false,
          limit: 1
        }
      ],
      limit: parseInt(limit),
      order: [['sales_count', 'DESC']]
    });

    return related;
  }

  /**
   * Actualizar calificación promedio
   */
  async updateAverageRating(productId, newRating, reviewsCount) {
    const product = await Product.findByPk(productId);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    await product.update({
      average_rating: newRating,
      reviews_count: reviewsCount
    });

    logger.info('Calificación actualizada', {
      productId,
      averageRating: newRating,
      reviewsCount
    });

    return product;
  }

  /**
   * Incrementar contador de vistas
   */
  async incrementViews(productId) {
    try {
      await Product.increment('views_count', {
        where: { id: productId }
      });
    } catch (error) {
      logger.error('Error incrementando vistas', {
        productId,
        error: error.message
      });
    }
  }

  /**
   * Obtener productos con bajo stock
   */
  async getLowStockProducts(limit = 20) {
    const products = await Product.findAll({
      where: {
        is_active: true,
        manage_stock: true,
        stock_quantity: {
          [Op.lte]: Product.sequelize.col('low_stock_threshold'),
          [Op.gt]: 0
        }
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      order: [['stock_quantity', 'ASC']]
    });

    return products;
  }

  /**
   * Obtener productos sin stock
   */
  async getOutOfStockProducts(limit = 20) {
    const products = await Product.findAll({
      where: {
        is_active: true,
        manage_stock: true,
        stock_quantity: 0
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      order: [['updated_at', 'DESC']]
    });

    return products;
  }

  /**
   * Clonar producto
   */
  async cloneProduct(productId) {
    const product = await Product.findByPk(productId, {
      include: [
        { model: ProductImage, as: 'images' },
        { model: ProductVariant, as: 'variants' }
      ]
    });

    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    // Crear copia del producto
    const clonedProduct = await Product.create({
      category_id: product.category_id,
      name: `${product.name} (Copia)`,
      description: product.description,
      long_description: product.long_description,
      price: product.price,
      compare_price: product.compare_price,
      cost_price: product.cost_price,
      stock_quantity: 0,
      weight: product.weight,
      dimensions: product.dimensions,
      tags: product.tags,
      attributes: product.attributes,
      is_active: false // Crear como inactivo
    });

    // Clonar imágenes
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await ProductImage.create({
          product_id: clonedProduct.id,
          image_url: image.image_url,
          cloudinary_public_id: image.cloudinary_public_id,
          alt_text: image.alt_text,
          display_order: image.display_order,
          is_primary: image.is_primary
        });
      }
    }

    // Clonar variantes
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        await ProductVariant.create({
          product_id: clonedProduct.id,
          name: variant.name,
          options: variant.options,
          price: variant.price,
          compare_price: variant.compare_price,
          stock_quantity: 0,
          weight: variant.weight,
          image_url: variant.image_url
        });
      }
    }

    logger.info('Producto clonado', {
      originalId: productId,
      clonedId: clonedProduct.id
    });

    return clonedProduct;
  }
}

module.exports = new ProductService();