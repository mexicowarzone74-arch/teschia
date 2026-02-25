import pool from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * 🤖 Sistema Inteligente de Sugerencias para Asignación de Maestros
 * 
 * Analiza:
 * - ❌ Conflictos de horarios (mismo día/hora)
 * - 📊 Carga de trabajo actual (cuántos grupos y horas)
 * - 🎯 Experiencia con el nivel específico
 * - 🔄 Continuidad pedagógica (si dio el grupo antes)
 * - ⚖️ Balance de niveles asignados
 * - 📅 Distribución de días de trabajo
 * - 🏆 Certificación compatible con el nivel
 * 
 * Retorna maestros ordenados por score de compatibilidad (0-100+)
 */

// Convertir hora en formato HH:MM a minutos desde medianoche
const horaAMinutos = (hora) => {
  if (!hora) return 0;
  const [horas, minutos] = hora.split(':').map(Number);
  return (horas * 60) + minutos;
};

// Verificar si dos rangos de horarios se solapan
const horariosConflicto = (inicio1, fin1, inicio2, fin2) => {
  const min1 = horaAMinutos(inicio1);
  const max1 = horaAMinutos(fin1);
  const min2 = horaAMinutos(inicio2);
  const max2 = horaAMinutos(fin2);
  
  // Hay conflicto si los rangos se solapan
  return (min1 < max2 && max1 > min2);
};

// Parsear días de la semana desde string "L,M,X" a array
const parsearDias = (diasStr) => {
  if (!diasStr) return [];
  return diasStr.split(',').map(d => d.trim().toUpperCase());
};

/**
 * Obtener sugerencias de maestros para un grupo específico
 * @param {number} grupoId - ID del grupo
 * @param {number} periodoId - ID del periodo actual
 * @returns {Array} Lista de maestros con score de compatibilidad
 */
export const obtenerSugerenciasMaestros = async (grupoId, periodoId) => {
  const client = await pool.connect();
  
  try {
    // 1. Obtener datos del grupo target (nivel, código)
    const grupoTargetQuery = await client.query(`
      SELECT g.*, n.nombre as nivel_nombre
      FROM grupos g
      LEFT JOIN niveles n ON g.nivel_id = n.id
      WHERE g.id = $1
    `, [grupoId]);

    if (grupoTargetQuery.rows.length === 0) {
      throw new Error('Grupo no encontrado');
    }

    const grupoTarget = grupoTargetQuery.rows[0];

    // 2. Obtener horarios del grupo target
    const horariosGrupoQuery = await client.query(`
      SELECT dia, hora_inicio, hora_fin
      FROM grupos_horarios
      WHERE grupo_id = $1
    `, [grupoId]);

    if (horariosGrupoQuery.rows.length === 0) {
      throw new Error('No se encontraron horarios para el grupo');
    }

    const horariosTarget = horariosGrupoQuery.rows;

    // 3. Obtener todos los maestros activos con sus certificaciones
    const maestrosQuery = await client.query(`
      SELECT 
        m.id,
        m.nombre,
        m.apellido_paterno,
        m.apellido_materno,
        m.telefono,
        m.correo,
        m.activo
      FROM maestros m
      INNER JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.activo = true AND u.rol = 'maestro'
      ORDER BY m.nombre
    `);

    // 4. Obtener niveles que imparte cada maestro
    const nivelesQuery = await client.query(`
      SELECT maestro_id, nivel_id
      FROM maestros_niveles
      WHERE activo = true
    `);

    const nivelesPorMaestro = {};
    nivelesQuery.rows.forEach(n => {
      if (!nivelesPorMaestro[n.maestro_id]) {
        nivelesPorMaestro[n.maestro_id] = [];
      }
      nivelesPorMaestro[n.maestro_id].push(n.nivel_id);
    });

    // 5. Obtener grupos asignados a cada maestro en este periodo
    const asignacionesQuery = await client.query(`
      SELECT 
        g.maestro_id,
        g.id as grupo_id,
        g.nivel_id,
        g.codigo,
        gh.dia,
        gh.hora_inicio,
        gh.hora_fin,
        COUNT(DISTINCT i.id) as num_alumnos
      FROM grupos g
      INNER JOIN grupos_horarios gh ON g.id = gh.grupo_id
      LEFT JOIN inscripciones i ON g.id = i.grupo_id
      WHERE g.periodo_id = $1 
        AND g.maestro_id IS NOT NULL
      GROUP BY g.id, g.maestro_id, g.nivel_id, g.codigo, gh.dia, gh.hora_inicio, gh.hora_fin
    `, [periodoId]);

    // 6. Obtener historial de quien dio este grupo antes
    const historialQuery = await client.query(`
      SELECT g.maestro_id, m.nombre, m.apellido_paterno, p.fecha_inicio_inscripciones
      FROM grupos g
      INNER JOIN periodos p ON g.periodo_id = p.id
      INNER JOIN maestros m ON g.maestro_id = m.id
      WHERE g.codigo = $1 
        AND p.id < $2
      ORDER BY p.fecha_inicio_inscripciones DESC
      LIMIT 1
    `, [grupoTarget.codigo, periodoId]);

    const maestroAnterior = historialQuery.rows[0]?.maestro_id || null;

    // Organizar asignaciones por maestro
    const asignacionesPorMaestro = {};
    asignacionesQuery.rows.forEach(asig => {
      if (!asignacionesPorMaestro[asig.maestro_id]) {
        asignacionesPorMaestro[asig.maestro_id] = [];
      }
      asignacionesPorMaestro[asig.maestro_id].push(asig);
    });

    // 7. Calcular score inteligente para cada maestro
    const sugerencias = maestrosQuery.rows.map(maestro => {
      const asignaciones = asignacionesPorMaestro[maestro.id] || [];
      const nivelesImparte = nivelesPorMaestro[maestro.id] || [];
      
      let score = 100; // Score inicial perfecto
      const conflictos = [];
      const warnings = [];
      const bonuses = [];

      // ═══════════════════════════════════════
      // 🎯 BONUS: Experiencia con el nivel
      // ═══════════════════════════════════════
      if (nivelesImparte.includes(grupoTarget.nivel_id)) {
        score += 15;
        bonuses.push({ tipo: 'nivel', mensaje: `✓ Imparte ${grupoTarget.nivel_nombre}` });
      }

      // ═══════════════════════════════════════
      // 🔄 BONUS: Continuidad pedagógica
      // ═══════════════════════════════════════
      if (maestro.id === maestroAnterior) {
        score += 20;
        bonuses.push({ tipo: 'continuidad', mensaje: `✓ Dio este grupo antes (continuidad)` });
      }

      // ═══════════════════════════════════════
      // 🏆 BONUS: Certificación compatible
      // ═══════════════════════════════════════
      if (maestro.certificacion_idioma && maestro.nivel_certificado) {
        const nivelesMap = { 'Básico': ['A1', 'A2'], 'Intermedio': ['B1', 'B2'], 'Avanzado': ['C1', 'C2'] };
        const nivelCert = maestro.nivel_certificado.toUpperCase();
        
        if (grupoTarget.nivel_nombre && 
            nivelesMap[grupoTarget.nivel_nombre]?.some(n => nivelCert.includes(n))) {
          score += 10;
          bonuses.push({ tipo: 'certificacion', mensaje: `✓ Certificado ${maestro.nivel_certificado}` });
        }
      }

      // ═══════════════════════════════════════
      // ❌ ANÁLISIS DE CONFLICTOS DE HORARIO
      // ═══════════════════════════════════════
      horariosTarget.forEach(horarioTarget => {
        asignaciones.forEach(asig => {
          if (asig.dia === horarioTarget.dia) {
            const hayConflicto = horariosConflicto(
              horarioTarget.hora_inicio,
              horarioTarget.hora_fin,
              asig.hora_inicio,
              asig.hora_fin
            );

            if (hayConflicto) {
              score -= 100; // Descalificar completamente
              conflictos.push({
                tipo: 'horario',
                gravedad: 'critico',
                mensaje: `Conflicto ${asig.dia} de ${asig.hora_inicio} a ${asig.hora_fin}`,
                grupo_id: asig.grupo_id
              });
            }
          }
        });
      });

      // ═══════════════════════════════════════
      // 📊 ANÁLISIS DE CARGA DE TRABAJO
      // ═══════════════════════════════════════
      const gruposUnicos = [...new Set(asignaciones.map(a => a.grupo_id))];
      const numGrupos = gruposUnicos.length;

      // Analizar balance de niveles
      const gruposPorNivel = {};
      asignaciones.forEach(asig => {
        gruposPorNivel[asig.nivel_id] = (gruposPorNivel[asig.nivel_id] || 0) + 1;
      });

      const gruposDelMismoNivel = gruposPorNivel[grupoTarget.nivel_id] || 0;

      // ⚖️ PENALIZACIÓN: Demasiados grupos del mismo nivel
      if (gruposDelMismoNivel >= 4) {
        score -= 10;
        warnings.push({ tipo: 'balance', mensaje: `Ya tiene ${gruposDelMismoNivel} grupos de ${grupoTarget.nivel_nombre}` });
      }

      // 📈 PENALIZACIÓN: Carga total de grupos
      if (numGrupos >= 8) {
        score -= 30;
        warnings.push({ tipo: 'carga', mensaje: `${numGrupos} grupos (carga muy alta)` });
      } else if (numGrupos >= 6) {
        score -= 20;
        warnings.push({ tipo: 'carga', mensaje: `Tiene ${numGrupos} grupos (carga alta)` });
      } else if (numGrupos >= 4) {
        score -= 10;
        warnings.push({ tipo: 'carga', mensaje: `Tiene ${numGrupos} grupos (carga media)` });
      } else if (numGrupos === 0) {
        score += 10; // Bonus por disponibilidad total
      }

      // ⏰ ANÁLISIS: Horas semanales
      const horasPorGrupo = new Map();
      asignaciones.forEach(asig => {
        const duracion = (horaAMinutos(asig.hora_fin) - horaAMinutos(asig.hora_inicio)) / 60;
        const actual = horasPorGrupo.get(asig.grupo_id) || 0;
        horasPorGrupo.set(asig.grupo_id, actual + duracion);
      });
      
      const horasTotales = Array.from(horasPorGrupo.values()).reduce((sum, hrs) => sum + hrs, 0);

      if (horasTotales >= 25) {
        score -= 15;
        warnings.push({ tipo: 'horas', mensaje: `${horasTotales.toFixed(1)} hrs/semana (límite: 25)` });
      }

      // 📅 ANÁLISIS: Días de trabajo actuales
      const diasTrabajo = [...new Set(asignaciones.map(a => a.dia))];
      const diasTexto = diasTrabajo.length > 0 ? diasTrabajo.join(', ') : 'Ninguno';

      return {
        maestro_id: maestro.id,
        nombre_completo: `${maestro.nombre} ${maestro.apellido_paterno} ${maestro.apellido_materno || ''}`.trim(),
        correo: maestro.correo,
        telefono: maestro.telefono,
        score: Math.max(0, score),
        num_grupos_actuales: numGrupos,
        horas_semanales: parseFloat(horasTotales.toFixed(1)),
        dias_trabajo: diasTexto,
        conflictos,
        warnings,
        bonuses,
        disponible: score > 0,
        recomendado: score >= 70
      };
    });

    // Ordenar por score descendente
    sugerencias.sort((a, b) => b.score - a.score);

    logger.info(`Sugerencias generadas para grupo ${grupoId}: ${sugerencias.length} maestros analizados`);

    // Formatear horarios del grupo para la respuesta
    const diasMap = { 'lunes': 'Lun', 'martes': 'Mar', 'miercoles': 'Mié', 'jueves': 'Jue', 'viernes': 'Vie', 'sabado': 'Sáb' };
    const horariosTexto = horariosTarget.map(h => 
      `${diasMap[h.dia] || h.dia} ${h.hora_inicio.substring(0,5)}-${h.hora_fin.substring(0,5)}`
    ).join(', ');

    return {
      success: true,
      grupo: {
        id: grupoId,
        horarios: horariosTexto
      },
      sugerencias
    };

  } catch (error) {
    logger.error('Error al generar sugerencias de maestros:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Validar si un maestro puede ser asignado a un grupo (sin conflictos)
 * @param {number} maestroId - ID del maestro
 * @param {number} grupoId - ID del grupo
 * @param {number} periodoId - ID del periodo
 * @returns {Object} Resultado de validación
 */
export const validarAsignacionMaestro = async (maestroId, grupoId, periodoId) => {
  const client = await pool.connect();

  try {
    // Obtener horarios del grupo
    const horariosGrupoQuery = await client.query(`
      SELECT dia, hora_inicio, hora_fin
      FROM grupos_horarios
      WHERE grupo_id = $1
    `, [grupoId]);

    if (horariosGrupoQuery.rows.length === 0) {
      return { valido: false, error: 'No se encontraron horarios para el grupo' };
    }

    const horariosTarget = horariosGrupoQuery.rows;

    // Obtener otros grupos y horarios del maestro en el mismo periodo
    const conflictosQuery = await client.query(`
      SELECT 
        g.id as grupo_id,
        gh.dia,
        gh.hora_inicio,
        gh.hora_fin
      FROM grupos g
      INNER JOIN grupos_horarios gh ON g.id = gh.grupo_id
      WHERE g.maestro_id = $1 
        AND g.periodo_id = $2
        AND g.id != $3
    `, [maestroId, periodoId, grupoId]);

    const conflictos = [];

    // Verificar cada horario del grupo target contra los horarios del maestro
    horariosTarget.forEach(horarioTarget => {
      conflictosQuery.rows.forEach(horarioMaestro => {
        if (horarioTarget.dia === horarioMaestro.dia) {
          const hayConflicto = horariosConflicto(
            horarioTarget.hora_inicio,
            horarioTarget.hora_fin,
            horarioMaestro.hora_inicio,
            horarioMaestro.hora_fin
          );

          if (hayConflicto) {
            conflictos.push({
              grupo_id: horarioMaestro.grupo_id,
              dia: horarioMaestro.dia,
              horario: `${horarioMaestro.hora_inicio.substring(0,5)} - ${horarioMaestro.hora_fin.substring(0,5)}`
            });
          }
        }
      });
    });

    return {
      valido: conflictos.length === 0,
      conflictos,
      mensaje: conflictos.length > 0 
        ? `El maestro tiene ${conflictos.length} conflicto(s) de horario`
        : 'Sin conflictos, asignación válida'
    };

  } catch (error) {
    logger.error('Error al validar asignación de maestro:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Asignar un maestro a múltiples grupos (asignación masiva)
 * @param {number} maestroId - ID del maestro
 * @param {Array<number>} gruposIds - IDs de los grupos
 * @param {number} periodoId - ID del periodo
 * @returns {Object} Resultado de la asignación masiva
 */
export const asignarMaestroMasivo = async (maestroId, gruposIds, periodoId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const resultados = [];
    let exitosos = 0;
    let fallidos = 0;

    for (const grupoId of gruposIds) {
      try {
        // Validar antes de asignar
        const validacion = await validarAsignacionMaestro(maestroId, grupoId, periodoId);

        if (!validacion.valido) {
          resultados.push({
            grupo_id: grupoId,
            exito: false,
            error: validacion.mensaje,
            conflictos: validacion.conflictos
          });
          fallidos++;
          continue;
        }

        // Asignar maestro al grupo
        await client.query(`
          UPDATE grupos
          SET maestro_id = $1, updated_at = NOW()
          WHERE id = $2 AND periodo_id = $3
        `, [maestroId, grupoId, periodoId]);

        resultados.push({
          grupo_id: grupoId,
          exito: true,
          mensaje: 'Maestro asignado correctamente'
        });
        exitosos++;

      } catch (error) {
        resultados.push({
          grupo_id: grupoId,
          exito: false,
          error: error.message
        });
        fallidos++;
      }
    }

    await client.query('COMMIT');

    logger.info(`Asignación masiva completada: ${exitosos} exitosos, ${fallidos} fallidos`);

    return {
      success: true,
      total: gruposIds.length,
      exitosos,
      fallidos,
      resultados
    };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error en asignación masiva de maestro:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default {
  obtenerSugerenciasMaestros,
  validarAsignacionMaestro,
  asignarMaestroMasivo
};
