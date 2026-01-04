module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define('Cart', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Usuario propietario del carrito'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Subtotal sin descuentos'
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Monto de descuento aplicado'
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Monto de impuestos'
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total final'
    },
    applied_coupon_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Código de cupón aplicado'
    },
    last_activity: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Última actividad en el carrito'
    }
  }, {
    tableName: 'carts',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id']
      },
      {
        fields: ['last_activity']
      }
    ]
  });

  // Asociaciones
  Cart.associate = (models) => {
    Cart.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    Cart.hasMany(models.CartItem, {
      foreignKey: 'cart_id',
      as: 'items',
      onDelete: 'CASCADE'
    });
  };

  // Métodos de instancia
  Cart.prototype.calculateTotals = async function() {
    const items = await this.getItems({
      include: [{
        model: sequelize.models.Product,
        as: 'product'
      }]
    });

    let subtotal = 0;

    for (const item of items) {
      const price = item.product_variant_id 
        ? (item.variant?.price || item.product.price)
        : item.product.price;
      
      subtotal += parseFloat(price) * item.quantity;
    }

    this.subtotal = subtotal;
    
    // Calcular impuestos (ejemplo: 12% IVA)
    const taxRate = 0.12;
    this.tax_amount = subtotal * taxRate;
    
    // Total = subtotal - descuento + impuestos
    this.total = subtotal - parseFloat(this.discount_amount) + parseFloat(this.tax_amount);
    
    await this.save();

    return {
      subtotal: parseFloat(this.subtotal),
      discountAmount: parseFloat(this.discount_amount),
      taxAmount: parseFloat(this.tax_amount),
      total: parseFloat(this.total)
    };
  };

  Cart.prototype.isEmpty = async function() {
    const count = await sequelize.models.CartItem.count({
      where: { cart_id: this.id }
    });
    return count === 0;
  };

  Cart.prototype.getItemsCount = async function() {
    const items = await this.getItems();
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  Cart.prototype.updateActivity = async function() {
    this.last_activity = new Date();
    await this.save();
  };

  Cart.prototype.toPublic = function() {
    return {
      id: this.id,
      userId: this.user_id,
      subtotal: parseFloat(this.subtotal),
      discountAmount: parseFloat(this.discount_amount),
      taxAmount: parseFloat(this.tax_amount),
      total: parseFloat(this.total),
      appliedCouponCode: this.applied_coupon_code,
      lastActivity: this.last_activity,
      createdAt: this.created_at,
      updatedAt: this.updated_at
    };
  };

  return Cart;
};