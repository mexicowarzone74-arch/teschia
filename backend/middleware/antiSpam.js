/**
 * Middleware anti-spam y protección contra comportamiento malicioso
 * Detecta y previene intentos de abuso del sistema
 */

import pool from '../config/database.js';

// Almacenamiento en memoria para tracking (en producción usar Redis)
const userActions = new Map();
const ipActions = new Map();
const suspiciousActivity = new Map();

// Configuración
const LIMITS = {
  // Máximo de acciones idénticas en un período
  MAX_DUPLICATE_ACTIONS: 5,
  DUPLICATE_WINDOW: 30000, // 30 segundos
  
  // Máximo de errores consecutivos
  MAX_CONSECUTIVE_ERRORS: 10,
  ERROR_RESET_TIME: 60000, // 1 minuto
  
  // Velocidad de escritura (caracteres por segundo)
  MIN_TYPING_TIME: 100, // ms mínimo entre caracteres
  SUSPICIOUS_TYPING_SPEED: 10, // caracteres en menos de 100ms
  
  // Límite de requests por usuario (aumentado para evitar bloqueos en dashboard)
  MAX_REQUESTS_PER_MINUTE: 600,
  
  // Tiempo de bloqueo temporal
  TEMP_BLOCK_DURATION: 300000 // 5 minutos
};

/**
 * Verifica si la solicitud proviene de una fuente confiable (local)
 */
const isTrustedSource = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  return (
    ip === '::1' || 
    ip === '127.0.0.1' || 
    ip?.includes('127.0.0.1') ||
    ip?.includes('192.168.') || 
    ip?.includes('10.') || 
    ip?.includes('172.16.') ||
    ip?.includes('localhost') ||
    req.hostname?.endsWith('.local')
  );
};

/**
 * Detecta intentos de automatización o bots
 */
export const detectBot = (req, res, next) => {
  if (isTrustedSource(req)) return next();
  
  const userAgent = req.get('user-agent');
  const userId = req.user?.id;
  const ip = req.ip;

  // Detectar user-agents sospechosos
  const suspiciousAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /postman/i
  ];

  const isSuspicious = suspiciousAgents.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious && !req.path.includes('/api/')) {
    console.warn(`🤖 User-Agent sospechoso detectado: ${userAgent} desde ${ip}`);
    logSuspiciousActivity(userId || ip, 'SUSPICIOUS_USER_AGENT', {
      userAgent,
      path: req.path
    });
  }

  // Detectar ausencia de headers comunes en navegadores
  const hasCommonHeaders = 
    req.get('accept') && 
    req.get('accept-language') && 
    req.get('referer');

  if (!hasCommonHeaders && !req.path.includes('/health')) {
    console.warn(`📡 Headers inusuales detectados desde ${ip}`);
  }

  next();
};

/**
 * Previene acciones duplicadas rápidas (double-submit, spam)
 */
export const preventDuplicateActions = (req, res, next) => {
  // Solo aplicar a métodos que modifican datos y no es fuente confiable
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || isTrustedSource(req)) {
    return next();
  }

  const userId = req.user?.id || req.ip;
  const actionKey = `${req.method}:${req.path}:${JSON.stringify(req.body)}`;
  
  if (!userActions.has(userId)) {
    userActions.set(userId, []);
  }

  const actions = userActions.get(userId);
  const now = Date.now();

  // Limpiar acciones antiguas
  const recentActions = actions.filter(a => now - a.timestamp < LIMITS.DUPLICATE_WINDOW);
  
  // Buscar acciones idénticas recientes
  const duplicates = recentActions.filter(a => a.key === actionKey);

  if (duplicates.length >= LIMITS.MAX_DUPLICATE_ACTIONS) {
    console.warn(`🚨 Acción duplicada detectada: Usuario ${userId}, Acción: ${req.path}`);
    logSuspiciousActivity(userId, 'DUPLICATE_ACTION', {
      action: req.path,
      count: duplicates.length
    });

    return res.status(429).json({
      error: 'Demasiadas solicitudes idénticas. Por favor espera un momento.',
      retryAfter: Math.ceil((LIMITS.DUPLICATE_WINDOW - (now - duplicates[0].timestamp)) / 1000)
    });
  }

  // Registrar acción
  recentActions.push({ key: actionKey, timestamp: now });
  userActions.set(userId, recentActions);

  next();
};

/**
 * Detecta velocidad de escritura sospechosa
 */
export const detectSuspiciousTyping = (req, res, next) => {
  if (isTrustedSource(req)) return next();
  
  const typingSpeed = req.header('X-Typing-Speed');
  
  if (typingSpeed && parseInt(typingSpeed) < LIMITS.MIN_TYPING_TIME) {
    const userId = req.user?.id || req.ip;
    console.warn(`⚡ Velocidad de escritura sospechosa: Usuario ${userId}, Speed: ${typingSpeed}ms`);
    
    logSuspiciousActivity(userId, 'SUSPICIOUS_TYPING_SPEED', {
      speed: typingSpeed,
      path: req.path
    });
  }

  next();
};

/**
 * Limita requests por usuario por minuto
 */
export const rateLimitPerUser = (req, res, next) => {
  if (isTrustedSource(req)) return next();
  
  const userId = req.user?.id || req.ip;
  
  if (!ipActions.has(userId)) {
    ipActions.set(userId, []);
  }

  const actions = ipActions.get(userId);
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Limpiar acciones antiguas
  const recentActions = actions.filter(a => a > oneMinuteAgo);

  if (recentActions.length >= LIMITS.MAX_REQUESTS_PER_MINUTE) {
    console.warn(`🚨 Rate limit excedido: Usuario ${userId}, Requests: ${recentActions.length}/min`);
    
    logSuspiciousActivity(userId, 'RATE_LIMIT_EXCEEDED', {
      requestsPerMinute: recentActions.length
    });

    return res.status(429).json({
      error: 'Has excedido el límite de solicitudes. Intenta más tarde.',
      retryAfter: 60
    });
  }

  recentActions.push(now);
  ipActions.set(userId, recentActions);

  next();
};

/**
 * Registra actividad sospechosa
 */
const logSuspiciousActivity = async (identifier, activityType, details) => {
  if (!suspiciousActivity.has(identifier)) {
    suspiciousActivity.set(identifier, []);
  }

  const activities = suspiciousActivity.get(identifier);
  activities.push({
    type: activityType,
    details,
    timestamp: new Date()
  });

  // Si hay demasiada actividad sospechosa, considerar bloqueo temporal
  const recentSuspicious = activities.filter(
    a => Date.now() - a.timestamp.getTime() < 600000 // últimos 10 minutos
  );

  if (recentSuspicious.length >= 5) {
    console.error(`🔴 ALERTA: Usuario ${identifier} con múltiple actividad sospechosa`);
    // Aquí podrías implementar un bloqueo temporal o notificar a administradores
  }

  // Guardar en base de datos (SIN await para no bloquear)
  pool.query(
    `INSERT INTO security_events (identifier, event_type, details, created_at) 
     VALUES ($1, $2, $3, NOW())`,
    [identifier, activityType, JSON.stringify(details)]
  ).catch(err => console.error('Error al registrar actividad sospechosa:', err));
};

/**
 * Middleware completo anti-spam
 */
export const antiSpamMiddleware = [
  detectBot,
  rateLimitPerUser,
  preventDuplicateActions,
  detectSuspiciousTyping
];

/**
 * Limpiar datos antiguos periódicamente
 */
setInterval(() => {
  const now = Date.now();
  
  // Limpiar userActions
  for (const [userId, actions] of userActions.entries()) {
    const recentActions = actions.filter(a => now - a.timestamp < LIMITS.DUPLICATE_WINDOW);
    if (recentActions.length === 0) {
      userActions.delete(userId);
    } else {
      userActions.set(userId, recentActions);
    }
  }

  // Limpiar ipActions
  for (const [userId, actions] of ipActions.entries()) {
    const recentActions = actions.filter(a => now - a < 60000);
    if (recentActions.length === 0) {
      ipActions.delete(userId);
    } else {
      ipActions.set(userId, recentActions);
    }
  }

  // Limpiar suspiciousActivity
  for (const [identifier, activities] of suspiciousActivity.entries()) {
    const recentActivities = activities.filter(
      a => now - a.timestamp.getTime() < 3600000 // última hora
    );
    if (recentActivities.length === 0) {
      suspiciousActivity.delete(identifier);
    } else {
      suspiciousActivity.set(identifier, recentActivities);
    }
  }
}, 300000); // Cada 5 minutos

export default antiSpamMiddleware;
