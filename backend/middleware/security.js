import crypto from 'crypto';
import pool from '../config/database.js';

/**
 * Middleware de seguridad avanzado
 * Incluye protección CSRF, sanitización, rate limiting por usuario, etc.
 */

// =============================================
// PROTECCIÓN CSRF (Cross-Site Request Forgery)
// =============================================

const csrfTokens = new Map(); // En producción, usar Redis

export const generateCsrfToken = (req, res, next) => {
    const token = crypto.randomBytes(32).toString('hex');
    const userId = req.user?.id || req.ip;

    csrfTokens.set(userId, {
        token,
        expires: Date.now() + 3600000 // 1 hora
    });

    res.locals.csrfToken = token;
    next();
};

export const verifyCsrfToken = (req, res, next) => {
    // Solo verificar en métodos que modifican datos
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const token = req.header('X-CSRF-Token') || req.body._csrf;
    const userId = req.user?.id || req.ip;

    const storedToken = csrfTokens.get(userId);

    if (!storedToken || storedToken.expires < Date.now()) {
        csrfTokens.delete(userId);
        return res.status(403).json({ error: 'Token CSRF expirado o inválido' });
    }

    if (storedToken.token !== token) {
        return res.status(403).json({ error: 'Token CSRF inválido' });
    }

    next();
};

// =============================================
// SANITIZACIÓN DE INPUTS
// =============================================

export const sanitizeInput = (req, res, next) => {
    // 🏠 WHITELIST: Saltear sanitización pesada para IPs locales/confiables
    const ip = req.ip;
    const isTrustedIP = 
        ip === '::1' || 
        ip === '127.0.0.1' || 
        ip.includes('127.0.0.1') ||
        ip.includes('192.168.') || 
        ip.includes('10.') || 
        ip.includes('172.16.') ||
        ip.includes('localhost') ||
        req.hostname?.endsWith('.local');

    if (isTrustedIP) return next();

    const sanitize = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            if (typeof obj === 'string') {
                return obj
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .trim();
            }
            return obj;
        }

        const sanitized = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            sanitized[key] = sanitize(obj[key]);
        }
        return sanitized;
    };

    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);

    next();
};

// =============================================
// LOGGING DE SEGURIDAD
// =============================================

export const securityLogger = async (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
        // Loggear eventos de seguridad importantes
        if (res.statusCode === 401 || res.statusCode === 403) {
            logSecurityEvent({
                type: res.statusCode === 401 ? 'UNAUTHORIZED_ACCESS' : 'FORBIDDEN_ACCESS',
                userId: req.user?.id || null,
                ip: req.ip,
                path: req.path,
                method: req.method,
                userAgent: req.get('user-agent'),
                timestamp: new Date()
            });
        }

        originalSend.call(this, data);
    };

    next();
};

async function logSecurityEvent(event) {
    try {
        await pool.query(
            `INSERT INTO security_logs (event_type, user_id, ip_address, path, method, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [event.type, event.userId, event.ip, event.path, event.method, event.userAgent, event.timestamp]
        );
    } catch (error) {
        console.error('Error logging security event:', error);
    }
}

// =============================================
// BLOQUEO DE CUENTA POR INTENTOS FALLIDOS
// =============================================

const loginAttempts = new Map(); // En producción, usar Redis

export const trackLoginAttempts = async (req, res, next) => {
    const { username } = req.body;
    const ip = req.ip;
    const key = `${username}:${ip}`;

    // Verificar intentos en base de datos
    try {
        const result = await pool.query(
            `SELECT COUNT(*) as attempts FROM login_attempts 
       WHERE username = $1 AND ip_address = $2 
       AND attempt_time > NOW() - INTERVAL '1 hour'`,
            [username, ip]
        );

        const attempts = parseInt(result.rows[0].attempts);

        if (attempts >= 10) {
            // Alerta para desarrollo/monitoreo
            console.warn(`⚠️  ALERTA DE SEGURIDAD: ${attempts} intentos fallidos para ${username} desde ${ip}`);
            
            return res.status(429).json({
                error: 'Demasiados intentos fallidos. Por seguridad, tu cuenta ha sido bloqueada temporalmente.',
                detalles: 'Contacta al administrador si necesitas ayuda.',
                intentos: attempts,
                tiempo_bloqueo: '1 hora'
            });
        }

        // Advertencia cuando se acerque al límite
        if (attempts >= 5) {
            console.warn(`⚠️  Advertencia: ${attempts}/10 intentos fallidos para ${username} desde ${ip}`);
        }

        req.loginAttempts = attempts;
        next();
    } catch (error) {
        console.error('Error tracking login attempts:', error);
        next();
    }
};

export const recordFailedLogin = async (username, ip) => {
    try {
        await pool.query(
            `INSERT INTO login_attempts (username, ip_address) VALUES ($1, $2)`,
            [username, ip]
        );
    } catch (error) {
        console.error('Error recording failed login:', error);
    }
};

export const clearLoginAttempts = async (username, ip) => {
    try {
        await pool.query(
            `DELETE FROM login_attempts WHERE username = $1 AND ip_address = $2`,
            [username, ip]
        );
    } catch (error) {
        console.error('Error clearing login attempts:', error);
    }
};

// =============================================
// VALIDACIÓN DE PROPIEDAD DE RECURSOS (IDOR Protection)
// =============================================

export const validateResourceOwnership = (resourceType) => {
    return async (req, res, next) => {
        const resourceId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.rol;

        // Coordinadores tienen acceso a todo
        if (userRole === 'coordinador') {
            return next();
        }

        try {
            let isOwner = false;

            switch (resourceType) {
                case 'alumno':
                    const alumnoResult = await pool.query(
                        'SELECT usuario_id FROM alumnos WHERE id = $1',
                        [resourceId]
                    );
                    isOwner = alumnoResult.rows[0]?.usuario_id === userId;
                    break;

                case 'maestro':
                    const maestroResult = await pool.query(
                        'SELECT usuario_id FROM maestros WHERE id = $1',
                        [resourceId]
                    );
                    isOwner = maestroResult.rows[0]?.usuario_id === userId;
                    break;

                case 'grupo':
                    if (userRole === 'maestro') {
                        const grupoResult = await pool.query(
                            `SELECT g.id FROM grupos g
               JOIN maestros m ON g.maestro_id = m.id
               WHERE g.id = $1 AND m.usuario_id = $2`,
                            [resourceId, userId]
                        );
                        isOwner = grupoResult.rows.length > 0;
                    }
                    break;

                default:
                    return res.status(400).json({ error: 'Tipo de recurso no válido' });
            }

            if (!isOwner) {
                return res.status(403).json({
                    error: 'No tienes permiso para acceder a este recurso'
                });
            }

            next();
        } catch (error) {
            console.error('Error validating resource ownership:', error);
            res.status(500).json({ error: 'Error al validar permisos' });
        }
    };
};

// =============================================
// HEADERS DE SEGURIDAD ADICIONALES
// =============================================

export const securityHeaders = (req, res, next) => {
    // Prevenir clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevenir MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection (legacy pero útil)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
};

// =============================================
// DETECCIÓN DE ANOMALÍAS
// =============================================

const requestPatterns = new Map(); // En producción, usar Redis

export const detectAnomalies = (req, res, next) => {
    const ip = req.ip;
    const isTrustedIP = 
        ip === '::1' || 
        ip === '127.0.0.1' || 
        ip.includes('127.0.0.1') ||
        ip.includes('192.168.') || 
        ip.includes('10.') || 
        ip.includes('172.16.') ||
        ip.includes('localhost') ||
        req.hostname?.endsWith('.local');

    if (isTrustedIP) return next();

    const userId = req.user?.id || ip;
    const now = Date.now();
    const windowMs = 60000; // 1 minuto

    if (!requestPatterns.has(userId)) {
        requestPatterns.set(userId, []);
    }

    const patterns = requestPatterns.get(userId);

    // Limpiar patrones antiguos
    const recentPatterns = patterns.filter(p => now - p.timestamp < windowMs);

    // Agregar nuevo patrón
    recentPatterns.push({
        path: req.path,
        method: req.method,
        timestamp: now
    });

    requestPatterns.set(userId, recentPatterns);

    // Detectar comportamiento sospechoso (Aumentado a 1000 para soportar Dashboard intensivo)
    if (recentPatterns.length > 1000) {
        console.warn(`⚠️ Comportamiento sospechoso detectado (POSIBLE SCRAPING): ${userId} - ${recentPatterns.length} requests en 1 minuto`);

        logSecurityEvent({
            type: 'SUSPICIOUS_ACTIVITY',
            userId: req.user?.id || null,
            ip: req.ip,
            path: req.path,
            method: req.method,
            userAgent: req.get('user-agent'),
            timestamp: new Date()
        });
    }

    next();
};

// =============================================
// ENCRIPTACIÓN DE DATOS SENSIBLES
// =============================================

// IMPORTANTE: ENCRYPTION_KEY debe ser un hex de 32 bytes (64 chars)
// Generarlo con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('ENCRYPTION_KEY no está definida. El servidor no puede iniciar en producción sin ella.');
}

const _rawKey = process.env.ENCRYPTION_KEY;
let ENCRYPTION_KEY;
if (_rawKey) {
  // Aceptar tanto hex (64 chars) como string libre (se hashea a 32 bytes)
  ENCRYPTION_KEY = _rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(_rawKey)
    ? Buffer.from(_rawKey, 'hex')
    : crypto.createHash('sha256').update(_rawKey).digest();
} else {
  // Solo en desarrollo local: clave fija para no romper reinicios
  ENCRYPTION_KEY = crypto.createHash('sha256').update('tescha-dev-key-local-no-usar-en-prod').digest();
}

const ALGORITHM = 'aes-256-gcm';

export function encryptData(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

export function decryptData(encrypted, iv, authTag) {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        ENCRYPTION_KEY,
        Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

// =============================================
// EXPORTAR TODOS LOS MIDDLEWARES
// =============================================

export default {
    generateCsrfToken,
    verifyCsrfToken,
    sanitizeInput,
    securityLogger,
    trackLoginAttempts,
    recordFailedLogin,
    clearLoginAttempts,
    validateResourceOwnership,
    securityHeaders,
    detectAnomalies,
    encryptData,
    decryptData
};
