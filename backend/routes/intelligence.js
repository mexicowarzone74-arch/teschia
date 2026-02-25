import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/intelligence/kpis
 * Obtiene indicadores de alto nivel (KPIs) para la toma de decisiones
 */
router.get('/kpis', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
    try {
        // 1. Calidad Académica (Promedio General y Asistencia)
        const academicRes = await pool.query(`
            SELECT 
                ROUND(AVG(calificacion), 2) as promedio_general,
                (
                    SELECT ROUND((COUNT(*) FILTER (WHERE presente = true OR justificada = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 2)
                    FROM asistencias
                ) as tasa_asistencia
            FROM calificaciones
        `);

        // 2. Salud Financiera
        const financialRes = await pool.query(`
            SELECT 
                ROUND((COUNT(*) FILTER (WHERE estatus = 'pagado')::numeric / NULLIF(COUNT(*), 0)) * 100, 2) as eficiencia_cobro,
                SUM(monto) FILTER (WHERE estatus = 'pagado') as recaudado,
                SUM(monto) FILTER (WHERE estatus != 'pagado') as pendiente
            FROM pagos
        `);

        // 3. Carga Operativa
        const operationalRes = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM alumnos WHERE estatus = 'activo') as total_alumnos,
                (SELECT COUNT(*) FROM maestros WHERE activo = true) as total_maestros,
                (SELECT COUNT(*) FROM grupos WHERE activo = true) as total_grupos
        `);

        const kpis = {
            academic: {
                score: academicRes.rows[0].promedio_general || 0,
                asistencia: academicRes.rows[0].tasa_asistencia || 0,
                status: academicRes.rows[0].promedio_general >= 80 ? 'Excelente' : academicRes.rows[0].promedio_general >= 70 ? 'Bueno' : 'Atención'
            },
            financial: {
                efficiency: financialRes.rows[0].eficiencia_cobro || 0,
                total: parseFloat(financialRes.rows[0].recaudado || 0),
                pending: parseFloat(financialRes.rows[0].pendiente || 0)
            },
            operational: {
                alumnos_por_maestro: Math.round((operationalRes.rows[0].total_alumnos / (operationalRes.rows[0].total_maestros || 1)) * 10) / 10,
                total_grupos: operationalRes.rows[0].total_grupos,
                total_alumnos: operationalRes.rows[0].total_alumnos
            }
        };

        res.json(kpis);
    } catch (error) {
        console.error('Error en Intelligence KPIs:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
