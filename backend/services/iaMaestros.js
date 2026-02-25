import pool from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * 🧑‍🏫 IA para Maestros - Sistema Inteligente de Análisis de Alumnos
 * 
 * Funcionalidades:
 * - Detectar alumnos en riesgo de reprobar
 * - Análisis de rendimiento del maestro
 * - Recomendaciones personalizadas
 * - Comparativas con otros grupos
 */

/**
 * Analizar alumnos del maestro - Detectar en riesgo
 */
export const analizarMisAlumnos = async (maestroId, periodoId) => {
  try {
    const alumnosAnalisis = await pool.query(`
      WITH datos_alumno AS (
        SELECT 
          a.id,
          a.nombre || ' ' || a.apellido_paterno || ' ' || COALESCE(a.apellido_materno, '') as nombre_completo,
          g.codigo as grupo,
          g.nombre as nombre_grupo,
          -- Calificaciones
          COALESCE(AVG(c.calificacion), 0) as promedio,
          COUNT(DISTINCT c.id) as num_calificaciones,
          -- Asistencias
          COUNT(DISTINCT ast.id) FILTER (WHERE ast.estado = 'presente') as asistencias,
          COUNT(DISTINCT ast.id) FILTER (WHERE ast.estado = 'falta') as faltas,
          COUNT(DISTINCT ast.id) as total_registros,
          -- Pagos
          i.estado_pago,
          CASE 
            WHEN i.estado_pago = 'pendiente' AND i.fecha_limite_pago < NOW() 
            THEN EXTRACT(DAY FROM NOW() - i.fecha_limite_pago)
            ELSE 0 
          END as dias_atraso_pago
        FROM alumnos a
        JOIN inscripciones i ON a.id = i.alumno_id
        JOIN grupos g ON i.grupo_id = g.id
        LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
        LEFT JOIN asistencias ast ON i.id = ast.inscripcion_id
        WHERE g.maestro_id = $1 
          AND i.periodo_id = $2
        GROUP BY a.id, a.nombre, a.apellido_paterno, a.apellido_materno, 
                 g.codigo, g.nombre, i.estado_pago, i.fecha_limite_pago, dias_atraso_pago
      )
      SELECT 
        id,
        nombre_completo,
        grupo,
        nombre_grupo,
        ROUND(promedio, 1) as promedio,
        num_calificaciones,
        asistencias,
        faltas,
        total_registros,
        CASE WHEN total_registros > 0 
          THEN ROUND((asistencias::float / total_registros * 100), 1)
          ELSE 0 
        END as porcentaje_asistencia,
        estado_pago,
        dias_atraso_pago,
        -- Score de riesgo (0-100, más alto = más riesgo)
        (
          -- Calificaciones bajas (máximo 40 puntos)
          CASE 
            WHEN promedio > 0 AND promedio < 60 THEN 40
            WHEN promedio >= 60 AND promedio < 70 THEN 25
            WHEN promedio >= 70 AND promedio < 80 THEN 10
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
          END +
          -- Atraso en pago (máximo 30 puntos)
          CASE 
            WHEN dias_atraso_pago > 30 THEN 30
            WHEN dias_atraso_pago > 15 THEN 20
            WHEN dias_atraso_pago > 7 THEN 10
            ELSE 0
          END
        ) as score_riesgo,
        -- Problemas identificados
        ARRAY_REMOVE(ARRAY[
          CASE WHEN promedio > 0 AND promedio < 70 THEN 'Calificaciones bajas' END,
          CASE WHEN total_registros > 0 AND (faltas::float / total_registros) > 0.2 THEN 'Muchas faltas' END,
          CASE WHEN dias_atraso_pago > 7 THEN 'Atraso en pago' END,
          CASE WHEN num_calificaciones < 3 THEN 'Pocas calificaciones registradas' END
        ], NULL) as problemas
      FROM datos_alumno
      ORDER BY score_riesgo DESC, promedio ASC
    `, [maestroId, periodoId]);

    // Clasificar alumnos
    const resultado = {
      total: alumnosAnalisis.rows.length,
      en_riesgo_alto: alumnosAnalisis.rows.filter(a => a.score_riesgo >= 50),
      necesitan_atencion: alumnosAnalisis.rows.filter(a => a.score_riesgo >= 30 && a.score_riesgo < 50),
      estables: alumnosAnalisis.rows.filter(a => a.score_riesgo < 30),
      todos: alumnosAnalisis.rows
    };

    logger.info(`Análisis maestro ${maestroId}: ${resultado.en_riesgo_alto.length} alumnos en riesgo alto`);
    
    return resultado;

  } catch (error) {
    logger.error('Error al analizar alumnos del maestro:', error);
    throw error;
  }
};

/**
 * Obtener recomendaciones personalizadas para el maestro
 */
export const obtenerRecomendacionesMaestro = async (maestroId, periodoId) => {
  try {
    const recomendaciones = [];

    // 1. Analizar alumnos en riesgo
    const analisis = await analizarMisAlumnos(maestroId, periodoId);
    
    if (analisis.en_riesgo_alto.length > 0) {
      recomendaciones.push({
        prioridad: 'alta',
        categoria: 'alumnos_riesgo',
        titulo: `🚨 ${analisis.en_riesgo_alto.length} alumno(s) en riesgo alto`,
        descripcion: 'Estos alumnos necesitan atención inmediata para evitar que reprueben',
        acciones: [
          'Programa asesorías individuales',
          'Contacta a los padres/tutores',
          'Revisa si tienen problemas personales',
          'Considera tareas de recuperación'
        ],
        alumnos: analisis.en_riesgo_alto.slice(0, 5).map(a => ({
          nombre: a.nombre_completo,
          promedio: a.promedio,
          asistencia: a.porcentaje_asistencia,
          problemas: a.problemas
        }))
      });
    }

    // 2. Alumnos con pocas calificaciones
    const pocasCalificaciones = analisis.todos.filter(a => a.num_calificaciones < 3);
    if (pocasCalificaciones.length > 0) {
      recomendaciones.push({
        prioridad: 'media',
        categoria: 'calificaciones',
        titulo: `📝 ${pocasCalificaciones.length} alumno(s) con pocas calificaciones`,
        descripcion: 'Asegúrate de tener suficientes calificaciones para evaluar correctamente',
        acciones: [
          'Sube las calificaciones faltantes',
          'Planifica evaluaciones adicionales',
          'Revisa si faltan trabajos por calificar'
        ]
      });
    }

    // 3. Alumnos con inasistencias altas
    const altasInasistencias = analisis.todos.filter(a => a.porcentaje_asistencia < 80 && a.total_registros > 5);
    if (altasInasistencias.length > 0) {
      recomendaciones.push({
        prioridad: 'alta',
        categoria: 'asistencias',
        titulo: `⚠️ ${altasInasistencias.length} alumno(s) con baja asistencia`,
        descripcion: 'La asistencia es crítica para el aprendizaje',
        acciones: [
          'Habla con los alumnos sobre su asistencia',
          'Notifica a coordinación',
          'Ofrece material de recuperación'
        ],
        alumnos: altasInasistencias.slice(0, 5).map(a => ({
          nombre: a.nombre_completo,
          asistencia: `${a.porcentaje_asistencia}%`,
          faltas: a.faltas
        }))
      });
    }

    // 4. Reconocimiento a alumnos destacados
    const destacados = analisis.todos
      .filter(a => a.promedio >= 90 && a.porcentaje_asistencia >= 90)
      .slice(0, 3);
    
    if (destacados.length > 0) {
      recomendaciones.push({
        prioridad: 'info',
        categoria: 'exito',
        titulo: `🏆 ${destacados.length} alumno(s) destacado(s)`,
        descripcion: '¡Reconoce su esfuerzo! El refuerzo positivo es poderoso',
        acciones: [
          'Felicítalos públicamente en clase',
          'Considera mencionarlos en coordinación',
          'Podrían ser tutores de compañeros'
        ],
        alumnos: destacados.map(a => ({
          nombre: a.nombre_completo,
          promedio: a.promedio,
          asistencia: `${a.porcentaje_asistencia}%`
        }))
      });
    }

    // 5. Recomendación general sobre el grupo
    const promedioGrupo = analisis.todos.length > 0
      ? analisis.todos.reduce((sum, a) => sum + parseFloat(a.promedio), 0) / analisis.todos.length
      : 0;

    if (promedioGrupo < 70) {
      recomendaciones.push({
        prioridad: 'alta',
        categoria: 'grupo',
        titulo: '📚 Promedio del grupo bajo',
        descripcion: `Promedio general: ${promedioGrupo.toFixed(1)}`,
        acciones: [
          'Revisa tu metodología de enseñanza',
          'Considera retroalimentación de alumnos',
          'Ajusta el ritmo de clase',
          'Consulta con coordinación pedagógica'
        ]
      });
    } else if (promedioGrupo >= 85) {
      recomendaciones.push({
        prioridad: 'info',
        categoria: 'exito',
        titulo: '✅ Excelente desempeño del grupo',
        descripcion: `Promedio general: ${promedioGrupo.toFixed(1)}`,
        acciones: [
          '¡Sigue así! Tu metodología funciona',
          'Comparte tus estrategias con otros maestros'
        ]
      });
    }

    // Ordenar por prioridad
    const orden = { alta: 0, media: 1, baja: 2, info: 3 };
    recomendaciones.sort((a, b) => orden[a.prioridad] - orden[b.prioridad]);

    return recomendaciones;

  } catch (error) {
    logger.error('Error al obtener recomendaciones para maestro:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas del maestro (mi desempeño)
 */
export const obtenerEstadisticasMaestro = async (maestroId, periodoId) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT i.alumno_id) as total_alumnos,
        COUNT(DISTINCT g.id) as total_grupos,
        ROUND(AVG(c.calificacion), 2) as promedio_general,
        COUNT(DISTINCT c.id) as total_calificaciones,
        COUNT(DISTINCT ast.id) FILTER (WHERE ast.estado = 'presente') as total_asistencias,
        COUNT(DISTINCT ast.id) FILTER (WHERE ast.estado = 'falta') as total_faltas
      FROM grupos g
      LEFT JOIN inscripciones i ON g.id = i.grupo_id AND i.periodo_id = $2
      LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
      LEFT JOIN asistencias ast ON i.id = ast.inscripcion_id
      WHERE g.maestro_id = $1
    `, [maestroId, periodoId]);

    // Comparar con promedio de todos los maestros
    const comparativa = await pool.query(`
      SELECT 
        ROUND(AVG(c.calificacion), 2) as promedio_todos_maestros
      FROM calificaciones c
      JOIN inscripciones i ON c.inscripcion_id = i.id
      WHERE i.periodo_id = $1
    `, [periodoId]);

    const miPromedio = parseFloat(stats.rows[0].promedio_general || 0);
    const promedioGeneral = parseFloat(comparativa.rows[0].promedio_todos_maestros || 0);

    return {
      mis_stats: {
        total_alumnos: parseInt(stats.rows[0].total_alumnos),
        total_grupos: parseInt(stats.rows[0].total_grupos),
        promedio_general: miPromedio,
        total_calificaciones: parseInt(stats.rows[0].total_calificaciones),
        tasa_asistencia: stats.rows[0].total_asistencias && stats.rows[0].total_faltas
          ? (parseInt(stats.rows[0].total_asistencias) / (parseInt(stats.rows[0].total_asistencias) + parseInt(stats.rows[0].total_faltas)) * 100).toFixed(1)
          : 0
      },
      comparativa: {
        promedio_general: promedioGeneral,
        diferencia: (miPromedio - promedioGeneral).toFixed(2),
        mejor_que_promedio: miPromedio > promedioGeneral
      },
      evaluacion: miPromedio >= 85 ? 'excelente' : miPromedio >= 75 ? 'bueno' : 'necesita_mejora'
    };

  } catch (error) {
    logger.error('Error al obtener estadísticas del maestro:', error);
    throw error;
  }
};

export default {
  analizarMisAlumnos,
  obtenerRecomendacionesMaestro,
  obtenerEstadisticasMaestro
};
