import express from 'express';
import { auth, checkRole } from '../middleware/auth.js';
import pool from '../config/database.js';
import {
    getBlockedIPs,
    getSuspiciousIPs,
    getSecurityReport,
    unblockIP
} from '../services/intrusionDetection.js';

const router = express.Router();

// =============================================
// DASHBOARD DE SEGURIDAD
// =============================================

// Obtener resumen de seguridad
router.get('/dashboard', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const report = await getSecurityReport();

        // Estadísticas adicionales
        const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM login_attempts WHERE attempt_time > NOW() - INTERVAL '24 hours') as login_attempts_24h,
        (SELECT COUNT(*) FROM security_logs WHERE event_type = 'UNAUTHORIZED_ACCESS' AND created_at > NOW() - INTERVAL '24 hours') as unauthorized_attempts_24h,
        (SELECT COUNT(*) FROM security_logs WHERE event_type = 'SUSPICIOUS_ACTIVITY' AND created_at > NOW() - INTERVAL '24 hours') as suspicious_activity_24h,
        (SELECT COUNT(DISTINCT ip_address) FROM login_attempts WHERE attempt_time > NOW() - INTERVAL '24 hours') as unique_ips_24h
    `);

        res.json({
            report,
            stats: stats.rows[0],
            blockedIPs: getBlockedIPs(),
            suspiciousIPs: getSuspiciousIPs()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener logs de seguridad recientes
router.get('/logs', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const { limit = 50, type, hours = 24 } = req.query;

        let query = `
      SELECT 
        sl.*,
        u.username
      FROM security_logs sl
      LEFT JOIN usuarios u ON sl.user_id = u.id
      WHERE sl.created_at > NOW() - INTERVAL '${hours} hours'
    `;

        if (type) {
            query += ` AND sl.event_type = $1`;
        }

        query += ` ORDER BY sl.created_at DESC LIMIT ${limit}`;

        const result = type
            ? await pool.query(query, [type])
            : await pool.query(query);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener intentos de login fallidos
router.get('/failed-logins', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const { hours = 24 } = req.query;

        const result = await pool.query(`
      SELECT 
        username,
        ip_address,
        COUNT(*) as attempts,
        MAX(attempt_time) as last_attempt,
        MIN(attempt_time) as first_attempt
      FROM login_attempts
      WHERE attempt_time > NOW() - INTERVAL '${hours} hours'
        AND success = false
      GROUP BY username, ip_address
      HAVING COUNT(*) >= 3
      ORDER BY attempts DESC
    `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener IPs sospechosas
router.get('/suspicious-ips', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        ip_address,
        COUNT(*) as events,
        MAX(created_at) as last_event,
        array_agg(DISTINCT event_type) as event_types
      FROM security_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND event_type IN ('SUSPICIOUS_ACTIVITY', 'UNAUTHORIZED_ACCESS', 'BRUTE_FORCE')
      GROUP BY ip_address
      HAVING COUNT(*) >= 3
      ORDER BY events DESC
    `);

        res.json({
            database: result.rows,
            memory: {
                blocked: getBlockedIPs(),
                suspicious: getSuspiciousIPs()
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Desbloquear IP
router.post('/unblock-ip', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const { ip } = req.body;

        if (!ip) {
            return res.status(400).json({ error: 'IP requerida' });
        }

        unblockIP(ip);

        // Registrar la acción
        await pool.query(
            `INSERT INTO security_logs (event_type, ip_address, user_id, details) 
       VALUES ($1, $2, $3, $4)`,
            ['IP_UNBLOCKED', ip, req.user.id, JSON.stringify({ unblocked_by: req.user.username })]
        );

        res.json({ message: `IP ${ip} desbloqueada exitosamente` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener gráfica de eventos por hora
router.get('/events-timeline', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const { hours = 24 } = req.query;

        const result = await pool.query(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        event_type,
        COUNT(*) as count
      FROM security_logs
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
      GROUP BY DATE_TRUNC('hour', created_at), event_type
      ORDER BY hour DESC
    `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener top atacantes
router.get('/top-attackers', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        ip_address,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE event_type = 'UNAUTHORIZED_ACCESS') as unauthorized_attempts,
        COUNT(*) FILTER (WHERE event_type = 'SUSPICIOUS_ACTIVITY') as suspicious_activities,
        MAX(created_at) as last_activity
      FROM security_logs
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY ip_address
      HAVING COUNT(*) >= 5
      ORDER BY total_events DESC
      LIMIT 10
    `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener estadísticas por tipo de evento
router.get('/event-stats', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d,
        MAX(created_at) as last_occurrence
      FROM security_logs
      GROUP BY event_type
      ORDER BY count DESC
    `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Exportar reporte de seguridad
router.get('/export-report', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const report = await pool.query(`
      SELECT 
        sl.*,
        u.username
      FROM security_logs sl
      LEFT JOIN usuarios u ON sl.user_id = u.id
      WHERE sl.created_at > NOW() - INTERVAL '${days} days'
      ORDER BY sl.created_at DESC
    `);

        const loginAttempts = await pool.query(`
      SELECT * FROM login_attempts
      WHERE attempt_time > NOW() - INTERVAL '${days} days'
      ORDER BY attempt_time DESC
    `);

        const exportData = {
            generated_at: new Date().toISOString(),
            period_days: days,
            security_logs: report.rows,
            login_attempts: loginAttempts.rows,
            summary: {
                total_events: report.rows.length,
                total_login_attempts: loginAttempts.rows.length,
                blocked_ips: getBlockedIPs(),
                suspicious_ips: getSuspiciousIPs()
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=security-report-${new Date().toISOString().split('T')[0]}.json`);
        res.json(exportData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Limpiar logs antiguos
router.delete('/cleanup-logs', auth, checkRole('coordinador'), async (req, res) => {
    try {
        const { days = 90 } = req.body;

        const result = await pool.query(`
      DELETE FROM security_logs
      WHERE created_at < NOW() - INTERVAL '${days} days'
      RETURNING id
    `);

        const loginResult = await pool.query(`
      DELETE FROM login_attempts
      WHERE attempt_time < NOW() - INTERVAL '${days} days'
      RETURNING id
    `);

        res.json({
            message: 'Logs limpiados exitosamente',
            security_logs_deleted: result.rowCount,
            login_attempts_deleted: loginResult.rowCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
