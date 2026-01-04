const jwt = require('jsonwebtoken');
const { setEx, del, get } = require('../config/redis');
const logger = require('../utils/logger');

class TokenService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRE || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRE || '7d';
  }

  /**
   * Generar Access Token (corta duración)
   */
  generateAccessToken(payload) {
    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        deviceHash: payload.deviceHash
      },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );
  }

  /**
   * Generar Refresh Token (larga duración)
   */
  generateRefreshToken(payload) {
    return jwt.sign(
      {
        userId: payload.userId,
        deviceHash: payload.deviceHash
      },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );
  }

  /**
   * Generar par de tokens
   */
  async generateTokenPair(user, deviceHash) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      deviceHash
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({ 
      userId: user.id, 
      deviceHash 
    });

    // Guardar refresh token en Redis
    const refreshKey = `refresh_token:${user.id}:${deviceHash}`;
    const expirySeconds = this.parseExpiryToSeconds(this.refreshTokenExpiry);
    await setEx(refreshKey, expirySeconds, refreshToken);

    logger.info('Tokens generados', { userId: user.id, deviceHash });

    return { accessToken, refreshToken };
  }

  /**
   * Verificar Access Token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessTokenSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error('INVALID_TOKEN');
    }
  }

  /**
   * Verificar Refresh Token
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshTokenSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }
      throw new Error('INVALID_REFRESH_TOKEN');
    }
  }

  /**
   * Refrescar Access Token usando Refresh Token
   */
  async refreshAccessToken(refreshToken, deviceHash) {
    try {
      // Verificar refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Verificar que el device hash coincida
      if (decoded.deviceHash !== deviceHash) {
        throw new Error('DEVICE_MISMATCH');
      }

      // Verificar que existe en Redis
      const redisKey = `refresh_token:${decoded.userId}:${deviceHash}`;
      const storedToken = await get(redisKey);

      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('INVALID_REFRESH_TOKEN');
      }

      // Obtener usuario (aquí deberías importar el modelo User)
      const { User } = require('../models');
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.is_active) {
        throw new Error('USER_NOT_FOUND');
      }

      // Generar nuevo access token
      const newAccessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        deviceHash
      });

      logger.info('Access token refrescado', { userId: user.id });

      return { accessToken: newAccessToken };

    } catch (error) {
      logger.error('Error refrescando token', { error: error.message });
      throw error;
    }
  }

  /**
   * Revocar tokens de un usuario (logout)
   */
  async revokeTokens(userId, deviceHash) {
    const redisKey = `refresh_token:${userId}:${deviceHash}`;
    await del(redisKey);
    logger.info('Tokens revocados', { userId, deviceHash });
  }

  /**
   * Revocar todos los tokens de un usuario
   */
  async revokeAllTokens(userId) {
    const { delPattern } = require('../config/redis');
    const pattern = `refresh_token:${userId}:*`;
    const deletedCount = await delPattern(pattern);
    logger.info('Todos los tokens revocados', { userId, count: deletedCount });
    return deletedCount;
  }

  /**
   * Convertir expresión de tiempo a segundos
   */
  parseExpiryToSeconds(expiry) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    };

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutos

    const value = parseInt(match[1]);
    const unit = match[2];
    return value * units[unit];
  }

  /**
   * Decodificar token sin verificar (para debugging)
   */
  decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = new TokenService();