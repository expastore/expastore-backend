// src/seeders/20260104000001-shipping-rates-ecuador.js
'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    await queryInterface.bulkInsert('shipping_rates', [
      // ===== COSTA =====
      {
        id: uuidv4(),
        region: 'costa',
        provinces: [
          'Guayas',
          'Manabí',
          'El Oro',
          'Los Ríos',
          'Esmeraldas',
          'Santa Elena',
          'Santo Domingo de los Tsáchilas'
        ],
        method: 'Standard',
        base_cost: 3.50,
        cost_per_kg: 0.50,
        free_shipping_threshold: 50.00,
        min_delivery_days: 3,
        max_delivery_days: 5,
        min_weight_kg: null,
        max_weight_kg: 30,
        is_active: true,
        description: 'Envío estándar a la Costa ecuatoriana',
        priority: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        region: 'costa',
        provinces: [
          'Guayas',
          'Manabí',
          'El Oro',
          'Los Ríos',
          'Esmeraldas',
          'Santa Elena',
          'Santo Domingo de los Tsáchilas'
        ],
        method: 'Express',
        base_cost: 6.00,
        cost_per_kg: 0.75,
        free_shipping_threshold: 100.00,
        min_delivery_days: 1,
        max_delivery_days: 2,
        min_weight_kg: null,
        max_weight_kg: 20,
        is_active: true,
        description: 'Envío express a la Costa (1-2 días)',
        priority: 2,
        created_at: now,
        updated_at: now
      },
      
      // ===== SIERRA =====
      {
        id: uuidv4(),
        region: 'sierra',
        provinces: [
          'Pichincha',
          'Azuay',
          'Tungurahua',
          'Imbabura',
          'Loja',
          'Chimborazo',
          'Cotopaxi',
          'Bolívar',
          'Cañar',
          'Carchi'
        ],
        method: 'Standard',
        base_cost: 3.00,
        cost_per_kg: 0.45,
        free_shipping_threshold: 50.00,
        min_delivery_days: 3,
        max_delivery_days: 5,
        min_weight_kg: null,
        max_weight_kg: 30,
        is_active: true,
        description: 'Envío estándar a la Sierra ecuatoriana',
        priority: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        region: 'sierra',
        provinces: [
          'Pichincha',
          'Azuay',
          'Tungurahua',
          'Imbabura',
          'Loja',
          'Chimborazo',
          'Cotopaxi',
          'Bolívar',
          'Cañar',
          'Carchi'
        ],
        method: 'Express',
        base_cost: 5.50,
        cost_per_kg: 0.70,
        free_shipping_threshold: 100.00,
        min_delivery_days: 1,
        max_delivery_days: 2,
        min_weight_kg: null,
        max_weight_kg: 20,
        is_active: true,
        description: 'Envío express a la Sierra (1-2 días)',
        priority: 2,
        created_at: now,
        updated_at: now
      },
      
      // ===== ORIENTE (AMAZONIA) =====
      {
        id: uuidv4(),
        region: 'oriente',
        provinces: [
          'Sucumbíos',
          'Orellana',
          'Napo',
          'Pastaza',
          'Morona Santiago',
          'Zamora Chinchipe'
        ],
        method: 'Standard',
        base_cost: 5.00,
        cost_per_kg: 0.80,
        free_shipping_threshold: 75.00,
        min_delivery_days: 5,
        max_delivery_days: 7,
        min_weight_kg: null,
        max_weight_kg: 25,
        is_active: true,
        description: 'Envío estándar a la Amazonía ecuatoriana',
        priority: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        region: 'oriente',
        provinces: [
          'Sucumbíos',
          'Orellana',
          'Napo',
          'Pastaza',
          'Morona Santiago',
          'Zamora Chinchipe'
        ],
        method: 'Express',
        base_cost: 8.00,
        cost_per_kg: 1.00,
        free_shipping_threshold: 150.00,
        min_delivery_days: 3,
        max_delivery_days: 4,
        min_weight_kg: null,
        max_weight_kg: 15,
        is_active: true,
        description: 'Envío express a la Amazonía (3-4 días)',
        priority: 2,
        created_at: now,
        updated_at: now
      },
      
      // ===== GALÁPAGOS =====
      {
        id: uuidv4(),
        region: 'galapagos',
        provinces: ['Galápagos'],
        method: 'Aéreo Standard',
        base_cost: 25.00,
        cost_per_kg: 5.00,
        free_shipping_threshold: 200.00,
        min_delivery_days: 7,
        max_delivery_days: 10,
        min_weight_kg: null,
        max_weight_kg: 10,
        is_active: true,
        description: 'Envío aéreo a Galápagos (restricciones especiales)',
        priority: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        region: 'galapagos',
        provinces: ['Galápagos'],
        method: 'Aéreo Express',
        base_cost: 40.00,
        cost_per_kg: 7.00,
        free_shipping_threshold: 300.00,
        min_delivery_days: 4,
        max_delivery_days: 6,
        min_weight_kg: null,
        max_weight_kg: 8,
        is_active: true,
        description: 'Envío aéreo express a Galápagos',
        priority: 2,
        created_at: now,
        updated_at: now
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('shipping_rates', null, {});
  }
};