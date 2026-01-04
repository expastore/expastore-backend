// src/models/OrderItem.js
module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Orden a la que pertenece'
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'Producto comprado'
    },
    product_variant_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'product_variants',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Variante del producto'
    },
    
    // SNAPSHOT DEL PRODUCTO (al momento de la compra)
    product_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Datos del producto al momento de la compra'
    },
    
    // CANTIDADES Y PRECIOS
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      },
      comment: 'Cantidad comprada'
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Precio unitario al momento de la compra'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Subtotal del item (unit_price * quantity)'
    },
    
    // DESCUENTOS
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Descuento aplicado al item'
    },
    
    // IVA
    tax_rate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.15,
      comment: 'Tasa de IVA (15% para Ecuador)'
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Monto de IVA del item'
    },
    
    // TOTAL
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total del item (subtotal - descuento + IVA)'
    },
    
    // ESTADO
    is_refunded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el item fue reembolsado'
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Monto reembolsado'
    },
    
    // NOTAS
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas sobre el item'
    }
  }, {
    tableName: 'order_items',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['order_id']
      },
      {
        fields: ['product_id']
      }
    ]
  });

  // Asociaciones
  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, {
      foreignKey: 'order_id',
      as: 'order'
    });

    OrderItem.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    OrderItem.belongsTo(models.ProductVariant, {
      foreignKey: 'product_variant_id',
      as: 'variant',
      required: false
    });
  };

  // Métodos de instancia
  OrderItem.prototype.calculateTotals = function() {
    // Subtotal
    this.subtotal = (parseFloat(this.unit_price) * this.quantity).toFixed(2);
    
    // Subtotal después de descuento
    const subtotalAfterDiscount = parseFloat(this.subtotal) - parseFloat(this.discount_amount);
    
    // IVA
    this.tax_amount = (subtotalAfterDiscount * parseFloat(this.tax_rate)).toFixed(2);
    
    // Total
    this.total = (subtotalAfterDiscount + parseFloat(this.tax_amount)).toFixed(2);
    
    return {
      subtotal: parseFloat(this.subtotal),
      discount: parseFloat(this.discount_amount),
      tax: parseFloat(this.tax_amount),
      total: parseFloat(this.total)
    };
  };

  OrderItem.prototype.toPublic = function() {
    return {
      id: this.id,
      orderId: this.order_id,
      productId: this.product_id,
      variantId: this.product_variant_id,
      
      // Snapshot del producto
      productSnapshot: this.product_snapshot,
      
      // Cantidades y precios
      quantity: this.quantity,
      unitPrice: parseFloat(this.unit_price),
      subtotal: parseFloat(this.subtotal),
      discountAmount: parseFloat(this.discount_amount),
      taxRate: parseFloat(this.tax_rate),
      taxAmount: parseFloat(this.tax_amount),
      total: parseFloat(this.total),
      
      // Estado
      isRefunded: this.is_refunded,
      refundAmount: parseFloat(this.refund_amount),
      
      notes: this.notes
    };
  };

  // Hooks
  OrderItem.beforeSave((item) => {
    // Recalcular totales antes de guardar
    item.calculateTotals();
  });

  return OrderItem;
};