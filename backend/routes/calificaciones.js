import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// Obtener calificaciones de un grupo
router.get('/grupo/:grupo_id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        i.id as inscripcion_id,
        a.id as alumno_id,
        CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
        a.matricula,
        json_agg(
          json_build_object(
            'parcial', c.parcial,
            'calificacion', c.calificacion,
            'observaciones', c.observaciones
          ) ORDER BY c.parcial
        ) FILTER (WHERE c.id IS NOT NULL) as calificaciones
      FROM inscripciones i
      JOIN alumnos a ON i.alumno_id = a.id
      LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
      WHERE i.grupo_id = $1
      GROUP BY i.id, a.id, a.nombre, a.apellido_paterno, a.apellido_materno
      ORDER BY a.nombre, a.apellido_paterno`,
      [req.params.grupo_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Capturar/actualizar calificación
router.post('/', auth, checkRole('coordinador', 'maestro'), async (req, res) => {
  try {
    const { inscripcion_id, alumno_id, grupo_id, parcial, calificacion } = req.body;
    
    // Validaciones de entrada
    if (!inscripcion_id || !alumno_id || !grupo_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: inscripcion_id, alumno_id, grupo_id' });
    }
    
    if (!parcial || parcial < 1 || parcial > 3) {
      return res.status(400).json({ error: 'Parcial debe ser 1, 2 o 3' });
    }
    
    const calNum = parseFloat(calificacion);
    if (isNaN(calNum) || calNum < 0 || calNum > 100) {
      return res.status(400).json({ error: 'Calificación debe estar entre 0 y 100' });
    }
    
    // Obtener datos anteriores para auditoría si es un update
    const prevData = await pool.query(
      'SELECT calificacion FROM calificaciones WHERE inscripcion_id = $1 AND parcial = $2',
      [inscripcion_id, parcial]
    );

    const result = await pool.query(
      `INSERT INTO calificaciones (inscripcion_id, alumno_id, grupo_id, parcial, calificacion)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (inscripcion_id, parcial) 
       DO UPDATE SET calificacion = $5
       RETURNING *`,
      [inscripcion_id, alumno_id, grupo_id, parcial, calNum]
    );
    
    // Registrar auditoría (en segundo plano)
    logAudit(
      req.user.id,
      prevData.rows.length > 0 ? 'UPDATE' : 'INSERT',
      'calificaciones',
      result.rows[0].id,
      prevData.rows[0] || null,
      result.rows[0],
      req.ip
    ).catch(err => console.error('Error en auditoría background:', err));

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('calificacion:saved', {
        inscripcion_id,
        alumno_id,
        parcial,
        calificacion: calNum
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al guardar calificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Captura masiva de calificaciones
router.post('/masivo', auth, checkRole('coordinador', 'maestro'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { calificaciones } = req.body; // Array de objetos
    
    if (!Array.isArray(calificaciones) || calificaciones.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de calificaciones' });
    }
    
    await client.query('BEGIN');
    
    for (const cal of calificaciones) {
      // Validaciones para cada calificación
      if (!cal.inscripcion_id || !cal.alumno_id || !cal.grupo_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Faltan campos obligatorios en calificación del alumno ${cal.alumno_id}` 
        });
      }
      
      if (!cal.parcial || cal.parcial < 1 || cal.parcial > 3) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Parcial inválido (${cal.parcial}) para alumno ${cal.alumno_id}. Debe ser 1, 2 o 3` 
        });
      }
      
      const calNum = parseFloat(cal.calificacion);
      if (isNaN(calNum) || calNum < 0 || calNum > 100) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Calificación inválida (${cal.calificacion}) para alumno ${cal.alumno_id}. Debe estar entre 0 y 100` 
        });
      }
      
      const prevData = await client.query(
        'SELECT * FROM calificaciones WHERE inscripcion_id = $1 AND parcial = $2',
        [cal.inscripcion_id, cal.parcial]
      );

      const resInsert = await client.query(
        `INSERT INTO calificaciones (inscripcion_id, alumno_id, grupo_id, parcial, calificacion, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (inscripcion_id, parcial) 
         DO UPDATE SET calificacion = $5, observaciones = $6
         RETURNING *`,
        [cal.inscripcion_id, cal.alumno_id, cal.grupo_id, cal.parcial, calNum, cal.observaciones || '']
      );

      // Registrar auditoría por cada alumno en carga masiva (en segundo plano)
      logAudit(
        req.user.id,
        prevData.rows.length > 0 ? 'UPDATE' : 'INSERT',
        'calificaciones',
        resInsert.rows[0].id,
        prevData.rows[0] || null,
        resInsert.rows[0],
        req.ip
      ).catch(err => console.error('Error en auditoría masiva background:', err));
    }
    
    await client.query('COMMIT');

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('calificacion:masivas_saved', {
        grupo_id: calificaciones[0]?.grupo_id,
        parcial: calificaciones[0]?.parcial,
        total: calificaciones.length
      });
    }

    res.json({ 
      message: 'Calificaciones capturadas exitosamente',
      total: calificaciones.length 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al guardar calificaciones masivas:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Obtener historial de calificaciones de un alumno
router.get('/alumno/:alumno_id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.*,
        g.codigo as grupo,
        g.nivel,
        p.nombre as periodo
      FROM calificaciones c
      JOIN grupos g ON c.grupo_id = g.id
      LEFT JOIN periodos p ON g.periodo_id = p.id
      WHERE c.alumno_id = $1
      ORDER BY c.created_at DESC`,
      [req.params.alumno_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alumnos reprobados en un grupo
router.get('/grupo/:grupo_id/reprobados', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        a.id,
        CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
        a.matricula,
        AVG(c.calificacion) as promedio
      FROM inscripciones i
      JOIN alumnos a ON i.alumno_id = a.id
      LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
      WHERE i.grupo_id = $1
      GROUP BY a.id, a.nombre, a.apellido_paterno, a.apellido_materno, a.matricula
      HAVING AVG(c.calificacion) < 70 OR AVG(c.calificacion) IS NULL
      ORDER BY a.nombre, a.apellido_paterno`,
      [req.params.grupo_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
