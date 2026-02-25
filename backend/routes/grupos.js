import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { 
  obtenerSugerenciasMaestros, 
  validarAsignacionMaestro,
  asignarMaestroMasivo 
} from '../services/maestrosSugerencias.js';

const router = express.Router();

// =============================================
// GET /api/grupos - Obtener todos los grupos
// =============================================
router.get('/', auth, async (req, res) => {
  try {
    const { periodo_id, nivel_id, maestro_id, activo } = req.query;

    let query = 'SELECT * FROM grupos_detalle WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (periodo_id) {
      query += ` AND periodo_id = $${paramCount++}`;
      params.push(periodo_id);
    }

    if (nivel_id) {
      query += ` AND nivel_id = $${paramCount++}`;
      params.push(nivel_id);
    }

    if (maestro_id) {
      query += ` AND maestro_id = $${paramCount++}`;
      params.push(maestro_id);
    }

    if (activo !== undefined) {
      query += ` AND activo = $${paramCount++}`;
      params.push(activo === 'true');
    }

    // Si es maestro, solo mostrar sus grupos
    if (req.user.rol === 'maestro') {
      const maestro = await pool.query('SELECT id FROM maestros WHERE usuario_id = $1', [req.user.id]);
      if (maestro.rows.length > 0) {
        query += ` AND maestro_id = $${paramCount++}`;
        params.push(maestro.rows[0].id);
      }
    }

    query += ' ORDER BY periodo_nombre DESC, nivel_nombre';

    const result = await pool.query(query, params);

    // Obtener todos los horarios de una vez para evitar N+1 queries
    const grupoIds = result.rows.map(g => g.id);
    let horariosMap = {};
    
    if (grupoIds.length > 0) {
      const horariosRes = await pool.query(
        `SELECT grupo_id, dia, hora_inicio, hora_fin 
         FROM grupos_horarios 
         WHERE grupo_id = ANY($1)
         ORDER BY grupo_id,
           CASE dia 
             WHEN 'lunes' THEN 1 
             WHEN 'martes' THEN 2 
             WHEN 'miercoles' THEN 3 
             WHEN 'jueves' THEN 4 
             WHEN 'viernes' THEN 5 
             WHEN 'sabado' THEN 6 
             WHEN 'domingo' THEN 7 
           END, 
           hora_inicio`,
        [grupoIds]
      );

      // Agrupar horarios por grupo_id
      horariosRes.rows.forEach(h => {
        if (!horariosMap[h.grupo_id]) {
          horariosMap[h.grupo_id] = [];
        }
        horariosMap[h.grupo_id].push(h);
      });
    }

    // Formatear horarios para cada grupo
    const diasMap = { 'lunes': 'Lun', 'martes': 'Mar', 'miercoles': 'Mié', 'jueves': 'Jue', 'viernes': 'Vie', 'sabado': 'Sáb', 'domingo': 'Dom' };
    const gruposConHorarios = result.rows.map(grupo => {
      const horariosGrupo = horariosMap[grupo.id] || [];
      
      if (horariosGrupo.length > 0) {
        const horariosTexto = horariosGrupo.map(h => 
          `${diasMap[h.dia] || h.dia} ${h.hora_inicio.substring(0,5)}-${h.hora_fin.substring(0,5)}`
        ).join(', ');
        grupo.horarios = horariosTexto;
      } else {
        grupo.horarios = null;
      }
      
      return grupo;
    });

    res.json(gruposConHorarios);
  } catch (error) {
    console.error('Error al obtener grupos:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /api/grupos/:id - Obtener grupo por ID
// =============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM grupos_detalle WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // Obtener horarios
    const horarios = await pool.query(
      `SELECT * FROM grupos_horarios 
       WHERE grupo_id = $1 
       ORDER BY 
         CASE dia 
           WHEN 'lunes' THEN 1 
           WHEN 'martes' THEN 2 
           WHEN 'miercoles' THEN 3 
           WHEN 'jueves' THEN 4 
           WHEN 'viernes' THEN 5 
           WHEN 'sabado' THEN 6 
           WHEN 'domingo' THEN 7 
         END, 
         hora_inicio`,
      [req.params.id]
    );

    const grupo = result.rows[0];
    grupo.horarios = horarios.rows;

    res.json(grupo);
  } catch (error) {
    console.error('Error al obtener grupo:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// POST /api/grupos - Crear grupo
// =============================================
router.post('/', auth, checkRole('coordinador'), async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      codigo,
      periodo_id,
      nivel_id,
      maestro_id,
      turno = 'matutino',
      modalidad,
      cupo_maximo,
      cupo_minimo = 5,
      costo_inscripcion,
      fecha_inicio,
      fecha_fin,
      horarios = [], // Array de {dia, hora_inicio, hora_fin}
      activo = true
    } = req.body;

    // Validaciones
    if (!codigo || !periodo_id || !nivel_id || !cupo_maximo) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Faltan campos obligatorios: codigo, periodo_id, nivel_id, cupo_maximo' });
    }
    
    // Validar tipos numéricos
    const cupoMaxNum = parseInt(cupo_maximo);
    const cupoMinNum = parseInt(cupo_minimo);
    
    if (isNaN(cupoMaxNum) || cupoMaxNum <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El cupo máximo debe ser un número válido mayor a 0' });
    }
    
    if (isNaN(cupoMinNum) || cupoMinNum <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El cupo mínimo debe ser un número válido mayor a 0' });
    }
    
    if (cupoMinNum > cupoMaxNum) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El cupo mínimo no puede ser mayor al cupo máximo' });
    }

    // Verificar código único
    const codigoCheck = await client.query('SELECT id FROM grupos WHERE codigo = $1', [codigo]);
    if (codigoCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El código del grupo ya existe' });
    }

    // Insertar grupo
    const result = await client.query(
      `INSERT INTO grupos 
       (codigo, periodo_id, nivel_id, maestro_id, turno, modalidad, cupo_maximo, cupo_minimo, 
        costo_inscripcion, fecha_inicio, fecha_fin, activo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING *`,
      [codigo, periodo_id, nivel_id, maestro_id, turno, modalidad, cupo_maximo, cupo_minimo,
       costo_inscripcion, fecha_inicio, fecha_fin, activo]
    );

    const grupoId = result.rows[0].id;

    // Insertar horarios
    if (horarios && horarios.length > 0) {
      for (const horario of horarios) {
        await client.query(
          'INSERT INTO grupos_horarios (grupo_id, dia, hora_inicio, hora_fin) VALUES ($1, $2, $3, $4)',
          [grupoId, horario.dia, horario.hora_inicio, horario.hora_fin]
        );
      }
    }

    await logAudit(req.user.id, 'CREATE', 'grupos', grupoId, null, result.rows[0], req.ip);

    await client.query('COMMIT');

    // Retornar con información completa
    const grupoCompleto = await pool.query('SELECT * FROM grupos_detalle WHERE id = $1', [grupoId]);
    const horariosGrupo = await pool.query(
      'SELECT * FROM grupos_horarios WHERE grupo_id = $1 ORDER BY dia, hora_inicio',
      [grupoId]
    );

    const grupo = grupoCompleto.rows[0];
    grupo.horarios = horariosGrupo.rows;

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('grupo:created', {
        id: grupoId,
        codigo: grupo.codigo,
        nivel: grupo.nivel_nombre,
        periodo: grupo.periodo_nombre
      });
    }

    res.status(201).json(grupo);
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return res.status(400).json({ error: 'El código del grupo ya existe' });
    }

    if (error.code === '23503') {
      return res.status(400).json({ error: 'El periodo, nivel o maestro seleccionado no existe' });
    }

    if (error.message?.includes('Conflicto de horario')) {
      return res.status(400).json({ error: error.message });
    }

    console.error('Error al crear grupo:', error);
    res.status(500).json({ error: 'Error al crear grupo: ' + error.message });
  } finally {
    client.release();
  }
});

// =============================================
// PUT /api/grupos/:id - Actualizar grupo
// =============================================
router.put('/:id', auth, checkRole('coordinador'), async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Campos permitidos
    const CAMPOS_PERMITIDOS = [
      'codigo', 'periodo_id', 'nivel_id', 'maestro_id', 'turno', 'modalidad',
      'cupo_maximo', 'cupo_minimo', 'costo_inscripcion', 'fecha_inicio', 'fecha_fin', 'activo'
    ];

    const fields = {};
    Object.keys(req.body).forEach(key => {
      if (CAMPOS_PERMITIDOS.includes(key)) {
        fields[key] = req.body[key];
      }
    });

    const oldData = await client.query('SELECT * FROM grupos WHERE id = $1', [id]);

    if (oldData.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // Actualizar grupo si hay campos
    if (Object.keys(fields).length > 0) {
      const keys = Object.keys(fields);
      const values = Object.values(fields);
      const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');

      await client.query(
        `UPDATE grupos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1}`,
        [...values, id]
      );
    }

    // Actualizar horarios si se proporcionan
    if (req.body.horarios !== undefined && Array.isArray(req.body.horarios) && req.body.horarios.length > 0) {
      // Eliminar horarios existentes
      await client.query('DELETE FROM grupos_horarios WHERE grupo_id = $1', [id]);

      // Insertar nuevos horarios solo si tienen los campos requeridos
      for (const horario of req.body.horarios) {
        if (horario.dia && horario.hora_inicio && horario.hora_fin) {
          await client.query(
            'INSERT INTO grupos_horarios (grupo_id, dia, hora_inicio, hora_fin) VALUES ($1, $2, $3, $4)',
            [id, horario.dia, horario.hora_inicio, horario.hora_fin]
          );
        }
      }
    }

    const newData = await client.query('SELECT * FROM grupos WHERE id = $1', [id]);
    await logAudit(req.user.id, 'UPDATE', 'grupos', id, oldData.rows[0], newData.rows[0], req.ip);

    await client.query('COMMIT');

    // Retornar con información completa
    const grupoCompleto = await pool.query('SELECT * FROM grupos_detalle WHERE id = $1', [id]);
    const horariosGrupo = await pool.query(
      'SELECT * FROM grupos_horarios WHERE grupo_id = $1 ORDER BY dia, hora_inicio',
      [id]
    );

    const grupo = grupoCompleto.rows[0];
    grupo.horarios = horariosGrupo.rows;

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('grupo:updated', {
        id: parseInt(id),
        codigo: grupo.codigo,
        nivel: grupo.nivel_nombre
      });
    }

    res.json(grupo);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar grupo:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// =============================================
// DELETE /api/grupos/:id - Eliminar grupo
// =============================================
router.delete('/:id', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const { id } = req.params;

    const oldData = await pool.query('SELECT * FROM grupos WHERE id = $1', [id]);

    if (oldData.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    await pool.query('DELETE FROM grupos WHERE id = $1', [id]);

    await logAudit(req.user.id, 'DELETE', 'grupos', id, oldData.rows[0], null, req.ip);

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('grupo:deleted', { id: parseInt(id), codigo: oldData.rows[0].codigo });
    }

    res.json({ message: 'Grupo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar grupo:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /api/grupos/:id/alumnos - Alumnos del grupo
// =============================================
router.get('/:id/alumnos', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        a.*,
        ac.nombre_completo,
        i.id as inscripcion_id,
        i.estatus as estatus_inscripcion,
        i.calificacion_final,
        i.porcentaje_asistencia
      FROM inscripciones i
      JOIN alumnos a ON i.alumno_id = a.id
      JOIN alumnos_completo ac ON a.id = ac.id
      WHERE i.grupo_id = $1
      ORDER BY ac.nombre_completo`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener alumnos del grupo:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🤖 GET /api/grupos/sugerencias-maestros/:id
// Obtener sugerencias inteligentes de maestros para un grupo
// =============================================
router.get('/sugerencias-maestros/:id', auth, checkRole(['coordinador', 'administrador']), async (req, res) => {
  try {
    console.log('🔍 Sugerencias maestros - Usuario:', req.user?.nombre, 'Rol:', req.user?.rol);
    const grupoId = parseInt(req.params.id);
    
    if (isNaN(grupoId)) {
      return res.status(400).json({ error: 'ID de grupo inválido' });
    }

    // Obtener periodo actual o del grupo
    const grupoQuery = await pool.query('SELECT periodo_id FROM grupos WHERE id = $1', [grupoId]);
    
    if (grupoQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const periodoId = grupoQuery.rows[0].periodo_id;
    
    const sugerencias = await obtenerSugerenciasMaestros(grupoId, periodoId);
    
    res.json(sugerencias);
  } catch (error) {
    console.error('Error al obtener sugerencias de maestros:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🔍 POST /api/grupos/validar-horario
// Validar si un maestro puede ser asignado a un grupo
// =============================================
router.post('/validar-horario', auth, checkRole(['coordinador', 'administrador']), async (req, res) => {
  try {
    const { maestro_id, grupo_id, periodo_id } = req.body;

    if (!maestro_id || !grupo_id || !periodo_id) {
      return res.status(400).json({ error: 'Faltan datos requeridos: maestro_id, grupo_id, periodo_id' });
    }

    const maestroIdNum = parseInt(maestro_id);
    const grupoIdNum = parseInt(grupo_id);
    const periodoIdNum = parseInt(periodo_id);

    if (isNaN(maestroIdNum) || isNaN(grupoIdNum) || isNaN(periodoIdNum)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    const validacion = await validarAsignacionMaestro(maestroIdNum, grupoIdNum, periodoIdNum);
    
    res.json(validacion);
  } catch (error) {
    console.error('Error al validar horario:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📋 POST /api/grupos/asignar-masivo
// Asignar un maestro a múltiples grupos
// =============================================
router.post('/asignar-masivo', auth, checkRole(['coordinador', 'administrador']), async (req, res) => {
  try {
    const { maestro_id, grupos_ids, periodo_id } = req.body;

    if (!maestro_id || !grupos_ids || !Array.isArray(grupos_ids) || grupos_ids.length === 0 || !periodo_id) {
      return res.status(400).json({ 
        error: 'Datos inválidos. Se requiere: maestro_id, grupos_ids (array), periodo_id' 
      });
    }

    const maestroIdNum = parseInt(maestro_id);
    const periodoIdNum = parseInt(periodo_id);
    const gruposIdsNum = grupos_ids.map(id => parseInt(id)).filter(id => !isNaN(id));

    if (isNaN(maestroIdNum) || isNaN(periodoIdNum) || gruposIdsNum.length === 0) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    // Verificar que el maestro existe
    const maestroQuery = await pool.query('SELECT id, nombre, apellido_paterno FROM maestros WHERE id = $1', [maestroIdNum]);
    
    if (maestroQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Maestro no encontrado' });
    }

    const resultado = await asignarMaestroMasivo(maestroIdNum, gruposIdsNum, periodoIdNum);
    
    // Registrar auditoría
    await logAudit(
      req.user.id,
      'UPDATE',
      'grupos',
      null,
      { accion: 'asignacion_masiva', maestro_id: maestroIdNum, grupos_asignados: resultado.exitosos },
      req
    );
    
    res.json(resultado);
  } catch (error) {
    console.error('Error en asignación masiva:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
