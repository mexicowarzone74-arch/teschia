import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { validateUniqueAlumno } from '../middleware/validateUnique.js';

const router = express.Router();

// =============================================
// GET /api/alumnos - Obtener todos los alumnos
// =============================================
router.get('/', auth, async (req, res) => {
  try {
    const { tipo, nivel, nivel_id, carrera, estatus, search, page = 1, limit = 10000 } = req.query;

    // Usar tabla alumnos con nombre_completo calculado
    let query = `SELECT DISTINCT 
      a.*, 
      CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) AS nombre_completo,
      n.nombre AS nivel_actual
      FROM alumnos a
      LEFT JOIN niveles n ON a.nivel_id = n.id`;

    // Si es maestro, solo mostrar alumnos de sus grupos
    if (req.user.rol === 'maestro') {
      query += ` 
        INNER JOIN inscripciones i ON a.id = i.alumno_id
        INNER JOIN grupos g ON i.grupo_id = g.id
        INNER JOIN maestros m ON g.maestro_id = m.id
        WHERE m.usuario_id = $1`;
      var params = [req.user.id];
      var paramCount = 2;
    } else {
      query += ' WHERE 1=1';
      var params = [];
      var paramCount = 1;
    }

    if (tipo) {
      query += ` AND a.tipo_alumno = $${paramCount++}`;
      params.push(tipo);
    }

    // Filtro por nivel_actual (nombre del nivel)
    if (nivel) {
      query += ` AND n.nombre = $${paramCount++}`;
      params.push(nivel);
    }

    // Filtro por nivel_id (legacy, por si acaso)
    if (nivel_id) {
      query += ` AND a.nivel_id = $${paramCount++}`;
      params.push(nivel_id);
    }

    if (carrera) {
      // Si es "Público General", buscar exactamente o alumnos externos
      if (carrera === 'Público General') {
        query += ` AND (a.carrera = $${paramCount} OR a.tipo_alumno = 'externo')`;
      } else {
        // Para ingenierías, buscar coincidencia exacta
        query += ` AND a.carrera = $${paramCount}`;
      }
      params.push(carrera);
      paramCount++;
    }

    if (estatus) {
      query += ` AND a.estatus = $${paramCount++}`;
      params.push(estatus);
    }

    if (search) {
      query += ` AND (CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) ILIKE $${paramCount} OR a.matricula ILIKE $${paramCount} OR a.correo ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY a.created_at DESC';

    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contar total
    const countQuery = query.split('LIMIT')[0];
    const countResult = await pool.query(`SELECT COUNT(*) FROM (${countQuery}) AS total`, params.slice(0, -2));

    res.json({
      alumnos: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    console.error('Error al obtener alumnos:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /api/alumnos/:id - Obtener alumno por ID
// =============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM alumnos_completo WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// POST /api/alumnos - Crear alumno
// =============================================
router.post('/', auth, checkRole('coordinador'), async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('📝 Creando alumno con datos:', JSON.stringify(req.body, null, 2));
    
    await client.query('BEGIN');

    const {
      tipo_alumno,
      matricula,
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      telefono,
      celular,
      fecha_nacimiento,
      municipio,
      direccion,
      carrera,
      semestre,
      numero_control,
      procedencia,
      ocupacion,
      nivel_id,
      nivel_actual,
      estatus = 'activo',
      edad,
      genero,
      turno
    } = req.body;

    // Validaciones
    if (!nombre || !apellido_paterno || !correo || !tipo_alumno) {
      console.log('❌ Faltan campos obligatorios');
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, apellido_paterno, correo, tipo_alumno' });
    }
    
    // Validar matrícula obligatoria solo para internos
    if (tipo_alumno === 'interno' && !matricula) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La matrícula es obligatoria para alumnos internos' });
    }

    // Verificar matrícula única
    if (matricula) {
      const matriculaCheck = await client.query('SELECT id FROM alumnos WHERE matricula = $1', [matricula]);
      if (matriculaCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'La matrícula ya existe' });
      }
    }

    // Verificar correo único
    const correoCheck = await client.query('SELECT id FROM alumnos WHERE correo = $1', [correo]);
    if (correoCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El correo ya existe' });
    }

    // Obtener nombre del nivel desde la tabla niveles para asegurar consistencia
    let nivel_actual_validado = nivel_actual;
    if (nivel_id) {
      const nivelResult = await client.query('SELECT nombre FROM niveles WHERE id = $1', [nivel_id]);
      if (nivelResult.rows.length > 0) {
        nivel_actual_validado = nivelResult.rows[0].nombre;
      }
    }

    // Insertar alumno
    const result = await client.query(
      `INSERT INTO alumnos 
       (tipo_alumno, matricula, nombre, apellido_paterno, apellido_materno, correo, telefono, celular, 
        fecha_nacimiento, municipio, direccion, carrera, semestre, numero_control, procedencia, 
        ocupacion, nivel_id, nivel_actual, estatus, edad, genero, turno) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) 
       RETURNING *`,
      [tipo_alumno, matricula, nombre, apellido_paterno, apellido_materno, correo, telefono, celular,
       fecha_nacimiento, municipio, direccion, carrera, semestre, numero_control, procedencia,
       ocupacion, nivel_id, nivel_actual_validado, estatus, edad, genero, turno]
    );

    await logAudit(req.user.id, 'CREATE', 'alumnos', result.rows[0].id, null, result.rows[0], req.ip);

    await client.query('COMMIT');
    
    const alumnoCompleto = await pool.query('SELECT * FROM alumnos_completo WHERE id = $1', [result.rows[0].id]);
    const alumno = alumnoCompleto.rows[0];

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('alumno:created', {
        id: alumno.id,
        nombre_completo: alumno.nombre_completo,
        matricula: alumno.matricula
      });
    }

    res.status(201).json(alumno);
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      if (error.constraint?.includes('matricula')) {
        return res.status(400).json({ error: 'La matrícula ya existe' });
      }
      if (error.constraint?.includes('correo')) {
        return res.status(400).json({ error: 'El correo ya existe' });
      }
      if (error.constraint?.includes('curp')) {
        return res.status(400).json({ error: 'El CURP ya existe' });
      }
      return res.status(400).json({ error: 'Ya existe un registro con esos datos' });
    }

    if (error.code === '23503') {
      return res.status(400).json({ error: 'El nivel seleccionado no existe' });
    }

    console.error('Error al crear alumno:', error);
    res.status(500).json({ error: 'Error al crear alumno: ' + error.message });
  } finally {
    client.release();
  }
});

// =============================================
// PUT /api/alumnos/:id - Actualizar alumno
// =============================================
router.put('/:id', auth, checkRole('coordinador'), validateUniqueAlumno, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔄 PUT /api/alumnos/' + id);
    console.log('📦 Body recibido:', JSON.stringify(req.body, null, 2));

    // Campos permitidos
    const CAMPOS_PERMITIDOS = [
      'nombre', 'apellido_paterno', 'apellido_materno', 'fecha_nacimiento',
      'correo', 'telefono', 'celular', 'curp', 'municipio', 'direccion',
      'contacto_emergencia', 'telefono_emergencia', 'carrera', 'semestre',
      'numero_control', 'procedencia', 'ocupacion', 'nivel_id', 'nivel_actual', 'tipo_alumno',
      'matricula', 'estatus', 'edad', 'genero', 'motivo_baja', 'fecha_baja'
    ];

    const fields = {};
    Object.keys(req.body).forEach(key => {
      if (CAMPOS_PERMITIDOS.includes(key)) {
        fields[key] = req.body[key];
      }
    });

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar' });
    }

    // Si se está actualizando nivel_id, obtener el nombre del nivel desde la BD
    if (fields.nivel_id) {
      const nivelResult = await pool.query('SELECT nombre FROM niveles WHERE id = $1', [fields.nivel_id]);
      if (nivelResult.rows.length > 0) {
        fields.nivel_actual = nivelResult.rows[0].nombre;
      }
    }

    // Normalizar nivel_actual si viene del frontend (asegurar que tenga acento)
    if (fields.nivel_actual) {
      const normalizacion = {
        'Basico': 'Básico',
        'basico': 'Básico',
        'BASICO': 'Básico'
      };
      fields.nivel_actual = normalizacion[fields.nivel_actual] || fields.nivel_actual;
    }

    const oldData = await pool.query('SELECT * FROM alumnos WHERE id = $1', [id]);

    if (oldData.rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE alumnos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );

    await logAudit(req.user.id, 'UPDATE', 'alumnos', id, oldData.rows[0], result.rows[0], req.ip);

    // Retornar con nombre_completo y nivel_actual
    const alumnoCompleto = await pool.query(
      `SELECT a.*, 
       CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) AS nombre_completo,
       n.nombre AS nivel_actual
       FROM alumnos a
       LEFT JOIN niveles n ON a.nivel_id = n.id
       WHERE a.id = $1`,
      [id]
    );
    const alumno = alumnoCompleto.rows[0];

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('alumno:updated', {
        id: parseInt(id),
        nombre_completo: alumno.nombre_completo,
        matricula: alumno.matricula
      });
    }

    res.json(alumno);
  } catch (error) {
    console.error('Error al actualizar alumno:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// DELETE /api/alumnos/:id - Eliminar alumno
// =============================================
router.delete('/:id', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const { id } = req.params;

    const oldData = await pool.query('SELECT * FROM alumnos WHERE id = $1', [id]);

    if (oldData.rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    await pool.query('DELETE FROM alumnos WHERE id = $1', [id]);

    await logAudit(req.user.id, 'DELETE', 'alumnos', id, oldData.rows[0], null, req.ip);

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('alumno:deleted', { id: parseInt(id), matricula: oldData.rows[0].matricula });
    }

    res.json({ message: 'Alumno eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar alumno:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /api/alumnos/:id/historial - Historial académico
// =============================================
router.get('/:id/historial', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        i.id, i.fecha_inscripcion, i.estatus, i.calificacion_final, i.porcentaje_asistencia,
        g.codigo as grupo_codigo,
        n.nombre as nivel_nombre,
        p.nombre as periodo,
        CONCAT(m.nombre, ' ', m.apellido_paterno) as maestro
      FROM inscripciones i
      JOIN grupos g ON i.grupo_id = g.id
      JOIN niveles n ON g.nivel_id = n.id
      JOIN periodos p ON i.periodo_id = p.id
      LEFT JOIN maestros m ON g.maestro_id = m.id
      WHERE i.alumno_id = $1
      ORDER BY i.fecha_inscripcion DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
