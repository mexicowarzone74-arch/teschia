import pkg from 'nodemailer';
const { createTransport } = pkg;
import { Resend } from 'resend';
import logger from '../utils/logger.js';

//  Helper unificado de envío 
// Si existe RESEND_API_KEY usa Resend (API HTTP, funciona en Render free tier).
// Si no, intenta SMTP (solo funciona en servidores que no bloqueen el puerto).
const sendEmail = async ({ to, subject, html, text }) => {
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.EMAIL_FROM || 'TESCHA <onboarding@resend.dev>';
    logger.info(' Enviando vía Resend', { to, subject });
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) throw new Error(`Resend error: ${error.message}`);
    return;
  }

  // Fallback SMTP
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('  Sin RESEND_API_KEY ni SMTP configurado  email no enviado', { to, subject });
    return;
  }
  const transporter = createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  logger.info(' Enviando vía SMTP', { to, host: process.env.SMTP_HOST, port: process.env.SMTP_PORT });
  await transporter.sendMail({
    from: `"TESCHA - Sistema de Coordinación" <${process.env.SMTP_USER}>`,
    to, subject, html, text,
  });
};

/**
 * Envía un correo de recuperación de contraseña
 * @param {string} email - Email del destinatario
 * @param {string} nombre - Nombre del usuario
 * @param {string} resetUrl - URL para restablecer la contraseña
 */
export const enviarEmailRecuperacion = async (email, nombre, resetUrl) => {
  const html = `
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#1e40af,#1e3a8a);padding:30px;text-align:center;border-radius:10px 10px 0 0">
        <h1 style="color:white;margin:0">TESCHA</h1>
        <p style="color:#fbbf24;margin:5px 0 0;font-size:14px">Sistema de Coordinación de Inglés</p>
      </div>
      <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px">
        <h2 style="color:#1e40af">Recuperación de Contraseña</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Hemos recibido una solicitud para restablecer tu contraseña en TESCHA.</p>
        <div style="text-align:center;margin:30px 0">
          <a href="${resetUrl}" style="background:#1e40af;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">Restablecer Contraseña</a>
        </div>
        <p style="color:#6b7280;font-size:14px"> Este enlace es válido por <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este correo.</p>
        <p style="font-size:12px;color:#1e40af;word-break:break-all">${resetUrl}</p>
        <p style="font-size:12px;color:#9ca3af;text-align:center">Tecnológico de Estudios Superiores de Chalco</p>
      </div>
    </body>`;
  await sendEmail({
    to: email,
    subject: 'Recuperación de Contraseña - TESCHA',
    html,
    text: `Hola ${nombre},\n\nRestablecer contraseña: ${resetUrl}\n\nVálido por 1 hora.`,
  });
  logger.info(' Correo de recuperación enviado', { email });
};

export const enviarEmailConfirmacionCambio = async (email, nombre) => {
  const html = `
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;border-radius:10px 10px 0 0">
        <h1 style="color:white;margin:0"> Contraseña Actualizada</h1>
      </div>
      <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px">
        <p>Hola <strong>${nombre}</strong>, tu contraseña de TESCHA fue actualizada exitosamente.</p>
        <p style="color:#6b7280;font-size:14px"> Si no realizaste este cambio, contacta al coordinador de inmediato.</p>
        <p style="font-size:12px;color:#9ca3af;text-align:center">Tecnológico de Estudios Superiores de Chalco</p>
      </div>
    </body>`;
  try {
    await sendEmail({ to: email, subject: 'Contraseña Actualizada - TESCHA', html });
    logger.info(' Correo confirmación cambio enviado', { email });
  } catch (e) {
    logger.error(' Error correo confirmación cambio', { email, message: e.message });
  }
};

export const enviarEmailVerificacion = async (email, nombre, verifyUrl) => {
  const html = `
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;border-radius:10px 10px 0 0">
        <h1 style="color:white;margin:0">TESCHA</h1>
        <p style="color:white;margin:5px 0 0;font-size:14px">Verificación de Email</p>
      </div>
      <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px">
        <h2 style="color:#10b981">¡Bienvenido, ${nombre}!</h2>
        <p>Para confirmar tu correo en TESCHA, haz clic en el botón:</p>
        <div style="text-align:center;margin:30px 0">
          <a href="${verifyUrl}" style="background:#10b981;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">Verificar Email</a>
        </div>
        <p style="color:#6b7280;font-size:14px"> Válido por <strong>24 horas</strong>.</p>
        <p style="font-size:12px;color:#10b981;word-break:break-all">${verifyUrl}</p>
        <p style="font-size:12px;color:#9ca3af;text-align:center">Tecnológico de Estudios Superiores de Chalco</p>
      </div>
    </body>`;
  await sendEmail({
    to: email,
    subject: 'Verifica tu correo electrónico - TESCHA',
    html,
    text: `Hola ${nombre},\n\nVerifica tu email: ${verifyUrl}\n\nVálido por 24 horas.`,
  });
  logger.info(' Correo de verificación enviado', { email });
};