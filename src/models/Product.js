module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'Categoría del producto'
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: {
          args: [3, 200],
          msg: 'El nombre debe tener entre 3 y 200 caracteres'
        }
      },
      comment: 'Nombre del producto'
    },
    slug: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true,
      comment: 'URL-friendly name'
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Stock Keeping Unit - Código único'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción corta'
    },
    long_description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada (HTML permitido)'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        isDecimal: true
      },
      comment: 'Precio base del producto'
    },
    compare_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
        isDecimal: true
      },
      comment: 'Precio antes de descuento (para mostrar ahorro)'
    },
    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
        isDecimal: true
      },
      comment: 'Precio de costo (privado)'
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Cantidad en stock'
    },
    low_stock_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      comment: 'Alerta cuando el stock baje de este número'
    },
    weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      comment: 'Peso en kilogramos'
    },
    dimensions: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Dimensiones: {length, width, height} en cm'
    },
    main_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Imagen principal del producto'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el producto está activo'
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si es producto destacado'
    },
    is_new: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si es producto nuevo'
    },
    is_on_sale: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si está en oferta'
    },
    allow_backorder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Permitir pedidos sin stock'
    },
    manage_stock: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si se gestiona el inventario'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Etiquetas para búsqueda'
    },
    attributes: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Atributos adicionales del producto'
    },
    meta_title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Título SEO'
    },
    meta_description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Descripción SEO'
    },
    meta_keywords: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Keywords SEO'
    },
    views_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Contador de vistas'
    },
    sales_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Contador de ventas'
    },
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      },
      comment: 'Calificación promedio'
    },
    reviews_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cantidad de reseñas'
    }
  }, {
    tableName: 'products',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        unique: true,
        fields: ['sku']
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['is_featured']
      },
      {
        fields: ['is_on_sale']
      },
      {
        fields: ['price']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // Asociaciones
  Product.associate = (models) => {
    Product.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });

    Product.hasMany(models.ProductImage, {
      foreignKey: 'product_id',
      as: 'images',
      onDelete: 'CASCADE'
    });

    Product.hasMany(models.ProductVariant, {
      foreignKey: 'product_id',
      as: 'variants',
      onDelete: 'CASCADE'
    });
  };

  // Métodos de instancia
  Product.prototype.isInStock = function() {
    if (!this.manage_stock) return true;
    if (this.allow_backorder) return true;
    return this.stock_quantity > 0;
  };

  Product.prototype.isLowStock = function() {
    if (!this.manage_stock) return false;
    return this.stock_quantity <= this.low_stock_threshold && this.stock_quantity > 0;
  };

  Product.prototype.getDiscountPercentage = function() {
    if (!this.compare_price || this.compare_price <= this.price) return 0;
    return Math.round(((this.compare_price - this.price) / this.compare_price) * 100);
  };

  Product.prototype.toPublic = function() {
    return {
      id: this.id,
      categoryId: this.category_id,
      name: this.name,
      slug: this.slug,
      sku: this.sku,
      description: this.description,
      longDescription: this.long_description,
      price: parseFloat(this.price),
      comparePrice: this.compare_price ? parseFloat(this.compare_price) : null,
      discountPercentage: this.getDiscountPercentage(),
      stockQuantity: this.stock_quantity,
      isInStock: this.isInStock(),
      isLowStock: this.isLowStock(),
      weight: this.weight ? parseFloat(this.weight) : null,
      dimensions: this.dimensions,
      mainImageUrl: this.main_image_url,
      isActive: this.is_active,
      isFeatured: this.is_featured,
      isNew: this.is_new,
      isOnSale: this.is_on_sale,
      tags: this.tags,
      attributes: this.attributes,
      averageRating: this.average_rating ? parseFloat(this.average_rating) : 0,
      reviewsCount: this.reviews_count,
      viewsCount: this.views_count,
      salesCount: this.sales_count,
      createdAt: this.created_at
    };
  };

  // Hooks
  Product.beforeValidate(async (product) => {
  // Auto-generar slug si no existe
  if (!product.slug && product.name) {
    let baseSlug = product.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Verificar si ya existe el slug
    let counter = 1;
    let finalSlug = baseSlug;
    
    while (true) {
      const existing = await Product.findOne({ where: { slug: finalSlug } });
      if (!existing || existing.id === product.id) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    product.slug = finalSlug;
  }

  // Auto-generar SKU si no existe
  if (!product.sku) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    let baseSku = `PROD-${timestamp}-${random}`;
    
    // Verificar si ya existe el SKU
    let counter = 1;
    let finalSku = baseSku;
    
    while (true) {
      const existing = await Product.findOne({ where: { sku: finalSku } });
      if (!existing || existing.id === product.id) break;
      finalSku = `${baseSku.split('-')[0]}-${timestamp}-${random}${counter}`;
      counter++;
    }
    
    product.sku = finalSku;
  }
});

  // Hook para actualizar slug cuando cambia el nombre
Product.beforeUpdate(async (product) => {
  // Actualizar slug si cambió el nombre sin cambiar slug
  if (product.changed('name') && !product.changed('slug') && product.name) {
    product.slug = product.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

  return Product;
};