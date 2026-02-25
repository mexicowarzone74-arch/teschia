import express from 'express';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import pool from '../config/database.js';
import { auth } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Generar secreto y código QR para configurar 2FA
router.post('/generate', auth, async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const username = req.user.username;
        
        // Generar nuevo secreto
        const secret = authenticator.generateSecret();
        
        // Generar URI de autenticación
        const otpauth = authenticator.keyuri(username, 'TESCHA-CELEX', secret);
        
        // Generar código QR en Base64
        const qrCodeUrl = await qrcode.toDataURL(otpauth);
        
        // Guardar secreto temporalmente o actualizar si ya existe (pero no activado)
        await pool.query(
            `INSERT INTO two_factor_auth (usuario_id, secret, enabled) 
             VALUES ($1, $2, false)
             ON CONFLICT (usuario_id) DO UPDATE SET secret = $2, enabled = false`,
            [usuarioId, secret]
        );

        res.json({
            secret,
            qrCodeUrl
        });
    } catch (error) {
        logger.error('Error generating 2FA secret:', error);
        res.status(500).json({ error: 'Error al generar configuración 2FA' });
    }
});

// Verificar y activar 2FA
router.post('/verify', auth, async (req, res) => {
    try {
        const { token } = req.body;
        const usuarioId = req.user.id;

        if (!token) {
            return res.status(400).json({ error: 'Token de verificación requerido' });
        }

        const result = await pool.query(
            'SELECT secret FROM two_factor_auth WHERE usuario_id = $1',
            [usuarioId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Configuración 2FA no encontrada. Genera un secreto primero.' });
        }

        const secret = result.rows[0].secret;
        const isValid = authenticator.verify({ token, secret });

        if (!isValid) {
            return res.status(400).json({ error: 'Código de verificación inválido' });
        }

        // Generar códigos de respaldo (ejemplo sencillo)
        const backupCodes = Array.from({ length: 10 }, () => 
            Math.random().toString(36).substring(2, 10).toUpperCase()
        );

        // Activar 2FA
        await pool.query(
            'UPDATE two_factor_auth SET enabled = true, backup_codes = $1, updated_at = NOW() WHERE usuario_id = $2',
            [backupCodes, usuarioId]
        );

        res.json({
            message: '2FA activado correctamente',
            backupCodes
        });
    } catch (error) {
        logger.error('Error verifying 2FA:', error);
        res.status(500).json({ error: 'Error al verificar 2FA' });
    }
});

// Desactivar 2FA
router.post('/disable', auth, async (req, res) => {
    try {
        const { token } = req.body;
        const usuarioId = req.user.id;

        const result = await pool.query(
            'SELECT secret, enabled FROM two_factor_auth WHERE usuario_id = $1',
            [usuarioId]
        );

        if (result.rows.length === 0 || !result.rows[0].enabled) {
            return res.status(400).json({ error: '2FA no está activado para este usuario' });
        }

        const secret = result.rows[0].secret;
        const isValid = authenticator.verify({ token, secret });

        if (!isValid) {
            return res.status(400).json({ error: 'Código de verificación inválido' });
        }

        await pool.query('DELETE FROM two_factor_auth WHERE usuario_id = $1', [usuarioId]);

        res.json({ message: '2FA desactivado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al desactivar 2FA' });
    }
});

// Verificar estatus de 2FA
router.get('/status', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT enabled FROM two_factor_auth WHERE usuario_id = $1',
            [req.user.id]
        );
        res.json({ enabled: result.rows.length > 0 && result.rows[0].enabled });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
