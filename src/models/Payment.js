// src/models/Payment.js
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
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
      comment: 'Orden asociada al pago'
    },
    
    // IDENTIFICADORES EXTERNOS
    payment_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID del pago en el proveedor (PayPal, etc.)'
    },
    transaction_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID de transacción'
    },
    
    // PROVEEDOR
    provider: {
      type: DataTypes.ENUM('paypal', 'stripe', 'bank_transfer', 'cash'),
      allowNull: false,
      comment: 'Proveedor de pago'
    },
    
    // MÉTODO
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Método específico (paypal, card, etc.)'
    },
    
    // MONTOS
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monto pagado'
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      comment: 'Moneda del pago'
    },
    
    // FEES (comisiones del proveedor)
    fee_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Comisión cobrada por el proveedor'
    },
    net_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monto neto recibido (amount - fee)'
    },
    
    // ESTADO
    status: {
      type: DataTypes.ENUM(
        'pending',      // Pendiente
        'processing',   // Procesando
        'completed',    // Completado
        'failed',       // Fallido
        'cancelled',    // Cancelado
        'refunded',     // Reembolsado
        'partial_refund' // Reembolso parcial
      ),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Estado del pago'
    },
    
    // INFORMACIÓN DEL PAGADOR (si aplica)
    payer_email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Email del pagador'
    },
    payer_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Nombre del pagador'
    },
    payer_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID del pagador en el proveedor'
    },
    
    // REEMBOLSO
    refund_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID del reembolso'
    },
    refunded_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Monto reembolsado'
    },
    refund_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Razón del reembolso'
    },
    refunded_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha del reembolso'
    },
    
    // METADATA
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Datos adicionales del pago (respuesta completa del proveedor)'
    },
    
    // ERROR
    error_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Código de error si falló'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensaje de error'
    },
    
    // FECHAS
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de procesamiento'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de completación'
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['order_id']
      },
      {
        fields: ['payment_id']
      },
      {
        fields: ['transaction_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['provider']
      }
    ]
  });

  // Asociaciones
  Payment.associate = (models) => {
    Payment.belongsTo(models.Order, {
      foreignKey: 'order_id',
      as: 'order'
    });
  };

  // Métodos de instancia
  Payment.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  Payment.prototype.canBeRefunded = function() {
    return this.status === 'completed' && 
           parseFloat(this.refunded_amount) < parseFloat(this.amount);
  };

  Payment.prototype.getRemainingRefundableAmount = function() {
    const total = parseFloat(this.amount);
    const refunded = parseFloat(this.refunded_amount);
    return (total - refunded).toFixed(2);
  };

  Payment.prototype.toPublic = function() {
    return {
      id: this.id,
      orderId: this.order_id,
      paymentId: this.payment_id,
      transactionId: this.transaction_id,
      provider: this.provider,
      paymentMethod: this.payment_method,
      amount: parseFloat(this.amount),
      currency: this.currency,
      feeAmount: parseFloat(this.fee_amount),
      netAmount: parseFloat(this.net_amount),
      status: this.status,
      payerEmail: this.payer_email,
      payerName: this.payer_name,
      refundedAmount: parseFloat(this.refunded_amount),
      refundReason: this.refund_reason,
      refundedAt: this.refunded_at,
      processedAt: this.processed_at,
      completedAt: this.completed_at,
      createdAt: this.created_at
    };
  };

  // Hooks
  Payment.beforeUpdate(async (payment) => {
    // Actualizar fechas según estado
    if (payment.changed('status')) {
      if (payment.status === 'completed' && !payment.completed_at) {
        payment.completed_at = new Date();
      }
      if (['completed', 'failed'].includes(payment.status) && !payment.processed_at) {
        payment.processed_at = new Date();
      }
    }
  });

  return Payment;
};