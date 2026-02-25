import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Obtener todos los períodos
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM periodos ORDER BY fecha_inicio_clases DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener período activo
router.get('/activo', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM periodos WHERE activo = true LIMIT 1');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No hay período activo' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear período
router.post('/', auth, checkRole('coordinador'), async (req, res) => {
  try {
    console.log('📅 Datos recibidos para crear período:', req.body);
    
    const {
      nombre,
      tipo,
      fecha_inicio_inscripciones,
      fecha_fin_inscripciones,
      fecha_inicio_clases,
      fecha_fin_clases,
      fecha_inicio_examenes,
      fecha_fin_examenes
    } = req.body;
    
    console.log('📅 Fechas a insertar:', {
      fecha_inicio_inscripciones,
      fecha_fin_inscripciones,
      fecha_inicio_clases,
      fecha_fin_clases,
      fecha_inicio_examenes,
      fecha_fin_examenes
    });
    
    const result = await pool.query(
      `INSERT INTO periodos 
       (nombre, tipo, fecha_inicio_inscripciones, fecha_fin_inscripciones, 
        fecha_inicio_clases, fecha_fin_clases, fecha_inicio_examenes, fecha_fin_examenes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nombre, tipo, fecha_inicio_inscripciones, fecha_fin_inscripciones,
       fecha_inicio_clases, fecha_fin_clases, fecha_inicio_examenes, fecha_fin_examenes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error al crear período:', error);
    
    // Error de constraint de fechas
    if (error.code === '23514' && error.constraint === 'clases_validas') {
      return res.status(400).json({ 
        error: 'Las fechas no son válidas. Verifica que el Fin de clases sea DESPUÉS del Inicio de clases.'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Actualizar período
router.put('/:id', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // WHITELIST de campos permitidos (SEGURIDAD SQL)
    const CAMPOS_PERMITIDOS = [
      'nombre', 'tipo', 'fecha_inicio_inscripciones', 'fecha_fin_inscripciones',
      'fecha_inicio_clases', 'fecha_fin_clases', 'fecha_inicio_examenes',
      'fecha_fin_examenes', 'activo'
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
    
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE periodos SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activar/desactivar período
router.patch('/:id/toggle', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    
    if (activo) {
      // Desactivar todos los demás períodos
      await pool.query('UPDATE periodos SET activo = false');
    }
    
    const result = await pool.query(
      'UPDATE periodos SET activo = $1 WHERE id = $2 RETURNING *',
      [activo, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configurar tarifas del período
router.post('/:id/tarifas', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { tarifa_interno, tarifa_externo } = req.body;
    
    await pool.query('DELETE FROM tarifas WHERE periodo_id = $1', [id]);
    
    await pool.query(
      'INSERT INTO tarifas (periodo_id, tipo_alumno, monto) VALUES ($1, $2, $3)',
      [id, 'interno', tarifa_interno]
    );
    
    await pool.query(
      'INSERT INTO tarifas (periodo_id, tipo_alumno, monto) VALUES ($1, $2, $3)',
      [id, 'externo', tarifa_externo]
    );
    
    res.json({ message: 'Tarifas configuradas exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener tarifas del período
router.get('/:id/tarifas', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tarifas WHERE periodo_id = $1',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar período
router.delete('/:id', auth, checkRole('coordinador'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Verificar si el período tiene grupos asociados
    const gruposResult = await client.query(
      'SELECT COUNT(*) as total FROM grupos WHERE periodo_id = $1',
      [id]
    );
    
    if (parseInt(gruposResult.rows[0].total) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el período porque tiene grupos asociados. Primero debes eliminar o reasignar los grupos.' 
      });
    }
    
    // Verificar si es el período activo
    const periodoResult = await client.query(
      'SELECT activo FROM periodos WHERE id = $1',
      [id]
    );
    
    if (periodoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Período no encontrado' });
    }
    
    if (periodoResult.rows[0].activo) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el período activo. Primero activa otro período.' 
      });
    }
    
    // Eliminar tarifas asociadas
    await client.query('DELETE FROM tarifas WHERE periodo_id = $1', [id]);
    
    // Eliminar período
    await client.query('DELETE FROM periodos WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    res.json({ message: 'Período eliminado correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar período:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
