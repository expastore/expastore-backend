// src/services/order.service.js
const { 
  Order, 
  OrderItem, 
  Payment,
  User, 
  Cart, 
  CartItem, 
  Product,
  ProductVariant,
  Address,
  BillingInfo,
  ShippingRate,
  sequelize 
} = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const ecuadorConstants = require('../utils/constants/ecuador.constants');
const cartService = require('./cart.service');

class OrderService {
  /**
   * Crear orden desde el carrito
   */
  async createOrderFromCart(userId, orderData) {
    const transaction = await sequelize.transaction();
    
    try {
      // 1. Obtener y validar carrito
      const cart = await Cart.findOne({
        where: { user_id: userId },
        include: [
          {
            model: CartItem,
            as: 'items',
            include: [
              { model: Product, as: 'product' },
              { model: ProductVariant, as: 'variant' }
            ]
          }
        ],
        transaction
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new Error(ecuadorConstants.ERROR_CODES.CART_EMPTY);
      }

      // 2. Validar disponibilidad de stock
      const stockValidation = await cartService.validateCart(userId);
      if (!stockValidation.valid) {
        const unavailable = stockValidation.items.filter(item => !item.available);
        throw new Error(`STOCK_UNAVAILABLE: ${unavailable.map(i => i.productName).join(', ')}`);
      }

      // 3. Obtener información del usuario
      const user = await User.findByPk(userId, {
        include: [
          { model: Address, as: 'addresses' },
          { model: BillingInfo, as: 'billingInfo' }
        ],
        transaction
      });

      // 4. Validar dirección de envío
      let shippingAddress;
      if (orderData.shippingAddressId) {
        shippingAddress = await Address.findOne({
          where: {
            id: orderData.shippingAddressId,
            user_id: userId
          },
          transaction
        });
      } else {
        shippingAddress = user.addresses.find(addr => addr.is_default);
      }

      if (!shippingAddress) {
        throw new Error(ecuadorConstants.ERROR_CODES.INVALID_SHIPPING_ADDRESS);
      }

      // 5. Calcular costos de envío
      const cartTotals = await cart.calculateTotals();
      const totalWeight = this.calculateTotalWeight(cart.items);
      
      const shippingOptions = await ShippingRate.calculateShippingCost(
        shippingAddress.state,
        cartTotals.subtotal,
        totalWeight
      );

      if (shippingOptions.length === 0) {
        throw new Error(ecuadorConstants.ERROR_CODES.NO_SHIPPING_AVAILABLE);
      }

      // Usar método de envío seleccionado o el primero disponible
      const selectedShipping = orderData.shippingMethod
        ? shippingOptions.find(opt => opt.method === orderData.shippingMethod)
        : shippingOptions[0];

      // 6. Calcular totales de la orden
      const subtotal = cartTotals.subtotal;
      const discountAmount = parseFloat(cart.discount_amount || 0);
      const shippingCost = parseFloat(selectedShipping.cost);
      
      // Obtener tasa de IVA actual
      const taxRate = ecuadorConstants.TAX.getCurrentRate();
      
      // Calcular impuestos sobre (subtotal - descuento)
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = parseFloat(ecuadorConstants.calculateTax(taxableAmount, taxRate));
      
      // Total = (subtotal - descuento) + IVA + envío
      const total = (taxableAmount + taxAmount + shippingCost).toFixed(2);

      // 7. Crear orden
      const order = await Order.create({
        user_id: userId,
        customer_email: user.email,
        customer_phone: orderData.customerPhone || user.phone,
        
        // Snapshots para historial
        shipping_address_id: shippingAddress.id,
        shipping_address_snapshot: {
          recipientName: shippingAddress.recipient_name,
          phone: shippingAddress.recipient_phone,
          addressLine1: shippingAddress.address_line1,
          addressLine2: shippingAddress.address_line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: shippingAddress.country,
          postalCode: shippingAddress.postal_code,
          notes: shippingAddress.notes
        },
        billing_info_snapshot: user.billingInfo ? {
          taxId: user.billingInfo.tax_id,
          companyName: user.billingInfo.company_name,
          billingAddress: user.billingInfo.billing_address,
          billingCity: user.billingInfo.billing_city,
          billingState: user.billingInfo.billing_state
        } : null,
        
        // Montos
        subtotal,
        discount_amount: discountAmount,
        discount_reason: cart.applied_coupon_code 
          ? `Cupón: ${cart.applied_coupon_code}` 
          : null,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        total,
        currency: ecuadorConstants.CURRENCY.CODE,
        
        // Envío
        shipping_method: selectedShipping.method,
        shipping_region: selectedShipping.region,
        
        // Estado
        status: ecuadorConstants.ORDER_STATUS.PENDING,
        payment_status: ecuadorConstants.PAYMENT_STATUS.PENDING,
        payment_method: orderData.paymentMethod || ecuadorConstants.PAYMENT_METHODS.PAYPAL,
        
        // Notas
        customer_notes: orderData.customerNotes,
        applied_coupon_code: cart.applied_coupon_code
      }, { transaction });

      logger.info('Orden creada', { 
        orderId: order.id, 
        orderNumber: order.order_number,
        userId 
      });

      // 8. Crear items de la orden
      const orderItems = [];
      for (const cartItem of cart.items) {
        const product = cartItem.product;
        const variant = cartItem.variant;
        
        const unitPrice = variant 
          ? parseFloat(variant.price || product.price)
          : parseFloat(product.price);
        
        const itemSubtotal = unitPrice * cartItem.quantity;
        const itemTaxAmount = parseFloat(ecuadorConstants.calculateTax(itemSubtotal, taxRate));
        const itemTotal = (itemSubtotal + itemTaxAmount).toFixed(2);

        const orderItem = await OrderItem.create({
          order_id: order.id,
          product_id: cartItem.product_id,
          product_variant_id: cartItem.product_variant_id,
          
          // Snapshot del producto
          product_snapshot: {
            name: product.name,
            sku: product.sku,
            slug: product.slug,
            mainImageUrl: product.main_image_url,
            variantName: variant?.name,
            variantOptions: variant?.options
          },
          
          quantity: cartItem.quantity,
          unit_price: unitPrice,
          subtotal: itemSubtotal,
          tax_rate: taxRate,
          tax_amount: itemTaxAmount,
          total: itemTotal
        }, { transaction });

        orderItems.push(orderItem);

        // 9. Reducir stock del producto
        await this.reduceProductStock(
          cartItem.product_id,
          cartItem.product_variant_id,
          cartItem.quantity,
          transaction
        );
      }

      // 10. Limpiar el carrito
      await CartItem.destroy({
        where: { cart_id: cart.id },
        transaction
      });

      await cart.update({
        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        total: 0,
        applied_coupon_code: null
      }, { transaction });

      await transaction.commit();

      logger.info('Orden completada exitosamente', {
        orderId: order.id,
        orderNumber: order.order_number,
        total: order.total
      });

      // Retornar orden completa
      return await this.getOrderById(userId, order.id);

    } catch (error) {
      await transaction.rollback();
      logger.error('Error creando orden', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Reducir stock de producto
   */
  async reduceProductStock(productId, variantId, quantity, transaction) {
    if (variantId) {
      const variant = await ProductVariant.findByPk(variantId, { transaction });
      if (variant && variant.manage_stock) {
        await variant.update({
          stock_quantity: variant.stock_quantity - quantity
        }, { transaction });
      }
    } else {
      const product = await Product.findByPk(productId, { transaction });
      if (product && product.manage_stock) {
        await product.update({
          stock_quantity: product.stock_quantity - quantity,
          sales_count: product.sales_count + quantity
        }, { transaction });
      }
    }
  }

  /**
   * Calcular peso total del carrito
   */
  calculateTotalWeight(cartItems) {
    return cartItems.reduce((total, item) => {
      const weight = item.product.weight || 0;
      return total + (parseFloat(weight) * item.quantity);
    }, 0);
  }

  /**
   * Obtener orden por ID
   */
  async getOrderById(userId, orderId) {
    const order = await Order.findOne({
      where: { 
        id: orderId,
        user_id: userId 
      },
      include: [
        {
          model: OrderItem,
          as: 'items'
        },
        {
          model: Payment,
          as: 'payments'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!order) {
      throw new Error(ecuadorConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    return this.formatOrderResponse(order);
  }

  /**
   * Obtener órdenes del usuario
   */
  async getUserOrders(userId, filters = {}) {
    const where = { user_id: userId };
    
    // Filtros opcionales
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.paymentStatus) {
      where.payment_status = filters.paymentStatus;
    }
    if (filters.fromDate) {
      where.created_at = { [Op.gte]: new Date(filters.fromDate) };
    }

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: OrderItem,
          as: 'items',
          limit: 5 // Solo primeros 5 items en listado
        }
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 20,
      offset: filters.offset || 0
    });

    return orders.map(order => this.formatOrderResponse(order, false));
  }

  /**
   * Cancelar orden
   */
  async cancelOrder(userId, orderId, reason) {
    const order = await Order.findOne({
      where: {
        id: orderId,
        user_id: userId
      }
    });

    if (!order) {
      throw new Error(ecuadorConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    if (!order.canBeCancelled()) {
      throw new Error(ecuadorConstants.ERROR_CODES.CANNOT_CANCEL_ORDER);
    }

    await order.update({
      status: ecuadorConstants.ORDER_STATUS.CANCELLED,
      admin_notes: `Cancelada por usuario. Razón: ${reason || 'No especificada'}`
    });

    // Restaurar stock
    await this.restoreOrderStock(orderId);

    logger.info('Orden cancelada', { orderId, userId, reason });

    return await this.getOrderById(userId, orderId);
  }

  /**
   * Restaurar stock de una orden
   */
  async restoreOrderStock(orderId) {
    const items = await OrderItem.findAll({
      where: { order_id: orderId }
    });

    for (const item of items) {
      if (item.product_variant_id) {
        await ProductVariant.increment(
          'stock_quantity',
          { 
            by: item.quantity,
            where: { id: item.product_variant_id }
          }
        );
      } else {
        await Product.increment(
          'stock_quantity',
          {
            by: item.quantity,
            where: { id: item.product_id }
          }
        );
      }
    }
  }

  /**
   * Formatear respuesta de orden
   */
  formatOrderResponse(order, includeAllDetails = true) {
    const response = {
      ...order.toPublic(),
      items: order.items ? order.items.map(item => item.toPublic()) : [],
      user: order.user ? {
        id: order.user.id,
        name: `${order.user.first_name} ${order.user.last_name}`,
        email: order.user.email
      } : null
    };

    if (includeAllDetails && order.payments) {
      response.payments = order.payments.map(payment => payment.toPublic());
    }

    return response;
  }

  /**
   * Obtener resumen de órdenes del usuario
   */
  async getOrdersSummary(userId) {
    const summary = await Order.findAll({
      where: { user_id: userId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total_amount']
      ],
      group: ['status']
    });

    return summary;
  }

  /**
   * Actualizar estado de orden (solo admin)
   */
  async updateOrderStatus(orderId, status, adminNotes = null) {
    const order = await Order.findByPk(orderId);
    
    if (!order) {
      throw new Error(ecuadorConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    await order.update({
      status,
      admin_notes: adminNotes || order.admin_notes
    });

    logger.info('Estado de orden actualizado', { orderId, newStatus: status });

    return order;
  }
}

module.exports = new OrderService();