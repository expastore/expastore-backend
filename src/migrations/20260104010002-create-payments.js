// src/migrations/20260104010002-create-payments.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tabla de pagos
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      
      // IDs externos
      payment_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      transaction_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      
      // Proveedor
      provider: {
        type: Sequelize.ENUM('paypal', 'stripe', 'bank_transfer', 'cash'),
        allowNull: false
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      
      // Montos
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      fee_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      net_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      
      // Estado
      status: {
        type: Sequelize.ENUM(
          'pending',
          'processing',
          'completed',
          'failed',
          'cancelled',
          'refunded',
          'partial_refund'
        ),
        defaultValue: 'pending',
        allowNull: false
      },
      
      // Info del pagador
      payer_email: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      payer_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      payer_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      
      // Reembolso
      refund_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      refunded_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      refund_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      refunded_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Metadata
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      
      // Errores
      error_code: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Fechas
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Índices para payments
    await queryInterface.addIndex('payments', ['order_id']);
    await queryInterface.addIndex('payments', ['payment_id']);
    await queryInterface.addIndex('payments', ['transaction_id']);
    await queryInterface.addIndex('payments', ['status']);
    await queryInterface.addIndex('payments', ['provider']);

    // Tabla de tarifas de envío
    await queryInterface.createTable('shipping_rates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      region: {
        type: Sequelize.ENUM('costa', 'sierra', 'oriente', 'galapagos', 'insular'),
        allowNull: false
      },
      provinces: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false
      },
      method: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      base_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      cost_per_kg: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      free_shipping_threshold: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      min_delivery_days: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      max_delivery_days: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      min_weight_kg: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true
      },
      max_weight_kg: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Índices para shipping_rates
    await queryInterface.addIndex('shipping_rates', ['region']);
    await queryInterface.addIndex('shipping_rates', ['is_active']);
    await queryInterface.addIndex('shipping_rates', ['priority']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('shipping_rates');
  }
};