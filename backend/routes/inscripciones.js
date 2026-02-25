import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// Crear inscripción (inscribir alumno a grupo)
router.post('/', auth, async (req, res) => {
  try {
    const { alumno_id, grupo_id, periodo_id } = req.body;
    
    console.log('📝 Creando inscripción:', { alumno_id, grupo_id, periodo_id });
    
    // Validar campos requeridos
    if (!alumno_id || !grupo_id || !periodo_id) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: alumno_id, grupo_id, periodo_id' 
      });
    }
    
    // Validar que el nivel del alumno coincida con el del grupo
    const validationQuery = await pool.query(
      `SELECT a.nivel_id as alumno_nivel, g.nivel_id as grupo_nivel,
              n_a.nombre as nivel_alumno_nombre, n_g.nombre as nivel_grupo_nombre
       FROM alumnos a, grupos g
       JOIN niveles n_a ON a.nivel_id = n_a.id
       JOIN niveles n_g ON g.nivel_id = n_g.id
       WHERE a.id = $1 AND g.id = $2`,
      [alumno_id, grupo_id]
    );

    if (validationQuery.rows.length > 0) {
      const { alumno_nivel, grupo_nivel, nivel_alumno_nombre, nivel_grupo_nombre } = validationQuery.rows[0];
      if (alumno_nivel !== grupo_nivel) {
        return res.status(400).json({ 
          error: `Nivel incompatible. El alumno está en "${nivel_alumno_nombre}" but the group is "${nivel_grupo_nombre}".` 
        });
      }
    }
    
    // Verificar cupo disponible
    const cupoCheck = await pool.query(
      `SELECT g.cupo_maximo, 
              COUNT(i.id) as inscritos
       FROM grupos g
       LEFT JOIN inscripciones i ON g.id = i.grupo_id AND i.estatus = 'activo'
       WHERE g.id = $1
       GROUP BY g.id, g.cupo_maximo`,
      [grupo_id]
    );
    
    if (cupoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    
    const { cupo_maximo, inscritos } = cupoCheck.rows[0];
    if (parseInt(inscritos) >= cupo_maximo) {
      return res.status(400).json({ error: 'El grupo ya está lleno' });
    }
    
    // Crear inscripción
    const result = await pool.query(
      `INSERT INTO inscripciones (alumno_id, grupo_id, periodo_id, estatus)
       VALUES ($1, $2, $3, 'activo')
       RETURNING *`,
      [alumno_id, grupo_id, periodo_id]
    );
    
    console.log('✅ Inscripción creada:', result.rows[0]);
    
    // Registrar auditoría
    await logAudit(
      req.user.id,
      'INSERT',
      'inscripciones',
      result.rows[0].id,
      null,
      result.rows[0],
      req.ip
    );
    const inscripcion = result.rows[0];

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('inscripcion:created', {
        id: inscripcion.id,
        alumno_id: inscripcion.alumno_id,
        grupo_id: inscripcion.grupo_id
      });
    }

    res.status(201).json(inscripcion);
  } catch (error) {
    console.error('❌ Error al crear inscripción:', error);
    
    // Error de clave duplicada (alumno ya inscrito)
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: 'El alumno ya está inscrito en este grupo para este período' 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las inscripciones con filtros
router.get('/', auth, async (req, res) => {
  try {
    const { periodo_id, grupo_id, alumno_id, estatus } = req.query;
    
    let query = `
      SELECT i.*,
             a.nombre || ' ' || a.apellido_paterno || ' ' || COALESCE(a.apellido_materno, '') as alumno_nombre,
             a.matricula,
             g.codigo as grupo_codigo,
             n.nombre as nivel_nombre,
             p.nombre as periodo_nombre
      FROM inscripciones i
      INNER JOIN alumnos a ON i.alumno_id = a.id
      INNER JOIN grupos g ON i.grupo_id = g.id
      INNER JOIN niveles n ON g.nivel_id = n.id
      INNER JOIN periodos p ON i.periodo_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (periodo_id) {
      query += ` AND i.periodo_id = $${paramIndex++}`;
      params.push(periodo_id);
    }
    
    if (grupo_id) {
      query += ` AND i.grupo_id = $${paramIndex++}`;
      params.push(grupo_id);
    }
    
    if (alumno_id) {
      query += ` AND i.alumno_id = $${paramIndex++}`;
      params.push(alumno_id);
    }
    
    if (estatus) {
      query += ` AND i.estatus = $${paramIndex++}`;
      params.push(estatus);
    }
    
    query += ' ORDER BY i.fecha_inscripcion DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener inscripciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener inscripciones de un alumno
router.get('/alumno/:alumnoId', auth, async (req, res) => {
  try {
    const { alumnoId } = req.params;
    
    const result = await pool.query(
      `SELECT i.*,
              g.codigo as grupo_codigo,
              n.nombre as nivel_nombre,
              m.nombre || ' ' || m.apellido_paterno as maestro_nombre,
              p.nombre as periodo_nombre
       FROM inscripciones i
       INNER JOIN grupos g ON i.grupo_id = g.id
       INNER JOIN niveles n ON g.nivel_id = n.id
       LEFT JOIN maestros m ON g.maestro_id = m.id
       INNER JOIN periodos p ON i.periodo_id = p.id
       WHERE i.alumno_id = $1
       ORDER BY i.fecha_inscripcion DESC`,
      [alumnoId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener inscripciones del alumno:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener inscripciones de un grupo
router.get('/grupo/:grupoId', auth, async (req, res) => {
  try {
    const { grupoId } = req.params;
    
    const result = await pool.query(
      `SELECT i.*,
              a.nombre || ' ' || a.apellido_paterno || ' ' || COALESCE(a.apellido_materno, '') as alumno_nombre,
              a.matricula,
              a.correo,
              a.telefono
       FROM inscripciones i
       INNER JOIN alumnos a ON i.alumno_id = a.id
       WHERE i.grupo_id = $1 AND i.estatus = 'activo'
       ORDER BY a.apellido_paterno, a.apellido_materno, a.nombre`,
      [grupoId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener inscripciones del grupo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar inscripción (dar de baja)
router.delete('/:id', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM inscripciones WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }
    
    // Registrar auditoría
    await logAudit(
      req.user.id,
      'DELETE',
      'inscripciones',
      result.rows[0].id,
      result.rows[0],
      null,
      req.ip
    );

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('inscripcion:deleted', { id: parseInt(id), alumno_id: result.rows[0].alumno_id });
    }

    res.json({ message: 'Inscripción eliminada correctamente', inscripcion: result.rows[0] });
  } catch (error) {
    console.error('Error al eliminar inscripción:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
