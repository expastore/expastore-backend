const { Category, Product } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class CategoryService {
  /**
   * Obtener árbol de categorías completo
   */
  async getCategoryTree(includeInactive = false) {
    const where = includeInactive ? {} : { is_active: true };

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
          required: false,
          include: [{
            model: Category,
            as: 'children',
            where: where,
            required: false
          }]
        }]
      }],
      order: [
        ['display_order', 'ASC'],
        ['name', 'ASC'],
        [{ model: Category, as: 'children' }, 'display_order', 'ASC'],
        [{ model: Category, as: 'children' }, { model: Category, as: 'children' }, 'display_order', 'ASC']
      ]
    });

    return categories;
  }

  /**
   * Obtener categoría con sus padres (breadcrumb)
   */
  async getCategoryBreadcrumb(categoryId) {
    const breadcrumb = [];
    let currentCategory = await Category.findByPk(categoryId);

    while (currentCategory) {
      breadcrumb.unshift({
        id: currentCategory.id,
        name: currentCategory.name,
        slug: currentCategory.slug
      });

      if (currentCategory.parent_id) {
        currentCategory = await Category.findByPk(currentCategory.parent_id);
      } else {
        currentCategory = null;
      }
    }

    return breadcrumb;
  }

  /**
   * Obtener todas las subcategorías de una categoría (recursivo)
   */
  async getAllSubcategoryIds(categoryId) {
    const ids = [categoryId];
    
    const getChildren = async (parentId) => {
      const children = await Category.findAll({
        where: { parent_id: parentId },
        attributes: ['id']
      });

      for (const child of children) {
        ids.push(child.id);
        await getChildren(child.id);
      }
    };

    await getChildren(categoryId);
    return ids;
  }

  /**
   * Contar productos en categoría (incluyendo subcategorías)
   */
  async countProductsInCategory(categoryId, includeSubcategories = true) {
    let categoryIds = [categoryId];

    if (includeSubcategories) {
      categoryIds = await this.getAllSubcategoryIds(categoryId);
    }

    const count = await Product.count({
      where: {
        category_id: { [Op.in]: categoryIds },
        is_active: true
      }
    });

    return count;
  }

  /**
   * Verificar si una categoría tiene productos
   */
  async hasProducts(categoryId) {
    const count = await Product.count({
      where: { category_id: categoryId }
    });

    return count > 0;
  }

  /**
   * Verificar si una categoría tiene subcategorías
   */
  async hasChildren(categoryId) {
    const count = await Category.count({
      where: { parent_id: categoryId }
    });

    return count > 0;
  }

  /**
   * Mover categoría a otro padre
   */
  async moveCategory(categoryId, newParentId) {
    const category = await Category.findByPk(categoryId);
    if (!category) throw new Error('CATEGORY_NOT_FOUND');

    // Verificar que no sea su propio padre
    if (categoryId === newParentId) {
      throw new Error('CANNOT_BE_OWN_PARENT');
    }

    // Verificar que el nuevo padre no sea un descendiente
    if (newParentId) {
      const descendantIds = await this.getAllSubcategoryIds(categoryId);
      if (descendantIds.includes(newParentId)) {
        throw new Error('CANNOT_MOVE_TO_DESCENDANT');
      }

      // Verificar que el nuevo padre existe
      const newParent = await Category.findByPk(newParentId);
      if (!newParent) throw new Error('PARENT_NOT_FOUND');
    }

    await category.update({ parent_id: newParentId });

    logger.info('Categoría movida', {
      categoryId,
      oldParentId: category.parent_id,
      newParentId
    });

    return category;
  }

  /**
   * Reordenar categorías
   */
  async reorderCategories(categoryOrders) {
    // categoryOrders es un array de { id, displayOrder }
    const promises = categoryOrders.map(({ id, displayOrder }) => {
      return Category.update(
        { display_order: displayOrder },
        { where: { id } }
      );
    });

    await Promise.all(promises);

    logger.info('Categorías reordenadas', {
      count: categoryOrders.length
    });

    return true;
  }

  /**
   * Obtener categorías con más productos
   */
  async getTopCategories(limit = 10) {
    const categories = await Category.findAll({
      where: { is_active: true },
      attributes: {
        include: [
          [
            Category.sequelize.literal(`(
              SELECT COUNT(*)
              FROM products
              WHERE products.category_id = "Category".id
              AND products.is_active = true
              AND products.deleted_at IS NULL
            )`),
            'productsCount'
          ]
        ]
      },
      order: [
        [Category.sequelize.literal('productsCount'), 'DESC'],
        ['name', 'ASC']
      ],
      limit: parseInt(limit)
    });

    return categories;
  }

  /**
   * Buscar categorías por nombre
   */
  async searchCategories(searchTerm, limit = 10) {
    const categories = await Category.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } }
        ],
        is_active: true
      },
      limit: parseInt(limit),
      order: [['name', 'ASC']]
    });

    return categories;
  }

  /**
   * Obtener nivel de profundidad de una categoría
   */
  async getCategoryDepth(categoryId) {
    let depth = 0;
    let currentCategory = await Category.findByPk(categoryId);

    while (currentCategory && currentCategory.parent_id) {
      depth++;
      currentCategory = await Category.findByPk(currentCategory.parent_id);
    }

    return depth;
  }

  /**
   * Validar que una categoría puede ser eliminada
   */
  async canDelete(categoryId) {
    const hasProducts = await this.hasProducts(categoryId);
    if (hasProducts) {
      return {
        canDelete: false,
        reason: 'HAS_PRODUCTS',
        message: 'La categoría tiene productos asociados'
      };
    }

    const hasChildren = await this.hasChildren(categoryId);
    if (hasChildren) {
      return {
        canDelete: false,
        reason: 'HAS_CHILDREN',
        message: 'La categoría tiene subcategorías'
      };
    }

    return {
      canDelete: true
    };
  }

  /**
   * Obtener estadísticas de una categoría
   */
  async getCategoryStats(categoryId) {
    const category = await Category.findByPk(categoryId);
    if (!category) throw new Error('CATEGORY_NOT_FOUND');

    const categoryIds = await this.getAllSubcategoryIds(categoryId);

    const stats = await Product.findAll({
      where: {
        category_id: { [Op.in]: categoryIds },
        is_active: true
      },
      attributes: [
        [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'totalProducts'],
        [Product.sequelize.fn('SUM', Product.sequelize.col('stock_quantity')), 'totalStock'],
        [Product.sequelize.fn('AVG', Product.sequelize.col('price')), 'averagePrice'],
        [Product.sequelize.fn('MIN', Product.sequelize.col('price')), 'minPrice'],
        [Product.sequelize.fn('MAX', Product.sequelize.col('price')), 'maxPrice']
      ],
      raw: true
    });

    const subcategoriesCount = await Category.count({
      where: { parent_id: categoryId }
    });

    return {
      category: category.toPublic(),
      totalProducts: parseInt(stats[0].totalProducts) || 0,
      totalStock: parseInt(stats[0].totalStock) || 0,
      averagePrice: parseFloat(stats[0].averagePrice) || 0,
      priceRange: {
        min: parseFloat(stats[0].minPrice) || 0,
        max: parseFloat(stats[0].maxPrice) || 0
      },
      subcategoriesCount
    };
  }

  /**
   * Clonar categoría
   */
  async cloneCategory(categoryId, includeChildren = false) {
    const category = await Category.findByPk(categoryId);
    if (!category) throw new Error('CATEGORY_NOT_FOUND');

    const clonedCategory = await Category.create({
      name: `${category.name} (Copia)`,
      description: category.description,
      parent_id: category.parent_id,
      image_url: category.image_url,
      icon: category.icon,
      display_order: category.display_order + 1,
      is_active: false,
      meta_title: category.meta_title,
      meta_description: category.meta_description,
      meta_keywords: category.meta_keywords
    });

    // Clonar subcategorías si se especifica
    if (includeChildren) {
      const children = await Category.findAll({
        where: { parent_id: categoryId }
      });

      for (const child of children) {
        await Category.create({
          name: child.name,
          description: child.description,
          parent_id: clonedCategory.id,
          image_url: child.image_url,
          icon: child.icon,
          display_order: child.display_order,
          is_active: false
        });
      }
    }

    logger.info('Categoría clonada', {
      originalId: categoryId,
      clonedId: clonedCategory.id,
      includeChildren
    });

    return clonedCategory;
  }
}

module.exports = new CategoryService();