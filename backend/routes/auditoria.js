import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Obtener logs de auditoría con filtros y paginación
router.get('/', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            tabla, 
            usuario_id, 
            accion,
            fecha_inicio,
            fecha_fin
        } = req.query;

        const offset = (page - 1) * limit;
        const params = [];
        let paramIndex = 1;

        let query = `
            SELECT a.*, u.username as usuario_nombre
            FROM auditoria a
            LEFT JOIN usuarios u ON a.usuario_id = u.id
            WHERE 1=1
        `;

        if (tabla) {
            query += ` AND a.tabla = $${paramIndex++}`;
            params.push(tabla);
        }

        if (usuario_id) {
            query += ` AND a.usuario_id = $${paramIndex++}`;
            params.push(usuario_id);
        }

        if (accion) {
            query += ` AND a.accion = $${paramIndex++}`;
            params.push(accion);
        }

        if (fecha_inicio) {
            query += ` AND a.created_at >= $${paramIndex++}`;
            params.push(fecha_inicio);
        }

        if (fecha_fin) {
            query += ` AND a.created_at <= $${paramIndex++}`;
            params.push(fecha_fin);
        }

        // Obtener total para paginación
        const countQuery = `SELECT COUNT(*) FROM (${query}) as total`;
        const totalResult = await pool.query(countQuery, params);
        const total = parseInt(totalResult.rows[0].count);

        // Agregar orden y paginación
        query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener logs de auditoría:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener estadísticas de actividad
router.get('/stats', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                tabla,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as ultimas_24h
            FROM auditoria
            GROUP BY tabla
            ORDER BY total DESC
        `);

        const activityByDay = await pool.query(`
            SELECT 
                DATE_TRUNC('day', created_at) as fecha,
                COUNT(*) as cantidad
            FROM auditoria
            WHERE created_at > NOW() - INTERVAL '30 days'
            GROUP BY 1
            ORDER BY 1 ASC
        `);

        res.json({
            statsByTable: stats.rows,
            activityByDay: activityByDay.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
