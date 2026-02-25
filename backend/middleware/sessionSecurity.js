/**
 * Middleware de seguridad de sesión avanzado
 * Previene secuestro de sesión y accesos no autorizados
 */

import crypto from 'crypto';
import pool from '../config/database.js';

// Almacenamiento temporal de sesiones activas (usar Redis en producción)
const activeSessions = new Map();
const sessionFingerprints = new Map();

/**
 * Genera fingerprint del cliente para detectar cambios sospechosos
 */
const generateFingerprint = (req) => {
  const components = [
    req.get('user-agent') || '',
    req.get('accept-language') || '',
    req.ip
  ];
  
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
};

/**
 * Valida que la sesión no haya sido comprometida
 */
export const validateSession = async (req, res, next) => {
  // Solo validar en rutas autenticadas
  if (!req.user) {
    return next();
  }

  const userId = req.user.id;
  const sessionToken = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return next();
  }

  // Generar fingerprint actual
  const currentFingerprint = generateFingerprint(req);

  // Obtener fingerprint almacenado
  const storedFingerprint = sessionFingerprints.get(sessionToken);

  // Primera vez que vemos esta sesión
  if (!storedFingerprint) {
    sessionFingerprints.set(sessionToken, currentFingerprint);
    activeSessions.set(sessionToken, {
      userId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      createdAt: Date.now(),
      lastActivity: Date.now()
    });
    return next();
  }

  // Verificar si el fingerprint cambió (posible secuestro de sesión)
  if (storedFingerprint !== currentFingerprint) {
    console.error(`🚨 ALERTA: Posible secuestro de sesión detectado`);
    console.error(`Usuario: ${userId}, IP: ${req.ip}`);
    
    // Registrar evento de seguridad
    await logSecurityEvent({
      type: 'SESSION_HIJACK_ATTEMPT',
      userId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        expectedFingerprint: storedFingerprint,
        actualFingerprint: currentFingerprint
      }
    });

    // Invalidar sesión
    sessionFingerprints.delete(sessionToken);
    activeSessions.delete(sessionToken);

    return res.status(401).json({
      error: 'Sesión inválida detectada. Por favor, inicia sesión nuevamente.',
      code: 'SESSION_HIJACK_DETECTED'
    });
  }

  // Actualizar última actividad
  const session = activeSessions.get(sessionToken);
  if (session) {
    session.lastActivity = Date.now();
    activeSessions.set(sessionToken, session);
  }

  next();
};

/**
 * Detecta múltiples sesiones activas simultáneas sospechosas
 */
export const detectMultipleSessions = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const userId = req.user.id;
  const userAgent = req.get('user-agent');
  const ip = req.ip;

  // Buscar todas las sesiones activas del usuario
  const userSessions = Array.from(activeSessions.values())
    .filter(session => session.userId === userId);

  // Permitir hasta 3 sesiones simultáneas
  if (userSessions.length > 3) {
    console.warn(`⚠️ Usuario ${userId} tiene ${userSessions.length} sesiones activas`);
    
    await logSecurityEvent({
      type: 'MULTIPLE_ACTIVE_SESSIONS',
      userId,
      ip,
      userAgent,
      details: {
        sessionCount: userSessions.length,
        sessions: userSessions.map(s => ({
          ip: s.ip,
          userAgent: s.userAgent,
          createdAt: new Date(s.createdAt)
        }))
      }
    });
  }

  // Detectar sesiones desde IPs muy diferentes (posible compartir credenciales)
  const uniqueIPs = new Set(userSessions.map(s => s.ip));
  if (uniqueIPs.size > 2) {
    console.warn(`⚠️ Usuario ${userId} accediendo desde ${uniqueIPs.size} IPs diferentes`);
    
    await logSecurityEvent({
      type: 'MULTIPLE_IP_ACCESS',
      userId,
      ip,
      userAgent,
      details: {
        ips: Array.from(uniqueIPs)
      }
    });
  }

  next();
};

/**
 * Detecta cambios sospechosos en patrones de uso
 */
export const detectAnomalousActivity = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const userId = req.user.id;
  const now = new Date();
  const hour = now.getHours();

  // Detectar acceso en horarios inusuales (solo loguear en consola en desarrollo)
  if (hour >= 2 && hour <= 5) {
    console.warn(`🌙 Acceso en horario inusual: Usuario ${userId} a las ${hour}:${now.getMinutes()}`);
    /*
    await logSecurityEvent({
      type: 'UNUSUAL_HOUR_ACCESS',
      userId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        hour,
        path: req.path
      }
    });
    */
  }

  // Detectar cambios repentinos de ubicación (IP geográfica)
  // En producción, usar un servicio de geolocalización de IPs

  next();
};

/**
 * Invalida sesión al cambiar contraseña
 */
export const invalidateUserSessions = (userId) => {
  let invalidatedCount = 0;
  
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(token);
      sessionFingerprints.delete(token);
      invalidatedCount++;
    }
  }

  console.log(`🔒 Invalidadas ${invalidatedCount} sesiones del usuario ${userId}`);
  return invalidatedCount;
};

/**
 * Limpieza automática de sesiones expiradas
 */
setInterval(() => {
  const now = Date.now();
  const maxInactivity = 24 * 60 * 60 * 1000; // 24 horas
  let cleanedCount = 0;

  for (const [token, session] of activeSessions.entries()) {
    if (now - session.lastActivity > maxInactivity) {
      activeSessions.delete(token);
      sessionFingerprints.delete(token);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Limpiadas ${cleanedCount} sesiones inactivas`);
  }
}, 3600000); // Cada hora

/**
 * Registra eventos de seguridad en base de datos
 */
const logSecurityEvent = async (event) => {
  try {
    await pool.query(
      `INSERT INTO security_events 
       (event_type, user_id, ip_address, user_agent, details, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        event.type,
        event.userId,
        event.ip,
        event.userAgent,
        JSON.stringify(event.details)
      ]
    );
  } catch (error) {
    console.error('Error al registrar evento de seguridad (session):', error.message);
  }
};

/**
 * Endpoint para obtener sesiones activas del usuario
 */
export const getUserActiveSessions = (userId) => {
  return Array.from(activeSessions.values())
    .filter(session => session.userId === userId)
    .map(session => ({
      ip: session.ip,
      userAgent: session.userAgent,
      createdAt: new Date(session.createdAt),
      lastActivity: new Date(session.lastActivity)
    }));
};

export default {
  validateSession,
  detectMultipleSessions,
  detectAnomalousActivity,
  invalidateUserSessions,
  getUserActiveSessions
};
