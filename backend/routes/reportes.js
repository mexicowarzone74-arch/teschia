import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';

const router = express.Router();

// Reporte de reprobación
router.get('/reprobacion', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const { periodo_id, nivel, carrera } = req.query;

    let query = `
      SELECT 
        g.codigo as grupo,
        n.nombre as nivel,
        CONCAT(m.nombre, ' ', m.apellido_paterno) as maestro,
        COUNT(DISTINCT i.alumno_id) as total_alumnos,
        COUNT(DISTINCT i.alumno_id) FILTER (
          WHERE (
            SELECT AVG(c.calificacion) 
            FROM calificaciones c 
            WHERE c.inscripcion_id = i.id
          ) < 70
        ) as reprobados,
        ROUND(
          COUNT(DISTINCT i.alumno_id) FILTER (
            WHERE (
              SELECT AVG(c.calificacion) 
              FROM calificaciones c 
              WHERE c.inscripcion_id = i.id
            ) < 70
          ) * 100.0 / NULLIF(COUNT(DISTINCT i.alumno_id), 0), 
          2
        ) as tasa_reprobacion
      FROM grupos g
      JOIN niveles n ON g.nivel_id = n.id
      LEFT JOIN inscripciones i ON g.id = i.grupo_id
      LEFT JOIN maestros m ON g.maestro_id = m.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE (u.rol = 'maestro' OR g.maestro_id IS NULL)
    `;

    const params = [];
    let paramCount = 1;

    if (periodo_id) {
      query += ` AND g.periodo_id = $${paramCount++}`;
      params.push(periodo_id);
    }

    if (nivel) {
      query += ` AND g.nivel = $${paramCount++}`;
      params.push(nivel);
    }

    query += ' GROUP BY g.id, g.codigo, n.nombre, m.nombre, m.apellido_paterno ORDER BY tasa_reprobacion DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte de deserción
router.get('/desercion', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const { periodo_id } = req.query;

    let query = `
      SELECT 
        g.id,
        g.codigo as grupo,
        n.nombre as nivel,
        COUNT(*) FILTER (WHERE i.estatus = 'activo' OR i.estatus = 'aprobado') as activos,
        COUNT(*) FILTER (WHERE i.estatus = 'baja' OR i.estatus = 'desercion') as deserciones,
        ROUND(
          COUNT(*) FILTER (WHERE i.estatus = 'baja' OR i.estatus = 'desercion') * 100.0 / 
          NULLIF(COUNT(*), 0), 
          2
        ) as tasa_desercion
      FROM grupos g
      JOIN niveles n ON g.nivel_id = n.id
      LEFT JOIN inscripciones i ON g.id = i.grupo_id
      WHERE 1=1
    `;

    const params = [];

    if (periodo_id) {
      query += ' AND g.periodo_id = $1';
      params.push(periodo_id);
    }

    query += ' GROUP BY g.id, g.codigo, n.nombre ORDER BY tasa_desercion DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte de alumnos próximos a egresar sin inglés
router.get('/alumnos/sin-requisito', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        a.id,
        a.matricula,
        CONCAT(a.nombre, ' ', a.apellido_paterno) as nombre_completo,
        a.carrera,
        a.semestre,
        a.nivel_actual,
        a.correo,
        a.telefono
      FROM alumnos a
      WHERE 1=1`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte de carga horaria de maestros
router.get('/maestros/carga', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        m.id,
        CONCAT(m.nombre, ' ', m.apellido_paterno) as nombre_completo,
        COUNT(DISTINCT g.id) as grupos_asignados,
        COUNT(DISTINCT gh.id) as horas_semanales
      FROM maestros m
      JOIN usuarios u ON m.usuario_id = u.id
      LEFT JOIN grupos g ON m.id = g.maestro_id AND g.activo = true
      LEFT JOIN grupos_horarios gh ON g.id = gh.grupo_id
      WHERE m.activo = true AND u.rol = 'maestro'
      GROUP BY m.id, m.nombre, m.apellido_paterno
      ORDER BY horas_semanales DESC`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte de eficiencia terminal
router.get('/eficiencia-terminal', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const query = `
      SELECT 
        a.nivel_actual as nivel,
        COUNT(DISTINCT a.id) as inscritos,
        COUNT(DISTINCT a.id) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM inscripciones i2
            JOIN grupos g2 ON i2.grupo_id = g2.id
            JOIN periodos p2 ON g2.periodo_id = p2.id
            WHERE i2.alumno_id = a.id
              AND i2.estatus = 'aprobado'
              AND p2.activo = true
          )
        ) as aprobados,
        ROUND(
          COUNT(DISTINCT a.id) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM inscripciones i2
              JOIN grupos g2 ON i2.grupo_id = g2.id
              JOIN periodos p2 ON g2.periodo_id = p2.id
              WHERE i2.alumno_id = a.id
                AND i2.estatus = 'aprobado'
                AND p2.activo = true
            )
          ) * 100.0 / NULLIF(COUNT(DISTINCT a.id), 0),
          2
        ) as eficiencia
      FROM alumnos a
      WHERE a.nivel_actual IS NOT NULL
      GROUP BY a.nivel_actual
      ORDER BY a.nivel_actual
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportar datos (simplificado - en producción usar librerías específicas)
router.get('/exportar/:tipo', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const { tipo } = req.params;
    const { periodo_id, maestro_id, grupo_id, formato } = req.query;

    console.log(`[REPORTES] Tipo: ${tipo}, Periodo: ${periodo_id}, Formato: ${formato}`);

    let result;

    switch (tipo) {
      case 'reprobacion': {
        let query = `
          SELECT 
            g.codigo as grupo,
            n.nombre as nivel,
            CONCAT(m.nombre, ' ', m.apellido_paterno) as maestro,
            COUNT(DISTINCT i.alumno_id) as total_alumnos,
            COUNT(DISTINCT i.alumno_id) FILTER (
              WHERE (SELECT AVG(c.calificacion) FROM calificaciones c WHERE c.inscripcion_id = i.id) < 70
            ) as reprobados
          FROM grupos g
          JOIN niveles n ON g.nivel_id = n.id
          LEFT JOIN inscripciones i ON g.id = i.grupo_id
          LEFT JOIN maestros m ON g.maestro_id = m.id
          LEFT JOIN usuarios u ON m.usuario_id = u.id
          WHERE (u.rol = 'maestro' OR g.maestro_id IS NULL)
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += ' GROUP BY g.id, g.codigo, n.nombre, m.nombre, m.apellido_paterno';
        result = await pool.query(query, params);
        break;
      }

      case 'desercion': {
        let query = `
          SELECT 
            g.codigo as grupo,
            n.nombre as nivel,
            COUNT(*) FILTER (WHERE i.estatus = 'activo' OR i.estatus = 'aprobado') as activos,
            COUNT(*) FILTER (WHERE i.estatus = 'baja' OR i.estatus = 'desercion') as deserciones
          FROM grupos g
          JOIN niveles n ON g.nivel_id = n.id
          LEFT JOIN inscripciones i ON g.id = i.grupo_id
          WHERE 1=1
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += ' GROUP BY g.id, g.codigo, n.nombre';
        result = await pool.query(query, params);
        break;
      }

      case 'sin-requisito':
        result = await pool.query(`
          SELECT 
            a.matricula,
            CONCAT(a.nombre, ' ', a.apellido_paterno) as nombre_completo,
            a.carrera,
            a.semestre,
            a.nivel_actual
          FROM alumnos a
          WHERE a.tipo_alumno = 'externo'
            AND a.estatus = 'activo'
        `);
        break;

      case 'carga-maestros': {
        const query = `
          SELECT 
            CONCAT(m.nombre, ' ', m.apellido_paterno) as nombre_completo,
            COUNT(DISTINCT g.id) as grupos_asignados,
            COUNT(DISTINCT gh.id) as horas_semanales
          FROM maestros m
          JOIN usuarios u ON m.usuario_id = u.id
          LEFT JOIN grupos g ON m.id = g.maestro_id AND g.activo = true ${periodo_id ? 'AND g.periodo_id = $1' : ''}
          LEFT JOIN grupos_horarios gh ON g.id = gh.grupo_id
          WHERE m.activo = true AND u.rol = 'maestro'
          GROUP BY m.id, m.nombre, m.apellido_paterno
        `;
        result = await pool.query(query, periodo_id ? [periodo_id] : []);
        break;
      }

      case 'eficiencia-terminal': {
        let query = `
          SELECT 
            n.nombre as nivel,
            COUNT(DISTINCT i.alumno_id) as inscritos,
            COUNT(DISTINCT i.alumno_id) FILTER (WHERE i.estatus = 'aprobado') as aprobados,
            ROUND(COUNT(DISTINCT i.alumno_id) FILTER (WHERE i.estatus = 'aprobado') * 100.0 / NULLIF(COUNT(DISTINCT i.alumno_id), 0), 2) as eficiencia
          FROM niveles n
          JOIN grupos g ON n.id = g.nivel_id
          JOIN inscripciones i ON g.id = i.grupo_id
          WHERE 1=1
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += ' GROUP BY n.id, n.nombre, n.orden ORDER BY n.orden';
        result = await pool.query(query, params);
        break;
      }

      case 'ingresos': {
        let query = `
          SELECT 
            p.concepto,
            COUNT(*) as total_pagos,
            SUM(p.monto_final) as monto_total,
            p.estatus
          FROM pagos p
          JOIN inscripciones i ON p.inscripcion_id = i.id
          JOIN grupos g ON i.grupo_id = g.id
          WHERE 1=1
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += ' GROUP BY p.concepto, p.estatus';
        result = await pool.query(query, params);
        break;
      }

      case 'prorrogas-activas': {
        let query = `
          SELECT 
            a.matricula,
            CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as alumno,
            g.codigo as grupo,
            p.monto_final as monto,
            p.fecha_limite_prorroga as limite,
            CASE 
              WHEN p.fecha_limite_prorroga < CURRENT_DATE THEN 'Vencida'
              WHEN p.fecha_limite_prorroga BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days' THEN 'Por Vencer'
              ELSE 'Activa'
            END as estado
          FROM pagos p
          JOIN inscripciones i ON p.inscripcion_id = i.id
          JOIN alumnos a ON i.alumno_id = a.id
          JOIN grupos g ON i.grupo_id = g.id
          WHERE p.tiene_prorroga = true 
            AND p.estatus IN ('pendiente', 'prorroga')
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        result = await pool.query(query, params);
        break;
      }

      case 'adeudos-criticos': {
        let query = `
          SELECT 
            a.matricula,
            CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as alumno,
            g.codigo as grupo,
            COUNT(p.id) as adeudos_cant,
            SUM(p.monto_final) as monto_total
          FROM alumnos a
          JOIN inscripciones i ON a.id = i.alumno_id
          JOIN grupos g ON i.grupo_id = g.id
          JOIN pagos p ON i.id = p.inscripcion_id
          WHERE p.estatus IN ('pendiente', 'prorroga')
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += ' GROUP BY a.id, a.nombre, a.apellido_paterno, a.apellido_materno, a.matricula, g.codigo HAVING SUM(p.monto_final) > 0';
        result = await pool.query(query, params);
        break;
      }

      case 'vencidos':
      case 'adeudos-vencidos': {
        let query = `
          SELECT 
            a.matricula,
            a.nombre,
            a.apellido_paterno,
            a.apellido_materno,
            a.correo,
            a.telefono,
            g.codigo as grupo,
            p.concepto,
            p.monto_final as monto,
            p.estatus,
            COALESCE(p.fecha_limite_prorroga, p.fecha_vencimiento) as fecha_vence,
            CURRENT_DATE - COALESCE(p.fecha_limite_prorroga, p.fecha_vencimiento) as dias_vencido
          FROM pagos p
          JOIN inscripciones i ON p.inscripcion_id = i.id
          JOIN alumnos a ON i.alumno_id = a.id
          JOIN grupos g ON i.grupo_id = g.id
          WHERE p.estatus IN ('pendiente', 'prorroga', 'vencido')
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += ' ORDER BY fecha_vence ASC, a.apellido_paterno';
        result = await pool.query(query, params);
        break;
      }

      case 'calificaciones-grupo': {
        const { periodo_id, grupo_id, maestro_id } = req.query;
        let query = `
          SELECT 
            a.matricula,
            CONCAT(a.nombre, ' ', a.apellido_paterno) as alumno,
            g.codigo as grupo,
            COALESCE(MAX(CASE WHEN c.parcial = 1 THEN c.calificacion END), 0) as p1,
            COALESCE(MAX(CASE WHEN c.parcial = 2 THEN c.calificacion END), 0) as p2,
            COALESCE(MAX(CASE WHEN c.parcial = 3 THEN c.calificacion END), 0) as p3,
            COALESCE(ROUND(AVG(c.calificacion), 2), 0) as promedio,
            CASE WHEN AVG(c.calificacion) >= 70 THEN 'Aprobado' ELSE 'Reprobado' END as estatus
          FROM inscripciones i
          JOIN alumnos a ON i.alumno_id = a.id
          JOIN grupos g ON i.grupo_id = g.id
          LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
          WHERE 1=1
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += ' GROUP BY a.id, a.nombre, a.apellido_paterno, a.matricula, g.codigo ORDER BY a.nombre';
        result = await pool.query(query, params);
        break;
      }

      case 'sabana-global': {
        const { periodo_id, grupo_id, maestro_id } = req.query;
        let query = `
          SELECT 
            a.matricula,
            CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as alumno,
            g.codigo as grupo,
            n.nombre as nivel,
            COALESCE(MAX(CASE WHEN c.parcial = 1 THEN c.calificacion END), 0) as p1,
            COALESCE(MAX(CASE WHEN c.parcial = 2 THEN c.calificacion END), 0) as p2,
            COALESCE(MAX(CASE WHEN c.parcial = 3 THEN c.calificacion END), 0) as p3,
            COALESCE(ROUND(AVG(c.calificacion), 2), 0) as promedio,
            ROUND((COUNT(asist.id) FILTER (WHERE asist.presente = true OR asist.justificada = true)::numeric / NULLIF(COUNT(asist.id), 0)) * 100, 2) as asistencia_pct,
            CASE 
              WHEN COALESCE(SUM(c.calificacion), 0) >= 210 AND 
                   ROUND((COUNT(asist.id) FILTER (WHERE asist.presente = true OR asist.justificada = true)::numeric / NULLIF(COUNT(asist.id), 0)) * 100, 2) >= 80 
              THEN 'APROBADO' 
              ELSE 'REPROBADO' 
            END as estatus_final
          FROM inscripciones i
          JOIN alumnos a ON i.alumno_id = a.id
          JOIN grupos g ON i.grupo_id = g.id
          JOIN niveles n ON g.nivel_id = n.id
          LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
          LEFT JOIN asistencias asist ON i.id = asist.inscripcion_id
          WHERE i.estatus = 'activo'
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += ' GROUP BY a.id, a.nombre, a.apellido_paterno, a.apellido_materno, a.matricula, g.codigo, n.nombre ORDER BY a.nombre';
        result = await pool.query(query, params);
        break;
      }

      case 'asistencias-alumnos': {
        const { periodo_id, grupo_id, maestro_id } = req.query;
        let query = `
          SELECT 
            a.matricula,
            CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as alumno,
            g.codigo as grupo,
            COUNT(asist.id) as total_clases,
            COUNT(asist.id) FILTER (WHERE asist.presente = true) as asistencias,
            COUNT(asist.id) FILTER (WHERE asist.presente = false AND asist.justificada = false) as faltas,
            COUNT(asist.id) FILTER (WHERE asist.justificada = true) as justificadas,
            ROUND((COUNT(asist.id) FILTER (WHERE asist.presente = true OR asist.justificada = true)::numeric / NULLIF(COUNT(asist.id), 0)) * 100, 2) as porcentaje
          FROM inscripciones i
          JOIN alumnos a ON i.alumno_id = a.id
          JOIN grupos g ON i.grupo_id = g.id
          LEFT JOIN asistencias asist ON i.id = asist.inscripcion_id
          WHERE i.estatus = 'activo'
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += ' GROUP BY a.id, a.nombre, a.apellido_paterno, a.apellido_materno, a.matricula, g.codigo ORDER BY a.nombre';
        result = await pool.query(query, params);
        break;
      }

      case 'asistencias-bajas': {
        const { periodo_id, grupo_id, maestro_id } = req.query;
        let query = `
          SELECT 
            a.matricula,
            CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
            g.codigo as grupo,
            COUNT(asist.id) as total_clases,
            COUNT(asist.id) FILTER (WHERE asist.presente = true) as asistencias,
            COUNT(asist.id) FILTER (WHERE asist.presente = false AND asist.justificada = false) as faltas,
            ROUND((COUNT(asist.id) FILTER (WHERE asist.presente = true)::numeric / NULLIF(COUNT(asist.id), 0)) * 100, 2) as porcentaje
          FROM inscripciones i
          JOIN alumnos a ON i.alumno_id = a.id
          JOIN grupos g ON i.grupo_id = g.id
          JOIN asistencias asist ON i.id = asist.inscripcion_id
          WHERE i.estatus = 'activo'
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += `
          GROUP BY a.id, a.nombre, a.apellido_paterno, a.apellido_materno, a.matricula, g.codigo
          HAVING ROUND((COUNT(asist.id) FILTER (WHERE asist.presente = true)::numeric / NULLIF(COUNT(asist.id), 0)) * 100, 2) < 80
          ORDER BY porcentaje ASC
        `;
        result = await pool.query(query, params);
        break;
      }

      case 'asistencias-resumen': {
        const { periodo_id, grupo_id, maestro_id } = req.query;
        let query = `
          SELECT 
            g.codigo as grupo,
            n.nombre as nivel,
            CONCAT(m.nombre, ' ', m.apellido_paterno) as maestro,
            COUNT(DISTINCT i.alumno_id) as total_alumnos,
            COUNT(asist.id) as registros,
            ROUND(AVG(CASE WHEN asist.presente = true OR asist.justificada = true THEN 100 ELSE 0 END), 2) as tasa_asistencia
          FROM grupos g
          JOIN niveles n ON g.nivel_id = n.id
          LEFT JOIN maestros m ON g.maestro_id = m.id
          LEFT JOIN usuarios u ON m.usuario_id = u.id
          LEFT JOIN inscripciones i ON g.id = i.grupo_id
          LEFT JOIN asistencias asist ON i.id = asist.inscripcion_id
          WHERE (u.rol = 'maestro' OR g.maestro_id IS NULL)
        `;
        const params = [];
        let pIndex = 1;

        if (periodo_id) { query += ` AND g.periodo_id = $${pIndex++}`; params.push(periodo_id); }
        if (grupo_id) { query += ` AND g.id = $${pIndex++}`; params.push(grupo_id); }
        if (maestro_id) { query += ` AND g.maestro_id = $${pIndex++}`; params.push(maestro_id); }

        query += `
          GROUP BY g.id, g.codigo, n.nombre, m.nombre, m.apellido_paterno
          ORDER BY tasa_asistencia DESC
        `;
        result = await pool.query(query, params);
        break;
      }

      default:
        return res.status(400).json({ error: 'Tipo de reporte no válido' });
    }

    // Generar archivo según formato
    if (formato === 'json') {
      return res.json(result.rows);
    }

    if (formato === 'excel') {
      // Generar Excel
      const ws = xlsx.utils.json_to_sheet(result.rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Reporte');

      const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(excelBuffer);
    } else if (formato === 'pdf') {
      // 1. DETERMINAR ORIENTACIÓN (Recommendation 3: Dynamic Orientation)
      const headers_count = result.rows.length > 0 ? Object.keys(result.rows[0]).length : 0;
      const isLandscape = headers_count > 6;
      
      const doc = new PDFDocument({
        margin: 40,
        size: 'LETTER',
        layout: isLandscape ? 'landscape' : 'portrait',
        bufferPages: true
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`);

      doc.pipe(res);

      // Encabezado con logo/título
      doc.rect(0, 0, doc.page.width, 70).fill('#0369a1');
      doc.fillColor('#ffffff')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('TESCHA - CELEX', 40, 20);
      doc.fontSize(10)
        .font('Helvetica')
        .text('Tecnológico de Estudios Superiores de Chalco', 40, 45);

      doc.fillColor('#000000');
      
      // Título del reporte
      const tituloReporte = tipo.replace(/-/g, ' ').split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

      doc.fontSize(16).font('Helvetica-Bold').text(tituloReporte, 40, 95, { align: 'center', width: doc.page.width - 80 });
      doc.fontSize(9).font('Helvetica').text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`, 40, 115, { align: 'center', width: doc.page.width - 80 });

      // =============================================
      // Recommendation 1: KPI Summary Cards
      // =============================================
      let nextY = 140;
      if (result.rows && result.rows.length > 0) {
        const kpis = [];
        if (tipo === 'reprobacion') {
          const total = result.rows.length;
          const totalAlumnos = result.rows.reduce((sum, r) => sum + parseInt(r.total_alumnos || 0), 0);
          const totalReprobados = result.rows.reduce((sum, r) => sum + parseInt(r.reprobados || 0), 0);
          const avgTasa = (totalReprobados * 100 / totalAlumnos).toFixed(1);
          kpis.push({ label: 'Total Grupos', value: total }, { label: 'Alumnos Totales', value: totalAlumnos }, { label: 'Tasa General', value: `${avgTasa}%` });
        } else if (tipo === 'ingresos') {
          const totalMonto = result.rows.reduce((sum, r) => sum + parseFloat(r.monto_total || 0), 0);
          const totalPagos = result.rows.reduce((sum, r) => sum + parseInt(r.total_pagos || 0), 0);
          kpis.push({ label: 'Total Recaudado', value: `$${totalMonto.toFixed(2)}` }, { label: 'Transacciones', value: totalPagos });
        } else if (tipo === 'adeudos-criticos') {
          const totalAdeuda = result.rows.reduce((sum, r) => sum + parseFloat(r.monto_total || 0), 0);
          kpis.push({ label: 'Deuda Total', value: `$${totalAdeuda.toFixed(2)}` }, { label: 'Alumnos Deudores', value: result.rows.length });
        }

        if (kpis.length > 0) {
          const kpiWidth = 140;
          const kpiGap = 20;
          let kpiX = (doc.page.width - (kpis.length * kpiWidth + (kpis.length - 1) * kpiGap)) / 2;
          
          kpis.forEach(kpi => {
            doc.rect(kpiX, 140, kpiWidth, 45).fill('#f3f4f6');
            doc.fillColor('#0369a1').fontSize(8).font('Helvetica-Bold').text(kpi.label.toUpperCase(), kpiX, 150, { width: kpiWidth, align: 'center' });
            doc.fillColor('#1f2937').fontSize(12).text(kpi.value.toString(), kpiX, 162, { width: kpiWidth, align: 'center' });
            kpiX += kpiWidth + kpiGap;
          });
          nextY = 205;
        }
      }

      // Tabla de datos - Posición dinámica
      const tableTopPosition = nextY;

      // Tabla de datos
      if (result.rows && result.rows.length > 0) {
        const headers = Object.keys(result.rows[0]).filter(key => result.rows[0][key] !== undefined);
        
        if (headers.length === 0) {
          doc.fontSize(12)
            .fillColor('#6b7280')
            .text('No hay datos disponibles para este reporte', { align: 'center' });
        } else {
          // Recommendation 3: Dynamic Column Widths & Alignment
          const tableTop = tableTopPosition;
          const itemHeight = 25;
          const maxWidth = doc.page.width - 80;
          
          // Definir pesos de ancho por columna
          const columnWeights = {
            'nombre_completo': 2.5,
            'matricula': 1,
            'grupo': 1,
            'maestro': 2.2,
            'concepto': 2,
            'estatus': 1,
            'monto_total': 1.2,
            'tasa_reprobacion': 1,
            'tasa_desercion': 1,
            'tasa_asistencia': 1,
            'porcentaje': 0.8,
            'registros': 0.8,
            'p1': 0.6,
            'p2': 0.6,
            'p3': 0.6,
            'promedio': 0.8,
            'asistencia_pct': 1,
            'estatus_final': 1.2,
            'adeudos_cant': 0.7
          };
          
          const totalWeight = headers.reduce((sum, h) => sum + (columnWeights[h] || 1), 0);
          const getColWidth = (header) => (maxWidth * (columnWeights[header] || 1)) / totalWeight;

          // Función para traducir nombres de columnas
          const traducirColumna = (col) => {
            const traducciones = {
              'nombre_completo': 'Nombre Completo',
              'matricula': 'Matrícula',
              'monto': 'Monto',
              'fecha_limite_prorroga': 'Fecha Límite',
              'estado': 'Estado',
              'total_adeudos': 'Total Adeudos',
              'monto_total': 'Monto Total',
              'grupo': 'Grupo',
              'nivel': 'Nivel',
              'maestro': 'Maestro',
              'total_alumnos': 'Total Alumnos',
              'reprobados': 'Reprobados',
              'tasa_reprobacion': 'Tasa Rep. %',
              'activos': 'Activos',
              'deserciones': 'Deserciones',
              'tasa_desercion': 'Tasa Des. %',
              'capacidad': 'Capacidad',
              'grupos_asignados': 'Grupos',
              'horas_ocupadas': 'Horas Ocup.',
              'horas_semanales': 'Horas/Sem',
              'inscritos': 'Inscritos',
              'aprobados': 'Aprobados',
              'eficiencia': 'Eficiencia %',
              'concepto': 'Concepto',
              'total_pagos': 'Pagos',
              'estatus': 'Estatus',
              'carrera': 'Carrera',
              'semestre': 'Semestre',
              'nivel_actual': 'Nivel Actual',
              'correo': 'Correo',
              'telefono': 'Teléfono',
              'tasa_asistencia': '% Asist.',
              'registros': 'Regs.',
              'total_clases': 'Clases',
              'asistencias': 'Asist.',
              'faltas': 'Faltas',
              'porcentaje': '% Asist.',
              'alumno': 'Alumno/a',
              'adeudos_cant': 'Deudas',
              'limite': 'Límite',
              'p1': 'Parc. 1',
              'p2': 'Parc. 2',
              'p3': 'Parc. 3',
              'promedio': 'Promedio',
              'asistencia_pct': 'Asistencia %',
              'estatus_final': 'Estatus Final',
              'justificadas': 'Justif.'
            };
            return traducciones[col] || col.replace(/_/g, ' ').toUpperCase();
          };

          // Encabezados con fondo
          doc.rect(40, tableTop, maxWidth, itemHeight).fill('#0369a1');
          doc.fillColor('#ffffff');

          let xPos = 50;
          doc.fontSize(8).font('Helvetica-Bold');
          headers.forEach(header => {
            const w = getColWidth(header);
            const isNumeric = ['monto', 'total', 'tasa', 'eficiencia', 'reprobados', 'activos', 'pago'].some(k => header.includes(k));
            
            doc.text(traducirColumna(header), xPos, tableTop + 8, {
              width: w - 10,
              align: isNumeric ? 'right' : 'left',
              lineBreak: false,
              ellipsis: true
            });
            xPos += w;
          });

          let yPos = tableTop + itemHeight;

          // Datos con líneas alternas
          doc.font('Helvetica').fontSize(8);
          result.rows.forEach((row, index) => {
            // Verificar si cabe el siguiente registro + margen de footer
            if (yPos > doc.page.height - 80) {
              doc.addPage();
              yPos = 40;

              // Re-dibujar encabezados en nueva página
              doc.rect(40, yPos, maxWidth, itemHeight).fill('#0369a1');
              doc.fillColor('#ffffff');
              xPos = 50;
              doc.fontSize(8).font('Helvetica-Bold');
              headers.forEach(header => {
                const w = getColWidth(header);
                const isNumeric = ['monto', 'total', 'tasa', 'eficiencia', 'reprobados', 'activos', 'pago'].some(k => header.includes(k));
                doc.text(traducirColumna(header), xPos, yPos + 8, {
                  width: w - 10,
                  align: isNumeric ? 'right' : 'left',
                  lineBreak: false,
                  ellipsis: true
                });
                xPos += w;
              });
              yPos += itemHeight;
              doc.font('Helvetica').fontSize(7);
            }

            // Fondo alternado
            if (index % 2 === 0) {
              doc.rect(40, yPos, maxWidth, itemHeight).fill('#f9fafb');
            }
            doc.fillColor('#000000');

            xPos = 50;
            headers.forEach(header => {
              const w = getColWidth(header);
              const isNumeric = ['monto', 'total', 'tasa', 'eficiencia', 'reprobados', 'activos', 'pago'].some(k => header.includes(k));
              let value = row[header];

              // Formatear valores especiales con validación
              try {
                if (value === null || value === undefined || value === '') {
                  value = '-';
                } else if ((header.includes('monto') || header.includes('precio') || (header.includes('total') && !['total_adeudos', 'total_alumnos', 'total_pagos', 'total_alumnos_reprobados', 'total_clases', 'registros'].includes(header)))) {
                  const num = parseFloat(value);
                  value = isNaN(num) ? '-' : `$${num.toFixed(2)}`;
                } else if (header.includes('fecha')) {
                  try {
                    const date = new Date(value);
                    value = isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-MX');
                  } catch {
                    value = String(value);
                  }
                } else if (header.includes('tasa') || header.includes('eficiencia') || header.includes('porcentaje')) {
                  const num = parseFloat(value);
                  value = isNaN(num) ? '-' : `${num.toFixed(2)}%`;
                } else if (typeof value === 'boolean') {
                  value = value ? 'Sí' : 'No';
                } else {
                  value = String(value);
                }
              } catch (error) {
                value = '-';
              }

              doc.text(value, xPos, yPos + 8, {
                width: w - 10,
                align: isNumeric ? 'right' : 'left',
                lineBreak: false,
                ellipsis: true
              });
              xPos += w;
            });

            yPos += itemHeight;
          });
        }
      } else {
        doc.fontSize(12)
          .fillColor('#6b7280')
          .text('No hay datos disponibles para este reporte', { align: 'center' });
      }

      // Footer con línea y totales
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        const footerTop = doc.page.height - 70;
        
        doc.moveTo(40, footerTop - 5)
          .lineTo(doc.page.width - 40, footerTop - 5)
          .stroke('#0369a1');

        doc.fontSize(7)
          .fillColor('#6b7280')
          .text(
            `TESCHA - Sistema de Coordinación de Inglés | Total de registros: ${result.rows.length}`,
            40,
            footerTop,
            { align: 'center', width: doc.page.width - 80, lineBreak: false }
          );

        doc.text(
          `Página ${i + 1} de ${pages.count}`,
          40,
          footerTop + 10,
          { align: 'center', width: doc.page.width - 80, lineBreak: false }
        );
      }

      doc.end();
    } else {
      // Formato JSON por defecto
      res.json({
        data: result.rows,
        tipo: tipo,
        total: result.rows.length
      });
    }
  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// REPORTE FINANCIERO DETALLADO
// =============================================
router.get('/financiero/detallado', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const { periodo_id, fecha_inicio, fecha_fin, agrupacion = 'mes' } = req.query;
    
    // Obtener período activo si no se especifica
    let periodoFinal = periodo_id;
    if (!periodoFinal) {
      const periodoActivo = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
      if (periodoActivo.rows.length > 0) {
        periodoFinal = periodoActivo.rows[0].id;
      }
    }
    
    // Construir consulta base
    let whereClause = "WHERE p.estatus = 'pagado'";
    const params = [];
    let paramCount = 1;
    
    if (periodoFinal) {
      whereClause += ` AND per.id = $${paramCount++}`;
      params.push(periodoFinal);
    }
    
    if (fecha_inicio) {
      whereClause += ` AND p.fecha_pago >= $${paramCount++}`;
      params.push(fecha_inicio);
    }
    
    if (fecha_fin) {
      whereClause += ` AND p.fecha_pago <= $${paramCount++}`;
      params.push(fecha_fin);
    }
    
    // Determinar agrupación temporal
    let groupByClause, selectClause;
    switch (agrupacion) {
      case 'dia':
        selectClause = "TO_CHAR(p.fecha_pago, 'YYYY-MM-DD') as periodo";
        groupByClause = "TO_CHAR(p.fecha_pago, 'YYYY-MM-DD')";
        break;
      case 'semana':
        selectClause = "TO_CHAR(p.fecha_pago, 'IYYY-IW') as periodo";
        groupByClause = "TO_CHAR(p.fecha_pago, 'IYYY-IW')";
        break;
      case 'mes':
        selectClause = "TO_CHAR(p.fecha_pago, 'YYYY-MM') as periodo";
        groupByClause = "TO_CHAR(p.fecha_pago, 'YYYY-MM')";
        break;
      case 'semestre':
        selectClause = `
          CONCAT(
            EXTRACT(YEAR FROM p.fecha_pago),
            '-S',
            CASE WHEN EXTRACT(MONTH FROM p.fecha_pago) <= 6 THEN '1' ELSE '2' END
          ) as periodo`;
        groupByClause = `
          CONCAT(
            EXTRACT(YEAR FROM p.fecha_pago),
            '-S',
            CASE WHEN EXTRACT(MONTH FROM p.fecha_pago) <= 6 THEN '1' ELSE '2' END
          )`;
        break;
      case 'anio':
        selectClause = "EXTRACT(YEAR FROM p.fecha_pago)::text as periodo";
        groupByClause = "EXTRACT(YEAR FROM p.fecha_pago)";
        break;
      default:
        selectClause = "TO_CHAR(p.fecha_pago, 'YYYY-MM') as periodo";
        groupByClause = "TO_CHAR(p.fecha_pago, 'YYYY-MM')";
    }
    
    // Consulta principal: Ingresos por período
    const ingresosPorPeriodo = await pool.query(`
      SELECT 
        ${selectClause},
        COUNT(*) as total_pagos,
        SUM(p.monto_final) as total_ingresos,
        AVG(p.monto_final) as promedio_pago,
        MIN(p.monto_final) as pago_minimo,
        MAX(p.monto_final) as pago_maximo
      FROM pagos p
      JOIN inscripciones i ON p.inscripcion_id = i.id
      JOIN periodos per ON i.periodo_id = per.id
      ${whereClause}
      GROUP BY ${groupByClause}
      ORDER BY periodo DESC
    `, params);
    
    // Ingresos por concepto
    const ingresosPorConcepto = await pool.query(`
      SELECT 
        p.concepto,
        COUNT(*) as total_pagos,
        SUM(p.monto_final) as total_ingresos,
        ROUND(SUM(p.monto_final) * 100.0 / SUM(SUM(p.monto_final)) OVER (), 2) as porcentaje
      FROM pagos p
      JOIN inscripciones i ON p.inscripcion_id = i.id
      JOIN periodos per ON i.periodo_id = per.id
      ${whereClause}
      GROUP BY p.concepto
      ORDER BY total_ingresos DESC
    `, params);
    
    // Ingresos por método de pago
    const ingresosPorMetodo = await pool.query(`
      SELECT 
        p.metodo_pago,
        COUNT(*) as total_pagos,
        SUM(p.monto_final) as total_ingresos
      FROM pagos p
      JOIN inscripciones i ON p.inscripcion_id = i.id
      JOIN periodos per ON i.periodo_id = per.id
      ${whereClause}
      GROUP BY p.metodo_pago
      ORDER BY total_ingresos DESC
    `, params);
    
    // Estadísticas generales
    const estadisticasGenerales = await pool.query(`
      SELECT 
        COUNT(*) as total_pagos,
        SUM(p.monto_final) as total_ingresos,
        AVG(p.monto_final) as promedio_pago,
        MIN(p.monto_final) as pago_minimo,
        MAX(p.monto_final) as pago_maximo,
        COUNT(DISTINCT i.alumno_id) as alumnos_pagaron,
        SUM(p.descuento) as total_descuentos
      FROM pagos p
      JOIN inscripciones i ON p.inscripcion_id = i.id
      JOIN periodos per ON i.periodo_id = per.id
      ${whereClause}
    `, params);
    
    // Pagos pendientes y adeudos
    const pagosPendientes = await pool.query(`
      SELECT 
        COUNT(*) as total_pendientes,
        SUM(p.monto_final) as monto_pendiente,
        COUNT(*) FILTER (WHERE p.tiene_prorroga = true) as con_prorroga,
        COUNT(*) FILTER (WHERE p.tiene_prorroga = true AND p.fecha_limite_prorroga < CURRENT_DATE) as prorrogas_vencidas
      FROM pagos p
      JOIN inscripciones i ON p.inscripcion_id = i.id
      JOIN periodos per ON i.periodo_id = per.id
      WHERE p.estatus IN ('pendiente', 'prorroga')
      ${periodoFinal ? `AND per.id = $1` : ''}
    `, periodoFinal ? [periodoFinal] : []);
    
    // Top 10 alumnos que más han pagado
    const topAlumnos = await pool.query(`
      SELECT 
        COALESCE(a.nombre_completo, CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, ''))) as nombre,
        a.matricula,
        COUNT(p.id) as total_pagos,
        SUM(p.monto_final) as total_pagado
      FROM alumnos a
      JOIN inscripciones i ON a.id = i.alumno_id
      JOIN pagos p ON i.id = p.inscripcion_id
      JOIN periodos per ON i.periodo_id = per.id
      ${whereClause}
      GROUP BY a.id, a.nombre_completo, a.nombre, a.apellido_paterno, a.apellido_materno, a.matricula
      ORDER BY total_pagado DESC
      LIMIT 10
    `, params);
    
    res.json({
      agrupacion,
      periodo: periodoFinal,
      fecha_inicio,
      fecha_fin,
      ingresos_por_periodo: ingresosPorPeriodo.rows,
      ingresos_por_concepto: ingresosPorConcepto.rows,
      ingresos_por_metodo: ingresosPorMetodo.rows,
      estadisticas_generales: estadisticasGenerales.rows[0],
      pagos_pendientes: pagosPendientes.rows[0],
      top_alumnos: topAlumnos.rows
    });
  } catch (error) {
    console.error('Error al generar reporte financiero:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// REPORTE DE ESTADÍSTICAS DEMOGRÁFICAS
// =============================================
router.get('/demograficas', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const { periodo_id } = req.query;
    
    // Obtener información del periodo (el solicitado o el activo)
    let periodoInfo;
    if (periodo_id) {
      const pRes = await pool.query('SELECT id, nombre FROM periodos WHERE id = $1', [periodo_id]);
      periodoInfo = pRes.rows[0];
    } else {
      const pRes = await pool.query('SELECT id, nombre FROM periodos WHERE activo = true LIMIT 1');
      periodoInfo = pRes.rows[0];
    }

    const pid = periodoInfo?.id;
    const pNombre = periodoInfo?.nombre || 'General';

    // Total de alumnos registrados en el periodo (o totales si no hay periodo)
    const totalResult = await pool.query(`
      SELECT COUNT(DISTINCT a.id)::int as total 
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
    `, pid ? [pid] : []);
    const totalAlumnos = parseInt(totalResult.rows[0].total);
    
    // 1. Municipios
    const municipiosRes = await pool.query(`
      SELECT COALESCE(a.municipio, 'Sin especificar') as municipio, COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
      GROUP BY a.municipio ORDER BY cantidad DESC LIMIT 10
    `, pid ? [pid] : []);
    const municipios = municipiosRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    // 2. Niveles
    const nivelesRes = await pool.query(`
      SELECT COALESCE(a.nivel_actual, 'Sin asignar') as nivel, COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
      GROUP BY a.nivel_actual
      ORDER BY CASE a.nivel_actual
        WHEN 'Básico' THEN 1 WHEN 'Intermedio' THEN 2 WHEN 'Avanzado' THEN 3
        WHEN 'Perfeccionamiento 1' THEN 4 WHEN 'Perfeccionamiento 2' THEN 5
        WHEN 'C1' THEN 6 ELSE 7 END
    `, pid ? [pid] : []);
    const niveles = nivelesRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    // 3. Edades
    const edadesRes = await pool.query(`
      SELECT CASE 
        WHEN a.edad IS NULL THEN 'Sin especificar'
        WHEN a.edad < 18 THEN 'Menor de 18'
        WHEN a.edad BETWEEN 18 AND 20 THEN '18-20 años'
        WHEN a.edad BETWEEN 21 AND 25 THEN '21-25 años'
        WHEN a.edad BETWEEN 26 AND 30 THEN '26-30 años'
        WHEN a.edad BETWEEN 31 AND 40 THEN '31-40 años'
        ELSE 'Mayor de 40' END as rango_edad,
        COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
      GROUP BY 1
      ORDER BY 1
    `, pid ? [pid] : []);
    const edades = edadesRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    // 4. Géneros
    const generosRes = await pool.query(`
      SELECT CASE 
        WHEN a.genero IS NULL THEN 'Sin especificar'
        WHEN a.genero = 'masculino' THEN 'Masculino'
        WHEN a.genero = 'femenino' THEN 'Femenino'
        WHEN a.genero = 'otro' THEN 'Otro'
        WHEN a.genero = 'prefiero_no_decir' THEN 'Prefiero no decir'
        ELSE 'Sin especificar' END as genero,
        COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
      GROUP BY 1 ORDER BY cantidad DESC
    `, pid ? [pid] : []);
    const generos = generosRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    // 5. Turnos
    const turnosRes = await pool.query(`
      SELECT 
        CASE 
          WHEN g.turno IS NULL THEN 'Sin especificar'
          WHEN g.turno = 'matutino' THEN 'Matutino'
          WHEN g.turno = 'vespertino' THEN 'Vespertino'
          ELSE 'Sin especificar'
        END as turno,
        COUNT(DISTINCT i.alumno_id)::int as cantidad
      FROM inscripciones i
      JOIN grupos g ON i.grupo_id = g.id
      WHERE ${pid ? 'i.periodo_id = $1' : '1=1'}
      GROUP BY 1
      ORDER BY cantidad DESC
    `, pid ? [pid] : []);
    const turnos = turnosRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    // 6. Carreras
    const carrerasRes = await pool.query(`
      SELECT a.carrera, COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id' : ''}
      WHERE a.tipo_alumno = 'interno'
      ${pid ? 'AND i.periodo_id = $1' : ''}
      GROUP BY a.carrera ORDER BY cantidad DESC
    `, pid ? [pid] : []);
    const carreras = carrerasRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    // 7. Tipos de Alumno
    const tiposRes = await pool.query(`
      SELECT 
        CASE a.tipo_alumno
          WHEN 'interno' THEN 'Interno'
          WHEN 'externo' THEN 'Externo'
          ELSE 'Otro'
        END as tipo,
        COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
      GROUP BY 1 ORDER BY cantidad DESC
    `, pid ? [pid] : []);
    const tipos = tiposRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    res.json({
      total_alumnos: totalAlumnos,
      periodo: pNombre,
      fecha_generacion: new Date().toISOString(),
      distribuciones: {
        por_municipio: municipios,
        por_nivel: niveles,
        por_edad: edades,
        por_genero: generos,
        por_carrera: carreras,
        por_turno: turnos,
        por_tipo: tipos
      }
    });
  } catch (error) {
    console.error('❌ Error al generar estadísticas demográficas:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// PDF DE ESTADÍSTICAS DEMOGRÁFICAS
// =============================================
router.get('/demograficas/pdf', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const { periodo_id } = req.query;
    
    // Obtener información del periodo (el solicitado o el activo)
    let periodoInfo;
    if (periodo_id) {
      const pRes = await pool.query('SELECT id, nombre FROM periodos WHERE id = $1', [periodo_id]);
      periodoInfo = pRes.rows[0];
    } else {
      const pRes = await pool.query('SELECT id, nombre FROM periodos WHERE activo = true LIMIT 1');
      periodoInfo = pRes.rows[0];
    }

    const pid = periodoInfo?.id;
    const pNombre = periodoInfo?.nombre || 'General';

    // Obtener datos (Misma lógica que la ruta JSON)
    const totalResult = await pool.query(`
      SELECT COUNT(DISTINCT a.id)::int as total 
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
    `, pid ? [pid] : []);
    const totalAlumnos = parseInt(totalResult.rows[0].total);
    
    // 1. Municipios
    const municipiosRes = await pool.query(`
      SELECT COALESCE(a.municipio, 'Sin especificar') as municipio, COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
      GROUP BY a.municipio ORDER BY cantidad DESC LIMIT 10
    `, pid ? [pid] : []);
    const municipios = municipiosRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    // 2. Niveles
    const nivelesRes = await pool.query(`
      SELECT COALESCE(a.nivel_actual, 'Sin asignar') as nivel, COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
      GROUP BY a.nivel_actual
      ORDER BY CASE a.nivel_actual
        WHEN 'Básico' THEN 1 WHEN 'Intermedio' THEN 2 WHEN 'Avanzado' THEN 3
        WHEN 'Perfeccionamiento 1' THEN 4 WHEN 'Perfeccionamiento 2' THEN 5
        WHEN 'C1' THEN 6 ELSE 7 END
    `, pid ? [pid] : []);
    const niveles = nivelesRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    // 3. Edades
    const edadesRes = await pool.query(`
      SELECT CASE 
        WHEN a.edad IS NULL THEN 'Sin especificar'
        WHEN a.edad < 18 THEN 'Menor de 18'
        WHEN a.edad BETWEEN 18 AND 20 THEN '18-20 años'
        WHEN a.edad BETWEEN 21 AND 25 THEN '21-25 años'
        WHEN a.edad BETWEEN 26 AND 30 THEN '26-30 años'
        WHEN a.edad BETWEEN 31 AND 40 THEN '31-40 años'
        ELSE 'Mayor de 40' END as rango_edad,
        COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
      GROUP BY 1
      ORDER BY 1
    `, pid ? [pid] : []);
    const edades = edadesRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    // 4. Géneros
    const generosRes = await pool.query(`
      SELECT CASE 
        WHEN a.genero IS NULL THEN 'Sin especificar'
        WHEN a.genero = 'masculino' THEN 'Masculino'
        WHEN a.genero = 'femenino' THEN 'Femenino'
        WHEN a.genero = 'otro' THEN 'Otro'
        WHEN a.genero = 'prefiero_no_decir' THEN 'Prefiero no decir'
        ELSE 'Sin especificar' END as genero,
        COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
      GROUP BY 1 ORDER BY cantidad DESC
    `, pid ? [pid] : []);
    const generos = generosRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));
    
    // 5. Turnos
    const turnosRes = await pool.query(`
      SELECT 
        CASE 
          WHEN g.turno IS NULL THEN 'Sin especificar'
          WHEN g.turno = 'matutino' THEN 'Matutino'
          WHEN g.turno = 'vespertino' THEN 'Vespertino'
          ELSE 'Sin especificar'
        END as turno,
        COUNT(DISTINCT i.alumno_id)::int as cantidad
      FROM inscripciones i
      JOIN grupos g ON i.grupo_id = g.id
      WHERE ${pid ? 'i.periodo_id = $1' : '1=1'}
      GROUP BY 1
      ORDER BY cantidad DESC
    `, pid ? [pid] : []);
    const turnos = turnosRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));

    // 6. Carreras
    const carrerasRes = await pool.query(`
      SELECT a.carrera, COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id' : ''}
      WHERE a.tipo_alumno = 'interno'
      ${pid ? 'AND i.periodo_id = $1' : ''}
      GROUP BY a.carrera ORDER BY cantidad DESC
    `, pid ? [pid] : []);
    const carreras = carrerasRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));

    // 7. Tipos
    const tiposRes = await pool.query(`
      SELECT 
        CASE a.tipo_alumno
          WHEN 'interno' THEN 'Interno'
          WHEN 'externo' THEN 'Externo'
          ELSE 'Otro'
        END as tipo,
        COUNT(DISTINCT a.id)::int as cantidad
      FROM alumnos a
      ${pid ? 'INNER JOIN inscripciones i ON a.id = i.alumno_id WHERE i.periodo_id = $1' : ''}
      GROUP BY 1 ORDER BY cantidad DESC
    `, pid ? [pid] : []);
    const tipos = tiposRes.rows.map(r => ({
      ...r,
      porcentaje: totalAlumnos > 0 ? parseFloat(((r.cantidad * 100.0) / totalAlumnos).toFixed(2)) : 0
    }));

    // Crear PDF
    // Configuración absoluta para 1 sola página
    const doc = new PDFDocument({ 
      margin: { top: 40, bottom: 20, left: 40, right: 40 }, 
      size: 'LETTER', 
      autoPageBreak: false 
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=estadisticas-demograficas-${pNombre.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    // Encabezado Clásico Centrado y Elegante
    doc.fillColor('#000000').fontSize(22).font('Helvetica-Bold').text('ESTADÍSTICAS DEMOGRÁFICAS', { align: 'center' });
    doc.fillColor('#666666').fontSize(10).font('Helvetica').text('Sistema de Coordinación de Inglés - TESCHA', { align: 'center' });
    doc.moveDown(1);
    
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0369a1');
    doc.text(`PERIODO: ${pNombre.toUpperCase()}`, 100, doc.y, { continued: true });
    doc.text(`        ALUMNOS: ${totalAlumnos}`, { continued: true });
    doc.text(`        FECHA: ${new Date().toLocaleDateString('es-MX')}`, { align: 'center' });

    doc.moveTo(40, doc.y + 10).lineTo(572, doc.y + 10).strokeColor('#dddddd').lineWidth(1).stroke();

    const startY = doc.y + 35; 
    // Función mejorada para dibujar gráfica (Dos por fila si es posible)
    const drawPieChart = (title, data, x, y) => {
      if (!data || data.length === 0 || data.every(row => row.cantidad === 0)) return false;

      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text(title, x, y, { width: 250 });
      let chartTop = y + 16;

      const centerX = x + 45;
      const centerY = chartTop + 45;
      const radius = 42;
      let startAngle = -Math.PI / 2;

      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];

      // Limitamos a los top 6 para que siempre quepan en 1 hoja
      data.slice(0, 6).forEach((row, i) => {
        if (row.porcentaje <= 0) return;

        const sliceAngle = (row.porcentaje / 100) * (2 * Math.PI);
        const endAngle = startAngle + sliceAngle;
        const color = colors[i % colors.length];

        doc.fillColor(color).strokeColor('#ffffff').lineWidth(1).moveTo(centerX, centerY).arc(centerX, centerY, radius, startAngle, endAngle).lineTo(centerX, centerY).fillAndStroke();

        // Leyenda vinculada localmente
        const legendX = x + 115;
        const legendY = chartTop + 12 + (i * 12);
        
        doc.rect(legendX, legendY, 7, 7).fill(color);
        const label = Object.values(row)[0];
        doc.fillColor('#333333').fontSize(8).font('Helvetica').text(`${label.substring(0, 18)}: ${row.cantidad}`, legendX + 11, legendY);

        startAngle = endAngle;
      });
      return true;
    };

    // Renderizar en cuadrícula de 2 columnas
    const charts = [
      { title: 'POR MUNICIPIO', data: municipios.slice(0, 5) },
      { title: 'POR NIVEL', data: niveles },
      { title: 'POR EDAD', data: edades },
      { title: 'POR GÉNERO', data: generos },
      { title: 'POR TURNO', data: turnos },
      { title: 'POR CARRERA', data: carreras.slice(0, 5) },
      { title: 'POR TIPO DE ALUMNO', data: tipos }
    ];

    let currentX = 50;
    let currentY = startY;
    let chartsInRow = 0;

    charts.forEach((chart, index) => {
      // SOLO una página. Eliminamos el salto de página automático por completo.
      const drawn = drawPieChart(chart.title, chart.data, currentX, currentY);
      
      if (drawn) {
        chartsInRow++;
        if (chartsInRow === 2) {
          currentX = 50;
          currentY += 150; // Salto vertical balanceado
          chartsInRow = 0;
        } else {
          currentX = 310;
        }
      }
    });

    // Footer final garantizado
    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text(
      `TESCHA - Sistema de Coordinación de Inglés | Reporte Demográfico Oficial | Página 1 de 1`,
      40, 745,
      { align: 'center', width: 532 }
    );

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF de estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
