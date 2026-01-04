module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'ID único del usuario'
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: {
          args: [2, 50],
          msg: 'El nombre debe tener entre 2 y 50 caracteres'
        },
        notEmpty: {
          msg: 'El nombre no puede estar vacío'
        }
      },
      comment: 'Nombre del usuario'
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: {
          args: [2, 50],
          msg: 'El apellido debe tener entre 2 y 50 caracteres'
        }
      },
      comment: 'Apellido del usuario'
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        msg: 'Este email ya está registrado'
      },
      validate: {
        isEmail: {
          msg: 'Debe ser un email válido'
        }
      },
      comment: 'Email único del usuario'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si la cuenta está activada'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^[0-9\-\+\(\)\s]{9,20}$/,
          msg: 'Formato de teléfono inválido'
        }
      },
      comment: 'Teléfono de contacto'
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL de la foto de perfil'
    },
    role: {
      type: DataTypes.ENUM('customer', 'admin', 'vendor'),
      defaultValue: 'customer',
      allowNull: false,
      comment: 'Rol del usuario en el sistema'
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        newsletter: true,
        notifications: true,
        language: 'es',
        currency: 'USD',
        theme: 'light'
      },
      comment: 'Preferencias del usuario'
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última vez que inició sesión'
    },
    login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Intentos fallidos de login'
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha hasta la que está bloqueada la cuenta'
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Cuándo se verificó el email'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['role']
      }
    ]
  });

  // Asociaciones
  User.associate = (models) => {
    // Un usuario tiene un registro de facturación
    User.hasOne(models.BillingInfo, {
      foreignKey: 'user_id',
      as: 'billingInfo',
      onDelete: 'CASCADE'
    });

    // Un usuario tiene múltiples direcciones
    User.hasMany(models.Address, {
      foreignKey: 'user_id',
      as: 'addresses',
      onDelete: 'CASCADE'
    });

    // Un usuario tiene múltiples sesiones
    User.hasMany(models.UserSession, {
      foreignKey: 'user_id',
      as: 'sessions',
      onDelete: 'CASCADE'
    });

    // Un usuario tiene múltiples PINs de login
    User.hasMany(models.LoginPin, {
      foreignKey: 'user_id',
      as: 'loginPins',
      onDelete: 'CASCADE'
    });
  };

  // Métodos de instancia
  User.prototype.toSafeObject = function() {
    return {
      id: this.id,
      firstName: this.first_name,
      lastName: this.last_name,
      email: this.email,
      phone: this.phone,
      avatarUrl: this.avatar_url,
      role: this.role,
      isActive: this.is_active,
      preferences: this.preferences,
      lastLogin: this.last_login,
      createdAt: this.created_at
    };
  };

  User.prototype.isAccountLocked = function() {
    if (!this.locked_until) return false;
    return new Date() < new Date(this.locked_until);
  };

  User.prototype.getFullName = function() {
    return `${this.first_name} ${this.last_name}`;
  };

  return User;
};