import express from 'express';
import { sendAlert } from '../services/intrusionDetection.js';

const router = express.Router();

/**
 * 🔒 ENDPOINT DE PRUEBA PARA ALERTAS DE SEGURIDAD
 * Este endpoint simula un intento de hackeo para probar el sistema de notificaciones
 */

// POST /api/security-test/simulate-attack
router.post('/simulate-attack', async (req, res) => {
    try {
        const { type = 'SQL_INJECTION', severity = 'HIGH' } = req.body;

        console.log('\n🔥 Simulando ataque de seguridad...');

        // Simular alerta de seguridad
        await sendAlert({
            type: type,
            severity: severity,
            ip: req.ip || '127.0.0.1',
            user: req.user?.username || 'test_attacker',
            details: `Simulación de ${type} desde endpoint de prueba`,
            action: 'LOGGED_AND_ALERTED'
        });

        res.json({
            success: true,
            message: '✅ Alerta de seguridad simulada y enviada',
            alert: {
                type,
                severity,
                ip: req.ip,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error simulando ataque:', error);
        res.status(500).json({
            error: 'Error al simular ataque',
            message: error.message
        });
    }
});

// POST /api/security-test/test-email
router.post('/test-email', async (req, res) => {
    try {
        console.log('\n📧 Probando envío de email de seguridad...');

        await sendAlert({
            type: 'TEST_ALERT',
            severity: 'LOW',
            ip: req.ip || '127.0.0.1',
            user: 'system_test',
            details: 'Esta es una prueba del sistema de alertas por email',
            action: 'TEST'
        });

        res.json({
            success: true,
            message: '✅ Email de prueba enviado correctamente',
            note: 'Revisa tu bandeja de entrada'
        });

    } catch (error) {
        console.error('❌ Error enviando email:', error);
        res.status(500).json({
            error: 'Error al enviar email de prueba',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/security-test/attacks - Lista de tipos de ataque para simular
router.get('/attacks', (req, res) => {
    res.json({
        availableAttacks: [
            {
                type: 'SQL_INJECTION',
                severity: 'CRITICAL',
                description: 'Intento de inyección SQL'
            },
            {
                type: 'XSS_ATTACK',
                severity: 'HIGH',
                description: 'Intento de Cross-Site Scripting'
            },
            {
                type: 'BRUTE_FORCE',
                severity: 'HIGH',
                description: 'Intento de fuerza bruta en login'
            },
            {
                type: 'PORT_SCANNING',
                severity: 'MEDIUM',
                description: 'Escaneo de puertos/endpoints'
            },
            {
                type: 'TRAFFIC_ANOMALY',
                severity: 'MEDIUM',
                description: 'Tráfico anómalo detectado'
            },
            {
                type: 'UNAUTHORIZED_ACCESS',
                severity: 'HIGH',
                description: 'Intento de acceso no autorizado'
            }
        ],
        severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    });
});

export default router;
