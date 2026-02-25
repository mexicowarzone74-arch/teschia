import express from 'express';
import pool from '../config/database.js';
import { auth } from '../middleware/auth.js';

import logger from '../utils/logger.js';

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configuración de multer para subir archivos en chat
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/chat';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Formato de archivo no soportado'));
    }
});

// Obtener conteo de mensajes no leídos para el usuario actual (respetando vaciados individuales)
router.get('/unread-count', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT COUNT(*) 
            FROM chat_mensajes m
            LEFT JOIN chat_vaciados v ON v.user_id = $1 AND v.sala_id = m.sala_id
            WHERE m.receptor_id = $1 
            AND m.leido = false
            AND (v.vaciado_at IS NULL OR m.created_at > v.vaciado_at)
        `, [req.user.id]);
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Marcar mensajes como leídos en una sala específica
router.post('/read/:sala_id', auth, async (req, res) => {
    try {
        const { sala_id } = req.params;
        await pool.query(`
            UPDATE chat_mensajes 
            SET leido = true 
            WHERE sala_id = $1 AND receptor_id = $2 AND leido = false
        `, [sala_id, req.user.id]);

        // Notificar al cliente que debe actualizar sus contadores
        const io = req.app.get('io');
        if (io) {
            io.emit(`chat:unread_update:${req.user.id}`, { sala_id });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Subir un archivo al chat
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const fileInfo = {
            url: `/api/uploads/chat/${req.file.filename}`,
            name: req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size
        };

        res.json(fileInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Listar usuarios para chat privado con conteo de no leídos y último mensaje (Estilo WhatsApp/Messenger)
router.get('/usuarios', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            WITH last_messages AS (
                SELECT DISTINCT ON (sala_id) 
                    id, mensaje, created_at, emisor_id, sala_id
                FROM chat_mensajes
                ORDER BY sala_id, created_at DESC
            )
            SELECT 
                u.id, u.username, u.rol, u.nombre, u.apellido_paterno,
                u.is_online, u.last_seen, u.status,
                (SELECT COUNT(*) FROM chat_mensajes m 
                 LEFT JOIN chat_vaciados v ON v.user_id = $1 AND v.sala_id = m.sala_id
                 WHERE m.emisor_id = u.id 
                 AND m.receptor_id = $1 
                 AND m.leido = false
                 AND (v.vaciado_at IS NULL OR m.created_at > v.vaciado_at)) as unread_count,
                CASE 
                    WHEN v.vaciado_at IS NOT NULL AND lm.created_at <= v.vaciado_at THEN NULL 
                    ELSE lm.mensaje 
                END as last_message,
                CASE 
                    WHEN v.vaciado_at IS NOT NULL AND lm.created_at <= v.vaciado_at THEN NULL 
                    ELSE lm.created_at 
                END as last_message_at,
                lm.emisor_id as last_message_emisor_id
            FROM usuarios u
            -- Unir con el último mensaje de la sala que comparten
            LEFT JOIN last_messages lm ON (
                lm.sala_id = CASE 
                    WHEN u.id < $1 THEN 'p_' || u.id || '_' || $1 
                    ELSE 'p_' || $1 || '_' || u.id 
                END
            )
            -- Unir con los vaciados del usuario actual para esta sala
            LEFT JOIN chat_vaciados v ON v.user_id = $1 AND v.sala_id = CASE 
                WHEN u.id < $1 THEN 'p_' || u.id || '_' || $1 
                ELSE 'p_' || $1 || '_' || u.id 
            END
            WHERE u.activo = true 
            AND u.id != $1
            AND u.rol IN ('coordinador', 'maestro', 'administrativo')
            AND u.username != 'admin'
            AND u.username NOT LIKE 'm1%'
            ORDER BY 
                unread_count DESC, 
                last_message_at DESC NULLS LAST, 
                u.rol ASC, 
                u.username ASC
        `, [req.user.id]);
        
        const usuarios = result.rows.map(u => ({
            ...u,
            unread_count: parseInt(u.unread_count),
            nombre_completo: u.nombre ? `${u.nombre} ${u.apellido_paterno || ''}`.trim() : u.username
        }));

        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar un mensaje específico
router.delete('/mensaje/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        // Solo el emisor puede eliminar su mensaje
        const result = await pool.query(`
            DELETE FROM chat_mensajes 
            WHERE id = $1 AND emisor_id = $2
            RETURNING *
        `, [id, req.user.id]);

        if (result.rowCount === 0) {
            return res.status(403).json({ error: 'No tienes permiso o el mensaje no existe' });
        }

        const deletedMsg = result.rows[0];
        const io = req.app.get('io');
        if (io) {
            io.to(deletedMsg.sala_id).emit('chat:message_deleted', { 
                id: deletedMsg.id, 
                sala_id: deletedMsg.sala_id 
            });
        }

        res.json({ success: true, message: 'Mensaje eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vaciar chat (INDIVIDUAL: Solo oculta los mensajes para el usuario que lo solicita)
router.delete('/sala/:sala_id', auth, async (req, res) => {
    try {
        const { sala_id } = req.params;
        
        await pool.query(`
            DELETE FROM chat_vaciados 
            WHERE user_id = $1 AND sala_id = $2
        `, [req.user.id, sala_id]);

        await pool.query(`
            INSERT INTO chat_vaciados (user_id, sala_id, vaciado_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, sala_id) 
            DO UPDATE SET vaciado_at = CURRENT_TIMESTAMP
        `, [req.user.id, sala_id]);

        // Notificar al usuario en todos sus dispositivos/ventanas
        const io = req.app.get('io');
        if (io) {
            io.emit(`chat:room_cleared:${req.user.id}`, { sala_id });
        }

        res.json({ success: true, message: 'Conversación vaciada para ti' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener historial de una sala (respetando vaciados individuales)
router.get('/:sala_id', auth, async (req, res) => {
    try {
        const { sala_id } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const result = await pool.query(`
            SELECT m.*, u.username as emisor_nombre, u.rol as emisor_rol
            FROM chat_mensajes m
            JOIN usuarios u ON m.emisor_id = u.id
            LEFT JOIN chat_vaciados v ON v.user_id = $1 AND v.sala_id = m.sala_id
            WHERE m.sala_id = $2
            AND (v.vaciado_at IS NULL OR m.created_at > v.vaciado_at)
            ORDER BY m.created_at DESC
            LIMIT $3 OFFSET $4
        `, [req.user.id, sala_id, limit, offset]);

        res.json(result.rows.reverse());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Guardar un mensaje
router.post('/', auth, async (req, res) => {
    try {
        const { mensaje, sala_id, receptor_id, metadata } = req.body;
        const emisor_id = req.user.id;

        const result = await pool.query(`
            INSERT INTO chat_mensajes (emisor_id, receptor_id, sala_id, mensaje, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [emisor_id, receptor_id, sala_id, mensaje, metadata || {}]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
