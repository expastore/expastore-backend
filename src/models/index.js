// src/models/index.js
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Importar modelos de autenticación
const User = require('./User')(sequelize, DataTypes);
const LoginPin = require('./LoginPin')(sequelize, DataTypes);
const UserSession = require('./UserSession')(sequelize, DataTypes);
const BillingInfo = require('./BillingInfo')(sequelize, DataTypes);
const Address = require('./Address')(sequelize, DataTypes);

// Importar modelos de productos
const Category = require('./Category')(sequelize, DataTypes);
const Product = require('./Product')(sequelize, DataTypes);
const ProductImage = require('./ProductImage')(sequelize, DataTypes);
const ProductVariant = require('./ProductVariant')(sequelize, DataTypes);

// Importar modelos de carrito
const Cart = require('./Cart')(sequelize, DataTypes);
const CartItem = require('./CartItem')(sequelize, DataTypes);

// Importar modelos de órdenes y pagos
const Order = require('./Order')(sequelize, DataTypes);
const OrderItem = require('./OrderItem')(sequelize, DataTypes);
const Payment = require('./Payment')(sequelize, DataTypes);
const ShippingRate = require('./ShippingRate')(sequelize, DataTypes);

// Objeto que contiene todos los modelos
const models = {
  User,
  LoginPin,
  UserSession,
  BillingInfo,
  Address,
  Category,
  Product,
  ProductImage,
  ProductVariant,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Payment,
  ShippingRate
};

// Ejecutar asociaciones si existen
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Exportar modelos y sequelize
module.exports = {
  ...models,
  sequelize
};