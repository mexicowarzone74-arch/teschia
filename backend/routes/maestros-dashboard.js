import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import { Parser } from 'json2csv';

const router = express.Router();

// Obtener métricas resumidas para el maestro
router.get('/metricas', auth, checkRole('maestro'), async (req, res) => {
  try {
    const maestroId = req.user.maestro_id;
    console.log('📊 Solicitando métricas para maestro_id:', maestroId);
    
    if (!maestroId) {
      console.log('❌ No hay maestro_id en el token');
      return res.status(401).json({ error: 'No se encontró tu ID de maestro. Por favor re-inicia sesión.' });
    }

    const result = await pool.query(`
      SELECT 
        COALESCE(COUNT(DISTINCT i.alumno_id), 0) as total_alumnos,
        COALESCE(COUNT(DISTINCT CASE WHEN a.tipo_alumno = 'interno' THEN i.alumno_id END), 0) as alumnos_internos,
        COALESCE(COUNT(DISTINCT CASE WHEN a.tipo_alumno = 'externo' THEN i.alumno_id END), 0) as alumnos_externos,
        COALESCE(COUNT(DISTINCT g.id), 0) as total_grupos
      FROM grupos g
      LEFT JOIN inscripciones i ON g.id = i.grupo_id AND i.estatus = 'activo'
      LEFT JOIN alumnos a ON i.alumno_id = a.id
      JOIN periodos p ON g.periodo_id = p.id
      WHERE g.maestro_id = $1 AND p.activo = true
    `, [maestroId]);

    const niveles = await pool.query(`
      SELECT 
        n.nombre as nivel,
        COALESCE(COUNT(DISTINCT i.alumno_id), 0) as total
      FROM niveles n
      JOIN grupos g ON n.id = g.nivel_id
      LEFT JOIN inscripciones i ON g.id = i.grupo_id AND i.estatus = 'activo'
      JOIN periodos p ON g.periodo_id = p.id
      WHERE g.maestro_id = $1 AND p.activo = true
      GROUP BY n.nombre, n.orden
      ORDER BY n.orden
    `, [maestroId]);

    res.json({
      ...result.rows[0],
      por_nivel: niveles.rows
    });
  } catch (error) {
    console.error('Error al obtener métricas de maestro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener grupos asignados al maestro autenticado
router.get('/mis-grupos', auth, checkRole('maestro', 'coordinador'), async (req, res) => {
  try {
    const maestroId = req.user.maestro_id;
    
    console.log('📚 Obteniendo grupos para usuario:', req.user.username, 'Rol:', req.user.rol, 'MaestroID:', maestroId);
    console.log('🔍 Token completo:', JSON.stringify(req.user, null, 2));
    
    // Si es maestro pero no tiene maestro_id, rechazar
    if (req.user.rol === 'maestro' && !maestroId) {
      console.log('❌ Maestro sin maestro_id - token antiguo');
      return res.status(401).json({ 
        error: 'Tu sesión es antigua. Por favor, cierra sesión (botón en la esquina superior derecha) y vuelve a iniciar sesión.' 
      });
    }
    
    let query = `
      SELECT 
        g.id,
        g.codigo,
        g.nivel_id,
        n.nombre as nivel,
        STRING_AGG(
          CONCAT(
            CASE gh.dia
              WHEN 'lunes' THEN 'Lun'
              WHEN 'martes' THEN 'Mar'
              WHEN 'miercoles' THEN 'Mié'
              WHEN 'jueves' THEN 'Jue'
              WHEN 'viernes' THEN 'Vie'
              WHEN 'sabado' THEN 'Sáb'
              WHEN 'domingo' THEN 'Dom'
            END,
            ' ',
            TO_CHAR(gh.hora_inicio, 'HH24:MI'),
            '-',
            TO_CHAR(gh.hora_fin, 'HH24:MI')
          ),
          ', ' ORDER BY gh.dia, gh.hora_inicio
        ) as horarios,
        ARRAY_AGG(DISTINCT gh.dia) as dias_lista,
        g.activo,
        p.nombre as periodo_nombre,
        COUNT(DISTINCT i.id) as total_alumnos
      FROM grupos g
      LEFT JOIN niveles n ON g.nivel_id = n.id
      LEFT JOIN periodos p ON g.periodo_id = p.id
      LEFT JOIN grupos_horarios gh ON g.id = gh.grupo_id
      LEFT JOIN inscripciones i ON g.id = i.grupo_id AND i.estatus = 'activo'
    `;
    
    const params = [];
    
    // Si es maestro, filtrar solo sus grupos
    if (req.user.rol === 'maestro' && maestroId) {
      console.log('✅ Aplicando filtro WHERE g.maestro_id =', maestroId);
      query += ' WHERE g.maestro_id = $1';
      params.push(maestroId);
    } else {
      console.log('⚠️ NO se aplicó filtro. Rol:', req.user.rol, 'MaestroID:', maestroId);
    }
    
    query += ' GROUP BY g.id, g.codigo, g.nivel_id, n.nombre, g.activo, p.nombre ORDER BY g.codigo';
    
    console.log('🔍 Query final:', query);
    console.log('🔍 Params:', params);
    
    const result = await pool.query(query, params);
    console.log('✅ Grupos encontrados:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener grupos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener alumnos del grupo en formato JSON
router.get('/alumnos-grupo/:grupo_id', auth, checkRole('maestro', 'coordinador'), async (req, res) => {
  try {
    const { grupo_id } = req.params;
    
    // Verificar que el maestro tenga acceso a este grupo
    if (req.user.rol === 'maestro') {
      const grupoCheck = await pool.query(
        'SELECT id FROM grupos WHERE id = $1 AND maestro_id = $2',
        [grupo_id, req.user.maestro_id]
      );
      
      if (grupoCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No tienes acceso a este grupo' });
      }
    }
    
    // Obtener alumnos inscritos
    const result = await pool.query(
      `SELECT 
        i.id as inscripcion_id,
        a.id as alumno_id,
        a.matricula,
        CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo
      FROM inscripciones i
      JOIN alumnos a ON i.alumno_id = a.id
      WHERE i.grupo_id = $1 AND i.estatus = 'activo'
      ORDER BY a.nombre, a.apellido_paterno`,
      [grupo_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener alumnos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generar plantilla CSV de calificaciones
router.get('/plantilla-calificaciones/:grupo_id/:parcial', auth, checkRole('maestro', 'coordinador'), async (req, res) => {
  try {
    const { grupo_id, parcial } = req.params;
    
    // Verificar que el maestro tenga acceso a este grupo
    if (req.user.rol === 'maestro') {
      const grupoCheck = await pool.query(
        'SELECT id FROM grupos WHERE id = $1 AND maestro_id = $2',
        [grupo_id, req.user.maestro_id]
      );
      
      if (grupoCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No tienes acceso a este grupo' });
      }
    }
    
    // Obtener alumnos inscritos
    const result = await pool.query(
      `SELECT 
        i.id as inscripcion_id,
        a.id as alumno_id,
        a.matricula,
        CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
        c.calificacion,
        c.observaciones
      FROM inscripciones i
      JOIN alumnos a ON i.alumno_id = a.id
      LEFT JOIN calificaciones c ON i.id = c.inscripcion_id AND c.parcial = $2
      WHERE i.grupo_id = $1 AND i.estatus = 'activo'
      ORDER BY a.nombre, a.apellido_paterno`,
      [grupo_id, parcial]
    );
    
    // Preparar datos para CSV
    const data = result.rows.map(row => ({
      inscripcion_id: row.inscripcion_id,
      alumno_id: row.alumno_id,
      matricula: row.matricula,
      nombre_completo: row.nombre_completo,
      calificacion: row.calificacion || '',
      observaciones: row.observaciones || ''
    }));
    
    // Generar CSV
    const fields = ['inscripcion_id', 'alumno_id', 'matricula', 'nombre_completo', 'calificacion', 'observaciones'];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    
    // Enviar archivo
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', `attachment; filename="calificaciones_grupo_${grupo_id}_parcial_${parcial}.csv"`);
    res.send('\uFEFF' + csv); // BOM para Excel
  } catch (error) {
    console.error('Error al generar plantilla:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generar plantilla CSV de asistencias
router.get('/plantilla-asistencias/:grupo_id/:fecha', auth, checkRole('maestro', 'coordinador'), async (req, res) => {
  try {
    const { grupo_id, fecha } = req.params;
    
    // Verificar acceso del maestro
    if (req.user.rol === 'maestro') {
      const grupoCheck = await pool.query(
        'SELECT id FROM grupos WHERE id = $1 AND maestro_id = $2',
        [grupo_id, req.user.maestro_id]
      );
      
      if (grupoCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No tienes acceso a este grupo' });
      }
    }
    
    // Obtener alumnos
    const result = await pool.query(
      `SELECT 
        i.id as inscripcion_id,
        a.id as alumno_id,
        a.matricula,
        CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
        asist.presente,
        asist.justificada,
        asist.observaciones
      FROM inscripciones i
      JOIN alumnos a ON i.alumno_id = a.id
      LEFT JOIN asistencias asist ON i.id = asist.inscripcion_id AND asist.fecha = $2
      WHERE i.grupo_id = $1 AND i.estatus = 'activo'
      ORDER BY a.nombre, a.apellido_paterno`,
      [grupo_id, fecha]
    );
    
    // Preparar datos
    const data = result.rows.map(row => {
      let estatus = 'Asistencia';
      if (row.justificada) estatus = 'Justificada';
      else if (row.presente === false) estatus = 'Falta';
      
      return {
        inscripcion_id: row.inscripcion_id,
        alumno_id: row.alumno_id,
        matricula: row.matricula,
        nombre_completo: row.nombre_completo,
        estatus: row.presente !== null ? estatus : '',
        observaciones: row.observaciones || ''
      };
    });
    
    // Generar CSV
    const fields = ['inscripcion_id', 'alumno_id', 'matricula', 'nombre_completo', 'estatus', 'observaciones'];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', `attachment; filename="asistencias_grupo_${grupo_id}_fecha_${fecha}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Error al generar plantilla:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
