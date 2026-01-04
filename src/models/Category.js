module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: {
          args: [2, 100],
          msg: 'El nombre debe tener entre 2 y 100 caracteres'
        }
      },
      comment: 'Nombre de la categoría'
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        is: {
          args: /^[a-z0-9-]+$/,
          msg: 'El slug solo puede contener letras minúsculas, números y guiones'
        }
      },
      comment: 'URL-friendly name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción de la categoría'
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Categoría padre (para subcategorías)'
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Imagen de la categoría'
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Icono para mostrar (ej: lucide-icon-name)'
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Orden de visualización'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si la categoría está activa'
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si es categoría destacada'
    },
    meta_title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Título para SEO'
    },
    meta_description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Descripción para SEO'
    },
    meta_keywords: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Keywords para SEO'
    }
  }, {
    tableName: 'categories',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        fields: ['parent_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['display_order']
      }
    ]
  });

  // Asociaciones
  Category.associate = (models) => {
    // Categoría padre
    Category.belongsTo(Category, {
      foreignKey: 'parent_id',
      as: 'parent',
      onDelete: 'CASCADE'
    });

    // Subcategorías
    Category.hasMany(Category, {
      foreignKey: 'parent_id',
      as: 'children'
    });

    // Productos
    Category.hasMany(models.Product, {
      foreignKey: 'category_id',
      as: 'products'
    });
  };

  // Métodos de instancia
  Category.prototype.getFullPath = async function() {
    const path = [this.name];
    let current = this;
    
    while (current.parent_id) {
      current = await Category.findByPk(current.parent_id);
      if (current) path.unshift(current.name);
    }
    
    return path.join(' > ');
  };

  Category.prototype.toPublic = function() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      imageUrl: this.image_url,
      icon: this.icon,
      displayOrder: this.display_order,
      isFeatured: this.is_featured,
      parentId: this.parent_id
    };
  };

  // Hooks
  Category.beforeValidate(async (category) => {
    // Auto-generar slug si no existe
    if (!category.slug && category.name) {
      category.slug = category.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });

  Category.beforeUpdate(async (category) => {
    // Actualizar slug si cambió el nombre
    if (category.changed('name') && !category.changed('slug')) {
      category.slug = category.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });

  return Category;
};