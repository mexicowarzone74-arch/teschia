import logger from '../utils/logger.js';

//  Helper unificado de envío 
// Usa Brevo API HTTP (no bloqueable por Render free tier).
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.BREVO_API_KEY) {
    logger.warn('Sin BREVO_API_KEY configurado - email no enviado', { to, subject });
    return;
  }

  const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'mexicowarzone74@gmail.com';

  const body = {
    sender: { name: 'TESCHA', email: fromEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  logger.info('Enviando via Brevo', { to, subject });

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error ${res.status}: ${err}`);
  }
};

/**
 * Envia un correo de recuperacion de contrasena
 */
export const enviarEmailRecuperacion = async (email, nombre, resetUrl) => {
  const html = `
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#1e40af,#1e3a8a);padding:30px;text-align:center;border-radius:10px 10px 0 0">
        <h1 style="color:white;margin:0">TESCHA</h1>
        <p style="color:#fbbf24;margin:5px 0 0;font-size:14px">Sistema de Coordinacion de Ingles</p>
      </div>
      <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px">
        <h2 style="color:#1e40af">Recuperacion de Contrasena</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Hemos recibido una solicitud para restablecer tu contrasena en TESCHA.</p>
        <div style="text-align:center;margin:30px 0">
          <a href="${resetUrl}" style="background:#1e40af;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">Restablecer Contrasena</a>
        </div>
        <p style="color:#6b7280;font-size:14px">Este enlace es valido por <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este correo.</p>
        <p style="font-size:12px;color:#1e40af;word-break:break-all">${resetUrl}</p>
        <p style="font-size:12px;color:#9ca3af;text-align:center">Tecnologico de Estudios Superiores de Chalco</p>
      </div>
    </body>`;
  await sendEmail({
    to: email,
    subject: 'Recuperacion de Contrasena - TESCHA',
    html,
    text: `Hola ${nombre},\n\nRestablecer contrasena: ${resetUrl}\n\nValido por 1 hora.`,
  });
  logger.info('Correo de recuperacion enviado', { email });
};

export const enviarEmailConfirmacionCambio = async (email, nombre) => {
  const html = `
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;border-radius:10px 10px 0 0">
        <h1 style="color:white;margin:0">Contrasena Actualizada</h1>
      </div>
      <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px">
        <p>Hola <strong>${nombre}</strong>, tu contrasena de TESCHA fue actualizada exitosamente.</p>
        <p style="color:#6b7280;font-size:14px">Si no realizaste este cambio, contacta al coordinador de inmediato.</p>
        <p style="font-size:12px;color:#9ca3af;text-align:center">Tecnologico de Estudios Superiores de Chalco</p>
      </div>
    </body>`;
  try {
    await sendEmail({ to: email, subject: 'Contrasena Actualizada - TESCHA', html });
    logger.info('Correo confirmacion cambio enviado', { email });
  } catch (e) {
    logger.error('Error correo confirmacion cambio', { email, message: e.message });
  }
};

export const enviarEmailVerificacion = async (email, nombre, verifyUrl) => {
  const html = `
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;border-radius:10px 10px 0 0">
        <h1 style="color:white;margin:0">TESCHA</h1>
        <p style="color:white;margin:5px 0 0;font-size:14px">Verificacion de Email</p>
      </div>
      <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px">
        <h2 style="color:#10b981">Bienvenido, ${nombre}!</h2>
        <p>Para confirmar tu correo en TESCHA, haz clic en el boton:</p>
        <div style="text-align:center;margin:30px 0">
          <a href="${verifyUrl}" style="background:#10b981;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">Verificar Email</a>
        </div>
        <p style="color:#6b7280;font-size:14px">Valido por <strong>24 horas</strong>.</p>
        <p style="font-size:12px;color:#10b981;word-break:break-all">${verifyUrl}</p>
        <p style="font-size:12px;color:#9ca3af;text-align:center">Tecnologico de Estudios Superiores de Chalco</p>
      </div>
    </body>`;
  await sendEmail({
    to: email,
    subject: 'Verifica tu correo electronico - TESCHA',
    html,
    text: `Hola ${nombre},\n\nVerifica tu email: ${verifyUrl}\n\nValido por 24 horas.`,
  });
  logger.info('Correo de verificacion enviado', { email });
};