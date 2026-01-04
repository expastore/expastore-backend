'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('billing_info', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tax_id: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      company_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      billing_address: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      billing_city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      billing_state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      billing_country: {
        type: Sequelize.STRING(2),
        defaultValue: 'EC'
      },
      billing_postal_code: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Índices
    await queryInterface.addIndex('billing_info', ['user_id'], {
      unique: true
    });
    await queryInterface.addIndex('billing_info', ['tax_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('billing_info');
  }
};