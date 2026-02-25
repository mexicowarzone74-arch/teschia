import pool from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * 🤖 Sistema de Análisis Predictivo e Inteligencia Artificial
 * 
 * Funcionalidades:
 * - Detección de alumnos en riesgo
 * - Predicción de deserción
 * - Análisis de tendencias
 * - Recomendaciones proactivas
 * - Dashboard inteligente con proyecciones
 */

/**
 * Detectar alumnos en riesgo de deserción
 */
export const detectarAlumnosEnRiesgo = async (periodoId) => {
  try {
    const alumnosRiesgo = await pool.query(`
      WITH datos_alumno AS (
        SELECT 
          a.id,
          a.nombre,
          a.apellido_paterno,
          a.apellido_materno,
          a.telefono,
          a.correo,
          MAX(g.codigo) as grupo_codigo,
          -- Calificación promedio
          COALESCE(AVG(c.calificacion), 0) as promedio_cal,
          COUNT(DISTINCT c.id) as num_calificaciones,
          -- Días de retraso en pago (máximo retraso entre todos los pagos pendientes)
          COALESCE(MAX(CASE 
            WHEN p.estatus IN ('pendiente', 'prorroga') AND p.fecha_vencimiento < NOW() 
            THEN EXTRACT(DAY FROM NOW() - p.fecha_vencimiento)
            ELSE 0 
          END), 0) as dias_retraso,
          -- Asistencias
          COUNT(DISTINCT ast.id) FILTER (WHERE ast.presente = true) as asistencias,
          COUNT(DISTINCT ast.id) FILTER (WHERE ast.presente = false) as faltas,
          COUNT(DISTINCT ast.id) as total_registros
        FROM alumnos a
        JOIN inscripciones i ON a.id = i.alumno_id
        LEFT JOIN grupos g ON i.grupo_id = g.id
        LEFT JOIN pagos p ON i.id = p.inscripcion_id
        LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
        LEFT JOIN asistencias ast ON i.id = ast.inscripcion_id
        WHERE i.periodo_id = $1
        GROUP BY a.id, a.nombre, a.apellido_paterno, a.apellido_materno, 
                 a.telefono, a.correo
      )
      SELECT 
        id,
        nombre || ' ' || apellido_paterno || ' ' || COALESCE(apellido_materno, '') as nombre_completo,
        telefono,
        correo,
        grupo_codigo,
        promedio_cal,
        dias_retraso,
        asistencias,
        faltas,
        total_registros,
        -- Calcular score de riesgo (0-100, más alto = más riesgo)
        (
          -- Retraso en pago (máximo 40 puntos)
          CASE 
            WHEN dias_retraso > 30 THEN 40
            WHEN dias_retraso > 15 THEN 30
            WHEN dias_retraso > 7 THEN 20
            WHEN dias_retraso > 0 THEN 10
            ELSE 0
          END +
          -- Calificaciones bajas (máximo 30 puntos)
          CASE 
            WHEN promedio_cal > 0 AND promedio_cal < 60 THEN 30
            WHEN promedio_cal >= 60 AND promedio_cal < 70 THEN 20
            WHEN promedio_cal >= 70 AND promedio_cal < 80 THEN 10
            ELSE 0
          END +
          -- Inasistencias (máximo 30 puntos)
          CASE 
            WHEN total_registros > 0 THEN
              CASE 
                WHEN (faltas::float / total_registros) > 0.3 THEN 30
                WHEN (faltas::float / total_registros) > 0.2 THEN 20
                WHEN (faltas::float / total_registros) > 0.1 THEN 10
                ELSE 0
              END
            ELSE 0
          END
        ) as score_riesgo,
        -- Razones del riesgo
        ARRAY_REMOVE(ARRAY[
          CASE WHEN dias_retraso > 7 THEN 'Pago atrasado ' || dias_retraso || ' días' END,
          CASE WHEN promedio_cal > 0 AND promedio_cal < 70 THEN 'Calificaciones bajas (' || ROUND(promedio_cal, 1) || ')' END,
          CASE WHEN total_registros > 0 AND (faltas::float / total_registros) > 0.2 THEN 'Inasistencias frecuentes' END
        ], NULL) as razones_riesgo
      FROM datos_alumno
      WHERE (
        -- Criterios de riesgo
        dias_retraso > 7 OR
        (promedio_cal > 0 AND promedio_cal < 70) OR
        (total_registros > 0 AND (faltas::float / total_registros) > 0.2)
      )
      ORDER BY score_riesgo DESC
    `, [periodoId]);

    // Clasificar por nivel de riesgo
    const resultado = {
      critico: alumnosRiesgo.rows.filter(a => a.score_riesgo >= 70),
      alto: alumnosRiesgo.rows.filter(a => a.score_riesgo >= 50 && a.score_riesgo < 70),
      medio: alumnosRiesgo.rows.filter(a => a.score_riesgo >= 30 && a.score_riesgo < 50),
      total: alumnosRiesgo.rows.length
    };

    logger.info(`Análisis de riesgo completado: ${resultado.total} alumnos en riesgo`);
    
    return resultado;

  } catch (error) {
    logger.error('Error al detectar alumnos en riesgo:', error);
    throw error;
  }
};

/**
 * Generar proyecciones de ingresos y estadísticas
 */
export const generarProyecciones = async (periodoId) => {
  try {
    // Ingresos actuales vs proyectados
    const proyeccionIngresos = await pool.query(`
      SELECT 
        COALESCE((SELECT COUNT(*) FROM pagos p 
         JOIN inscripciones i ON p.inscripcion_id = i.id 
         WHERE i.periodo_id = $1), 0)::int as total_pagos,
        
        COALESCE((SELECT COUNT(*) FROM pagos p 
         JOIN inscripciones i ON p.inscripcion_id = i.id 
         WHERE i.periodo_id = $1 AND p.estatus IN ('pagado', 'completado')), 0)::int as pagados,
        
        COALESCE((SELECT SUM(p.monto_final) FROM pagos p 
         JOIN inscripciones i ON p.inscripcion_id = i.id 
         WHERE i.periodo_id = $1 AND p.estatus IN ('pagado', 'completado')), 0)::numeric as ingresos_actuales,
        
        COALESCE((SELECT SUM(p.monto_final) FROM pagos p 
         JOIN inscripciones i ON p.inscripcion_id = i.id 
         WHERE i.periodo_id = $1), 0)::numeric as ingresos_proyectados,
        
        COALESCE((SELECT AVG(p.monto_final) FROM pagos p 
         JOIN inscripciones i ON p.inscripcion_id = i.id 
         WHERE i.periodo_id = $1), 0)::numeric as monto_promedio
    `, [periodoId]);
    
    // Calcular valores derivados en JavaScript para evitar problemas de tipos SQL
    const row = proyeccionIngresos.rows[0];
    const total_pagos = parseInt(row.total_pagos) || 0;
    const pagados = parseInt(row.pagados) || 0;
    const ingresos_actuales = parseFloat(row.ingresos_actuales) || 0;
    const ingresos_proyectados = parseFloat(row.ingresos_proyectados) || 0;
    const monto_promedio = parseFloat(row.monto_promedio) || 0;
    
    const pendientes = total_pagos - pagados;
    const ingresos_pendientes = ingresos_proyectados - ingresos_actuales;
    const tasa_cobro = total_pagos > 0 ? (pagados / total_pagos) * 100 : 0;
    
    // Crear objeto con valores calculados y redondeados
    proyeccionIngresos.rows[0] = {
      total_pagos,
      pagados,
      pendientes,
      ingresos_actuales: Math.round(ingresos_actuales * 100) / 100,
      ingresos_proyectados: Math.round(ingresos_proyectados * 100) / 100,
      ingresos_pendientes: Math.round(ingresos_pendientes * 100) / 100,
      tasa_cobro: Math.round(tasa_cobro * 10) / 10,
      monto_promedio: Math.round(monto_promedio * 100) / 100
    };

    // Tendencia de pagos (últimos 7 días)
    const tendenciaPagos = await pool.query(`
      SELECT 
        DATE(p.fecha_pago) as fecha,
        COUNT(*) as num_pagos,
        SUM(p.monto_final) as total_dia
      FROM inscripciones i
      JOIN pagos p ON i.id = p.inscripcion_id
      WHERE i.periodo_id = $1 
        AND p.estatus IN ('pagado', 'completado')
        AND p.fecha_pago >= NOW() - INTERVAL '7 days'
      GROUP BY 1
      ORDER BY fecha DESC
    `, [periodoId]);

    // Predicción: días estimados para completar cobro
    const proyeccion = proyeccionIngresos.rows[0];
    const tendencia = tendenciaPagos.rows;
    
    let diasEstimados = null;
    if (tendencia.length > 0 && proyeccion.pendientes > 0) {
      const pagosPorDia = tendencia.reduce((sum, t) => sum + parseInt(t.num_pagos), 0) / tendencia.length;
      if (pagosPorDia > 0) {
        diasEstimados = Math.ceil(proyeccion.pendientes / pagosPorDia);
      }
    }

    return {
      proyeccion: proyeccion,
      tendencia: tendencia,
      prediccion: {
        dias_para_completar: diasEstimados,
        fecha_estimada: diasEstimados ? new Date(Date.now() + diasEstimados * 24 * 60 * 60 * 1000).toLocaleDateString() : null
      }
    };

  } catch (error) {
    logger.error('Error al generar proyecciones:', error);
    throw error;
  }
};

/**
 * Obtener recomendaciones diarias para el coordinador
 */
export const obtenerRecomendacionesDiarias = async (periodoId, userId) => {
  try {
    const recomendaciones = [];

    // 1. Revisar pagos urgentes
    const pagosUrgentes = await pool.query(`
      SELECT COUNT(*) as count
      FROM inscripciones i
      JOIN pagos p ON i.id = p.inscripcion_id
      WHERE i.periodo_id = $1
        AND p.estatus IN ('pendiente', 'prorroga')
        AND p.fecha_vencimiento <= NOW() + INTERVAL '2 days'
    `, [periodoId]);

    if (parseInt(pagosUrgentes.rows[0].count) > 0) {
      recomendaciones.push({
        prioridad: 'alta',
        categoria: 'pagos',
        titulo: `⚠️ ${pagosUrgentes.rows[0].count} pagos vencen en 2 días`,
        accion: 'Envía recordatorios HOY para evitar retrasos',
        pasos: [
          'Ve a "Pagos"',
          'Filtra por "Próximos a vencer"',
          'Click en "Enviar Recordatorios Masivos"'
        ],
        tiempo_estimado: '5 minutos'
      });
    }

    // 2. Verificar grupos sin maestro
    const gruposSinMaestro = await pool.query(`
      SELECT COUNT(*) as count
      FROM grupos g
      WHERE g.periodo_id = $1 AND g.maestro_id IS NULL
    `, [periodoId]);

    if (parseInt(gruposSinMaestro.rows[0].count) > 0) {
      recomendaciones.push({
        prioridad: 'media',
        categoria: 'grupos',
        titulo: `📚 ${gruposSinMaestro.rows[0].count} grupos sin maestro`,
        accion: 'Usa "Asignación Masiva" con Sugerencias IA',
        pasos: [
          'Ve a "Grupos"',
          'Selecciona grupos sin maestro (checkbox)',
          'Click "Asignar a X grupos"',
          'El sistema valida conflictos automáticamente'
        ],
        tiempo_estimado: '10 minutos'
      });
    }

    // 3. Detectar alumnos en riesgo crítico
    const riesgo = await detectarAlumnosEnRiesgo(periodoId);
    
    if (riesgo.critico.length > 0) {
      recomendaciones.push({
        prioridad: 'alta',
        categoria: 'alumnos',
        titulo: `🚨 ${riesgo.critico.length} alumnos en riesgo CRÍTICO`,
        accion: 'Contacta a estos alumnos urgentemente',
        pasos: [
          'Revisa razones del riesgo',
          'Llama o envía mensaje personalizado',
          'Ofrece plan de pagos o tutorías',
          'Registra seguimiento'
        ],
        tiempo_estimado: '30 minutos',
        detalle: riesgo.critico.slice(0, 3).map(a => ({
          nombre: a.nombre_completo,
          razones: a.razones_riesgo
        }))
      });
    }

    // 4. Revisar calificaciones pendientes
    const calPendientes = await pool.query(`
      SELECT COUNT(*) as count
      FROM (
        SELECT i.grupo_id
        FROM inscripciones i
        LEFT JOIN (
          SELECT inscripcion_id, COUNT(*) as num_cal
          FROM calificaciones
          GROUP BY inscripcion_id
        ) c ON i.id = c.inscripcion_id
        WHERE i.periodo_id = $1
          AND (c.num_cal IS NULL OR c.num_cal < 3)
        GROUP BY i.grupo_id
        HAVING COUNT(*) > 3
      ) grupos_incompletos
    `, [periodoId]);

    if (parseInt(calPendientes.rows[0].count) > 0) {
      recomendaciones.push({
        prioridad: 'baja',
        categoria: 'calificaciones',
        titulo: '📝 Grupos con calificaciones incompletas',
        accion: 'Recuerda a los maestros subir calificaciones',
        pasos: [
          'Ve a "Calificaciones"',
          'Identifica grupos faltantes',
          'Contacta a los maestros',
          'Comparte plantilla CSV si es necesario'
        ],
        tiempo_estimado: '15 minutos'
      });
    }

    // 5. Análisis de tendencias positivas
    const tendenciaPositiva = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT p.id) 
         FROM inscripciones i
         JOIN pagos p ON i.id = p.inscripcion_id
         WHERE i.periodo_id = $1 
           AND p.fecha_pago >= NOW() - INTERVAL '7 days') as pagos_semana,
        (SELECT AVG(c.calificacion) 
         FROM inscripciones i
         JOIN calificaciones c ON i.id = c.inscripcion_id
         WHERE i.periodo_id = $1) as promedio_general
    `, [periodoId]);

    const stats = tendenciaPositiva.rows[0];
    if (parseInt(stats.pagos_semana) > 10) {
      recomendaciones.push({
        prioridad: 'info',
        categoria: 'exito',
        titulo: `✅ ${stats.pagos_semana} pagos esta semana`,
        accion: 'Buen ritmo de cobro, mantén las estrategias actuales',
        tiempo_estimado: null
      });
    }

    // Ordenar por prioridad
    const orden = { alta: 0, media: 1, baja: 2, info: 3 };
    recomendaciones.sort((a, b) => orden[a.prioridad] - orden[b.prioridad]);

    return recomendaciones;

  } catch (error) {
    logger.error('Error al obtener recomendaciones diarias:', error);
    throw error;
  }
};

/**
 * Generar resumen ejecutivo inteligente
 */
export const generarResumenEjecutivo = async (periodoId) => {
  try {
    // Métricas clave
    const metricas = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT alumno_id) FROM inscripciones WHERE periodo_id = $1) as total_alumnos,
        (SELECT COUNT(DISTINCT id) FROM grupos WHERE periodo_id = $1) as total_grupos,
        (SELECT COUNT(*) FROM maestros m 
         JOIN usuarios u ON m.usuario_id = u.id 
         WHERE m.activo = true AND u.rol = 'maestro') as total_maestros,
        (SELECT AVG(c.calificacion) FROM calificaciones c 
         JOIN inscripciones i ON c.inscripcion_id = i.id 
         WHERE i.periodo_id = $1) as promedio_general,
        (SELECT COUNT(*) FROM pagos p 
         JOIN inscripciones i ON p.inscripcion_id = i.id 
         WHERE i.periodo_id = $1 AND p.estatus IN ('pagado', 'completado'))::float / 
        NULLIF((SELECT COUNT(*) FROM pagos p 
         JOIN inscripciones i ON p.inscripcion_id = i.id 
         WHERE i.periodo_id = $1), 0) * 100 as tasa_pagos,
        (SELECT SUM(p.monto_final) FROM pagos p 
         JOIN inscripciones i ON p.inscripcion_id = i.id 
         WHERE i.periodo_id = $1 AND p.estatus IN ('pagado', 'completado')) as ingresos_totales
    `, [periodoId]);

    const stats = metricas.rows[0];

    // Generar insights
    const insights = [];

    if (parseFloat(stats.tasa_pagos) < 70) {
      insights.push('⚠️ Tasa de cobro baja. Considera enviar recordatorios o extender fechas límite.');
    } else if (parseFloat(stats.tasa_pagos) > 90) {
      insights.push('✅ Excelente tasa de cobro. Proceso de pagos funcionando óptimamente.');
    }

    if (stats.promedio_general && parseFloat(stats.promedio_general) < 70) {
      insights.push('📚 Promedio general bajo. Recomendado: Reunión con maestros y asesorías.');
    } else if (stats.promedio_general && parseFloat(stats.promedio_general) > 85) {
      insights.push('🎓 Alto rendimiento académico. Felicita a maestros y alumnos.');
    }

    const alumnosPorGrupo = parseInt(stats.total_alumnos) / parseInt(stats.total_grupos || 1);
    if (alumnosPorGrupo > 25) {
      insights.push('👥 Grupos con mucha carga. Considera abrir paralelos para mejor atención.');
    } else if (alumnosPorGrupo < 10) {
      insights.push('📉 Grupos con pocos alumnos. Analiza si es necesario consolidar.');
    }

    return {
      metricas: {
        total_alumnos: parseInt(stats.total_alumnos),
        total_grupos: parseInt(stats.total_grupos),
        total_maestros: parseInt(stats.total_maestros),
        promedio_general: parseFloat(stats.promedio_general || 0).toFixed(2),
        tasa_pagos: parseFloat(stats.tasa_pagos || 0).toFixed(1),
        ingresos_totales: parseFloat(stats.ingresos_totales || 0).toFixed(2)
      },
      insights,
      estado_general: parseFloat(stats.tasa_pagos) > 80 && parseFloat(stats.promedio_general) > 75 ? 'excelente' : 
                      parseFloat(stats.tasa_pagos) > 60 && parseFloat(stats.promedio_general) > 60 ? 'bueno' : 'necesita_atencion'
    };

  } catch (error) {
    logger.error('Error al generar resumen ejecutivo:', error);
    throw error;
  }
};

export default {
  detectarAlumnosEnRiesgo,
  generarProyecciones,
  obtenerRecomendacionesDiarias,
  generarResumenEjecutivo
};
