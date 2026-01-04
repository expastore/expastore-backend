module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define('Address', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Usuario al que pertenece'
    },
    label: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Etiqueta: Casa, Oficina, etc.'
    },
    recipient_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre de quien recibe'
    },
    recipient_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Teléfono de contacto'
    },
    address_line1: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Calle principal y número'
    },
    address_line2: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Información adicional (edificio, piso, etc.)'
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Ciudad'
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Provincia/Estado'
    },
    country: {
      type: DataTypes.STRING(2),
      defaultValue: 'EC',
      comment: 'Código ISO del país'
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Código postal'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si es la dirección por defecto'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      comment: 'Latitud para mapas'
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Longitud para mapas'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Referencias adicionales para encontrar'
    }
  }, {
    tableName: 'addresses',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['is_default']
      }
    ]
  });

  // Asociaciones
  Address.associate = (models) => {
    Address.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  // Hook: solo una dirección puede ser default por usuario
  Address.beforeSave(async (address) => {
    if (address.is_default && address.changed('is_default')) {
      await Address.update(
        { is_default: false },
        {
          where: {
            user_id: address.user_id,
            id: { [sequelize.Sequelize.Op.ne]: address.id }
          }
        }
      );
    }
  });

  return Address;
};