module.exports = (sequelize, DataTypes) => {
  const ProductImage = sequelize.define('ProductImage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Producto al que pertenece'
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'URL de la imagen en Cloudinary'
    },
    cloudinary_public_id: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'ID público de Cloudinary para eliminación'
    },
    alt_text: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Texto alternativo para SEO y accesibilidad'
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Orden de visualización'
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si es la imagen principal'
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Ancho de la imagen en píxeles'
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Alto de la imagen en píxeles'
    },
    size_bytes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tamaño del archivo en bytes'
    }
  }, {
    tableName: 'product_images',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['product_id']
      },
      {
        fields: ['is_primary']
      },
      {
        fields: ['display_order']
      }
    ]
  });

  // Asociaciones
  ProductImage.associate = (models) => {
    ProductImage.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  // Hook: Solo una imagen puede ser primaria por producto
  ProductImage.beforeSave(async (image) => {
    if (image.is_primary && image.changed('is_primary')) {
      await ProductImage.update(
        { is_primary: false },
        {
          where: {
            product_id: image.product_id,
            id: { [sequelize.Sequelize.Op.ne]: image.id }
          }
        }
      );
    }
  });

  return ProductImage;
};