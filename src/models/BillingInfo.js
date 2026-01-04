module.exports = (sequelize, DataTypes) => {
  const BillingInfo = sequelize.define('BillingInfo', {
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
      comment: 'Usuario al que pertenece'
    },
    tax_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'RUC o cédula para facturación'
    },
    company_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Nombre de la empresa (si aplica)'
    },
    billing_address: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Dirección de facturación'
    },
    billing_city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Ciudad de facturación'
    },
    billing_state: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Provincia/Estado'
    },
    billing_country: {
      type: DataTypes.STRING(2),
      defaultValue: 'EC',
      comment: 'Código ISO del país'
    },
    billing_postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Código postal'
    }
  }, {
    tableName: 'billing_info',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['tax_id']
      }
    ]
  });

  // Asociaciones
  BillingInfo.associate = (models) => {
    BillingInfo.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return BillingInfo;
};