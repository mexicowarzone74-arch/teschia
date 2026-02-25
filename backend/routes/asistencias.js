import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Registrar asistencia
router.post('/', auth, checkRole('coordinador', 'maestro'), async (req, res) => {
  try {
    const { inscripcion_id, alumno_id, grupo_id, fecha, presente, justificada, observaciones } = req.body;
    
    const result = await pool.query(
      `INSERT INTO asistencias (inscripcion_id, fecha, presente, justificada, observaciones)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (inscripcion_id, fecha)
       DO UPDATE SET presente = $3, justificada = $4, observaciones = $5
       RETURNING *`,
      [inscripcion_id, fecha, presente, justificada, observaciones]
    );
    
    const asistencia = result.rows[0];

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('asistencia:saved', {
        inscripcion_id,
        fecha,
        presente
      });
    }

    res.json(asistencia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar asistencias masivas (lista completa del grupo)
router.post('/masivo', auth, checkRole('coordinador', 'maestro'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { grupo_id, fecha, asistencias } = req.body;

    // Validar día de la semana
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaSeleccionado = diasSemana[new Date(fecha + 'T12:00:00').getDay()];
    
    const horarioCheck = await pool.query(
      'SELECT id FROM grupos_horarios WHERE grupo_id = $1 AND dia = $2',
      [grupo_id, diaSeleccionado]
    );

    if (horarioCheck.rows.length === 0) {
      const diasValidos = await pool.query('SELECT dia FROM grupos_horarios WHERE grupo_id = $1', [grupo_id]);
      const listaDias = diasValidos.rows.map(d => d.dia).join(', ');
      return res.status(400).json({ 
        error: `Día inválido (${diaSeleccionado}). Días permitidos: ${listaDias}` 
      });
    }
    
    await client.query('BEGIN');
    
    for (const asist of asistencias) {
      const presente = asist.estatus === 'Asistencia' || asist.estatus === 'Retardo';
      const justificada = asist.estatus === 'Justificada';
      const retardo = asist.estatus === 'Retardo';
      
      await client.query(
        `INSERT INTO asistencias (inscripcion_id, fecha, presente, justificada, retardo, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (inscripcion_id, fecha)
         DO UPDATE SET presente = $3, justificada = $4, retardo = $5, observaciones = $6`,
        [asist.inscripcion_id, fecha, presente, justificada, retardo, asist.observaciones || '']
      );
    }
    
    await client.query('COMMIT');

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('asistencia:masivas_saved', {
        grupo_id,
        fecha,
        total: asistencias.length
      });
    }

    res.json({ message: 'Asistencias registradas exitosamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Obtener asistencias de un grupo en una fecha
router.get('/grupo/:grupo_id', auth, async (req, res) => {
  try {
    const { fecha } = req.query;
    
    let query = `
      SELECT 
        a.id,
        CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
        a.matricula,
        i.id as inscripcion_id,
        asist.presente,
        asist.justificada,
        asist.observaciones
      FROM inscripciones i
      JOIN alumnos a ON i.alumno_id = a.id
      LEFT JOIN asistencias asist ON i.id = asist.inscripcion_id AND asist.fecha = $2
      WHERE i.grupo_id = $1 AND i.estatus = 'activo'
      ORDER BY a.nombre, a.apellido_paterno
    `;
    
    const result = await pool.query(query, [req.params.grupo_id, fecha]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte de asistencias de un alumno
router.get('/alumno/:alumno_id', auth, async (req, res) => {
  try {
    const { grupo_id } = req.query;
    
    let query = `
      SELECT 
        asist.*,
        g.codigo as grupo
      FROM asistencias asist
      JOIN grupos g ON asist.grupo_id = g.id
      WHERE asist.alumno_id = $1
    `;
    
    const params = [req.params.alumno_id];
    
    if (grupo_id) {
      query += ' AND asist.grupo_id = $2';
      params.push(grupo_id);
    }
    
    query += ' ORDER BY asist.fecha DESC';
    
    const result = await pool.query(query, params);
    
    // Calcular porcentaje
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM asistencias WHERE alumno_id = $1' + (grupo_id ? ' AND grupo_id = $2' : ''),
      grupo_id ? [req.params.alumno_id, grupo_id] : [req.params.alumno_id]
    );
    
    const presentesResult = await pool.query(
      'SELECT COUNT(*) as presentes FROM asistencias WHERE alumno_id = $1 AND presente = true' + (grupo_id ? ' AND grupo_id = $2' : ''),
      grupo_id ? [req.params.alumno_id, grupo_id] : [req.params.alumno_id]
    );
    
    const total = parseInt(totalResult.rows[0].total);
    const presentes = parseInt(presentesResult.rows[0].presentes);
    const porcentaje = total > 0 ? (presentes / total) * 100 : 0;
    
    res.json({
      asistencias: result.rows,
      estadisticas: {
        total,
        presentes,
        ausencias: total - presentes,
        porcentaje: porcentaje.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alumnos en riesgo por faltas
router.get('/grupo/:grupo_id/riesgo', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        a.id,
        CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
        a.matricula,
        COUNT(*) FILTER (WHERE asist.presente = false AND asist.justificada = false) as faltas,
        COUNT(*) as total_clases,
        ROUND((COUNT(*) FILTER (WHERE asist.presente = true)::numeric / COUNT(*)::numeric) * 100, 2) as porcentaje_asistencia
      FROM inscripciones i
      JOIN alumnos a ON i.alumno_id = a.id
      LEFT JOIN asistencias asist ON i.id = asist.inscripcion_id
      WHERE i.grupo_id = $1
      GROUP BY a.id, a.nombre, a.apellido_paterno, a.apellido_materno
      HAVING ROUND((COUNT(*) FILTER (WHERE asist.presente = true)::numeric / COUNT(*)::numeric) * 100, 2) < 80
      ORDER BY porcentaje_asistencia ASC`,
      [req.params.grupo_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
