/**
 * Middleware de validación avanzada del lado del servidor
 * Complementa la validación del cliente con reglas de negocio
 */

import pool from '../config/database.js';

/**
 * Valida que los datos sean consistentes con las reglas de negocio
 */
export const validateBusinessRules = async (req, res, next) => {
  const { path, method, body, user } = req;

  try {
    // Validar creación/edición de alumnos
    if (path.includes('/alumnos') && ['POST', 'PUT'].includes(method)) {
      // Extraer ID del path para PUT (ej: /api/alumnos/2 -> 2)
      let alumnoId = null;
      if (method === 'PUT') {
        const match = path.match(/\/alumnos\/(\d+)/);
        alumnoId = match ? match[1] : null;
      }
      console.log('🔍 businessRules middleware - path:', path, 'method:', method, 'alumnoId extraído:', alumnoId);
      await validateAlumnoBusinessRules(body, user, alumnoId);
    }

    // Validar creación/edición de pagos
    if (path.includes('/pagos') && ['POST', 'PUT'].includes(method)) {
      await validatePagoBusinessRules(body, user);
    }

    // Validar creación/edición de calificaciones
    if (path.includes('/calificaciones') && ['POST', 'PUT'].includes(method)) {
      await validateCalificacionBusinessRules(body, user);
    }

    // Validar creación/edición de grupos
    if (path.includes('/grupos') && ['POST', 'PUT'].includes(method)) {
      await validateGrupoBusinessRules(body, user);
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: error.message,
      code: 'BUSINESS_RULE_VIOLATION'
    });
  }
};

/**
 * Reglas de negocio para alumnos
 */
const validateAlumnoBusinessRules = async (data, user, alumnoId = null) => {
  // Validar edad razonable
  if (data.edad && (data.edad < 15 || data.edad > 100)) {
    throw new Error('La edad debe estar entre 15 y 100 años');
  }

  // Validar semestre para alumnos internos
  if (data.tipo_alumno === 'interno' && !data.es_nuevo_ingreso) {
    if (!data.semestre || data.semestre < 1 || data.semestre > 14) {
      throw new Error('El semestre debe estar entre 1 y 14 para alumnos internos');
    }
  }

  // Validar matrícula única (POSTGRESQL)
  if (data.matricula) {
    console.log('🔍 businessRules - Validando matrícula:', data.matricula, 'alumnoId:', alumnoId, 'tipo:', typeof alumnoId);
    
    const existing = await pool.query(
      'SELECT id FROM alumnos WHERE matricula = $1 AND id != $2',
      [data.matricula, alumnoId || 0]
    );
    
    console.log('📊 businessRules - Resultados:', existing.rows);
    
    if (existing.rows.length > 0) {
      throw new Error('Oops: Ya existe un alumno con esa matrícula. Por favor verifica los datos e intenta nuevamente');
    }
  }

  // Validar email único (POSTGRESQL)
  if (data.correo) {
    const existing = await pool.query(
      'SELECT id FROM alumnos WHERE correo = $1 AND id != $2',
      [data.correo, alumnoId || 0]
    );
    
    if (existing.rows.length > 0) {
      throw new Error('Ya existe un alumno con ese correo electrónico');
    }
  }

  // Validar fecha de ingreso no en el futuro
  if (data.fecha_ingreso) {
    const ingresoDate = new Date(data.fecha_ingreso);
    // Permitir hasta 30 días en el futuro para inscripciones anticipadas
    const maxFutureDate = new Date();
    maxFutureDate.setDate(maxFutureDate.getDate() + 30);
    maxFutureDate.setHours(23, 59, 59, 999);
    
    if (ingresoDate > maxFutureDate) {
      throw new Error('La fecha de ingreso no puede ser mayor a 30 días en el futuro');
    }
  }
};

/**
 * Reglas de negocio para pagos
 */
const validatePagoBusinessRules = async (data, user) => {
  // Validar monto positivo
  if (data.monto && parseFloat(data.monto) <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  // Validar que el alumno existe
  if (data.alumno_id) {
    const alumno = await pool.query(
      'SELECT id, estatus FROM alumnos WHERE id = $1',
      [data.alumno_id]
    );
    
    if (alumno.rows.length === 0) {
      throw new Error('El alumno especificado no existe');
    }
  }

  // Validar que el período existe y está activo
  if (data.periodo_id) {
    const periodo = await pool.query(
      'SELECT id, activo FROM periodos WHERE id = $1',
      [data.periodo_id]
    );
    
    if (periodo.rows.length === 0) {
      throw new Error('El período especificado no existe');
    }
    
    if (!periodo.rows[0].activo) {
      throw new Error('No se pueden registrar pagos en un período inactivo');
    }
  }

  // Prevenir pagos duplicados (mismo alumno, mismo concepto, mismo período, mismo día)
  if (data.alumno_id && data.concepto && data.periodo_id) {
    const existing = await pool.query(
      `SELECT id FROM pagos 
       WHERE alumno_id = $1 
       AND concepto = $2 
       AND periodo_id = $3
       AND DATE(fecha_pago) = CURRENT_DATE
       AND id != $4`,
      [data.alumno_id, data.concepto, data.periodo_id, data.id || 0]
    );
    
    if (existing.rows.length > 0) {
      throw new Error('Ya existe un pago registrado hoy para este alumno, concepto y período');
    }
  }

  // Validar fecha de pago no en el futuro
  if (data.fecha_pago) {
    const pagoDate = new Date(data.fecha_pago);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (pagoDate > today) {
      throw new Error('La fecha de pago no puede ser en el futuro');
    }
  }
};

/**
 * Reglas de negocio para calificaciones
 */
const validateCalificacionBusinessRules = async (data, user) => {
  // Validar rango de calificación (0-100)
  if (data.calificacion !== null && data.calificacion !== undefined) {
    const calif = parseFloat(data.calificacion);
    if (calif < 0 || calif > 100) {
      throw new Error('La calificación debe estar entre 0 y 100');
    }
  }

  // Validar que el grupo existe
  if (data.grupo_id) {
    const grupo = await pool.query(
      'SELECT id FROM grupos WHERE id = $1',
      [data.grupo_id]
    );
    
    if (grupo.rows.length === 0) {
      throw new Error('El grupo especificado no existe');
    }
  }

  // Validar que el alumno está inscrito en el grupo
  if (data.grupo_id && data.alumno_id) {
    const inscripcion = await pool.query(
      'SELECT id FROM inscripciones WHERE grupo_id = $1 AND alumno_id = $2',
      [data.grupo_id, data.alumno_id]
    );
    
    if (inscripcion.rows.length === 0) {
      throw new Error('El alumno no está inscrito en este grupo');
    }
  }

  // Validar que el maestro tiene permiso para calificar este grupo
  if (user && user.rol === 'maestro' && data.grupo_id) {
    const asignacion = await pool.query(
      'SELECT id FROM grupos WHERE id = $1 AND maestro_id = $2',
      [data.grupo_id, user.id]
    );
    
    if (asignacion.rows.length === 0) {
      throw new Error('No tienes permiso para calificar este grupo');
    }
  }
};

/**
 * Reglas de negocio para grupos
 */
const validateGrupoBusinessRules = async (data, user) => {
  // Validar cupo máximo razonable
  if (data.cupo_maximo && (data.cupo_maximo < 1 || data.cupo_maximo > 100)) {
    throw new Error('El cupo máximo debe estar entre 1 y 100');
  }

  // Validar que el maestro existe
  if (data.maestro_id) {
    const maestro = await pool.query(
      'SELECT id, activo FROM maestros WHERE id = $1',
      [data.maestro_id]
    );
    
    if (maestro.rows.length === 0) {
      throw new Error('El maestro especificado no existe');
    }
    
    if (!maestro.rows[0].activo) {
      throw new Error('No se puede asignar un maestro inactivo');
    }
  }

  // Validar que el nivel existe
  if (data.nivel_id) {
    const nivel = await pool.query(
      'SELECT id FROM niveles WHERE id = $1',
      [data.nivel_id]
    );
    
    if (nivel.rows.length === 0) {
      throw new Error('El nivel especificado no existe');
    }
  }

  // Validar que el período existe
  if (data.periodo_id) {
    const periodo = await pool.query(
      'SELECT id, activo FROM periodos WHERE id = $1',
      [data.periodo_id]
    );
    
    if (periodo.rows.length === 0) {
      throw new Error('El período especificado no existe');
    }
  }

  // Validar horarios no traslapados para el mismo maestro
  if (data.maestro_id && data.horario && data.periodo_id) {
    // Esta validación requeriría parsear el horario y comparar
    // Por ahora solo validamos que exista
  }
};

export default validateBusinessRules;
