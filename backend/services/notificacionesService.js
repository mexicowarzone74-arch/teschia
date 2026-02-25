import pool from '../config/database.js';
import cron from 'node-cron';
import nodemailer from 'nodemailer';

// Configuración de correo
const EMAIL_COORDINADOR = process.env.EMAIL_COORDINADOR || 'coordinador@tescha.com';

// Configurar transportador de email
let transporter = null;
let io = null; // Instancia de Socket.io
const EMAIL_ENABLED = process.env.EMAIL_USER && process.env.EMAIL_PASS;

/**
 * Configurar instancia de Socket.io
 */
const setIo = (ioInstance) => {
  io = ioInstance;
};

if (EMAIL_ENABLED) {
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail', // Puedes cambiar a otro servicio
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('✅ Sistema de Email configurado - ENVÍO AUTOMÁTICO ACTIVO');
  } catch (error) {
    console.log('❌ Error al inicializar Email:', error.message);
  }
} else {
  console.log('⚠️  Email no configurado - necesitas agregar credenciales');
  console.log('');
  console.log('📧 Para activar envío automático de correos:');
  console.log('   1. Usa una cuenta de Gmail');
  console.log('   2. Activa "Contraseñas de aplicaciones" en tu cuenta Google');
  console.log('   3. Agrega en .env:');
  console.log('      EMAIL_USER=tu-email@gmail.com');
  console.log('      EMAIL_PASS=tu-contraseña-de-aplicacion');
  console.log('      EMAIL_COORDINADOR=coordinador@tescha.com');
  console.log('');
}

/**
 * Obtener prórrogas que vencen pronto
 */
const obtenerProrrogasPorVencer = async (diasAntes = 3) => {
  const result = await pool.query(`
    SELECT 
      p.id,
      p.monto,
      p.concepto,
      p.fecha_limite_prorroga,
      CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as alumno_nombre,
      a.correo as alumno_correo,
      a.telefono as alumno_telefono,
      a.matricula,
      (DATE(p.fecha_limite_prorroga) - CURRENT_DATE) as dias_restantes
    FROM pagos p
    JOIN inscripciones i ON p.inscripcion_id = i.id
    JOIN alumnos a ON i.alumno_id = a.id
    WHERE p.tiene_prorroga = true 
      AND p.estatus IN ('pendiente', 'prorroga')
      AND p.fecha_limite_prorroga >= CURRENT_DATE
      AND p.fecha_limite_prorroga <= CURRENT_DATE + INTERVAL '30 days'
      AND (DATE(p.fecha_limite_prorroga) - CURRENT_DATE) <= $1
    ORDER BY p.fecha_limite_prorroga ASC
  `, [diasAntes]);

  return result.rows;
};

/**
 * Obtener prórrogas vencidas
 */
const obtenerProrrogasVencidas = async () => {
  const result = await pool.query(`
    SELECT 
      p.id,
      p.monto,
      p.concepto,
      p.fecha_limite_prorroga,
      CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as alumno_nombre,
      a.correo as alumno_correo,
      a.telefono as alumno_telefono,
      a.matricula,
      (CURRENT_DATE - DATE(p.fecha_limite_prorroga)) as dias_vencidos
    FROM pagos p
    JOIN inscripciones i ON p.inscripcion_id = i.id
    JOIN alumnos a ON i.alumno_id = a.id
    WHERE p.tiene_prorroga = true 
      AND p.estatus IN ('pendiente', 'vencido', 'prorroga')
      AND p.fecha_limite_prorroga < CURRENT_DATE
    ORDER BY p.fecha_limite_prorroga ASC
  `);

  return result.rows;
};

/**
 * Generar contenido de Email
 */
const generarMensajeEmail = (prorroga, tipo = 'recordatorio') => {
  const fecha = new Date(prorroga.fecha_limite_prorroga);
  const fechaFormateada = fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (tipo === 'recordatorio') {
    return {
      subject: `🔔 Recordatorio de Prórroga - ${prorroga.alumno_nombre}`,
      text: `RECORDATORIO DE PRÓRROGA

Estimado Coordinador,

Le informo que al alumno ${prorroga.alumno_nombre} con matrícula ${prorroga.matricula} se le acabará la prórroga el día ${fechaFormateada}.

DETALLES:
• Concepto: ${prorroga.concepto}
• Monto: $${parseFloat(prorroga.monto).toFixed(2)}
• Fecha Límite: ${fechaFormateada}
• Estado: ${Math.ceil(prorroga.dias_restantes) <= 0 ? '¡VENCE HOY!' : 'Faltan ' + Math.ceil(prorroga.dias_restantes) + ' días'}
• Teléfono: ${prorroga.alumno_telefono || 'No registrado'}

Notificación automática - Sistema TESCHA`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #f59e0b; border-radius: 10px;">
          <h2 style="color: #f59e0b; text-align: center;">🔔 RECORDATORIO DE PRÓRROGA</h2>
          <p>Estimado Coordinador,</p>
          <p>Le informo que al alumno <strong>${prorroga.alumno_nombre}</strong> con matrícula <strong>${prorroga.matricula}</strong> se le acabará la prórroga el día <strong>${fechaFormateada}</strong>.</p>
          <div style="background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📋 Detalles:</h3>
            <p><strong>Concepto:</strong> ${prorroga.concepto}</p>
            <p><strong>Monto:</strong> <span style="font-size: 1.2em; color: #059669;">$${parseFloat(prorroga.monto).toFixed(2)}</span></p>
            <p><strong>Días restantes:</strong> ${Math.ceil(prorroga.dias_restantes)}</p>
            <p><strong>Teléfono:</strong> ${prorroga.alumno_telefono || 'No registrado'}</p>
          </div>
          <p style="color: #666; font-size: 0.9em; margin-top: 20px;"><em>Notificación automática - Sistema TESCHA</em></p>
        </div>
      `
    };
  } else if (tipo === 'vencida') {
    return {
      subject: `⚠️ URGENTE: Prórroga Vencida - ${prorroga.alumno_nombre}`,
      text: `PRÓRROGA VENCIDA

Estimado Coordinador,

La prórroga del alumno ${prorroga.alumno_nombre} (${prorroga.matricula}) venció hace ${Math.ceil(prorroga.dias_vencidos)} día(s).

DETALLES:
• Concepto: ${prorroga.concepto}
• Monto: $${parseFloat(prorroga.monto).toFixed(2)}
• Fecha límite: ${fechaFormateada}
• Teléfono: ${prorroga.alumno_telefono || 'No registrado'}

⚡ ACCIÓN REQUERIDA

Notificación automática - Sistema TESCHA`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #dc2626; border-radius: 10px;">
          <h2 style="color: #dc2626; text-align: center;">⚠️ PRÓRROGA VENCIDA</h2>
          <p>Estimado Coordinador,</p>
          <p>La prórroga del alumno <strong>${prorroga.alumno_nombre}</strong> (<strong>${prorroga.matricula}</strong>) venció hace <strong>${Math.ceil(prorroga.dias_vencidos)} día(s)</strong>.</p>
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0;">📋 Detalles:</h3>
            <p><strong>Concepto:</strong> ${prorroga.concepto}</p>
            <p><strong>Monto:</strong> <span style="font-size: 1.2em; color: #dc2626;">$${parseFloat(prorroga.monto).toFixed(2)}</span></p>
            <p><strong>Fecha límite:</strong> ${fechaFormateada}</p>
            <p><strong>Teléfono:</strong> ${prorroga.alumno_telefono || 'No registrado'}</p>
          </div>
          <div style="background-color: #fee2e2; padding: 10px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #dc2626; font-weight: bold;">⚡ ACCIÓN REQUERIDA</p>
          </div>
          <p style="color: #666; font-size: 0.9em; margin-top: 20px;"><em>Notificación automática - Sistema TESCHA</em></p>
        </div>
      `
    };
  }
};

/**
 * Enviar notificación por Email
 */
const enviarNotificacion = async (prorroga, tipo = 'recordatorio') => {
  const emailContent = generarMensajeEmail(prorroga, tipo);

  console.log('\n' + '='.repeat(60));
  console.log(`📧 NOTIFICACIÓN ${tipo.toUpperCase()} - ${new Date().toLocaleString('es-MX')}`);
  console.log('='.repeat(60));
  console.log(`Alumno: ${prorroga.alumno_nombre} (${prorroga.matricula})`);
  console.log(`Monto: $${prorroga.monto}`);
  console.log(`Fecha límite: ${prorroga.fecha_limite_prorroga}`);

  // Intentar envío automático por Email
  if (EMAIL_ENABLED && transporter) {
    try {
      const mailOptions = {
        from: `"TESCHA - Sistema de Pagos" <${process.env.EMAIL_USER}>`,
        to: EMAIL_COORDINADOR,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      };

      const result = await transporter.sendMail(mailOptions);

      console.log(`\n✅ ¡EMAIL ENVIADO AUTOMÁTICAMENTE!`);
      console.log(`   📧 Destinatario: ${EMAIL_COORDINADOR}`);
      console.log(`   📨 Message ID: ${result.messageId}`);
      console.log(`   ✓ Estado: Enviado`);

      return { success: true, mensaje: emailContent.text, messageId: result.messageId, metodo: 'email' };
    } catch (error) {
      console.log(`\n❌ Error al enviar email: ${error.message}`);
      console.log(`   ⚠️  Verifica las credenciales en .env`);
    }
  }

  // Emitir alerta por Socket.io si está disponible
  if (io) {
    io.emit('notificacion:pago', {
      tipo,
      alumno: prorroga.alumno_nombre,
      matricula: prorroga.matricula,
      concepto: prorroga.concepto,
      fecha_limite: prorroga.fecha_limite_prorroga,
      monto: prorroga.monto
    });
    console.log(`   📡 Alerta de tiempo real emitida via Socket.io`);
  }

  // Modo manual
  console.log(`\n${'█'.repeat(60)}`);
  console.log(`█  🚨 ACCIÓN REQUERIDA - PRÓRROGA POR VENCER  🚨`);
  console.log(`${'█'.repeat(60)}`);
  console.log(`\n📧 Envía manualmente este correo a: ${EMAIL_COORDINADOR}`);
  console.log(`\nAsunto: ${emailContent.subject}`);
  console.log(`\n${emailContent.text}\n`);
  console.log(`${'═'.repeat(60)}\n`);

  return { success: true, mensaje: emailContent.text, metodo: 'manual' };
};

/**
 * Registrar notificación en base de datos
 */
const registrarNotificacion = async (pagoId, tipo, mensaje, metodo = 'email') => {
  try {
    await pool.query(`
      INSERT INTO notificaciones_enviadas 
        (pago_id, tipo, mensaje, metodo, fecha_envio) 
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (pago_id, tipo, DATE(NOW()))
      DO NOTHING
    `, [pagoId, tipo, mensaje, metodo]);
    
    console.log(`   ✓ Notificación registrada (ID Pago: ${pagoId})`);
  } catch (error) {
    console.error('   ⚠️  Error al registrar notificación:', error.message);
  }
};

/**
 * Verificar si ya se envió notificación hoy
 */
const yaSeEnvioHoy = async (pagoId, tipo) => {
  try {
    const result = await pool.query(`
      SELECT id, fecha_envio, metodo FROM notificaciones_enviadas 
      WHERE pago_id = $1 
        AND tipo = $2 
        AND DATE(fecha_envio) = CURRENT_DATE
      LIMIT 1
    `, [pagoId, tipo]);

    if (result.rows.length > 0) {
      const registro = result.rows[0];
      console.log(`   ⏭️  Ya enviado hoy (${tipo}) - ${registro.metodo.toUpperCase()} - ${new Date(registro.fecha_envio).toLocaleTimeString('es-MX')}`);
      return true;
    }
    
    return false;
  } catch (error) {
    // Si la tabla no existe o hay error, retornar false para permitir el envío
    console.log('   ⚠️  No se pudo verificar duplicados:', error.message);
    return false;
  }
};

/**
 * Proceso principal de notificaciones
 */
const procesarNotificaciones = async () => {
  console.log('\n🔄 Iniciando proceso de notificaciones automáticas...');
  console.log(`📅 Fecha/Hora: ${new Date().toLocaleString('es-MX')}`);

  try {
    // 1. Revisar prórrogas por vencer (próximos 3 días)
    const porVencer = await obtenerProrrogasPorVencer(3);
    console.log(`\n📊 Prórrogas por vencer: ${porVencer.length}`);

    let enviadosRecordatorio = 0;
    for (const prorroga of porVencer) {
      const yaEnviado = await yaSeEnvioHoy(prorroga.id, 'recordatorio');
      if (!yaEnviado) {
        const result = await enviarNotificacion(prorroga, 'recordatorio');
        await registrarNotificacion(prorroga.id, 'recordatorio', result.mensaje, result.metodo);
        enviadosRecordatorio++;
      }
    }

    // 2. Revisar prórrogas vencidas
    const vencidas = await obtenerProrrogasVencidas();
    console.log(`\n⚠️  Prórrogas vencidas: ${vencidas.length}`);

    let enviadosVencidas = 0;
    for (const prorroga of vencidas) {
      const yaEnviado = await yaSeEnvioHoy(prorroga.id, 'vencida');
      if (!yaEnviado) {
        const result = await enviarNotificacion(prorroga, 'vencida');
        await registrarNotificacion(prorroga.id, 'vencida', result.mensaje, result.metodo);
        enviadosVencidas++;
      }
    }

    console.log('\n✅ Proceso de notificaciones completado');
    console.log(`📤 Enviados: ${enviadosRecordatorio} recordatorios + ${enviadosVencidas} vencidas = ${enviadosRecordatorio + enviadosVencidas} total\n`);

    return {
      success: true,
      porVencer: porVencer.length,
      vencidas: vencidas.length,
      enviadosRecordatorio,
      enviadosVencidas,
      totalEnviados: enviadosRecordatorio + enviadosVencidas
    };
  } catch (error) {
    console.error('❌ Error en proceso de notificaciones:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Iniciar cron job
 * Se ejecuta todos los días a las 9:00 AM
 */
const iniciarCronNotificaciones = () => {
  // Ejecutar todos los días a las 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Cron job ejecutado: Notificaciones automáticas');
    await procesarNotificaciones();
  });

  // También ejecutar cada 6 horas para verificaciones adicionales
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Verificación periódica de prórrogas');
    const vencidas = await obtenerProrrogasVencidas();
    if (vencidas.length > 0) {
      console.log(`⚠️  ${vencidas.length} prórrogas vencidas detectadas`);
    }
  });

  console.log('✅ Cron jobs de notificaciones iniciados');
  console.log('   - Notificaciones diarias: 9:00 AM');
  console.log('   - Verificaciones: cada 6 horas');
};

/**
 * Crear tabla de notificaciones si no existe
 */
const inicializarTablaNotificaciones = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
        id SERIAL PRIMARY KEY,
        pago_id INTEGER REFERENCES pagos(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('recordatorio', 'vencida')),
        mensaje TEXT,
        metodo VARCHAR(20) DEFAULT 'email' CHECK (metodo IN ('email', 'manual')),
        fecha_envio TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Crear índice único para evitar duplicados
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_notificacion_diaria 
      ON notificaciones_enviadas (pago_id, tipo, DATE(fecha_envio))
    `);
    
    console.log('✅ Tabla notificaciones_enviadas verificada');
  } catch (error) {
    console.error('Error al crear tabla notificaciones:', error);
  }
};

export {
  obtenerProrrogasPorVencer,
  obtenerProrrogasVencidas,
  generarMensajeEmail,
  enviarNotificacion,
  procesarNotificaciones,
  iniciarCronNotificaciones,
  inicializarTablaNotificaciones,
  setIo
};
