import pool from '../config/database.js';

/**
 * Middleware para validar que no existan duplicados antes de insertar/actualizar
 * Previene errores de constraints UNIQUE y proporciona mensajes claros
 */

export const validateUniqueUser = async (req, res, next) => {
  try {
    const { username } = req.body;
    const userId = req.params.id;

    if (!username) {
      return next();
    }

    let query = 'SELECT id FROM usuarios WHERE username = $1';
    const params = [username];

    // Si es actualización, excluir el propio registro
    if (userId) {
      query += ' AND id != $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length > 0) {
      return res.status(409).json({
        error: 'El nombre de usuario ya está en uso',
        field: 'username',
        code: 'DUPLICATE_USERNAME'
      });
    }

    next();
  } catch (error) {
    console.error('Error en validación de usuario único:', error);
    next(error);
  }
};

export const validateUniqueAlumno = async (req, res, next) => {
  try {
    const { matricula, correo } = req.body;
    const alumnoId = req.params.id;

    console.log('🔍 validateUniqueAlumno - Matrícula:', matricula, 'ID Alumno:', alumnoId);

    // Validar matrícula única
    if (matricula) {
      let query = 'SELECT id FROM alumnos WHERE matricula = $1';
      const params = [matricula];

      if (alumnoId) {
        query += ' AND id != $2';
        params.push(alumnoId);
        console.log('✅ Excluyendo alumno ID:', alumnoId, 'de la búsqueda');
      } else {
        console.log('⚠️  NO hay alumnoId - es una creación nueva');
      }

      console.log('📝 Query:', query, 'Params:', params);
      const result = await pool.query(query, params);
      console.log('📊 Resultados encontrados:', result.rows.length);
      
      if (result.rows.length > 0) {
        console.log('❌ Matrícula duplicada encontrada:', result.rows[0]);
        return res.status(409).json({
          error: 'Oops: Ya existe un alumno con esa matrícula. Por favor verifica los datos e intenta nuevamente',
          field: 'matricula',
          code: 'DUPLICATE_MATRICULA'
        });
      }
    }

    // Validar correo único
    if (correo) {
      let query = 'SELECT id FROM alumnos WHERE correo = $1';
      const params = [correo];

      if (alumnoId) {
        query += ' AND id != $2';
        params.push(alumnoId);
      }

      const result = await pool.query(query, params);
      if (result.rows.length > 0) {
        return res.status(409).json({
          error: 'El correo electrónico ya está registrado',
          field: 'correo',
          code: 'DUPLICATE_EMAIL'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error en validación de alumno único:', error);
    next(error);
  }
};

export const validateUniqueMaestro = async (req, res, next) => {
  try {
    const { rfc, correo } = req.body;
    const maestroId = req.params.id;

    // Validar RFC único
    if (rfc) {
      let query = 'SELECT id FROM maestros WHERE rfc = $1';
      const params = [rfc];

      if (maestroId) {
        query += ' AND id != $2';
        params.push(maestroId);
      }

      const result = await pool.query(query, params);
      if (result.rows.length > 0) {
        return res.status(409).json({
          error: 'El RFC ya está registrado',
          field: 'rfc',
          code: 'DUPLICATE_RFC'
        });
      }
    }

    // Validar correo único
    if (correo) {
      let query = 'SELECT id FROM maestros WHERE correo = $1';
      const params = [correo];

      if (maestroId) {
        query += ' AND id != $2';
        params.push(maestroId);
      }

      const result = await pool.query(query, params);
      if (result.rows.length > 0) {
        return res.status(409).json({
          error: 'El correo electrónico ya está registrado',
          field: 'correo',
          code: 'DUPLICATE_EMAIL'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error en validación de maestro único:', error);
    next(error);
  }
};

export const validateUniqueInscripcion = async (req, res, next) => {
  try {
    const { alumno_id, grupo_id, periodo_id } = req.body;

    if (!alumno_id || !grupo_id || !periodo_id) {
      return next();
    }

    const result = await pool.query(
      'SELECT id FROM inscripciones WHERE alumno_id = $1 AND grupo_id = $2 AND periodo_id = $3',
      [alumno_id, grupo_id, periodo_id]
    );

    if (result.rows.length > 0) {
      return res.status(409).json({
        error: 'El alumno ya está inscrito en este grupo para este periodo',
        code: 'DUPLICATE_INSCRIPCION'
      });
    }

    next();
  } catch (error) {
    console.error('Error en validación de inscripción única:', error);
    next(error);
  }
};

export const validateUniquePeriodo = async (req, res, next) => {
  try {
    const { nombre } = req.body;
    const periodoId = req.params.id;

    if (!nombre) {
      return next();
    }

    let query = 'SELECT id FROM periodos WHERE nombre = $1';
    const params = [nombre];

    if (periodoId) {
      query += ' AND id != $2';
      params.push(periodoId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length > 0) {
      return res.status(409).json({
        error: 'Ya existe un periodo con ese nombre',
        field: 'nombre',
        code: 'DUPLICATE_PERIODO'
      });
    }

    next();
  } catch (error) {
    console.error('Error en validación de periodo único:', error);
    next(error);
  }
};

export const validateUniqueSalon = async (req, res, next) => {
  try {
    const { codigo } = req.body;
    const salonId = req.params.id;

    if (!codigo) {
      return next();
    }

    let query = 'SELECT id FROM salones WHERE codigo = $1';
    const params = [codigo];

    if (salonId) {
      query += ' AND id != $2';
      params.push(salonId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length > 0) {
      return res.status(409).json({
        error: 'Ya existe un salón con ese código',
        field: 'codigo',
        code: 'DUPLICATE_SALON'
      });
    }

    next();
  } catch (error) {
    console.error('Error en validación de salón único:', error);
    next(error);
  }
};

export const validateUniqueGrupo = async (req, res, next) => {
  try {
    const { codigo } = req.body;
    const grupoId = req.params.id;

    if (!codigo) {
      return next();
    }

    let query = 'SELECT id FROM grupos WHERE codigo = $1';
    const params = [codigo];

    if (grupoId) {
      query += ' AND id != $2';
      params.push(grupoId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length > 0) {
      return res.status(409).json({
        error: 'Ya existe un grupo con ese código',
        field: 'codigo',
        code: 'DUPLICATE_GRUPO'
      });
    }

    next();
  } catch (error) {
    console.error('Error en validación de grupo único:', error);
    next(error);
  }
};

/**
 * Validación de pagos duplicados
 * Previene múltiples pagos para la misma inscripción/periodo/concepto
 */
export const validateDuplicatePago = async (req, res, next) => {
  try {
    const { inscripcion_id, concepto, periodo_id } = req.body;

    if (!inscripcion_id || !concepto) {
      return next();
    }

    const result = await pool.query(
      `SELECT id FROM pagos 
       WHERE inscripcion_id = $1 
       AND concepto = $2 
       AND estatus = 'completado'
       LIMIT 1`,
      [inscripcion_id, concepto]
    );

    if (result.rows.length > 0) {
      return res.status(409).json({
        error: 'Ya existe un pago completado para este concepto',
        code: 'DUPLICATE_PAGO'
      });
    }

    next();
  } catch (error) {
    console.error('Error en validación de pago duplicado:', error);
    next(error);
  }
};
