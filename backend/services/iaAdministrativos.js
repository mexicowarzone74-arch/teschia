import pool from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * 💰 IA para Administrativos - Sistema Inteligente de Cobranza
 * 
 * Funcionalidades:
 * - Priorización automática de llamadas
 * - Predicción de pagos
 * - Lista inteligente de contactos
 * - Análisis de eficiencia de cobro
 */

/**
 * Obtener lista priorizada de cobranza
 */
export const obtenerListaPriorizadaCobranza = async (periodoId) => {
  try {
    const listaCobros = await pool.query(`
      WITH datos_pago AS (
        SELECT 
          a.id,
          a.nombre || ' ' || a.apellido_paterno || ' ' || COALESCE(a.apellido_materno, '') as nombre_completo,
          a.telefono,
          a.email,
          g.codigo as grupo,
          i.monto,
          i.estado_pago,
          i.fecha_limite_pago,
          i.fecha_pago,
          CASE 
            WHEN i.estado_pago = 'pendiente' AND i.fecha_limite_pago < NOW() 
            THEN EXTRACT(DAY FROM NOW() - i.fecha_limite_pago)
            ELSE 0 
          END as dias_atraso,
          -- Historial de pagos del alumno (otros periodos)
          (SELECT COUNT(*) 
           FROM inscripciones i2 
           WHERE i2.alumno_id = a.id 
             AND i2.estado_pago = 'pagado'
             AND i2.id != i.id) as pagos_anteriores,
          (SELECT COUNT(*) 
           FROM inscripciones i2 
           WHERE i2.alumno_id = a.id 
             AND i2.estado_pago = 'pendiente'
             AND i2.fecha_limite_pago < NOW()
             AND i2.id != i.id) as atrasos_anteriores,
          -- Calificaciones (indicador de compromiso)
          COALESCE(AVG(c.calificacion), 0) as promedio_calificaciones
        FROM alumnos a
        JOIN inscripciones i ON a.id = i.alumno_id
        LEFT JOIN grupos g ON i.grupo_id = g.id
        LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
        WHERE i.periodo_id = $1
          AND i.estado_pago = 'pendiente'
        GROUP BY a.id, a.nombre, a.apellido_paterno, a.apellido_materno, 
                 a.telefono, a.email, g.codigo, i.monto, i.estado_pago, 
                 i.fecha_limite_pago, i.fecha_pago, dias_atraso
      )
      SELECT 
        id,
        nombre_completo,
        telefono,
        email,
        grupo,
        monto,
        dias_atraso,
        pagos_anteriores,
        atrasos_anteriores,
        promedio_calificaciones,
        -- Score de prioridad (0-100, más alto = más urgente)
        (
          -- Días de atraso (máximo 40 puntos)
          CASE 
            WHEN dias_atraso > 60 THEN 40
            WHEN dias_atraso > 30 THEN 30
            WHEN dias_atraso > 15 THEN 20
            WHEN dias_atraso > 7 THEN 10
            ELSE 5
          END +
          -- Monto (máximo 25 puntos)
          CASE 
            WHEN monto >= 5000 THEN 25
            WHEN monto >= 3000 THEN 15
            WHEN monto >= 1500 THEN 10
            ELSE 5
          END +
          -- Historial de atrasos (máximo 20 puntos)
          CASE 
            WHEN atrasos_anteriores > 2 THEN 20
            WHEN atrasos_anteriores > 0 THEN 10
            ELSE 0
          END +
          -- Compromiso académico (máximo 15 puntos)
          CASE 
            WHEN promedio_calificaciones > 0 AND promedio_calificaciones < 70 THEN 15
            WHEN promedio_calificaciones >= 85 THEN -5  -- Descuento por buen estudiante
            ELSE 0
          END
        ) as score_prioridad,
        -- Predicción de pago
        CASE 
          WHEN pagos_anteriores > 0 AND atrasos_anteriores = 0 THEN 'alta'
          WHEN pagos_anteriores > 0 AND atrasos_anteriores <= 1 THEN 'media'
          WHEN atrasos_anteriores > 2 THEN 'baja'
          ELSE 'desconocida'
        END as probabilidad_pago,
        -- Guion sugerido
        CASE 
          WHEN dias_atraso > 30 THEN 'urgente_formal'
          WHEN dias_atraso > 15 THEN 'recordatorio_firme'
          WHEN dias_atraso > 7 THEN 'recordatorio_amable'
          ELSE 'seguimiento'
        END as tipo_contacto
      FROM datos_pago
      ORDER BY score_prioridad DESC, dias_atraso DESC
    `, [periodoId]);

    // Clasificar por urgencia
    const resultado = {
      total: listaCobros.rows.length,
      urgente: listaCobros.rows.filter(c => c.score_prioridad >= 70),
      alta_prioridad: listaCobros.rows.filter(c => c.score_prioridad >= 50 && c.score_prioridad < 70),
      media_prioridad: listaCobros.rows.filter(c => c.score_prioridad >= 30 && c.score_prioridad < 50),
      baja_prioridad: listaCobros.rows.filter(c => c.score_prioridad < 30),
      todos: listaCobros.rows
    };

    logger.info(`Lista de cobranza: ${resultado.urgente.length} casos urgentes`);
    
    return resultado;

  } catch (error) {
    logger.error('Error al obtener lista priorizada de cobranza:', error);
    throw error;
  }
};

/**
 * Obtener guiones de llamada sugeridos
 */
export const obtenerGuionesLlamada = () => {
  return {
    urgente_formal: {
      titulo: '🚨 Caso Urgente (>30 días)',
      apertura: 'Buenos días/tardes, habla [NOMBRE] de coordinación del TESCHA. ¿Es usted [NOMBRE ALUMNO/PADRE]?',
      cuerpo: 'Le llamo porque tenemos un adeudo pendiente desde hace más de 30 días por $[MONTO]. Es importante que regularicemos esta situación para que [NOMBRE ALUMNO] pueda continuar sus estudios sin interrupciones.',
      cierre: '¿Cuándo podría realizar el pago? Podemos ofrecer facilidades si es necesario.',
      tono: 'Firme pero respetuoso'
    },
    recordatorio_firme: {
      titulo: '⚠️ Recordatorio Firme (15-30 días)',
      apertura: 'Buenos días/tardes, soy [NOMBRE] del área administrativa del TESCHA.',
      cuerpo: 'Le recuerdo que tiene un pago pendiente de $[MONTO] con [DIAS] días de atraso. La fecha límite era el [FECHA]. Para evitar recargos, es importante que regularice pronto.',
      cierre: '¿Podría realizar el pago esta semana? Estoy aquí para ayudarle.',
      tono: 'Profesional y directo'
    },
    recordatorio_amable: {
      titulo: '💙 Recordatorio Amable (7-15 días)',
      apertura: 'Hola, buenos días/tardes. Habla [NOMBRE] del TESCHA.',
      cuerpo: 'Solo quería recordarle que tiene un pago pendiente de $[MONTO]. Sé que a veces se nos pasan las fechas, así que le hago este recordatorio amistoso.',
      cierre: '¿Tiene alguna duda o necesita apoyo para realizar el pago?',
      tono: 'Amable y comprensivo'
    },
    seguimiento: {
      titulo: '📞 Seguimiento (<7 días)',
      apertura: 'Hola, soy [NOMBRE] del TESCHA. ¿Cómo está?',
      cuerpo: 'Solo quería confirmar que recibió el recordatorio de pago de $[MONTO]. Todavía está dentro del plazo, pero quería asegurarme de que no haya ningún inconveniente.',
      cierre: '¿Alguna pregunta o necesita los datos de pago?',
      tono: 'Preventivo y servicial'
    }
  };
};

/**
 * Predicción de pagos para la semana
 */
export const predecirPagosSemana = async (periodoId) => {
  try {
    const prediccion = await pool.query(`
      WITH historial AS (
        SELECT 
          alumno_id,
          COUNT(*) as total_pagos,
          AVG(EXTRACT(DAY FROM fecha_pago - fecha_limite_pago)) as promedio_dias_retraso
        FROM inscripciones
        WHERE estado_pago = 'pagado'
          AND fecha_pago IS NOT NULL
        GROUP BY alumno_id
      ),
      pendientes_actuales AS (
        SELECT 
          i.alumno_id,
          a.nombre || ' ' || a.apellido_paterno as nombre,
          i.monto,
          i.fecha_limite_pago,
          EXTRACT(DAY FROM NOW() - i.fecha_limite_pago) as dias_atraso,
          h.promedio_dias_retraso
        FROM inscripciones i
        JOIN alumnos a ON i.alumno_id = a.id
        LEFT JOIN historial h ON i.alumno_id = h.alumno_id
        WHERE i.periodo_id = $1
          AND i.estado_pago = 'pendiente'
      )
      SELECT 
        nombre,
        monto,
        -- Probabilidad basada en historial
        CASE 
          WHEN promedio_dias_retraso IS NULL THEN 'desconocida'
          WHEN promedio_dias_retraso <= 3 AND dias_atraso <= 7 THEN 'muy_alta'
          WHEN promedio_dias_retraso <= 7 AND dias_atraso <= 15 THEN 'alta'
          WHEN promedio_dias_retraso <= 15 THEN 'media'
          ELSE 'baja'
        END as probabilidad,
        dias_atraso
      FROM pendientes_actuales
      WHERE promedio_dias_retraso IS NOT NULL
        AND dias_atraso <= 30
      ORDER BY 
        CASE 
          WHEN promedio_dias_retraso <= 3 THEN 1
          WHEN promedio_dias_retraso <= 7 THEN 2
          WHEN promedio_dias_retraso <= 15 THEN 3
          ELSE 4
        END,
        dias_atraso ASC
      LIMIT 20
    `, [periodoId]);

    // Calcular proyección de ingresos
    const proyeccion = {
      muy_probable: prediccion.rows.filter(p => p.probabilidad === 'muy_alta'),
      probable: prediccion.rows.filter(p => p.probabilidad === 'alta'),
      posible: prediccion.rows.filter(p => p.probabilidad === 'media'),
      ingreso_esperado: prediccion.rows
        .filter(p => ['muy_alta', 'alta'].includes(p.probabilidad))
        .reduce((sum, p) => sum + parseFloat(p.monto), 0)
    };

    return proyeccion;

  } catch (error) {
    logger.error('Error al predecir pagos:', error);
    throw error;
  }
};

/**
 * Análisis de eficiencia del administrativo
 */
export const analizarEficienciaCobranza = async (periodoId) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE estado_pago = 'pagado') as pagos_completados,
        COUNT(*) FILTER (WHERE estado_pago = 'pendiente') as pagos_pendientes,
        COUNT(*) FILTER (WHERE estado_pago = 'pendiente' AND fecha_limite_pago < NOW()) as pagos_vencidos,
        SUM(monto) FILTER (WHERE estado_pago = 'pagado') as ingresos_cobrados,
        SUM(monto) FILTER (WHERE estado_pago = 'pendiente') as ingresos_pendientes,
        AVG(EXTRACT(DAY FROM fecha_pago - fecha_limite_pago)) FILTER (WHERE estado_pago = 'pagado' AND fecha_pago > fecha_limite_pago) as promedio_dias_retraso
      FROM inscripciones
      WHERE periodo_id = $1
    `, [periodoId]);

    const data = stats.rows[0];
    const totalInscripciones = parseInt(data.pagos_completados) + parseInt(data.pagos_pendientes);
    const tasaCobro = totalInscripciones > 0 
      ? (parseInt(data.pagos_completados) / totalInscripciones * 100).toFixed(1)
      : 0;

    return {
      pagos_completados: parseInt(data.pagos_completados),
      pagos_pendientes: parseInt(data.pagos_pendientes),
      pagos_vencidos: parseInt(data.pagos_vencidos),
      tasa_cobro: parseFloat(tasaCobro),
      ingresos_cobrados: parseFloat(data.ingresos_cobrados || 0),
      ingresos_pendientes: parseFloat(data.ingresos_pendientes || 0),
      promedio_dias_retraso: data.promedio_dias_retraso ? parseFloat(data.promedio_dias_retraso).toFixed(1) : 0,
      evaluacion: tasaCobro >= 90 ? 'excelente' : tasaCobro >= 75 ? 'bueno' : 'necesita_mejora',
      recomendaciones: [
        tasaCobro < 75 && '⚠️ Tasa de cobro baja. Intensifica seguimiento telefónico.',
        data.pagos_vencidos > 10 && '🚨 Muchos pagos vencidos. Prioriza casos urgentes.',
        data.promedio_dias_retraso > 10 && '📞 Alumnos pagan tarde. Envía recordatorios más temprano.',
        tasaCobro >= 90 && '✅ Excelente trabajo. Mantén las estrategias actuales.'
      ].filter(Boolean)
    };

  } catch (error) {
    logger.error('Error al analizar eficiencia de cobranza:', error);
    throw error;
  }
};

export default {
  obtenerListaPriorizadaCobranza,
  obtenerGuionesLlamada,
  predecirPagosSemana,
  analizarEficienciaCobranza
};
