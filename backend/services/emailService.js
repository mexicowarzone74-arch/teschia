import pkg from 'nodemailer';
const { createTransport } = pkg;
import logger from '../utils/logger.js';

// Configuración del transporter de nodemailer
const createTransporter = () => {
  const cfg = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };
  logger.info('📧 SMTP config', {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.auth.user || '(no configurado)',
    passSet: !!cfg.auth.pass,
  });
  return createTransport(cfg);
};

/**
 * Envía un correo de recuperación de contraseña
 * @param {string} email - Email del destinatario
 * @param {string} nombre - Nombre del usuario
 * @param {string} resetUrl - URL para restablecer la contraseña
 */
export const enviarEmailRecuperacion = async (email, nombre, resetUrl) => {
  try {
    // Si no está configurado el SMTP, solo log (modo desarrollo)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('SMTP not configured. Password reset link:', { resetUrl });
      console.log('\n===========================================');
      console.log('🔐 RECUPERACIÓN DE CONTRASEÑA');
      console.log('===========================================');
      console.log(`Para: ${email}`);
      console.log(`Nombre: ${nombre}`);
      console.log(`Enlace: ${resetUrl}`);
      console.log('===========================================\n');
      return { success: true, mode: 'development' };
    }

    const transporter = createTransporter();

    // HTML del email
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña - TESCHA</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">TESCHA</h1>
          <p style="color: #fbbf24; margin: 5px 0 0 0; font-size: 14px;">Sistema de Coordinación de Inglés</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1e40af; margin-top: 0;">Recuperación de Contraseña</h2>
          
          <p>Hola <strong>${nombre}</strong>,</p>
          
          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en TESCHA.</p>
          
          <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #1e40af; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Restablecer Contraseña
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            <strong>⚠️ Importante:</strong><br>
            • Este enlace es válido por <strong>1 hora</strong><br>
            • Si no solicitaste este cambio, ignora este correo<br>
            • Tu contraseña actual seguirá funcionando
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="font-size: 13px; color: #6b7280;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </p>
          <p style="font-size: 12px; color: #1e40af; word-break: break-all;">
            ${resetUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 10px 0 0 0;">
            Tecnológico de Estudios Superiores de Chalco<br>
            Este es un correo automático, por favor no responder.
          </p>
        </div>
      </body>
      </html>
    `;

    // Verificar conexión SMTP antes de enviar
    await transporter.verify();
    logger.info('📧 SMTP verify OK — enviando correo de recuperación', { email });

    // Enviar email
    await transporter.sendMail({
      from: `"TESCHA - Sistema de Coordinación" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Recuperación de Contraseña - TESCHA',
      html: htmlContent,
      text: `
Hola ${nombre},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en TESCHA.

Para crear una nueva contraseña, haz clic en el siguiente enlace:
${resetUrl}

⚠️ Importante:
• Este enlace es válido por 1 hora
• Si no solicitaste este cambio, ignora este correo
• Tu contraseña actual seguirá funcionando

Tecnológico de Estudios Superiores de Chalco
      `.trim(),
    });

    logger.info('✅ Correo de recuperación enviado', { email });
    return { success: true };
  } catch (error) {
    logger.error('❌ Error enviando correo de recuperación', {
      email,
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    throw new Error('No se pudo enviar el correo de recuperación: ' + error.message);
  }
};

/**
 * Envía un correo de confirmación de cambio de contraseña
 * @param {string} email - Email del destinatario
 * @param {string} nombre - Nombre del usuario
 */
export const enviarEmailConfirmacionCambio = async (email, nombre) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('SMTP not configured. Password change confirmation not sent.');
      return { success: true, mode: 'development' };
    }

    const transporter = createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Contraseña Actualizada - TESCHA</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Contraseña Actualizada</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Hola <strong>${nombre}</strong>,</p>
          
          <p>Tu contraseña de TESCHA ha sido actualizada exitosamente.</p>
          
          <p style="color: #6b7280; font-size: 14px;">
            <strong>⚠️ Importante:</strong><br>
            Si no realizaste este cambio, contacta inmediatamente al coordinador del sistema.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 10px 0 0 0;">
            Tecnológico de Estudios Superiores de Chalco<br>
            Este es un correo automático, por favor no responder.
          </p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"TESCHA - Sistema de Coordinación" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Contraseña Actualizada - TESCHA',
      html: htmlContent,
    });

    logger.info('✅ Correo de confirmación de cambio enviado', { email });
    return { success: true };
  } catch (error) {
    logger.error('❌ Error enviando correo de confirmación', {
      email,
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    return { success: false, error: error.message };
  }
};

/**
 * Envía un correo de verificación de email
 * @param {string} email - Email del destinatario
 * @param {string} nombre - Nombre del usuario
 * @param {string} verifyUrl - URL para verificar el email
 */
export const enviarEmailVerificacion = async (email, nombre, verifyUrl) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('SMTP not configured. Email verification link:', { verifyUrl });
      console.log('\n===========================================');
      console.log('📧 VERIFICACIÓN DE EMAIL');
      console.log('===========================================');
      console.log(`Para: ${email}`);
      console.log(`Nombre: ${nombre}`);
      console.log(`Enlace: ${verifyUrl}`);
      console.log('===========================================\n');
      return { success: true, mode: 'development' };
    }

    const transporter = createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificación de Email - TESCHA</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">TESCHA</h1>
          <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Verificación de Email</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #10b981; margin-top: 0;">¡Bienvenido!</h2>
          
          <p>Hola <strong>${nombre}</strong>,</p>
          
          <p>Se ha registrado este correo electrónico en el sistema TESCHA. Para confirmar que este email te pertenece, necesitamos que lo verifiques.</p>
          
          <p>Haz clic en el siguiente botón para verificar tu correo:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Verificar Email
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            <strong>📌 Información importante:</strong><br>
            • Este enlace es válido por <strong>24 horas</strong><br>
            • Solo necesitas hacer clic una vez<br>
            • Si no solicitaste esta verificación, ignora este correo
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="font-size: 13px; color: #6b7280;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </p>
          <p style="font-size: 12px; color: #10b981; word-break: break-all;">
            ${verifyUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 10px 0 0 0;">
            Tecnológico de Estudios Superiores de Chalco<br>
            Sistema de Coordinación de Inglés<br>
            Este es un correo automático, por favor no responder.
          </p>
        </div>
      </body>
      </html>
    `;

    await transporter.verify();
    logger.info('📧 SMTP verify OK — enviando correo de verificación', { email });

    await transporter.sendMail({
      from: `"TESCHA - Sistema de Coordinación" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verifica tu correo electrónico - TESCHA',
      html: htmlContent,
      text: `
Hola ${nombre},

Se ha registrado este correo electrónico en el sistema TESCHA.

Para confirmar que este email te pertenece, haz clic en el siguiente enlace:
${verifyUrl}

📌 Información importante:
• Este enlace es válido por 24 horas
• Solo necesitas hacer clic una vez
• Si no solicitaste esta verificación, ignora este correo

Tecnológico de Estudios Superiores de Chalco
      `.trim(),
    });

    logger.info('✅ Correo de verificación enviado', { email });
    return { success: true };
  } catch (error) {
    logger.error('❌ Error enviando correo de verificación', {
      email,
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    throw new Error('No se pudo enviar el correo de verificación: ' + error.message);
  }
};

export default {
  enviarEmailRecuperacion,
  enviarEmailConfirmacionCambio,
  enviarEmailVerificacion,
};
