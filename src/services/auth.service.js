const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, LoginPin, UserSession } = require('../models');
const emailService = require('./email.service');
const tokenService = require('./token.service');
const { setEx, get, incr, expire, del } = require('../config/redis');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutos
    this.MAX_ATTEMPTS = 5;
    this.PIN_LENGTH = parseInt(process.env.PIN_LENGTH) || 6;
    this.ACTIVATION_PIN_EXPIRY = 10 * 60 * 1000; // 10 minutos
    this.LOGIN_PIN_EXPIRY = 5 * 60 * 1000; // 5 minutos
    this.BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
  }

  /**
   * REGISTRO DE USUARIO
   */
  async register(userData) {
    try {
      // Verificar si el email ya existe
      const existingUser = await User.findOne({
        where: { email: userData.email },
        paranoid: false // Incluir usuarios eliminados
      });

      if (existingUser) {
        if (existingUser.is_active) {
          throw new Error('EMAIL_ALREADY_REGISTERED');
        }
        // Si existe pero no está activo, reactivar
        if (existingUser.deleted_at) {
          await existingUser.restore();
        }
        await existingUser.update({ 
          is_active: false,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone
        });
        
        await this.sendActivationPin(existingUser.email);
        return {
          success: true,
          message: 'PIN de activación reenviado',
          userId: existingUser.id
        };
      }

      // Crear nuevo usuario inactivo
      const user = await User.create({
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        is_active: false
      });

      // Enviar PIN de activación
      await this.sendActivationPin(user.email);

      logger.info('Usuario registrado', { userId: user.id, email: user.email });

      return {
        success: true,
        message: 'Usuario registrado. Verifica tu email para activar la cuenta.',
        userId: user.id
      };

    } catch (error) {
      logger.error('Error en registro', { error: error.message });
      throw error;
    }
  }

  /**
   * ENVIAR PIN DE ACTIVACIÓN
   */
  async sendActivationPin(email) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Verificar rate limiting
    const rateLimitKey = `activation_pin:${user.id}`;
    const attempts = await get(rateLimitKey);
    if (attempts && parseInt(attempts) >= 3) {
      throw new Error('TOO_MANY_PIN_REQUESTS');
    }

    // Eliminar PINs anteriores de activación
    await LoginPin.destroy({
      where: {
        user_id: user.id,
        type: 'activation'
      }
    });

    // Generar PIN
    const pin = this.generatePin();
    const pinHash = await bcrypt.hash(pin, this.BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + this.ACTIVATION_PIN_EXPIRY);

    // Guardar PIN
    await LoginPin.create({
      user_id: user.id,
      pin_hash: pinHash,
      type: 'activation',
      expires_at: expiresAt
    });

    // Enviar email
    await emailService.sendActivationPin(user.email, pin, user.first_name);

    // Rate limiting
    if (attempts) {
      await incr(rateLimitKey);
    } else {
      await setEx(rateLimitKey, 3600, '1'); // 1 hora
    }

    logger.info('PIN de activación enviado', { userId: user.id });

    return { success: true, message: 'PIN enviado al email' };
  }

  /**
   * ACTIVAR CUENTA CON PIN
   */
  async activateAccount(email, pin) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (user.is_active) {
      throw new Error('ACCOUNT_ALREADY_ACTIVE');
    }

    // Buscar PIN válido
    const pinRecord = await LoginPin.findOne({
      where: {
        user_id: user.id,
        type: 'activation',
        expires_at: { [Op.gt]: new Date() },
        used_at: null
      }
    });

    if (!pinRecord) {
      throw new Error('PIN_EXPIRED_OR_INVALID');
    }

    // Verificar PIN
    const isValid = await bcrypt.compare(pin, pinRecord.pin_hash);
    if (!isValid) {
      throw new Error('INVALID_PIN');
    }

    // Activar cuenta
    await user.update({ 
      is_active: true,
      email_verified_at: new Date()
    });

    // Marcar PIN como usado
    await pinRecord.update({ used_at: new Date() });

    // Eliminar del rate limiting
    await del(`activation_pin:${user.id}`);

    // Enviar email de bienvenida
    await emailService.sendWelcomeEmail(user.email, user.first_name);

    logger.info('Cuenta activada', { userId: user.id });

    return {
      success: true,
      message: 'Cuenta activada exitosamente',
      user: user.toSafeObject()
    };
  }

  /**
   * SOLICITAR PIN DE LOGIN
   */
  async requestLoginPin(email, deviceInfo) {
    // Rate limiting por email
    const rateLimitKey = `login_attempts:${email}`;
    const attempts = await get(rateLimitKey);
    
    if (attempts && parseInt(attempts) >= this.MAX_ATTEMPTS) {
      throw new Error('TOO_MANY_ATTEMPTS');
    }

    const user = await User.findOne({ 
      where: { 
        email,
        is_active: true 
      } 
    });

    if (!user) {
      // Por seguridad, no revelar si el usuario existe
      await incr(rateLimitKey);
      await expire(rateLimitKey, 900); // 15 minutos
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, message: 'Si el email existe, recibirás un PIN' };
    }

    // Verificar si la cuenta está bloqueada
    if (user.isAccountLocked()) {
      const lockTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      throw new Error(`ACCOUNT_LOCKED:${lockTime}`);
    }

    // Generar PIN
    const pin = this.generatePin();
    const pinHash = await bcrypt.hash(pin, this.BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + this.LOGIN_PIN_EXPIRY);

    // Eliminar PINs anteriores para este dispositivo
    await LoginPin.destroy({
      where: {
        user_id: user.id,
        device_hash: deviceInfo.deviceHash,
        type: 'login'
      }
    });

    // Guardar nuevo PIN
    await LoginPin.create({
      user_id: user.id,
      pin_hash: pinHash,
      device_hash: deviceInfo.deviceHash,
      type: 'login',
      expires_at: expiresAt,
      ip_address: deviceInfo.ip
    });

    // Enviar email
    await emailService.sendLoginPin(user.email, pin, user.first_name);

    // Incrementar intentos
    await incr(rateLimitKey);
    await expire(rateLimitKey, 900);

    logger.info('PIN de login enviado', { userId: user.id, deviceHash: deviceInfo.deviceHash });

    return { success: true, message: 'PIN enviado al email' };
  }

  /**
   * VERIFICAR PIN Y LOGIN
   */
  async verifyLoginPin(email, pin, deviceInfo) {
    const user = await User.findOne({ 
      where: { 
        email,
        is_active: true 
      } 
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verificar bloqueo
    if (user.isAccountLocked()) {
      const lockTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      throw new Error(`ACCOUNT_LOCKED:${lockTime}`);
    }

    // Buscar PIN
    const pinRecord = await LoginPin.findOne({
      where: {
        user_id: user.id,
        device_hash: deviceInfo.deviceHash,
        type: 'login',
        expires_at: { [Op.gt]: new Date() },
        used_at: null
      }
    });

    if (!pinRecord) {
      await this.recordFailedAttempt(user);
      throw new Error('PIN_EXPIRED_OR_INVALID');
    }

    // Verificar PIN
    const isValid = await bcrypt.compare(pin, pinRecord.pin_hash);
    if (!isValid) {
      await this.recordFailedAttempt(user);
      throw new Error('INVALID_PIN');
    }

    // PIN válido - Limpiar intentos
    await del(`login_attempts:${email}`);
    await user.update({ 
      login_attempts: 0,
      locked_until: null,
      last_login: new Date()
    });

    // Marcar PIN como usado
    await pinRecord.update({ used_at: new Date() });

    // Crear o actualizar sesión
    await this.createOrUpdateSession(user.id, deviceInfo);

    // Generar tokens
    const tokens = await tokenService.generateTokenPair(user, deviceInfo.deviceHash);

    logger.info('Login exitoso', { userId: user.id, deviceHash: deviceInfo.deviceHash });

    return {
      success: true,
      user: user.toSafeObject(),
      ...tokens
    };
  }

  /**
   * REFRESH TOKEN
   */
  async refreshToken(refreshToken, deviceInfo) {
    try {
      const result = await tokenService.refreshAccessToken(refreshToken, deviceInfo.deviceHash);
      
      logger.info('Token refrescado', { deviceHash: deviceInfo.deviceHash });
      
      return result;
    } catch (error) {
      logger.error('Error refrescando token', { error: error.message });
      throw error;
    }
  }

  /**
   * LOGOUT
   */
  async logout(userId, deviceHash) {
    // Desactivar sesión
    await UserSession.update(
      { is_active: false },
      { 
        where: { 
          user_id: userId,
          device_hash: deviceHash 
        } 
      }
    );

    // Revocar tokens
    await tokenService.revokeTokens(userId, deviceHash);

    logger.info('Logout exitoso', { userId, deviceHash });

    return { success: true, message: 'Sesión cerrada' };
  }

  /**
   * LOGOUT DE TODOS LOS DISPOSITIVOS
   */
  async logoutAllDevices(userId) {
    // Desactivar todas las sesiones
    await UserSession.update(
      { is_active: false },
      { where: { user_id: userId } }
    );

    // Revocar todos los tokens
    const count = await tokenService.revokeAllTokens(userId);

    logger.info('Logout de todos los dispositivos', { userId, sessionsRevoked: count });

    return { 
      success: true, 
      message: 'Todas las sesiones cerradas',
      sessionsRevoked: count
    };
  }

  /**
   * CREAR O ACTUALIZAR SESIÓN
   */
  async createOrUpdateSession(userId, deviceInfo) {
    const [session, created] = await UserSession.findOrCreate({
      where: {
        user_id: userId,
        device_hash: deviceInfo.deviceHash
      },
      defaults: {
        device_name: deviceInfo.deviceName || 'Unknown Device',
        ip_address: deviceInfo.ip,
        user_agent: deviceInfo.userAgent,
        is_active: true,
        last_activity: new Date()
      }
    });

    if (!created) {
      await session.update({
        is_active: true,
        ip_address: deviceInfo.ip,
        user_agent: deviceInfo.userAgent,
        last_activity: new Date()
      });
    }

    return session;
  }

  /**
   * REGISTRAR INTENTO FALLIDO
   */
  async recordFailedAttempt(user) {
    const attempts = user.login_attempts + 1;
    
    if (attempts >= this.MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + this.ATTEMPT_WINDOW);
      await user.update({
        login_attempts: attempts,
        locked_until: lockedUntil
      });
      logger.warn('Cuenta bloqueada por intentos fallidos', { userId: user.id });
    } else {
      await user.update({ login_attempts: attempts });
    }
  }

  /**
   * GENERAR PIN ALEATORIO
   */
  generatePin() {
    const min = Math.pow(10, this.PIN_LENGTH - 1);
    const max = Math.pow(10, this.PIN_LENGTH) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * OBTENER SESIONES ACTIVAS
   */
  async getActiveSessions(userId) {
    const sessions = await UserSession.findAll({
      where: {
        user_id: userId,
        is_active: true
      },
      order: [['last_activity', 'DESC']]
    });

    return sessions.map(session => ({
      id: session.id,
      deviceName: session.device_name,
      deviceHash: session.device_hash,
      ipAddress: session.ip_address,
      lastActivity: session.last_activity,
      createdAt: session.created_at
    }));
  }
}

module.exports = new AuthService();