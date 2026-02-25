import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';

const router = express.Router();

// =============================================
// GET /api/dashboard/metricas - Métricas principales
// =============================================
router.get('/metricas', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        const { periodo_id } = req.query;

        // Determinar el ID del periodo a consultar
        let targetPeriodoId = periodo_id;

        if (!targetPeriodoId) {
            const periodoActivo = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
            if (periodoActivo.rows.length > 0) {
                targetPeriodoId = periodoActivo.rows[0].id;
            } else {
                // Si no hay periodo activo ni especificado, devolver ceros
                return res.json({
                    total_alumnos: 0, alumnos_internos: 0, alumnos_externos: 0,
                    total_grupos: 0, total_maestros: 0, ingresos_totales: 0,
                    cuentas_por_cobrar: 0, pagos_vencidos: 0
                });
            }
        }

        // Métricas específicas del periodo - usando subqueries para evitar multiplicación
        const metricas = await pool.query(`
            SELECT 
                (SELECT COUNT(DISTINCT alumno_id) FROM inscripciones WHERE periodo_id = $1) as total_alumnos,
                (SELECT COUNT(DISTINCT i.alumno_id) FROM inscripciones i JOIN alumnos a ON i.alumno_id = a.id WHERE i.periodo_id = $1 AND a.tipo_alumno = 'interno') as alumnos_internos,
                (SELECT COUNT(DISTINCT i.alumno_id) FROM inscripciones i JOIN alumnos a ON i.alumno_id = a.id WHERE i.periodo_id = $1 AND a.tipo_alumno = 'externo') as alumnos_externos,
                (SELECT COUNT(DISTINCT id) FROM grupos WHERE periodo_id = $1) as total_grupos,
                (SELECT COUNT(*) FROM maestros m 
                 JOIN usuarios u ON m.usuario_id = u.id 
                 WHERE m.activo = true AND u.rol = 'maestro') as total_maestros,
                (SELECT COALESCE(SUM(p.monto_final), 0) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id WHERE i.periodo_id = $1 AND p.estatus = 'pagado') as ingresos_totales,
                (SELECT COALESCE(SUM(p.monto_final), 0) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id WHERE i.periodo_id = $1 AND p.estatus IN ('pendiente', 'prorroga')) as cuentas_por_cobrar,
                (SELECT COUNT(*) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id WHERE i.periodo_id = $1 AND p.estatus = 'prorroga') as pagos_prorroga,
                (SELECT COUNT(*) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id WHERE i.periodo_id = $1 AND p.estatus = 'pagado') as pagos_completados,
                (SELECT COUNT(*) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id WHERE i.periodo_id = $1 AND p.estatus IN ('pendiente', 'prorroga')) as pagos_pendientes_con_prorroga
        `, [targetPeriodoId]);
        
        const result = {
            ...metricas.rows[0]
        };

        console.log('[DEBUG_MAESTROS] total_maestros en resultado:', result.total_maestros);

        res.json(result);
    } catch (error) {
        console.error('Error al obtener métricas:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// GET /api/dashboard/tendencias - Tendencias históricas
// =============================================
router.get('/tendencias', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        // Usar tabla estadisticas_periodo si existe, sino calcular
        const estadisticas = await pool.query(`
            SELECT 
                p.id as periodo_id,
                p.nombre as periodo,
                p.fecha_inicio_clases,
                COALESCE(ep.total_alumnos, 0) as total_alumnos,
                COALESCE(ep.total_alumnos_internos, 0) as alumnos_internos,
                COALESCE(ep.total_alumnos_externos, 0) as alumnos_externos,
                COALESCE(ep.ingresos_totales, 0) as ingresos,
                COALESCE(ep.ingresos_internos, 0) as ingresos_internos,
                COALESCE(ep.ingresos_externos, 0) as ingresos_externos,
                COALESCE(ep.total_grupos, 0) as total_grupos,
                COALESCE(ep.total_maestros_activos, 0) as total_maestros
            FROM periodos p
            LEFT JOIN estadisticas_periodo ep ON p.id = ep.periodo_id
            ORDER BY p.fecha_inicio_clases DESC
            LIMIT 10
        `);

        // Si no hay estadísticas, calcularlas en tiempo real
        const rows = [];
        for (const periodo of estadisticas.rows) {
            if (periodo.total_alumnos === 0) {
                // Calcular en tiempo real - usando subqueries para evitar multiplicación
                const calc = await pool.query(`
                    SELECT 
                        (SELECT COUNT(DISTINCT alumno_id) FROM inscripciones WHERE periodo_id = $1) as total_alumnos,
                        (SELECT COUNT(DISTINCT i.alumno_id) FROM inscripciones i JOIN alumnos a ON i.alumno_id = a.id WHERE i.periodo_id = $1 AND a.tipo_alumno = 'interno') as alumnos_internos,
                        (SELECT COUNT(DISTINCT i.alumno_id) FROM inscripciones i JOIN alumnos a ON i.alumno_id = a.id WHERE i.periodo_id = $1 AND a.tipo_alumno = 'externo') as alumnos_externos,
                        (SELECT COALESCE(SUM(p.monto_final), 0) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id WHERE i.periodo_id = $1 AND p.estatus = 'pagado') as ingresos,
                        (SELECT COALESCE(SUM(p.monto_final), 0) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id JOIN alumnos a ON i.alumno_id = a.id WHERE i.periodo_id = $1 AND p.estatus = 'pagado' AND a.tipo_alumno = 'interno') as ingresos_internos,
                        (SELECT COALESCE(SUM(p.monto_final), 0) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id JOIN alumnos a ON i.alumno_id = a.id WHERE i.periodo_id = $1 AND p.estatus = 'pagado' AND a.tipo_alumno = 'externo') as ingresos_externos
                `, [periodo.periodo_id]);

                rows.push({
                    periodo: periodo.periodo,
                    total_alumnos: parseInt(calc.rows[0].total_alumnos) || 0,
                    alumnos_internos: parseInt(calc.rows[0].alumnos_internos) || 0,
                    alumnos_externos: parseInt(calc.rows[0].alumnos_externos) || 0,
                    ingresos: parseFloat(calc.rows[0].ingresos) || 0,
                    ingresos_internos: parseFloat(calc.rows[0].ingresos_internos) || 0,
                    ingresos_externos: parseFloat(calc.rows[0].ingresos_externos) || 0
                });
            } else {
                rows.push({
                    periodo: periodo.periodo,
                    total_alumnos: parseInt(periodo.total_alumnos) || 0,
                    alumnos_internos: parseInt(periodo.alumnos_internos) || 0,
                    alumnos_externos: parseInt(periodo.alumnos_externos) || 0,
                    ingresos: parseFloat(periodo.ingresos) || 0,
                    ingresos_internos: parseFloat(periodo.ingresos_internos) || 0,
                    ingresos_externos: parseFloat(periodo.ingresos_externos) || 0
                });
            }
        }

        res.json(rows);
    } catch (error) {
        console.error('Error al obtener tendencias:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// GET /api/dashboard/alumnos-por-nivel - Distribución por nivel
// =============================================
router.get('/alumnos-por-nivel', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        const { periodo_id } = req.query;

        let periodoCondition = '';
        const params = [];

        if (periodo_id) {
            periodoCondition = 'AND per.id = $1';
            params.push(periodo_id);
        } else {
            periodoCondition = 'AND per.activo = true';
        }

        // Contar alumnos por su nivel_actual (no por inscripciones en grupos)
        const result = await pool.query(`
            SELECT 
                n.nombre as nivel,
                n.codigo,
                COALESCE(COUNT(DISTINCT a.id), 0) as total,
                COALESCE(COUNT(DISTINCT CASE WHEN a.tipo_alumno = 'interno' THEN a.id END), 0) as internos,
                COALESCE(COUNT(DISTINCT CASE WHEN a.tipo_alumno = 'externo' THEN a.id END), 0) as externos
            FROM niveles n
            LEFT JOIN alumnos a ON n.nombre = a.nivel_actual
            GROUP BY n.id, n.nombre, n.codigo, n.orden
            ORDER BY n.orden
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener distribución por nivel:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// GET /api/dashboard/ingresos-mensuales - Ingresos por mes
// =============================================
router.get('/ingresos-mensuales', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        const { periodo_id, anio } = req.query;

        let whereClause = '';
        const params = [];
        let paramCount = 1;

        if (periodo_id) {
            whereClause = 'WHERE i.periodo_id = $1';
            params.push(periodo_id);
            paramCount++;
        }

        if (anio) {
            whereClause += whereClause ? ' AND' : 'WHERE';
            whereClause += ` EXTRACT(YEAR FROM p.fecha_pago) = $${paramCount}`;
            params.push(anio);
        }

        const result = await pool.query(`
            SELECT 
                EXTRACT(MONTH FROM p.fecha_pago) as mes,
                EXTRACT(YEAR FROM p.fecha_pago) as anio,
                COUNT(*) as total_pagos,
                SUM(p.monto_final) as ingresos_totales,
                SUM(CASE WHEN a.tipo_alumno = 'interno' THEN p.monto_final ELSE 0 END) as ingresos_internos,
                SUM(CASE WHEN a.tipo_alumno = 'externo' THEN p.monto_final ELSE 0 END) as ingresos_externos
            FROM pagos p
            JOIN inscripciones i ON p.inscripcion_id = i.id
            JOIN alumnos a ON i.alumno_id = a.id
            ${whereClause}
            AND p.estatus = 'pagado'
            AND p.fecha_pago IS NOT NULL
            GROUP BY EXTRACT(MONTH FROM p.fecha_pago), EXTRACT(YEAR FROM p.fecha_pago)
            ORDER BY anio DESC, mes DESC
        `, params);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener ingresos mensuales:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// GET /api/dashboard/grupos-activos - Grupos activos
// =============================================
router.get('/grupos-activos', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM grupos_detalle
            WHERE activo = true
            ORDER BY periodo_nombre DESC, nivel_nombre
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener grupos activos:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// GET /api/dashboard/alertas - Alertas y notificaciones
// =============================================
router.get('/alertas', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        const alertas = [];

        // Pagos con prórroga
        const pagosProrroga = await pool.query(`
            SELECT COUNT(*) as total
            FROM pagos p
            JOIN inscripciones i ON p.inscripcion_id = i.id
            WHERE p.estatus IN ('prorroga', 'vencido')
            AND p.tiene_prorroga = true
        `);

        if (parseInt(pagosProrroga.rows[0].total) > 0) {
            alertas.push({
                tipo: 'pagos_prorroga',
                mensaje: `${pagosProrroga.rows[0].total} pagos con prórroga activa`,
                cantidad: parseInt(pagosProrroga.rows[0].total),
                prioridad: 'alta'
            });
        }

        // Prórroga pendientes
        const prorrogasPendientes = await pool.query(`
            SELECT COUNT(*) as total
            FROM prorrogas
            WHERE estatus = 'pendiente'
        `);

        if (parseInt(prorrogasPendientes.rows[0].total) > 0) {
            alertas.push({
                tipo: 'prorrogas_pendientes',
                mensaje: `${prorrogasPendientes.rows[0].total} solicitudes de prórroga pendientes`,
                cantidad: parseInt(prorrogasPendientes.rows[0].total),
                prioridad: 'media'
            });
        }

        // Grupos con cupo bajo
        const gruposCupo = await pool.query(`
            SELECT 
                g.codigo,
                g.cupo_minimo,
                COUNT(i.id) as inscritos
            FROM grupos g
            LEFT JOIN inscripciones i ON g.id = i.grupo_id AND i.estatus = 'activo'
            WHERE g.activo = true
            GROUP BY g.id, g.codigo, g.cupo_minimo
            HAVING COUNT(i.id) < g.cupo_minimo
        `);

        if (gruposCupo.rows.length > 0) {
            alertas.push({
                tipo: 'grupos_cupo_bajo',
                mensaje: `${gruposCupo.rows.length} grupos con cupo bajo`,
                cantidad: gruposCupo.rows.length,
                prioridad: 'baja',
                detalles: gruposCupo.rows
            });
        }

        res.json(alertas);
    } catch (error) {
        console.error('Error al obtener alertas:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// POST /api/dashboard/actualizar-estadisticas - Actualizar estadísticas
// =============================================
router.post('/actualizar-estadisticas', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const { periodo_id } = req.body;

        if (periodo_id) {
            // Actualizar un periodo específico
            await pool.query('SELECT actualizar_estadisticas_periodo($1)', [periodo_id]);
            res.json({ message: `Estadísticas del periodo ${periodo_id} actualizadas` });
        } else {
            // Actualizar todos los periodos
            const periodos = await pool.query('SELECT id FROM periodos');
            for (const periodo of periodos.rows) {
                await pool.query('SELECT actualizar_estadisticas_periodo($1)', [periodo.id]);
            }
            res.json({ message: `Estadísticas de ${periodos.rows.length} periodos actualizadas` });
        }
    } catch (error) {
        console.error('Error al actualizar estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// GET /api/dashboard/alertas-academicas - Alumnos en riesgo
// =============================================
router.get('/alertas-academicas', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        const { periodo_id } = req.query;
        let targetPeriodoId = periodo_id;

        if (!targetPeriodoId) {
            const periodoActivo = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
            targetPeriodoId = periodoActivo.rows[0]?.id;
        }

        if (!targetPeriodoId) return res.json([]);

        const result = await pool.query(`
            WITH promedio_calif AS (
                SELECT inscripcion_id, AVG(calificacion) as promedio
                FROM calificaciones
                GROUP BY inscripcion_id
            ),
            stats_asistencia AS (
                SELECT 
                    inscripcion_id,
                    COUNT(id) as total_clases,
                    COUNT(id) FILTER (WHERE presente = true OR justificada = true) as asistencias,
                    ROUND((COUNT(id) FILTER (WHERE presente = true OR justificada = true)::numeric / NULLIF(COUNT(id), 0)) * 100, 2) as pct_asistencia
                FROM asistencias
                GROUP BY inscripcion_id
            )
            SELECT 
                a.matricula,
                CONCAT(a.nombre, ' ', a.apellido_paterno) as alumno,
                g.codigo as grupo,
                COALESCE(p.promedio, 0) as promedio,
                COALESCE(s.pct_asistencia, 100) as asistencia,
                CASE 
                    WHEN COALESCE(p.promedio, 0) < 70 AND COALESCE(s.pct_asistencia, 100) < 80 THEN 'Critico'
                    WHEN COALESCE(p.promedio, 0) < 70 OR COALESCE(s.pct_asistencia, 100) < 80 THEN 'Atencion'
                    ELSE 'Estable'
                END as nivel_riesgo
            FROM inscripciones i
            JOIN alumnos a ON i.alumno_id = a.id
            JOIN grupos g ON i.grupo_id = g.id
            LEFT JOIN promedio_calif p ON i.id = p.inscripcion_id
            LEFT JOIN stats_asistencia s ON i.id = s.inscripcion_id
            WHERE g.periodo_id = $1 
              AND i.estatus = 'activo'
              AND (COALESCE(p.promedio, 0) < 80 OR COALESCE(s.pct_asistencia, 100) < 85)
            ORDER BY nivel_riesgo DESC, promedio ASC
            LIMIT 10
        `, [targetPeriodoId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener alertas académicas:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
