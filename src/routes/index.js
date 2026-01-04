const express = require('express');
const router = express.Router();

// Importar rutas
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');

/**
 * API Routes v1
 */

// Autenticación
router.use('/auth', authRoutes);

// Usuarios
router.use('/users', userRoutes);
// Categorías
router.use('/categories', categoryRoutes);

// Productos
router.use('/products', productRoutes);

// Carrito
router.use('/cart', cartRoutes);

// Ordenes
router.use('/orders', orderRoutes);

// Pagos
router.use('/payments', orderRoutes); 

// Ruta de información de la API
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Expastore API v1',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /auth/register',
        activate: 'POST /auth/activate',
        requestLoginPin: 'POST /auth/login/request-pin',
        verifyLoginPin: 'POST /auth/login/verify-pin',
        refresh: 'POST /auth/refresh',
        logout: 'POST /auth/logout',
        logoutAll: 'POST /auth/logout-all',
        sessions: 'GET /auth/sessions',
        check: 'GET /auth/check'
      },
      users: {
        profile: 'GET /users/me',
        updateProfile: 'PATCH /users/me',
        deleteAccount: 'DELETE /users/me',
        addresses: 'GET /users/me/addresses',
        createAddress: 'POST /users/me/addresses',
        billingInfo: 'GET /users/me/billing-info'
      },
       categories: {
        list: 'GET /categories',
        listFlat: 'GET /categories/flat',
        featured: 'GET /categories/featured',
        getByIdOrSlug: 'GET /categories/:id',
        getProducts: 'GET /categories/:id/products',
        create: 'POST /categories',
        update: 'PATCH /categories/:id',
        delete: 'DELETE /categories/:id'
      },
      products: {
        list: 'GET /products',
        featured: 'GET /products/featured',
        getByIdOrSlug: 'GET /products/:id',
        create: 'POST /products',
        update: 'PATCH /products/:id',
        delete: 'DELETE /products/:id',
        uploadImages: 'POST /products/:id/images',
        deleteImage: 'DELETE /products/:productId/images/:imageId',
        createVariant: 'POST /products/:id/variants'
      },
      cart: {
        get: 'GET /cart',
        count: 'GET /cart/count',
        addItem: 'POST /cart/items',
        updateItem: 'PATCH /cart/items/:itemId',
        removeItem: 'DELETE /cart/items/:itemId',
        clear: 'DELETE /cart',
        validate: 'POST /cart/validate',
        merge: 'POST /cart/merge',
        applyCoupon: 'POST /cart/coupon',
        removeCoupon: 'DELETE /cart/coupon'
      }
    },
    documentation: '/api/docs'
  });
});

module.exports = router;