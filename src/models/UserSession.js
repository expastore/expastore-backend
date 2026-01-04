module.exports = (sequelize, DataTypes) => {
  const UserSession = sequelize.define('UserSession', {
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
      comment: 'Usuario de la sesión'
    },
    device_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'Hash único del dispositivo'
    },
    device_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nombre descriptivo del dispositivo'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP de la sesión'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent del navegador'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si la sesión está activa'
    },
    last_activity: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Última actividad de la sesión'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Cuándo expira la sesión'
    }
  }, {
    tableName: 'user_sessions',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['device_hash']
      },
      {
        fields: ['is_active']
      },
      {
        unique: true,
        fields: ['user_id', 'device_hash']
      }
    ]
  });

  // Asociaciones
  UserSession.associate = (models) => {
    UserSession.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  // Métodos de instancia
  UserSession.prototype.updateActivity = async function() {
    this.last_activity = new Date();
    await this.save();
  };

  UserSession.prototype.deactivate = async function() {
    this.is_active = false;
    await this.save();
  };

  UserSession.prototype.isExpired = function() {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  };

  return UserSession;
};