module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define('CartItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cart_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'carts',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Carrito al que pertenece'
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'Producto en el carrito'
    },
    product_variant_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'product_variants',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Variante específica del producto'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      },
      comment: 'Cantidad del producto'
    },
    price_at_addition: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Precio cuando se agregó (para histórico)'
    }
  }, {
    tableName: 'cart_items',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['cart_id']
      },
      {
        fields: ['product_id']
      },
      {
        fields: ['product_variant_id']
      },
      {
        unique: true,
        fields: ['cart_id', 'product_id', 'product_variant_id'],
        name: 'cart_items_unique_product_variant'
      }
    ]
  });

  // Asociaciones
  CartItem.associate = (models) => {
    CartItem.belongsTo(models.Cart, {
      foreignKey: 'cart_id',
      as: 'cart'
    });

    CartItem.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    CartItem.belongsTo(models.ProductVariant, {
      foreignKey: 'product_variant_id',
      as: 'variant',
      required: false
    });
  };

  // Métodos de instancia
  CartItem.prototype.getCurrentPrice = async function() {
    if (this.product_variant_id && this.variant) {
      return parseFloat(this.variant.price || this.product.price);
    }
    return parseFloat(this.product.price);
  };

  CartItem.prototype.getSubtotal = async function() {
    const price = await this.getCurrentPrice();
    return price * this.quantity;
  };

  CartItem.prototype.toPublic = async function() {
    const product = this.product;
    const variant = this.variant;
    const currentPrice = await this.getCurrentPrice();

    return {
      id: this.id,
      productId: this.product_id,
      productName: product.name,
      productSlug: product.slug,
      productImage: product.main_image_url,
      variantId: this.product_variant_id,
      variantName: variant?.name,
      variantOptions: variant?.options,
      quantity: this.quantity,
      priceAtAddition: parseFloat(this.price_at_addition),
      currentPrice: currentPrice,
      subtotal: currentPrice * this.quantity,
      inStock: variant 
        ? variant.stock_quantity >= this.quantity
        : product.stock_quantity >= this.quantity,
      maxQuantity: variant ? variant.stock_quantity : product.stock_quantity
    };
  };

  // Hooks
  CartItem.afterCreate(async (item) => {
    const cart = await item.getCart();
    await cart.calculateTotals();
    await cart.updateActivity();
  });

  CartItem.afterUpdate(async (item) => {
    const cart = await item.getCart();
    await cart.calculateTotals();
    await cart.updateActivity();
  });

  CartItem.afterDestroy(async (item) => {
    const cart = await sequelize.models.Cart.findByPk(item.cart_id);
    if (cart) {
      await cart.calculateTotals();
      await cart.updateActivity();
    }
  });

  return CartItem;
};