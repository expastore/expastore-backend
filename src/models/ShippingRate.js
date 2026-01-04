// src/models/ShippingRate.js
module.exports = (sequelize, DataTypes) => {
  const ShippingRate = sequelize.define('ShippingRate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // REGIÓN DE ECUADOR
    region: {
      type: DataTypes.ENUM('costa', 'sierra', 'oriente', 'galapagos', 'insular'),
      allowNull: false,
      comment: 'Región de Ecuador'
    },
    
    // PROVINCIAS INCLUIDAS
    provinces: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      comment: 'Provincias de Ecuador incluidas en esta tarifa'
    },
    
    // MÉTODO DE ENVÍO
    method: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Método de envío (Standard, Express, etc.)'
    },
    
    // COSTOS
    base_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Costo base de envío'
    },
    cost_per_kg: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Costo adicional por kg'
    },
    
    // ENVÍO GRATIS
    free_shipping_threshold: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monto mínimo para envío gratis'
    },
    
    // TIEMPO DE ENTREGA
    min_delivery_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Días mínimos de entrega'
    },
    max_delivery_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Días máximos de entrega'
    },
    
    // RESTRICCIONES
    min_weight_kg: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      comment: 'Peso mínimo en kg'
    },
    max_weight_kg: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      comment: 'Peso máximo en kg'
    },
    
    // ESTADO
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si la tarifa está activa'
    },
    
    // DESCRIPCIÓN
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción del método de envío'
    },
    
    // PRIORIDAD (para ordenar opciones)
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Orden de prioridad (menor = más prioritario)'
    }
  }, {
    tableName: 'shipping_rates',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['region']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['priority']
      }
    ]
  });

  // Métodos de clase
  ShippingRate.calculateShippingCost = async function(province, subtotal, totalWeight = 0) {
    // Buscar tarifas activas para la provincia
    const rates = await ShippingRate.findAll({
      where: {
        is_active: true,
        provinces: {
          [sequelize.Sequelize.Op.contains]: [province]
        }
      },
      order: [['priority', 'ASC']]
    });

    if (rates.length === 0) {
      throw new Error('NO_SHIPPING_AVAILABLE');
    }

    const options = rates.map(rate => {
      let cost = parseFloat(rate.base_cost);
      
      // Agregar costo por peso
      if (totalWeight > 0 && rate.cost_per_kg > 0) {
        cost += parseFloat(rate.cost_per_kg) * totalWeight;
      }
      
      // Verificar envío gratis
      if (rate.free_shipping_threshold && subtotal >= parseFloat(rate.free_shipping_threshold)) {
        cost = 0;
      }
      
      // Verificar restricciones de peso
      let isAvailable = true;
      if (rate.min_weight_kg && totalWeight < parseFloat(rate.min_weight_kg)) {
        isAvailable = false;
      }
      if (rate.max_weight_kg && totalWeight > parseFloat(rate.max_weight_kg)) {
        isAvailable = false;
      }
      
      return {
        id: rate.id,
        method: rate.method,
        region: rate.region,
        cost: cost.toFixed(2),
        isFree: cost === 0,
        estimatedDays: `${rate.min_delivery_days}-${rate.max_delivery_days}`,
        description: rate.description,
        isAvailable
      };
    });

    return options.filter(opt => opt.isAvailable);
  };

  // Métodos de instancia
  ShippingRate.prototype.calculateCost = function(subtotal, weight = 0) {
    let cost = parseFloat(this.base_cost);
    
    // Agregar costo por peso
    if (weight > 0 && this.cost_per_kg > 0) {
      cost += parseFloat(this.cost_per_kg) * weight;
    }
    
    // Verificar envío gratis
    if (this.free_shipping_threshold && subtotal >= parseFloat(this.free_shipping_threshold)) {
      cost = 0;
    }
    
    return cost.toFixed(2);
  };

  ShippingRate.prototype.isAvailableForWeight = function(weight) {
    if (this.min_weight_kg && weight < parseFloat(this.min_weight_kg)) {
      return false;
    }
    if (this.max_weight_kg && weight > parseFloat(this.max_weight_kg)) {
      return false;
    }
    return true;
  };

  return ShippingRate;
};