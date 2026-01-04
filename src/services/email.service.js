const logger = require('../utils/logger');

// Intentar cargar nodemailer
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  logger.warn('Nodemailer no está instalado. Emails se simularán en consola.');
}

class EmailService {
  constructor() {
    this.isEnabled = false;
    
    if (nodemailer && typeof nodemailer.createTransport === 'function') {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
        
        this.from = {
          name: process.env.EMAIL_FROM_NAME || 'Expastore',
          address: process.env.EMAIL_FROM || 'noreply@expastore.com'
        };
        
        this.isEnabled = true;
        logger.info('Email service: Nodemailer configurado correctamente');
      } catch (error) {
        logger.error('Email service: Error configurando nodemailer', { error: error.message });
      }
    } else {
      logger.warn('Email service: Nodemailer no disponible, usando modo simulación');
    }
  }

  /**
   * Enviar email genérico
   */
  async sendEmail({ to, subject, html, text }) {
    // Si nodemailer no está disponible, simular envío
    if (!this.isEnabled) {
      logger.info('📧 EMAIL SIMULADO', { to, subject });
      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║         📧 EMAIL SIMULADO                  ║');
      console.log('╠════════════════════════════════════════════╣');
      console.log(`║ Para: ${to.padEnd(38)} ║`);
      console.log(`║ Asunto: ${subject.substring(0, 35).padEnd(35)} ║`);
      console.log('╠════════════════════════════════════════════╣');
      console.log('║ Contenido (texto):                         ║');
      console.log('╚════════════════════════════════════════════╝');
      console.log(text);
      console.log('════════════════════════════════════════════\n');
      
      return { success: true, messageId: 'simulated-' + Date.now() };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.from.name}" <${this.from.address}>`,
        to,
        subject,
        text,
        html
      });

      logger.info('Email enviado', { 
        to, 
        subject, 
        messageId: info.messageId 
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Error enviando email', { 
        to, 
        subject, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Enviar PIN de activación
   */
  async sendActivationPin(email, pin, firstName) {
    const subject = '🔐 Activa tu cuenta en Expastore';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .pin-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .pin { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛍️ Bienvenido a Expastore</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${firstName}</strong>,</p>
            <p>¡Gracias por registrarte! Para activar tu cuenta, usa el siguiente código PIN:</p>
            
            <div class="pin-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Tu código de activación:</p>
              <div class="pin">${pin}</div>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Este código expira en <strong>10 minutos</strong></p>
            </div>

            <p><strong>⚠️ Importante:</strong></p>
            <ul>
              <li>No compartas este código con nadie</li>
              <li>El código es de un solo uso</li>
              <li>Si no solicitaste este registro, ignora este email</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Expastore. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hola ${firstName},

Tu código de activación es: ${pin}

Este código expira en 10 minutos.

Si no solicitaste este registro, ignora este email.

Expastore
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Enviar PIN de login
   */
  async sendLoginPin(email, pin, firstName) {
    const subject = '🔑 Tu código de acceso a Expastore';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .pin-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .pin { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Código de Acceso</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${firstName}</strong>,</p>
            <p>Alguien solicitó acceso a tu cuenta. Si fuiste tú, usa este código:</p>
            
            <div class="pin-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Tu código de acceso:</p>
              <div class="pin">${pin}</div>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Este código expira en <strong>5 minutos</strong></p>
            </div>

            <p><strong>🛡️ Seguridad:</strong></p>
            <ul>
              <li>Si no solicitaste este código, <strong>ignora este email</strong></li>
              <li>Nunca compartas este código</li>
              <li>El código es válido solo para este dispositivo</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Expastore. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hola ${firstName},

Tu código de acceso es: ${pin}

Este código expira en 5 minutos.
Si no solicitaste este código, ignora este email.

Expastore
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Enviar email de bienvenida
   */
  async sendWelcomeEmail(email, firstName) {
    const subject = '🎉 ¡Bienvenido a Expastore!';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎊 ¡Cuenta Activada!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${firstName}</strong>,</p>
            <p>Tu cuenta ha sido activada exitosamente. ¡Ya puedes disfrutar de todas las funciones de Expastore!</p>
            
            <center>
              <a href="${process.env.FRONTEND_URL}" class="button">Ir a Expastore</a>
            </center>

            <p><strong>¿Qué puedes hacer ahora?</strong></p>
            <ul>
              <li>🛒 Explorar nuestro catálogo de productos</li>
              <li>❤️ Crear tu lista de deseos</li>
              <li>🎁 Aprovechar ofertas exclusivas</li>
              <li>📦 Realizar pedidos con envío rápido</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `¡Bienvenido ${firstName}!`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Verificar configuración del transporter
   */
  async verifyConnection() {
    if (!this.isEnabled) {
      logger.warn('Email service: Modo simulación activo');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service: Conexión verificada');
      return true;
    } catch (error) {
      logger.error('Email service: Error de conexión', { error: error.message });
      return false;
    }
  }
}

module.exports = new EmailService();