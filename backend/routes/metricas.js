import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import pdfReportService from '../services/pdfReportService.js';

const router = express.Router();

/**
 * Endpoint para obtener métricas históricas
 * Retorna datos de todos los periodos para análisis de tendencias
 */
router.get('/historicas', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        const { limite = 12 } = req.query; // Últimos 12 periodos por defecto (2 años)

        const result = await pool.query(`
      SELECT 
        p.nombre as periodo,
        mp.fecha_corte,
        mp.total_alumnos,
        mp.alumnos_nuevos_ingreso as nuevos_ingresos,
        mp.alumnos_internos,
        mp.alumnos_externos,
        mp.alumnos_a1,
        mp.alumnos_a2,
        mp.alumnos_b1,
        mp.alumnos_b2,
        mp.alumnos_c1,
        mp.alumnos_c2,
        mp.ingresos_totales as ingresos,
        mp.adeudos_pendientes as adeudos,
        mp.grupos_activos,
        mp.maestros_activos,
        mp.tasa_aprobacion,
        mp.tasa_reprobacion,
        mp.tasa_desercion
      FROM metricas_periodo mp
      JOIN periodos p ON mp.periodo_id = p.id
      ORDER BY mp.fecha_corte DESC
      LIMIT $1
    `, [limite]);

        res.json({
            success: true,
            data: result.rows.reverse(), // Ordenar cronológicamente
            total: result.rows.length
        });
    } catch (error) {
        console.error('Error al obtener métricas históricas:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint para obtener métricas mensuales
 * Útil para gráficas de tendencias más granulares
 */
router.get('/mensuales', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        const { meses = 12 } = req.query;

        const result = await pool.query(`
      SELECT 
        anio,
        mes,
        TO_CHAR(TO_DATE(mes::text, 'MM'), 'TMMonth') as mes_nombre,
        total_alumnos,
        nuevos_ingresos,
        bajas,
        ingresos_mes,
        adeudos_mes,
        grupos_activos
      FROM metricas_mensuales
      ORDER BY anio DESC, mes DESC
      LIMIT $1
    `, [meses]);

        res.json({
            success: true,
            data: result.rows.reverse(),
            total: result.rows.length
        });
    } catch (error) {
        console.error('Error al obtener métricas mensuales:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint para calcular y actualizar métricas del periodo actual
 */
router.post('/calcular/:periodo_id', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const { periodo_id } = req.params;

        await pool.query('SELECT calcular_metricas_periodo($1)', [periodo_id]);

        res.json({
            success: true,
            message: 'Métricas calculadas exitosamente'
        });
    } catch (error) {
        console.error('Error al calcular métricas:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint para generar PDF con gráficas de tendencias
 */
router.get('/pdf/tendencias-ingresos', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        // Obtener datos históricos
        const result = await pool.query(`
      SELECT 
        p.nombre as periodo,
        mp.total_alumnos,
        mp.alumnos_nuevos_ingreso as nuevos_ingresos,
        mp.alumnos_a1,
        mp.alumnos_a2,
        mp.alumnos_b1,
        mp.alumnos_b2,
        mp.alumnos_c1,
        mp.alumnos_c2,
        mp.ingresos_totales as ingresos,
        mp.adeudos_pendientes as adeudos,
        mp.grupos_activos
      FROM metricas_periodo mp
      JOIN periodos p ON mp.periodo_id = p.id
      ORDER BY mp.fecha_corte ASC
      LIMIT 12
    `);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'No hay datos históricos disponibles. Ejecuta primero el cálculo de métricas.'
            });
        }

        await pdfReportService.generarPDFTendenciasIngresos(result.rows, res);
    } catch (error) {
        console.error('Error al generar PDF de tendencias:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint para análisis de crecimiento semestral
 */
router.get('/crecimiento-semestral', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        const result = await pool.query(`
      WITH periodos_ordenados AS (
        SELECT 
          p.nombre as periodo,
          mp.total_alumnos,
          mp.alumnos_nuevos_ingreso,
          mp.ingresos_totales,
          mp.fecha_corte,
          ROW_NUMBER() OVER (ORDER BY mp.fecha_corte) as periodo_num,
          LAG(mp.total_alumnos) OVER (ORDER BY mp.fecha_corte) as alumnos_periodo_anterior,
          LAG(mp.ingresos_totales) OVER (ORDER BY mp.fecha_corte) as ingresos_periodo_anterior
        FROM metricas_periodo mp
        JOIN periodos p ON mp.periodo_id = p.id
        ORDER BY mp.fecha_corte DESC
        LIMIT 6
      )
      SELECT 
        periodo,
        total_alumnos,
        alumnos_nuevos_ingreso,
        ingresos_totales,
        CASE 
          WHEN alumnos_periodo_anterior IS NOT NULL AND alumnos_periodo_anterior > 0
          THEN ROUND(((total_alumnos - alumnos_periodo_anterior)::numeric / alumnos_periodo_anterior * 100), 2)
          ELSE 0
        END as crecimiento_alumnos_porcentaje,
        CASE 
          WHEN ingresos_periodo_anterior IS NOT NULL AND ingresos_periodo_anterior > 0
          THEN ROUND(((ingresos_totales - ingresos_periodo_anterior) / ingresos_periodo_anterior * 100), 2)
          ELSE 0
        END as crecimiento_ingresos_porcentaje,
        (total_alumnos - COALESCE(alumnos_periodo_anterior, 0)) as crecimiento_alumnos_absoluto,
        (ingresos_totales - COALESCE(ingresos_periodo_anterior, 0)) as crecimiento_ingresos_absoluto
      FROM periodos_ordenados
      ORDER BY fecha_corte DESC
    `);

        // Calcular promedios
        const promedios = {
            crecimiento_alumnos_promedio: 0,
            crecimiento_ingresos_promedio: 0,
            nuevos_ingresos_promedio: 0
        };

        if (result.rows.length > 0) {
            promedios.crecimiento_alumnos_promedio = (
                result.rows.reduce((sum, r) => sum + parseFloat(r.crecimiento_alumnos_porcentaje || 0), 0) / result.rows.length
            ).toFixed(2);

            promedios.crecimiento_ingresos_promedio = (
                result.rows.reduce((sum, r) => sum + parseFloat(r.crecimiento_ingresos_porcentaje || 0), 0) / result.rows.length
            ).toFixed(2);

            promedios.nuevos_ingresos_promedio = Math.round(
                result.rows.reduce((sum, r) => sum + parseInt(r.alumnos_nuevos_ingreso || 0), 0) / result.rows.length
            );
        }

        res.json({
            success: true,
            periodos: result.rows,
            promedios: promedios,
            total_periodos: result.rows.length
        });
    } catch (error) {
        console.error('Error al analizar crecimiento semestral:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint para proyecciones futuras basadas en tendencias
 */
router.get('/proyecciones', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const result = await pool.query(`
      WITH ultimos_periodos AS (
        SELECT 
          mp.total_alumnos,
          mp.alumnos_nuevos_ingreso,
          mp.ingresos_totales,
          mp.fecha_corte
        FROM metricas_periodo mp
        ORDER BY mp.fecha_corte DESC
        LIMIT 4
      ),
      tendencias AS (
        SELECT 
          AVG(total_alumnos) as promedio_alumnos,
          AVG(alumnos_nuevos_ingreso) as promedio_nuevos,
          AVG(ingresos_totales) as promedio_ingresos,
          STDDEV(total_alumnos) as desviacion_alumnos,
          STDDEV(ingresos_totales) as desviacion_ingresos
        FROM ultimos_periodos
      )
      SELECT 
        ROUND(promedio_alumnos) as alumnos_esperados_proximo_periodo,
        ROUND(promedio_nuevos) as nuevos_ingresos_esperados,
        ROUND(promedio_ingresos::numeric, 2) as ingresos_esperados,
        ROUND(desviacion_alumnos) as margen_error_alumnos,
        ROUND(desviacion_ingresos::numeric, 2) as margen_error_ingresos,
        ROUND(promedio_alumnos + (promedio_nuevos * 1.1)) as proyeccion_optimista_alumnos,
        ROUND(promedio_alumnos + (promedio_nuevos * 0.9)) as proyeccion_conservadora_alumnos
      FROM tendencias
    `);

        res.json({
            success: true,
            proyecciones: result.rows[0] || {},
            nota: 'Proyecciones basadas en los últimos 4 periodos académicos'
        });
    } catch (error) {
        console.error('Error al calcular proyecciones:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Dashboard de métricas en tiempo real
 */
router.get('/tiempo-real', auth, async (req, res) => {
    try {
        const periodo_actual = await pool.query(`
      SELECT id FROM periodos WHERE activo = true ORDER BY created_at DESC LIMIT 1
    `);

        if (periodo_actual.rows.length === 0) {
            return res.status(404).json({ error: 'No hay periodo activo' });
        }

        const periodo_id = periodo_actual.rows[0].id;

        // Calcular métricas en tiempo real
        const metricas = await pool.query(`
      SELECT 
        COUNT(DISTINCT a.id) as total_alumnos,
        COUNT(DISTINCT a.id) FILTER (WHERE a.es_nuevo_ingreso = true) as nuevos_ingresos,
        COUNT(DISTINCT a.id) FILTER (WHERE a.tipo_alumno = 'interno') as alumnos_internos,
        COUNT(DISTINCT a.id) FILTER (WHERE a.tipo_alumno = 'externo') as alumnos_externos,
        COUNT(DISTINCT a.id) FILTER (WHERE a.nivel_actual = 'A1') as alumnos_a1,
        COUNT(DISTINCT a.id) FILTER (WHERE a.nivel_actual = 'A2') as alumnos_a2,
        COUNT(DISTINCT a.id) FILTER (WHERE a.nivel_actual = 'B1') as alumnos_b1,
        COUNT(DISTINCT a.id) FILTER (WHERE a.nivel_actual = 'B2') as alumnos_b2,
        COUNT(DISTINCT a.id) FILTER (WHERE a.nivel_actual = 'C1') as alumnos_c1,
        COUNT(DISTINCT a.id) FILTER (WHERE a.nivel_actual = 'C2') as alumnos_c2,
        COALESCE(SUM(p.monto) FILTER (WHERE p.estatus IN ('completado', 'pagado')), 0) as ingresos_totales,
        COALESCE(SUM(p.monto) FILTER (WHERE p.estatus IN ('pendiente', 'adeudo')), 0) as adeudos_pendientes,
        COUNT(DISTINCT g.id) as grupos_activos
      FROM alumnos a
      LEFT JOIN inscripciones i ON a.id = i.alumno_id AND i.periodo_id = $1
      LEFT JOIN pagos p ON a.id = p.alumno_id AND p.periodo_id = $1
      LEFT JOIN grupos g ON g.periodo_id = $1 AND g.activo = true
      WHERE a.estatus = 'activo'
    `, [periodo_id]);

        res.json({
            success: true,
            periodo_id: periodo_id,
            metricas: metricas.rows[0],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error al obtener métricas en tiempo real:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
