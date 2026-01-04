const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryService {
  constructor() {
    this.folder = process.env.CLOUDINARY_FOLDER || 'expastore';
    this.isConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (!this.isConfigured) {
      logger.warn('Cloudinary no está configurado. Las imágenes no se subirán.');
    }
  }

  /**
   * Optimizar imagen antes de subir
   */
  async optimizeImage(buffer, options = {}) {
    const {
      width = 1200,
      height = null,
      quality = 85,
      format = 'jpeg'
    } = options;

    try {
      return await sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality, progressive: true })
        .toBuffer();
    } catch (error) {
      logger.error('Error optimizando imagen', { error: error.message });
      return buffer; // Retornar buffer original si falla
    }
  }

  /**
   * Subir imagen de producto
   */
  async uploadProductImage(file, productId, position = 0) {
    if (!this.isConfigured) {
      logger.warn('Cloudinary no configurado, usando URL simulada');
      return {
        url: `https://via.placeholder.com/800x800?text=Product+Image+${position}`,
        publicId: `simulated-${uuidv4()}`,
        width: 800,
        height: 800,
        format: 'jpeg',
        bytes: file.size || 0
      };
    }

    try {
      const publicId = `${this.folder}/products/${productId}/${uuidv4()}`;

      // Optimizar imagen
      const optimizedBuffer = await this.optimizeImage(file.buffer, {
        width: 1200,
        quality: 85
      });

      // Convertir buffer a base64
      const base64Image = `data:${file.mimetype};base64,${optimizedBuffer.toString('base64')}`;

      // Subir a Cloudinary
      const result = await cloudinary.uploader.upload(base64Image, {
        public_id: publicId,
        folder: `${this.folder}/products`,
        resource_type: 'image',
        transformation: [
          { width: 1200, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      });

      logger.info('Imagen subida a Cloudinary', {
        publicId: result.public_id,
        url: result.secure_url
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      };
    } catch (error) {
      logger.error('Error subiendo imagen a Cloudinary', {
        error: error.message,
        productId
      });
      throw new Error('Error subiendo imagen');
    }
  }

  /**
   * Subir imagen de categoría
   */
  async uploadCategoryImage(file, categoryId) {
    if (!this.isConfigured) {
      return {
        url: 'https://via.placeholder.com/400x400?text=Category',
        publicId: `simulated-${uuidv4()}`
      };
    }

    try {
      const publicId = `${this.folder}/categories/${categoryId}/${uuidv4()}`;

      const optimizedBuffer = await this.optimizeImage(file.buffer, {
        width: 800,
        height: 800,
        quality: 80
      });

      const base64Image = `data:${file.mimetype};base64,${optimizedBuffer.toString('base64')}`;

      const result = await cloudinary.uploader.upload(base64Image, {
        public_id: publicId,
        folder: `${this.folder}/categories`,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'fill' },
          { quality: 'auto:good' }
        ]
      });

      logger.info('Imagen de categoría subida', {
        publicId: result.public_id,
        categoryId
      });

      return {
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (error) {
      logger.error('Error subiendo imagen de categoría', {
        error: error.message,
        categoryId
      });
      throw new Error('Error subiendo imagen');
    }
  }

  /**
   * Eliminar imagen de Cloudinary
   */
  async deleteImage(publicId) {
    if (!this.isConfigured) {
      logger.info('Cloudinary no configurado, eliminación simulada', { publicId });
      return true;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok') {
        logger.info('Imagen eliminada de Cloudinary', { publicId });
        return true;
      }

      logger.warn('No se pudo eliminar imagen', { publicId, result });
      return false;
    } catch (error) {
      logger.error('Error eliminando imagen', {
        error: error.message,
        publicId
      });
      return false;
    }
  }

  /**
   * Generar URL optimizada
   */
  getOptimizedUrl(publicId, options = {}) {
    if (!this.isConfigured) {
      return `https://via.placeholder.com/800x600?text=Image`;
    }

    const {
      width = 800,
      height = null,
      quality = 80,
      crop = 'fill'
    } = options;

    return cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      fetch_format: 'auto',
      secure: true
    });
  }

  /**
   * Verificar configuración
   */
  async verifyConfiguration() {
    if (!this.isConfigured) {
      return {
        configured: false,
        message: 'Cloudinary no está configurado'
      };
    }

    try {
      // Intentar hacer ping a Cloudinary
      await cloudinary.api.ping();

      return {
        configured: true,
        message: 'Cloudinary configurado correctamente',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
      };
    } catch (error) {
      logger.error('Error verificando Cloudinary', { error: error.message });
      return {
        configured: false,
        message: 'Error de configuración',
        error: error.message
      };
    }
  }

  /**
   * Generar múltiples tamaños de imagen
   */
  generateImageSizes(publicId) {
    if (!this.isConfigured) {
      return {
        thumbnail: 'https://via.placeholder.com/150',
        small: 'https://via.placeholder.com/400',
        medium: 'https://via.placeholder.com/800',
        large: 'https://via.placeholder.com/1200'
      };
    }

    return {
      thumbnail: this.getOptimizedUrl(publicId, { width: 150, height: 150 }),
      small: this.getOptimizedUrl(publicId, { width: 400 }),
      medium: this.getOptimizedUrl(publicId, { width: 800 }),
      large: this.getOptimizedUrl(publicId, { width: 1200 }),
      original: cloudinary.url(publicId, { secure: true })
    };
  }
}

module.exports = new CloudinaryService();