import express from 'express';
import pool from '../config/database.js';
import logger from '../utils/logger.js';
import nodemailer from 'nodemailer';
import { auth, checkRole } from '../middleware/auth.js';
import {
  obtenerProrrogasPorVencer,
  obtenerProrrogasVencidas,
  procesarNotificaciones
} from '../services/notificacionesService.js';

const router = express.Router();

// Obtener prórrogas por vencer (próximos 3 días)
router.get('/prorrogas-por-vencer', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const dias = req.query.dias || 3;
    const prorrogas = await obtenerProrrogasPorVencer(dias);

    res.json({
      count: prorrogas.length,
      prorrogas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener prórrogas vencidas
router.get('/prorrogas-vencidas', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const prorrogas = await obtenerProrrogasVencidas();

    res.json({
      count: prorrogas.length,
      prorrogas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar recordatorio manual a un alumno
router.post('/enviar-recordatorio', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const { alumno_id } = req.body;

    if (!alumno_id) {
      return res.status(400).json({ error: 'Se requiere alumno_id' });
    }

    // Obtener pagos pendientes con prórroga del alumno
    const result = await pool.query(`
      SELECT 
        p.id,
        p.monto,
        p.concepto,
        p.estatus,
        pr.fecha_limite_nueva as fecha_limite_prorroga,
        CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as alumno_nombre,
        a.correo as alumno_correo,
        a.telefono as alumno_telefono,
        a.matricula,
        CASE 
          WHEN pr.fecha_limite_nueva < CURRENT_DATE THEN 
            EXTRACT(DAY FROM CURRENT_DATE - pr.fecha_limite_nueva)
          ELSE 
            EXTRACT(DAY FROM pr.fecha_limite_nueva - CURRENT_DATE)
        END as dias_diferencia,
        CASE 
          WHEN pr.fecha_limite_nueva < CURRENT_DATE THEN 'vencida'
          ELSE 'vigente'
        END as estado_prorroga
      FROM pagos p
      JOIN inscripciones i ON p.inscripcion_id = i.id
      JOIN alumnos a ON i.alumno_id = a.id
      LEFT JOIN prorrogas pr ON pr.pago_id = p.id AND pr.estatus = 'aprobada'
      WHERE a.id = $1
        AND p.estatus IN ('pendiente', 'prorroga')
        AND pr.id IS NOT NULL
      ORDER BY pr.fecha_limite_nueva ASC
    `, [alumno_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron pagos pendientes con prórroga para este alumno' });
    }

    const pagos = result.rows;
    const alumno = pagos[0];
    const totalAdeudado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);

    // Enviar email al coordinador
    const emailEnviado = await enviarEmailCoordinador(alumno, pagos, totalAdeudado);

    const mensaje = emailEnviado 
      ? `📧 Recordatorio enviado a tu correo sobre ${alumno.alumno_nombre}`
      : `✅ Recordatorio registrado para ${alumno.alumno_nombre}`;
    
    logger.info('Manual reminder sent to coordinator', {
      alumno: alumno.alumno_nombre,
      matricula: alumno.matricula,
      pagos_pendientes: pagos.length,
      email_enviado: emailEnviado
    });

    res.json({
      success: true,
      mensaje,
      emailEnviado,
      alumno: {
        nombre: alumno.alumno_nombre,
        correo: alumno.alumno_correo,
        matricula: alumno.matricula,
        telefono: alumno.alumno_telefono
      },
      pagos_pendientes: pagos.length,
      total_adeudado: totalAdeudado,
      estado_prorroga: alumno.estado_prorroga,
      dias_diferencia: Math.ceil(alumno.dias_diferencia)
    });
  } catch (error) {
    console.error('Error al enviar recordatorio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Función auxiliar para enviar email al coordinador
async function enviarEmailCoordinador(alumno, pagos, totalAdeudado) {
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;
  const EMAIL_COORDINADOR = process.env.EMAIL_COORDINADOR;

  if (!EMAIL_USER || !EMAIL_PASS) {
    logger.warn('Email not configured - cannot send notification');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });

    const fechaFormateada = new Date(alumno.fecha_limite_prorroga).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const esVencida = alumno.estado_prorroga === 'vencida';
    const diasTexto = esVencida 
      ? `${Math.ceil(alumno.dias_diferencia)} día(s) vencida`
      : `${Math.ceil(alumno.dias_diferencia)} día(s) restantes`;

    const detallesPagos = pagos.map(p => 
      `    • ${p.concepto}: $${parseFloat(p.monto).toFixed(2)}`
    ).join('\n');

    const mailOptions = {
      from: `"TESCHA - Sistema de Coordinación" <${EMAIL_USER}>`,
      to: EMAIL_COORDINADOR,
      subject: esVencida 
        ? `🚨 URGENTE: Cobrar a ${alumno.alumno_nombre} - Prórroga Vencida`
        : `⏰ Recordatorio: Cobrar a ${alumno.alumno_nombre} - Prórroga por Vencer`,
      text: `RECORDATORIO DE COBRO

Hola Coordinador,

${esVencida ? '🚨 URGENTE: La prórroga ya venció' : '⏰ La prórroga está por vencer'}

ALUMNO A COBRAR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Nombre: ${alumno.alumno_nombre}
🎓 Matrícula: ${alumno.matricula}
📧 Correo: ${alumno.alumno_correo || 'No registrado'}
📱 Teléfono: ${alumno.alumno_telefono || 'No registrado'}

DETALLES DEL PAGO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Fecha límite prórroga: ${fechaFormateada}
⏱️  Estado: ${diasTexto}
💰 Total a cobrar: $${totalAdeudado.toFixed(2)}
📋 Pagos pendientes: ${pagos.length}

${detallesPagos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${esVencida ? '⚠️ ACCIÓN REQUERIDA: Contacta al alumno URGENTEMENTE' : '📞 Sugerencia: Contacta al alumno pronto'}

Este es un recordatorio automático del Sistema TESCHA.
`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 3px solid ${esVencida ? '#dc2626' : '#f59e0b'}; border-radius: 10px; background-color: #fff;">
          <div style="text-align: center; padding: 20px; background: ${esVencida ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'linear-gradient(135deg, #f59e0b, #d97706)'}; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">
              ${esVencida ? '🚨 URGENTE: COBRAR PRÓRROGA VENCIDA' : '⏰ RECORDATORIO DE COBRO'}
            </h1>
          </div>

          <p style="font-size: 16px; color: #333;">Hola Coordinador,</p>
          <p style="font-size: 16px; color: #333; font-weight: bold;">
            ${esVencida ? '🚨 La prórroga de este alumno ya VENCIÓ. Necesitas cobrarlo URGENTEMENTE.' : '⏰ La prórroga de este alumno está por vencer. Es momento de cobrarlo.'}
          </p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1e40af; margin-top: 0; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">
              👤 ALUMNO A COBRAR
            </h2>
            <table style="width: 100%; margin-top: 10px;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Nombre:</td>
                <td style="padding: 8px 0; color: #333;">${alumno.alumno_nombre}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Matrícula:</td>
                <td style="padding: 8px 0; color: #333;">${alumno.matricula}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Correo:</td>
                <td style="padding: 8px 0; color: #333;">${alumno.alumno_correo || 'No registrado'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Teléfono:</td>
                <td style="padding: 8px 0; color: #333;">${alumno.alumno_telefono || 'No registrado'}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: ${esVencida ? '#fee2e2' : '#fef3c7'}; padding: 20px; border-radius: 8px; border-left: 5px solid ${esVencida ? '#dc2626' : '#f59e0b'};">
            <h2 style="color: ${esVencida ? '#991b1b' : '#92400e'}; margin-top: 0;">💰 DETALLES DEL PAGO</h2>
            <table style="width: 100%; margin-top: 10px;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Fecha límite:</td>
                <td style="padding: 8px 0; color: #333;">${fechaFormateada}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Estado:</td>
                <td style="padding: 8px 0; color: ${esVencida ? '#dc2626' : '#d97706'}; font-weight: bold;">${diasTexto}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Total a cobrar:</td>
                <td style="padding: 8px 0; color: #059669; font-size: 20px; font-weight: bold;">$${totalAdeudado.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Pagos pendientes:</td>
                <td style="padding: 8px 0; color: #333;">${pagos.length}</td>
              </tr>
            </table>

            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #cbd5e0;">
              <h3 style="color: #666; font-size: 14px; margin: 10px 0;">Conceptos:</h3>
              ${pagos.map(p => `
                <div style="padding: 5px 0; color: #333;">
                  • ${p.concepto}: <strong>$${parseFloat(p.monto).toFixed(2)}</strong>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="background-color: ${esVencida ? '#fca5a5' : '#fcd34d'}; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: ${esVencida ? '#7f1d1d' : '#78350f'}; font-weight: bold; font-size: 16px;">
              ${esVencida ? '⚠️ ACCIÓN REQUERIDA: Contacta al alumno URGENTEMENTE' : '📞 Sugerencia: Contacta al alumno pronto para recordarle el pago'}
            </p>
          </div>

          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center; margin: 10px 0;">
            <em>Recordatorio automático del Sistema TESCHA</em><br>
            <small>Tecnológico de Estudios Superiores de Chalco</small><br>
            <small>Fecha de envío: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</small>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info('Email sent to coordinator', { to: EMAIL_COORDINADOR });
    return true;

  } catch (error) {
    logger.error('Error sending email to coordinator', { error: error.message });
    return false;
  }
}

// ⚠️ NOTA: Las notificaciones se envían AUTOMÁTICAMENTE todos los días a las 9:00 AM
// Este endpoint permite envíos manuales adicionales cuando sea necesario

export default router;
