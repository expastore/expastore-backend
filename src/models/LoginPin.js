module.exports = (sequelize, DataTypes) => {
  const LoginPin = sequelize.define('LoginPin', {
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
      comment: 'Usuario al que pertenece el PIN'
    },
    pin_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'PIN hasheado con bcrypt'
    },
    type: {
      type: DataTypes.ENUM('activation', 'login', 'password_reset'),
      allowNull: false,
      defaultValue: 'login',
      comment: 'Tipo de PIN'
    },
    device_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Hash del dispositivo (solo para login)'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha de expiración del PIN'
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Cuándo se usó el PIN'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP desde donde se solicitó'
    }
  }, {
    tableName: 'login_pins',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['type']
      },
      {
        fields: ['device_hash']
      }
    ]
  });

  // Asociaciones
  LoginPin.associate = (models) => {
    LoginPin.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  // Métodos de instancia
  LoginPin.prototype.isExpired = function() {
    return new Date() > new Date(this.expires_at);
  };

  LoginPin.prototype.isUsed = function() {
    return this.used_at !== null;
  };

  LoginPin.prototype.markAsUsed = async function() {
    this.used_at = new Date();
    await this.save();
  };

  return LoginPin;
};