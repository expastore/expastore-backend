// src/models/Order.js
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    order_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Número de orden único (ORD-YYYYMMDD-XXXX)'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'Usuario que realizó la orden'
    },
    
    // INFORMACIÓN DE CONTACTO
    customer_email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Email del cliente'
    },
    customer_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Teléfono del cliente'
    },
    
    // DIRECCIÓN DE ENVÍO
    shipping_address_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'addresses',
        key: 'id'
      },
      comment: 'Dirección de envío'
    },
    shipping_address_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Snapshot de la dirección al momento de la orden'
    },
    
    // INFORMACIÓN DE FACTURACIÓN
    billing_info_snapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Información de facturación'
    },
    
    // MONTOS - ECUADOR
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Subtotal antes de descuentos'
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Descuento aplicado'
    },
    discount_reason: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Razón del descuento (cupón, promoción, etc.)'
    },
    
    // IVA ECUADOR - 15% (configurable)
    tax_rate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.15,
      comment: 'Tasa de IVA aplicada (15% = 0.15)'
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Monto del IVA'
    },
    
    // ENVÍO
    shipping_method: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Método de envío seleccionado'
    },
    shipping_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Costo de envío'
    },
    shipping_region: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Región de envío (Costa, Sierra, Oriente, Galápagos)'
    },
    
    // TOTAL
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total final de la orden'
    },
    
    // MONEDA
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      comment: 'Moneda (USD para Ecuador)'
    },
    
    // ESTADO DE LA ORDEN
    status: {
      type: DataTypes.ENUM(
        'pending',      // Pendiente de pago
        'paid',         // Pagada
        'processing',   // En proceso
        'shipped',      // Enviada
        'delivered',    // Entregada
        'cancelled',    // Cancelada
        'refunded'      // Reembolsada
      ),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Estado actual de la orden'
    },
    
    // ESTADO DE PAGO
    payment_status: {
      type: DataTypes.ENUM(
        'pending',      // Pendiente
        'completed',    // Completado
        'failed',       // Fallido
        'refunded',     // Reembolsado
        'partial_refund' // Reembolso parcial
      ),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Estado del pago'
    },
    
    // MÉTODO DE PAGO
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Método de pago usado'
    },
    
    // TRACKING
    tracking_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número de seguimiento del envío'
    },
    carrier: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Transportadora'
    },
    estimated_delivery_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha estimada de entrega'
    },
    
    // FECHAS IMPORTANTES
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de pago'
    },
    shipped_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de envío'
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de entrega'
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de cancelación'
    },
    
    // NOTAS
    customer_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas del cliente'
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas internas del admin'
    },
    
    // METADATA
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Datos adicionales'
    },
    
    // CUPÓN APLICADO
    applied_coupon_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Código de cupón usado'
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['order_number']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['payment_status']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['tracking_number']
      }
    ]
  });

  // Asociaciones
  Order.associate = (models) => {
    Order.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    Order.belongsTo(models.Address, {
      foreignKey: 'shipping_address_id',
      as: 'shippingAddress'
    });

    Order.hasMany(models.OrderItem, {
      foreignKey: 'order_id',
      as: 'items',
      onDelete: 'CASCADE'
    });

    Order.hasMany(models.Payment, {
      foreignKey: 'order_id',
      as: 'payments',
      onDelete: 'CASCADE'
    });
  };

  // Métodos de instancia
  Order.prototype.canBeCancelled = function() {
    return ['pending', 'paid', 'processing'].includes(this.status);
  };

  Order.prototype.canBeRefunded = function() {
    return this.status === 'paid' && this.payment_status === 'completed';
  };

  Order.prototype.calculateTotals = function() {
    // Subtotal - descuento
    const subtotalAfterDiscount = parseFloat(this.subtotal) - parseFloat(this.discount_amount);
    
    // Calcular IVA sobre subtotal después de descuento
    this.tax_amount = (subtotalAfterDiscount * parseFloat(this.tax_rate)).toFixed(2);
    
    // Total = (subtotal - descuento) + IVA + envío
    this.total = (
      subtotalAfterDiscount + 
      parseFloat(this.tax_amount) + 
      parseFloat(this.shipping_cost)
    ).toFixed(2);
    
    return {
      subtotal: parseFloat(this.subtotal),
      discount: parseFloat(this.discount_amount),
      subtotalAfterDiscount,
      taxRate: parseFloat(this.tax_rate),
      tax: parseFloat(this.tax_amount),
      shipping: parseFloat(this.shipping_cost),
      total: parseFloat(this.total)
    };
  };

  Order.prototype.toPublic = function() {
    return {
      id: this.id,
      orderNumber: this.order_number,
      userId: this.user_id,
      status: this.status,
      paymentStatus: this.payment_status,
      paymentMethod: this.payment_method,
      
      // Montos
      subtotal: parseFloat(this.subtotal),
      discountAmount: parseFloat(this.discount_amount),
      discountReason: this.discount_reason,
      taxRate: parseFloat(this.tax_rate),
      taxAmount: parseFloat(this.tax_amount),
      shippingCost: parseFloat(this.shipping_cost),
      total: parseFloat(this.total),
      currency: this.currency,
      
      // Contacto
      customerEmail: this.customer_email,
      customerPhone: this.customer_phone,
      
      // Envío
      shippingMethod: this.shipping_method,
      shippingRegion: this.shipping_region,
      shippingAddress: this.shipping_address_snapshot,
      trackingNumber: this.tracking_number,
      carrier: this.carrier,
      estimatedDeliveryDate: this.estimated_delivery_date,
      
      // Facturación
      billingInfo: this.billing_info_snapshot,
      
      // Fechas
      paidAt: this.paid_at,
      shippedAt: this.shipped_at,
      deliveredAt: this.delivered_at,
      cancelledAt: this.cancelled_at,
      createdAt: this.created_at,
      
      // Notas
      customerNotes: this.customer_notes,
      appliedCouponCode: this.applied_coupon_code
    };
  };

  // Hooks
  Order.beforeCreate(async (order) => {
    // Generar número de orden único
    if (!order.order_number) {
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      let orderNumber = `ORD-${dateStr}-${random}`;
      
      // Verificar unicidad
      let counter = 1;
      while (await Order.findOne({ where: { order_number: orderNumber } })) {
        orderNumber = `ORD-${dateStr}-${random}${counter}`;
        counter++;
      }
      
      order.order_number = orderNumber;
    }
  });

  Order.beforeUpdate(async (order) => {
    // Actualizar fechas según cambios de estado
    if (order.changed('status')) {
      if (order.status === 'shipped' && !order.shipped_at) {
        order.shipped_at = new Date();
      }
      if (order.status === 'delivered' && !order.delivered_at) {
        order.delivered_at = new Date();
      }
      if (order.status === 'cancelled' && !order.cancelled_at) {
        order.cancelled_at = new Date();
      }
    }
    
    if (order.changed('payment_status')) {
      if (order.payment_status === 'completed' && !order.paid_at) {
        order.paid_at = new Date();
        order.status = 'paid';
      }
    }
  });

  return Order;
};