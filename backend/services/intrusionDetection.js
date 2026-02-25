import pool from '../config/database.js';
import nodemailer from 'nodemailer';

/**
 * SISTEMA DE DETECCIÓN DE INTRUSOS (IDS)
 * Monitorea actividad sospechosa y genera alertas en tiempo real
 */

// Configuración de alertas
const ALERT_CONFIG = {
    email: process.env.SECURITY_ALERT_EMAIL || 'admin@tescha.com',
    enableEmailAlerts: process.env.ENABLE_EMAIL_ALERTS === 'true',
    enableConsoleAlerts: true,
    enableDatabaseAlerts: true
};

// Umbrales de detección
const THRESHOLDS = {
    loginAttempts: 5,           // Intentos de login en ventana de tiempo
    loginWindow: 300000,        // 5 minutos
    requestsPerMinute: 60,      // Requests por minuto
    failedAuthPerHour: 10,      // Autenticaciones fallidas por hora
    suspiciousPatterns: 3       // Patrones sospechosos detectados
};

// Almacenamiento en memoria (en producción usar Redis)
const activityLog = new Map();
const suspiciousIPs = new Set();
const blockedIPs = new Set();

// =============================================
// DETECCIÓN DE PATRONES SOSPECHOSOS
// =============================================

export function detectSuspiciousPattern(req, bodyToTest = '') {
    const ip = req.ip;
    const path = req.path;
    const method = req.method;

    // Excepción: Permitir búsqueda múltiple en /api/pagos
    if (path === '/api/pagos' && req.query.search) {
        return { detected: false };
    }

    // Patrones sospechosos (REFINADOS para evitar falsos positivos)
    const patterns = [
        // SQL Injection - Más específico para evitar falsos positivos con palabras comunes
        /(SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|UNION\s+SELECT|xp_cmdshell|exec\s+sp_)/i,
        // SQL Injection básico (caracteres peligrosos)
        /('|--|;|\/\*|\*\/)/,
        // XSS
        /<script|javascript:|onerror=|onload=|<iframe|<object|<embed/i,
        // Path Traversal
        /\.\.\/|\.\.\\|\/etc\/passwd|\/proc\/self/i,
        // Command Injection
        /(;|\s|&|\|)(bash|sh|cmd|powershell|curl|wget|nc|netcat)\s/i,
        // File Upload Attacks
        /\.(php|asp|jsp|exe|sh|bat)$/i
    ];

    const queryString = decodeURIComponent(JSON.stringify(req.query));

    for (const pattern of patterns) {
        if (pattern.test(path) || pattern.test(queryString) || (bodyToTest && pattern.test(bodyToTest))) {
            console.log(`⚠️ ALERTA: Patrón detectado ${pattern} en ${method} ${path}`);
            return {
                detected: true,
                type: 'SUSPICIOUS_PATTERN',
                pattern: pattern.toString(),
                details: `Patrón sospechoso detectado en ${method} ${path}`
            };
        }
    }

    // Detectar escaneo de puertos/endpoints
    if (!activityLog.has(ip)) {
        activityLog.set(ip, []);
    }

    const ipActivity = activityLog.get(ip);
    ipActivity.push({ path, timestamp: Date.now() });

    // Limpiar actividad antigua
    const fiveMinutesAgo = Date.now() - 300000;
    const recentActivity = ipActivity.filter(a => a.timestamp > fiveMinutesAgo);
    activityLog.set(ip, recentActivity);

    // Detectar escaneo (muchos endpoints diferentes en poco tiempo)
    const uniquePaths = new Set(recentActivity.map(a => a.path));
    if (uniquePaths.size > 40) { // Aumentado de 20 a 40 para evitar falsos positivos con el Dashboard pesado
        return {
            detected: true,
            type: 'PORT_SCANNING',
            details: `${uniquePaths.size} endpoints diferentes accedidos en 5 minutos`
        };
    }

    return { detected: false };
}

// =============================================
// DETECCIÓN DE ANOMALÍAS DE TRÁFICO
// =============================================

export function detectTrafficAnomaly(ip) {
    if (!activityLog.has(ip)) {
        return { detected: false };
    }

    const ipActivity = activityLog.get(ip);
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = ipActivity.filter(a => a.timestamp > oneMinuteAgo);

    if (recentRequests.length > 150) { // Aumentado el umbral para el nuevo Dashboard BI
        return {
            detected: true,
            type: 'TRAFFIC_ANOMALY',
            requests: recentRequests.length,
            details: `${recentRequests.length} requests en el último minuto`
        };
    }

    return { detected: false };
}

// =============================================
// GENERACIÓN DE ALERTAS
// =============================================

async function sendAlert(alert) {
    const alertData = {
        timestamp: new Date().toISOString(),
        type: alert.type,
        severity: alert.severity || 'HIGH',
        ip: alert.ip,
        user: alert.user,
        details: alert.details,
        action: alert.action || 'LOGGED'
    };

    // Alerta en consola
    if (ALERT_CONFIG.enableConsoleAlerts) {
        console.error('\n' + '='.repeat(60));
        console.error(`🚨 ALERTA DE SEGURIDAD - [${alertData.type}]`);
        console.error(`IP: ${alertData.ip} | Usuario: ${alertData.user || 'N/A'}`);
        console.error(`Detalles: ${alertData.details}`);
        console.error('='.repeat(60) + '\n');
    }

    // Guardar en base de datos
    if (ALERT_CONFIG.enableDatabaseAlerts) {
        try {
            await pool.query(
                `INSERT INTO security_logs (event_type, ip_address, details, created_at) 
                 VALUES ($1, $2, $3, NOW())`,
                ['SECURITY_ALERT', alertData.ip, JSON.stringify(alertData)]
            );
        } catch (error) {
            console.error('Error saving alert to database:', error.message);
        }
    }

    // Enviar email (si está configurado)
    if (ALERT_CONFIG.enableEmailAlerts && alertData.severity === 'CRITICAL') {
        try {
            await sendEmailAlert(alertData);
        } catch (error) {
            console.error('❌ Error sending email alert:', error.message);
        }
    }
}

async function sendEmailAlert(alertData) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const mailOptions = {
        from: `"Sistema TESCHA 🔒" <${process.env.SMTP_USER}>`,
        to: ALERT_CONFIG.email,
        subject: `🚨 ALERTA DE SEGURIDAD CRÍTICA - ${alertData.type}`,
        html: `<p>Se ha detectado una actividad sospechosa crítica.</p><pre>${JSON.stringify(alertData, null, 2)}</pre>`
    };

    return await transporter.sendMail(mailOptions);
}

// =============================================
// MIDDLEWARE DE DETECCIÓN
// =============================================

export const intrusionDetectionMiddleware = async (req, res, next) => {
    const ip = req.ip;
    const user = req.user?.username || 'anonymous';

    // 🏠 WHITELIST (MEJORADA): IPs confiables (localhost y LAN)
    // Se evalúa al inicio para evitar procesamiento innecesario
    const isTrustedIP = 
        ip === '::1' || 
        ip === '127.0.0.1' || 
        ip.includes('127.0.0.1') ||
        ip.includes('192.168.') || 
        ip.includes('10.') || 
        ip.includes('172.16.') ||
        ip.includes('localhost') ||
        req.hostname?.endsWith('.local');

    if (isTrustedIP) {
        // Para desarrollo/LAN, permitimos todo sin procesar patrones pesados
        return next();
    }

    // Si llegamos aquí, es una IP externa. Verificar si está bloqueada.
    if (blockedIPs.has(ip)) {
        return res.status(403).json({
            error: 'Tu IP ha sido bloqueada temporalmente por actividad sospechosa.'
        });
    }

    // Obtener body de forma segura y limitada para no saturar el Event Loop
    let bodyToTest = '';
    try {
        if (req.body && Object.keys(req.body).length > 0) {
            const bodyStr = JSON.stringify(req.body);
            // Solo probamos patrones en cuerpos de menos de 50KB para evitar lentitud
            if (bodyStr.length < 50000) {
                bodyToTest = bodyStr;
            } else {
                bodyToTest = '[BODY_TOO_LARGE_SKIPPED]';
            }
        }
    } catch (e) {
        bodyToTest = '[BODY_PARSE_ERROR]';
    }

    // Detectar patrones sospechosos (Solo para IPs externas)
    const patternDetection = detectSuspiciousPattern(req, bodyToTest);
    if (patternDetection.detected) {
        sendAlert({
            type: patternDetection.type,
            severity: 'HIGH',
            ip,
            user,
            details: patternDetection.details,
            action: 'LOGGED'
        }).catch(err => console.error('Error in sendAlert background:', err));

        suspiciousIPs.add(ip);

        if (!activityLog.has(ip)) activityLog.set(ip, []);
        const ipActivity = activityLog.get(ip);
        ipActivity.push({ path: req.path, timestamp: Date.now(), suspicious: true });

        const suspiciousCount = ipActivity.filter(a => a.suspicious).length;
        if (suspiciousCount >= 15) {
            blockedIPs.add(ip);
            return res.status(403).json({ error: 'Tu IP ha sido bloqueada por múltiples intentos sospechosos.' });
        }
    }

    // Detectar anomalías de tráfico (solo alertar)
    const trafficDetection = detectTrafficAnomaly(ip);
    if (trafficDetection.detected) {
        sendAlert({
            type: trafficDetection.type,
            severity: 'MEDIUM',
            ip,
            user,
            details: trafficDetection.details,
            action: 'LOGGED'
        }).catch(err => console.error('Error in traffic alert background:', err));
    }

    next();
};

// Limpiar IPs bloqueadas al iniciar para dar margen en desarrollo
blockedIPs.clear();
suspiciousIPs.clear();
console.log('🛡️  IDS: Filtros de seguridad inicializados y lista blanca activa para LAN.');

// =============================================
// FUNCIONES DE GESTIÓN
// =============================================

export function unblockIP(ip) {
    blockedIPs.delete(ip);
    suspiciousIPs.delete(ip);
    activityLog.delete(ip);
    console.log(`IP desbloqueada: ${ip}`);
}

export function getBlockedIPs() {
    return Array.from(blockedIPs);
}

export function getSuspiciousIPs() {
    return Array.from(suspiciousIPs);
}

export async function getSecurityReport() {
    try {
        const result = await pool.query(`
      SELECT 
        event_type,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM security_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY event_type
      ORDER BY count DESC
    `);

        return {
            last24Hours: result.rows,
            blockedIPs: getBlockedIPs(),
            suspiciousIPs: getSuspiciousIPs(),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error generating security report:', error.message);
        return {
            last24Hours: [],
            blockedIPs: getBlockedIPs(),
            suspiciousIPs: getSuspiciousIPs(),
            timestamp: new Date().toISOString()
        };
    }
}

// Exportar sendAlert como named export
export { sendAlert };

export default {
    detectSuspiciousPattern,
    detectTrafficAnomaly,
    intrusionDetectionMiddleware,
    sendAlert,
    unblockIP,
    getBlockedIPs,
    getSuspiciousIPs,
    getSecurityReport
};
