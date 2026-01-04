const { Cart, CartItem, Product, ProductVariant, ProductImage } = require('../models');
const productService = require('./product.service');
const logger = require('../utils/logger');

class CartService {
  /**
   * Obtener o crear carrito del usuario
   */
  async getOrCreateCart(userId) {
    let cart = await Cart.findOne({
      where: { user_id: userId },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              include: [
                {
                  model: ProductImage,
                  as: 'images',
                  where: { is_primary: true },
                  required: false,
                  limit: 1
                }
              ]
            },
            {
              model: ProductVariant,
              as: 'variant',
              required: false
            }
          ]
        }
      ]
    });

    if (!cart) {
      cart = await Cart.create({ user_id: userId });
      logger.info('Carrito creado', { userId, cartId: cart.id });
    }

    return cart;
  }

  /**
   * Agregar producto al carrito
   */
  async addItem(userId, productId, quantity = 1, variantId = null) {
    const cart = await this.getOrCreateCart(userId);

    // Verificar que el producto existe y está activo
    const product = await Product.findByPk(productId);
    if (!product || !product.is_active) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    // Verificar stock
    const stockCheck = await productService.checkStockAvailability(
      productId,
      quantity,
      variantId
    );

    if (!stockCheck.available) {
      throw new Error(stockCheck.reason);
    }

    // Determinar precio
    let price = parseFloat(product.price);
    if (variantId) {
      const variant = await ProductVariant.findByPk(variantId);
      if (!variant || !variant.is_active) {
        throw new Error('VARIANT_NOT_FOUND');
      }
      price = parseFloat(variant.price || product.price);
    }

    // Buscar si ya existe el item
    const existingItem = await CartItem.findOne({
      where: {
        cart_id: cart.id,
        product_id: productId,
        product_variant_id: variantId
      }
    });

    let item;
    if (existingItem) {
      // Actualizar cantidad
      const newQuantity = existingItem.quantity + quantity;
      
      // Verificar stock para nueva cantidad
      const newStockCheck = await productService.checkStockAvailability(
        productId,
        newQuantity,
        variantId
      );

      if (!newStockCheck.available) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      item = await existingItem.update({ quantity: newQuantity });
      logger.info('Item del carrito actualizado', {
        cartId: cart.id,
        productId,
        newQuantity
      });
    } else {
      // Crear nuevo item
      item = await CartItem.create({
        cart_id: cart.id,
        product_id: productId,
        product_variant_id: variantId,
        quantity,
        price_at_addition: price
      });
      logger.info('Item agregado al carrito', {
        cartId: cart.id,
        productId,
        quantity
      });
    }

    return item;
  }

  /**
   * Actualizar cantidad de un item
   */
  async updateItemQuantity(userId, itemId, quantity) {
    if (quantity < 1) {
      throw new Error('INVALID_QUANTITY');
    }

    const cart = await this.getOrCreateCart(userId);
    
    const item = await CartItem.findOne({
      where: {
        id: itemId,
        cart_id: cart.id
      }
    });

    if (!item) {
      throw new Error('ITEM_NOT_FOUND');
    }

    // Verificar stock para nueva cantidad
    const stockCheck = await productService.checkStockAvailability(
      item.product_id,
      quantity,
      item.product_variant_id
    );

    if (!stockCheck.available) {
      throw new Error(stockCheck.reason);
    }

    await item.update({ quantity });

    logger.info('Cantidad de item actualizada', {
      cartId: cart.id,
      itemId,
      newQuantity: quantity
    });

    return item;
  }

  /**
   * Eliminar item del carrito
   */
  async removeItem(userId, itemId) {
    const cart = await this.getOrCreateCart(userId);
    
    const item = await CartItem.findOne({
      where: {
        id: itemId,
        cart_id: cart.id
      }
    });

    if (!item) {
      throw new Error('ITEM_NOT_FOUND');
    }

    await item.destroy();

    logger.info('Item eliminado del carrito', {
      cartId: cart.id,
      itemId
    });

    return true;
  }

  /**
   * Limpiar todo el carrito
   */
  async clearCart(userId) {
    const cart = await this.getOrCreateCart(userId);

    await CartItem.destroy({
      where: { cart_id: cart.id }
    });

    await cart.update({
      subtotal: 0,
      discount_amount: 0,
      tax_amount: 0,
      total: 0,
      applied_coupon_code: null
    });

    logger.info('Carrito limpiado', { cartId: cart.id, userId });

    return cart;
  }

  /**
   * Obtener carrito completo con items
   */
  async getCart(userId) {
    const cart = await this.getOrCreateCart(userId);

    const items = await CartItem.findAll({
      where: { cart_id: cart.id },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            {
              model: ProductImage,
              as: 'images',
              where: { is_primary: true },
              required: false,
              limit: 1
            }
          ]
        },
        {
          model: ProductVariant,
          as: 'variant',
          required: false
        }
      ]
    });

    // Formatear items
    const formattedItems = await Promise.all(
      items.map(item => item.toPublic())
    );

    // Recalcular totales
    await cart.calculateTotals();

    return {
      cart: cart.toPublic(),
      items: formattedItems,
      itemsCount: await cart.getItemsCount()
    };
  }

  /**
   * Validar disponibilidad de todos los items del carrito
   */
  async validateCart(userId) {
    const cart = await this.getOrCreateCart(userId);
    
    const items = await CartItem.findAll({
      where: { cart_id: cart.id },
      include: [
        { model: Product, as: 'product' },
        { model: ProductVariant, as: 'variant' }
      ]
    });

    const validationResults = [];

    for (const item of items) {
      const stockCheck = await productService.checkStockAvailability(
        item.product_id,
        item.quantity,
        item.product_variant_id
      );

      validationResults.push({
        itemId: item.id,
        productId: item.product_id,
        productName: item.product.name,
        quantity: item.quantity,
        available: stockCheck.available,
        reason: stockCheck.reason,
        maxQuantity: stockCheck.available_quantity
      });
    }

    const allValid = validationResults.every(r => r.available);

    return {
      valid: allValid,
      items: validationResults
    };
  }

  /**
   * Fusionar carrito temporal (de localStorage) con carrito del usuario
   */
  async mergeCart(userId, tempCartItems) {
    if (!tempCartItems || tempCartItems.length === 0) {
      return await this.getCart(userId);
    }

    const cart = await this.getOrCreateCart(userId);

    for (const tempItem of tempCartItems) {
      try {
        await this.addItem(
          userId,
          tempItem.productId,
          tempItem.quantity,
          tempItem.variantId
        );
      } catch (error) {
        logger.warn('Error fusionando item del carrito temporal', {
          userId,
          productId: tempItem.productId,
          error: error.message
        });
      }
    }

    logger.info('Carrito temporal fusionado', {
      userId,
      tempItemsCount: tempCartItems.length
    });

    return await this.getCart(userId);
  }

  /**
   * Aplicar cupón de descuento
   */
  async applyCoupon(userId, couponCode) {
    const cart = await this.getOrCreateCart(userId);

    // TODO: Implementar lógica de cupones en el módulo de cupones
    // Por ahora, solo guardamos el código
    
    await cart.update({
      applied_coupon_code: couponCode,
      discount_amount: 0 // Calcular según el cupón
    });

    await cart.calculateTotals();

    logger.info('Cupón aplicado al carrito', {
      cartId: cart.id,
      couponCode
    });

    return cart;
  }

  /**
   * Remover cupón
   */
  async removeCoupon(userId) {
    const cart = await this.getOrCreateCart(userId);

    await cart.update({
      applied_coupon_code: null,
      discount_amount: 0
    });

    await cart.calculateTotals();

    logger.info('Cupón removido del carrito', { cartId: cart.id });

    return cart;
  }

  /**
   * Limpiar carritos abandonados (más de 30 días)
   */
  async cleanAbandonedCarts() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const abandonedCarts = await Cart.findAll({
      where: {
        last_activity: {
          [require('sequelize').Op.lt]: thirtyDaysAgo
        }
      }
    });

    let deletedCount = 0;

    for (const cart of abandonedCarts) {
      // Eliminar items primero
      await CartItem.destroy({
        where: { cart_id: cart.id },
        force: true // Hard delete
      });

      // Eliminar carrito
      await cart.destroy({ force: true });
      deletedCount++;
    }

    logger.info('Carritos abandonados limpiados', { count: deletedCount });

    return deletedCount;
  }
}

module.exports = new CartService();