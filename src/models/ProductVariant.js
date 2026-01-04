module.exports = (sequelize, DataTypes) => {
  const ProductVariant = sequelize.define('ProductVariant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Producto padre'
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'SKU único de la variante'
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Nombre de la variante (ej: Talla M - Color Rojo)'
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Opciones de la variante: {size: "M", color: "Rojo"}'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Precio específico (null = usar precio del producto)'
    },
    compare_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Precio comparativo para esta variante'
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Stock específico de esta variante'
    },
    weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      comment: 'Peso específico en kg'
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Imagen específica de la variante'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si la variante está activa'
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Orden de visualización'
    }
  }, {
    tableName: 'product_variants',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['sku']
      },
      {
        fields: ['product_id']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // Asociaciones
  ProductVariant.associate = (models) => {
    ProductVariant.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  // Métodos de instancia
  ProductVariant.prototype.isInStock = function() {
    return this.stock_quantity > 0;
  };

  ProductVariant.prototype.getEffectivePrice = async function() {
    if (this.price) return parseFloat(this.price);
    
    const product = await this.getProduct();
    return product ? parseFloat(product.price) : 0;
  };

  ProductVariant.prototype.toPublic = function() {
    return {
      id: this.id,
      productId: this.product_id,
      sku: this.sku,
      name: this.name,
      options: this.options,
      price: this.price ? parseFloat(this.price) : null,
      comparePrice: this.compare_price ? parseFloat(this.compare_price) : null,
      stockQuantity: this.stock_quantity,
      isInStock: this.isInStock(),
      weight: this.weight ? parseFloat(this.weight) : null,
      imageUrl: this.image_url,
      isActive: this.is_active,
      displayOrder: this.display_order
    };
  };

  // Hook: Auto-generar SKU
  ProductVariant.beforeCreate(async (variant) => {
    if (!variant.sku) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      variant.sku = `VAR-${timestamp}-${random}`;
    }
  });

  return ProductVariant;
};