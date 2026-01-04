// src/migrations/20260104010000-create-orders.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      order_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'RESTRICT'
      },
      
      // Información de contacto
      customer_email: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      customer_phone: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      
      // Dirección de envío
      shipping_address_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'addresses',
          key: 'id'
        }
      },
      shipping_address_snapshot: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      
      // Facturación
      billing_info_snapshot: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      
      // Montos
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      discount_reason: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      
      // IVA Ecuador
      tax_rate: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
        defaultValue: 0.15
      },
      tax_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      
      // Envío
      shipping_method: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      shipping_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      shipping_region: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      
      // Total
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      
      // Estados
      status: {
        type: Sequelize.ENUM(
          'pending',
          'paid',
          'processing',
          'shipped',
          'delivered',
          'cancelled',
          'refunded'
        ),
        defaultValue: 'pending',
        allowNull: false
      },
      payment_status: {
        type: Sequelize.ENUM(
          'pending',
          'completed',
          'failed',
          'refunded',
          'partial_refund'
        ),
        defaultValue: 'pending',
        allowNull: false
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      
      // Tracking
      tracking_number: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      carrier: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      estimated_delivery_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Fechas importantes
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      shipped_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Notas
      customer_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Metadata
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      applied_coupon_code: {
        type: Sequelize.STRING(50),
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Crear índices
    await queryInterface.addIndex('orders', ['order_number'], {
      unique: true,
      name: 'orders_order_number_unique'
    });
    await queryInterface.addIndex('orders', ['user_id']);
    await queryInterface.addIndex('orders', ['status']);
    await queryInterface.addIndex('orders', ['payment_status']);
    await queryInterface.addIndex('orders', ['tracking_number']);
    await queryInterface.addIndex('orders', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('orders');
  }
};