import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';

const router = express.Router();

// =============================================
// GET /api/niveles - Obtener todos los niveles
// =============================================
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, codigo, nombre, descripcion, orden, horas_totales FROM niveles ORDER BY orden ASC'
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener niveles:', error);
        res.status(500).json({ error: 'Error al obtener niveles' });
    }
});

// =============================================
// GET /api/niveles/:id - Obtener un nivel específico
// =============================================
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT id, codigo, nombre, descripcion, orden, horas_totales FROM niveles WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Nivel no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener nivel:', error);
        res.status(500).json({ error: 'Error al obtener nivel' });
    }
});

// =============================================
// GET /api/niveles/codigo/:codigo - Obtener nivel por código
// =============================================
router.get('/codigo/:codigo', auth, async (req, res) => {
    try {
        const { codigo } = req.params;

        const result = await pool.query(
            'SELECT id, codigo, nombre, descripcion, orden, horas_totales FROM niveles WHERE codigo = $1',
            [codigo]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Nivel no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener nivel:', error);
        res.status(500).json({ error: 'Error al obtener nivel' });
    }
});

export default router;
