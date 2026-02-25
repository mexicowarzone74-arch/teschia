import express from 'express';
import pool from '../config/database.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/search/global
 * Búsqueda unificada en todo el sistema
 */
router.get('/global', auth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ alumnos: [], grupos: [], maestros: [] });

        const searchPattern = `%${q}%`;

        // 1. Alumnos
        const alumnos = await pool.query(`
            SELECT id, CONCAT(nombre, ' ', apellido_paterno) as title, matricula as subtitle, 'alumno' as type 
            FROM alumnos 
            WHERE nombre ILIKE $1 OR apellido_paterno ILIKE $1 OR matricula ILIKE $1
            LIMIT 5
        `, [searchPattern]);

        // 2. Grupos
        const grupos = await pool.query(`
            SELECT g.id, g.codigo as title, n.nombre as subtitle, 'grupo' as type
            FROM grupos g
            JOIN niveles n ON g.nivel_id = n.id
            WHERE g.codigo ILIKE $1
            LIMIT 5
        `, [searchPattern]);

        // 3. Maestros (Solo para coordinadores)
        let maestros = { rows: [] };
        if (req.user.rol === 'coordinador') {
            maestros = await pool.query(`
                SELECT id, CONCAT(nombre, ' ', apellido_paterno) as title, 'Docente' as subtitle, 'maestro' as type
                FROM maestros
                WHERE nombre ILIKE $1 OR apellido_paterno ILIKE $1
                LIMIT 5
            `, [searchPattern]);
        }

        res.json({
            results: [
                ...alumnos.rows,
                ...grupos.rows,
                ...maestros.rows
            ]
        });

    } catch (error) {
        console.error('Error en búsqueda global:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
