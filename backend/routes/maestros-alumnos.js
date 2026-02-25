import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// =============================================
// GET /:maestroId/alumnos - Obtener alumnos asignados directamente al maestro
// =============================================
router.get('/:maestroId/alumnos', auth, async (req, res) => {
  try {
    const { maestroId } = req.params;
    
    // Verificar que el usuario tenga permiso (coordinador o el mismo maestro)
    if (req.user.rol !== 'coordinador' && req.user.rol !== 'administrativo') {
      const maestro = await pool.query('SELECT id FROM maestros WHERE usuario_id = $1', [req.user.id]);
      if (!maestro.rows.length || maestro.rows[0].id !== parseInt(maestroId)) {
        return res.status(403).json({ error: 'No tienes permiso para ver estos alumnos' });
      }
    }
    
    // Obtener alumnos asignados directamente
    const alumnos = await pool.query(
      `SELECT * FROM maestros_alumnos 
       WHERE maestro_id = $1 AND alumno_estatus = 'activo'
       ORDER BY nivel_codigo, alumno_nombre`,
      [maestroId]
    );
    
    res.json(alumnos.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// POST /:maestroId/alumnos/:alumnoId - Asignar alumno a maestro
// =============================================
router.post('/:maestroId/alumnos/:alumnoId', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const { maestroId, alumnoId } = req.params;
    
    // Usar la función de la base de datos para validar y asignar
    const result = await pool.query(
      'SELECT asignar_maestro_alumno($1, $2) as success',
      [alumnoId, maestroId]
    );
    
    if (result.rows[0].success) {
      // Obtener información del alumno asignado
      const alumno = await pool.query(
        'SELECT * FROM alumnos_completo WHERE id = $1',
        [alumnoId]
      );
      
      res.json({ 
        message: 'Alumno asignado exitosamente al maestro',
        alumno: alumno.rows[0]
      });
    }
  } catch (error) {
    if (error.message.includes('no está certificado')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// DELETE /:maestroId/alumnos/:alumnoId - Desasignar alumno de maestro
// =============================================
router.delete('/:maestroId/alumnos/:alumnoId', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const { alumnoId } = req.params;
    
    await pool.query(
      'UPDATE alumnos SET maestro_id = NULL WHERE id = $1',
      [alumnoId]
    );
    
    res.json({ message: 'Alumno desasignado del maestro' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /:maestroId/alumnos-disponibles - Alumnos disponibles para asignar
// =============================================
router.get('/:maestroId/alumnos-disponibles', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const { maestroId } = req.params;
    const { nivel_id } = req.query;
    
    let query = `
      SELECT a.id, a.matricula, a.nombre, a.apellido_paterno, a.apellido_materno,
             a.tipo_alumno, a.nivel_id,
             CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
             n.nombre as nivel_nombre,
             n.codigo as nivel_codigo,
             n.orden
      FROM alumnos a
      LEFT JOIN niveles n ON a.nivel_id = n.id
      WHERE a.estatus = 'activo' 
      AND (a.maestro_id IS NULL OR a.maestro_id != $1)
    `;
    
    const params = [maestroId];
    
    // Filtrar por nivel si se especifica
    if (nivel_id) {
      query += ' AND a.nivel_id = $2';
      params.push(nivel_id);
      
      // Verificar que el maestro puede impartir ese nivel (solo si es necesario)
      const puedeImpartir = await pool.query(
        `SELECT EXISTS(
          SELECT 1 FROM maestros_niveles
          WHERE maestro_id = $1 AND nivel_id = $2 AND activo = true
        ) as puede`,
        [maestroId, nivel_id]
      );
      
      if (!puedeImpartir.rows[0].puede) {
        return res.status(400).json({ 
          error: 'El maestro no está certificado para impartir este nivel' 
        });
      }
    }
    
    query += ' ORDER BY n.orden, a.apellido_paterno, a.nombre LIMIT 50';
    
    const alumnos = await pool.query(query, params);
    
    res.json(alumnos.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /:maestroId/grupos-alumnos - Obtener grupos del maestro con alumnos
// =============================================
router.get('/:maestroId/grupos-alumnos', auth, async (req, res) => {
  try {
    const { maestroId } = req.params;
    
    // Verificar permisos
    if (req.user.rol !== 'coordinador' && req.user.rol !== 'administrativo') {
      const maestro = await pool.query('SELECT id FROM maestros WHERE usuario_id = $1', [req.user.id]);
      if (!maestro.rows.length || maestro.rows[0].id !== parseInt(maestroId)) {
        return res.status(403).json({ error: 'No tienes permiso' });
      }
    }
    
    // Obtener grupos del maestro con validación
    const grupos = await pool.query(
      `SELECT g.id, g.codigo, g.nivel_id, g.activo,
              n.nombre as nivel,
              n.codigo as nivel_codigo,
              p.nombre as periodo_nombre,
              COUNT(DISTINCT i.alumno_id) as total_alumnos
       FROM grupos g
       LEFT JOIN niveles n ON g.nivel_id = n.id
       LEFT JOIN periodos p ON g.periodo_id = p.id
       LEFT JOIN inscripciones i ON g.id = i.grupo_id AND i.estatus = 'activo'
       WHERE g.maestro_id = $1
       GROUP BY g.id, g.codigo, g.nivel_id, g.activo, n.nombre, n.codigo, n.orden, p.nombre
       ORDER BY g.activo DESC, n.orden, g.codigo`,
      [maestroId]
    );
    
    res.json(grupos.rows);
  } catch (error) {
    console.error('Error en grupos-alumnos:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /:maestroId/grupos/:grupoId/alumnos - Alumnos de un grupo específico
// =============================================
router.get('/:maestroId/grupos/:grupoId/alumnos', auth, async (req, res) => {
  try {
    const { grupoId } = req.params;
    
    const alumnos = await pool.query(
      `SELECT a.id, a.matricula, 
              CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
              a.tipo_alumno, 
              n.nombre as nivel_nombre,
              i.id as inscripcion_id, 
              i.estatus as inscripcion_estatus
       FROM inscripciones i
       JOIN alumnos a ON i.alumno_id = a.id
       LEFT JOIN niveles n ON a.nivel_id = n.id
       WHERE i.grupo_id = $1 AND i.estatus = 'activo'
       ORDER BY a.apellido_paterno, a.nombre`,
      [grupoId]
    );
    
    res.json(alumnos.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /:maestroId/grupos/:grupoId/disponibles - Alumnos disponibles para inscribir
// =============================================
router.get('/:maestroId/grupos/:grupoId/disponibles', auth, async (req, res) => {
  try {
    const { grupoId } = req.params;
    const { search } = req.query;
    
    // Obtener el grupo para validar el período (query optimizada)
    const grupo = await pool.query(
      'SELECT periodo_id, nivel_id FROM grupos WHERE id = $1',
      [grupoId]
    );
    
    if (grupo.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    
    const { periodo_id: periodoId, nivel_id: nivelId } = grupo.rows[0];
    
    // Query optimizada - excluir solo los que tienen inscripción ACTIVA en el periodo
    let query = `
      SELECT DISTINCT ON (a.id)
             a.id, a.matricula,
             CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
             a.tipo_alumno,
             a.semestre,
             n.nombre as nivel_nombre
      FROM alumnos a
      INNER JOIN niveles n ON a.nivel_id = n.id
      WHERE a.estatus = 'activo'
        AND a.nivel_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM inscripciones i
          INNER JOIN grupos g ON i.grupo_id = g.id
          WHERE i.alumno_id = a.id
            AND g.periodo_id = $2
            AND i.estatus = 'activo'
        )
    `;
    
    const params = [nivelId, periodoId];
    
    if (search) {
      query += ` AND (
        a.nombre ILIKE $3
        OR a.apellido_paterno ILIKE $3
        OR a.apellido_materno ILIKE $3
        OR a.matricula ILIKE $3
      )`;
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY a.id, a.apellido_paterno, a.nombre LIMIT 100';
    
    const alumnos = await pool.query(query, params);
    
    res.json(alumnos.rows);
  } catch (error) {
    console.error('Error al obtener alumnos disponibles:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// POST /:maestroId/grupos/:grupoId/inscribir - Inscribir alumno a grupo
// =============================================
router.post('/:maestroId/grupos/:grupoId/inscribir', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { grupoId } = req.params;
    const { alumnoId } = req.body;
    
    await client.query('BEGIN');
    
    // Obtener información del grupo
    const grupo = await client.query(
      `SELECT g.id, g.codigo, g.periodo_id, g.nivel_id, g.cupo_maximo,
              COUNT(i.id) FILTER (WHERE i.estatus = 'activo') as inscritos_activos
       FROM grupos g
       LEFT JOIN inscripciones i ON g.id = i.grupo_id AND i.estatus = 'activo'
       WHERE g.id = $1
       GROUP BY g.id, g.codigo, g.periodo_id, g.nivel_id, g.cupo_maximo`,
      [grupoId]
    );
    
    if (grupo.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    
    const grupoInfo = grupo.rows[0];
    
    // VALIDACIÓN DE NIVEL: El nivel del alumno debe coincidir con el del grupo
    const alumnoLevelCheck = await client.query(
      `SELECT a.nivel_id, n.nombre as nivel_nombre 
       FROM alumnos a 
       JOIN niveles n ON a.nivel_id = n.id 
       WHERE a.id = $1`,
      [alumnoId]
    );

    if (alumnoLevelCheck.rows.length > 0) {
      const { nivel_id: alumnoNivelId, nivel_nombre: alumnoNivelNombre } = alumnoLevelCheck.rows[0];
      
      // Obtener nombre del nivel del grupo para el mensaje de error
      const grupoNivel = await client.query('SELECT nombre FROM niveles WHERE id = $1', [grupoInfo.nivel_id]);
      const grupoNivelNombre = grupoNivel.rows[0]?.nombre || 'Nivel desconocido';

      if (alumnoNivelId !== grupoInfo.nivel_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Incompatibilidad de nivel: El alumno está en "${alumnoNivelNombre}" y el grupo es de nivel "${grupoNivelNombre}".` 
        });
      }
    }

    // Validar cupo disponible
    if (grupoInfo.inscritos_activos >= grupoInfo.cupo_maximo) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `El grupo ${grupoInfo.codigo} ya está lleno (${grupoInfo.cupo_maximo}/${grupoInfo.cupo_maximo})` 
      });
    }
    
    // VALIDACIÓN CRÍTICA: Un alumno solo puede estar en UN grupo por período
    const inscripcionExistente = await client.query(
      `SELECT g.codigo, g.id
       FROM inscripciones i
       JOIN grupos g ON i.grupo_id = g.id
       WHERE i.alumno_id = $1
         AND g.periodo_id = $2
         AND i.estatus = 'activo'`,
      [alumnoId, grupoInfo.periodo_id]
    );
    
    if (inscripcionExistente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `El alumno ya está inscrito en el grupo "${inscripcionExistente.rows[0].codigo}". Solo puede estar en UN grupo por período.` 
      });
    }
    
    // Verificar que el alumno existe y está activo
    const alumno = await client.query(
      'SELECT id, nombre, apellido_paterno FROM alumnos WHERE id = $1 AND estatus = \'activo\'',
      [alumnoId]
    );
    
    if (alumno.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Alumno no encontrado o inactivo' });
    }
    
    // Crear o reactivar inscripción
    const inscripcion = await client.query(
      `INSERT INTO inscripciones (alumno_id, grupo_id, periodo_id, estatus, fecha_inscripcion, fecha_baja, motivo_baja)
       VALUES ($1, $2, $3, 'activo', NOW(), NULL, NULL)
       ON CONFLICT (alumno_id, grupo_id, periodo_id) 
       DO UPDATE SET 
         estatus = 'activo', 
         fecha_inscripcion = NOW(),
         fecha_baja = NULL,
         motivo_baja = NULL,
         updated_at = NOW()
       RETURNING *`,
      [alumnoId, grupoId, grupoInfo.periodo_id]
    );
    
    await client.query('COMMIT');
    
    // Responder de inmediato
    res.json({
      message: 'Alumno inscrito exitosamente',
      inscripcion: inscripcion.rows[0],
      alumno: alumno.rows[0],
      grupo: grupoInfo
    });

    // Registrar auditoría en segundo plano
    logAudit(
      req.user.id,
      'INSERT',
      'inscripciones',
      inscripcion.rows[0].id,
      null,
      inscripcion.rows[0],
      req.ip
    ).catch(err => console.error('Error en auditoría background:', err));

  } catch (error) {
    await client.query('ROLLBACK');
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: 'El alumno ya está inscrito en este grupo' 
      });
    }
    
    console.error('Error al inscribir alumno:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// =============================================
// DELETE /:maestroId/grupos/:grupoId/remover/:inscripcionId - Remover alumno del grupo
// =============================================
router.delete('/:maestroId/grupos/:grupoId/remover/:inscripcionId', auth, async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    
    // Cambiar estatus a 'inactivo' para mantener historial
    const result = await pool.query(
      `UPDATE inscripciones 
       SET estatus = 'inactivo', 
           fecha_baja = NOW(),
           motivo_baja = 'Removido del grupo'
       WHERE id = $1
       RETURNING *`,
      [inscripcionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }
    
    // Responder de inmediato al usuario
    res.json({ 
      message: 'Alumno removido del grupo exitosamente',
      inscripcion: result.rows[0]
    });

    // Registrar auditoría en segundo plano (sin await para no bloquear)
    logAudit(
      req.user.id,
      'UPDATE',
      'inscripciones',
      result.rows[0].id,
      { estatus: 'activo' },
      { estatus: 'inactivo', motivo: 'Removido del grupo' },
      req.ip
    ).catch(err => console.error('Error en auditoría background:', err));

  } catch (error) {
    console.error('Error al remover alumno:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /:maestroId/estadisticas - Estadísticas del maestro
// =============================================
router.get('/:maestroId/estadisticas', auth, async (req, res) => {
  try {
    const { maestroId } = req.params;
    
    // Total de alumnos asignados directamente
    const alumnosDirectos = await pool.query(
      'SELECT COUNT(*) as total FROM alumnos WHERE maestro_id = $1 AND estatus = \'activo\'',
      [maestroId]
    );
    
    // Total de alumnos en grupos
    const alumnosGrupos = await pool.query(
      `SELECT COUNT(DISTINCT i.alumno_id) as total
       FROM inscripciones i
       JOIN grupos g ON i.grupo_id = g.id
       WHERE g.maestro_id = $1 AND i.estatus = 'activo'`,
      [maestroId]
    );
    
    // Distribución por nivel
    const porNivel = await pool.query(
      `SELECT n.nombre as nivel, COUNT(*) as total
       FROM alumnos a
       JOIN niveles n ON a.nivel_id = n.id
       WHERE a.maestro_id = $1 AND a.estatus = 'activo'
       GROUP BY n.nombre, n.orden
       ORDER BY n.orden
       LIMIT 20`,
      [maestroId]
    );
    
    res.json({
      alumnos_directos: parseInt(alumnosDirectos.rows[0].total),
      alumnos_en_grupos: parseInt(alumnosGrupos.rows[0].total),
      distribucion_por_nivel: porNivel.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
