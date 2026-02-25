import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pool from './config/database.js';
import logger from './utils/logger.js';
import {
  errorHandler,
  notFoundHandler,
  setupUncaughtHandlers,
  requestLogger,
  healthCheck
} from './middleware/errorHandler.js';
import { iniciarCronNotificaciones, inicializarTablaNotificaciones, procesarNotificaciones, setIo } from './services/notificacionesService.js';
import { getLocalIPs } from './utils/network.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import alumnosRoutes from './routes/alumnos.js';
import maestrosRoutes from './routes/maestros.js';
import gruposRoutes from './routes/grupos.js';
import inscripcionesRoutes from './routes/inscripciones.js';
import periodosRoutes from './routes/periodos.js';
import pagosRoutes from './routes/pagos.js';
import calificacionesRoutes from './routes/calificaciones.js';
import asistenciasRoutes from './routes/asistencias.js';
import nivelesRoutes from './routes/niveles.js';
import reportesRoutes from './routes/reportes.js';
import dashboardRoutes from './routes/dashboard.js';
import maestrosDashboardRoutes from './routes/maestros-dashboard.js';
import maestrosAlumnosRoutes from './routes/maestros-alumnos.js';
import uploadRoutes from './routes/upload.js';
import notificacionesRoutes from './routes/notificaciones.js';
import metricasRoutes from './routes/metricas.js';
import asistenteRoutes from './routes/asistente.js';
import iaRoutes from './routes/ia.js';
import iaRolesRoutes from './routes/ia-roles.js';
import modelosIARoutes from './routes/modelos-ia.js';
import auditoriaRoutes from './routes/auditoria.js';
import twoFactorRoutes from './routes/two-factor.js';
import intelligenceRoutes from './routes/intelligence.js';
import searchRoutes from './routes/search.js';
import chatRoutes from './routes/chat.js';
import { procesarMensajeConIA } from './services/chatIAService.js';
import metricsScheduler from './services/metricsScheduler.js';

// Importar middlewares de seguridad
import {
  sanitizeInput,
  securityLogger,
  securityHeaders,
  detectAnomalies
} from './middleware/security.js';

// Importar sistema de detección de intrusos
import { intrusionDetectionMiddleware } from './services/intrusionDetection.js';

// Importar middleware anti-spam y seguridad de sesión
import antiSpamMiddleware from './middleware/antiSpam.js';
import sessionSecurity from './middleware/sessionSecurity.js';

// Importar validación de reglas de negocio
import validateBusinessRules from './middleware/businessRules.js';

// Importar dashboard de seguridad
import securityDashboardRoutes from './routes/security-dashboard.js';
import securityTestRoutes from './routes/security-test.js';

// Importar sistema de mantenimiento automático
import { runAutoMaintenance, maintenanceMiddleware } from './utils/autoMaintenance.js';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const httpServer = createServer(app);
const networkIPs = getLocalIPs();
const commonOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://coordinacion-tescha.local',
  ...networkIPs.map(ip => `http://${ip}`),
  ...networkIPs.map(ip => `http://${ip}:3000`),
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: commonOrigins,
    credentials: true
  }
});

// Hacer io disponible globalmente para las rutas y servicios
app.set('io', io);
global.io = io;
setIo(io);

// Configurar trust proxy para que funcione con X-Forwarded-For
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// 🛡️ SEGURIDAD: Rate Limiting - Prevenir ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10000, // Aumentado a 10,000 para evitar bloqueos en uso intensivo
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos',
  standardHeaders: true,
  legacyHeaders: false,
  // 🏠 WHITELIST: Saltear rate limit para red local y coordinadores
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress || '';
    return (
      ip === '::1' || 
      ip === '127.0.0.1' || 
      ip.includes('127.0.0.1') ||
      ip.includes('192.168.') || 
      ip.includes('10.') || 
      ip.includes('172.16.') ||
      ip.includes('localhost') ||
      req.hostname?.endsWith('.local')
    );
  }
});

// Rate limiter específico para login (más restrictivo)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos de login en 15 minutos
  message: 'Demasiados intentos de inicio de sesión, intenta de nuevo en 15 minutos',
  skipSuccessfulRequests: true, // No contar requests exitosos
});

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (commonOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // En desarrollo permitir todo, en prod commonOrigins
    }
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(requestLogger); // 📝 Logging de todas las requests
app.use(express.json({ limit: '10mb' })); // Limitar tamaño de payload
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// � Servir archivos estáticos de uploads ANTES de forzar JSON headers
app.use('/api/uploads', express.static(join(__dirname, 'uploads')));

// �🔤 Asegurar encoding UTF-8 en respuestas API (excepto para archivos/uploads)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/uploads')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');    res.setHeader('Accept-Charset', 'utf-8');  }
  next();
});

// 🔒 SEGURIDAD: Prevenir Parameter Pollution
// Si hay parámetros duplicados, solo usar el primero
app.use((req, res, next) => {
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (Array.isArray(req.query[key])) {
        req.query[key] = req.query[key][0]; // Solo el primer valor
      }
    });
  }
  next();
});

app.use(limiter); // Aplicar rate limiting global

// 🛡️ SEGURIDAD AVANZADA: Middlewares de protección
app.use(sanitizeInput);      // Sanitizar todos los inputs (XSS protection)
app.use(securityLogger);     // Logging de eventos de seguridad
app.use(securityHeaders);    // Headers de seguridad adicionales
app.use(detectAnomalies);    // Detección de comportamiento sospechoso
app.use(intrusionDetectionMiddleware); // 🚨 Sistema de Detección de Intrusos (IDS)
app.use(antiSpamMiddleware); // 🛑 Protección anti-spam y anti-bot
app.use(sessionSecurity.validateSession); // 🔐 Validación de sesión mejorada
app.use(sessionSecurity.detectMultipleSessions); // 👥 Detectar sesiones múltiples
app.use(sessionSecurity.detectAnomalousActivity); // 🕵️ Detectar actividad anómala
app.use(validateBusinessRules); // ✅ Validar reglas de negocio

// Rutas públicas
app.get('/', (req, res) => {
  res.json({
    message: 'API TESCHA - Sistema de Coordinación de Inglés',
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', healthCheck);

// Rutas de la API
// Login con rate limiting más restrictivo
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/alumnos', alumnosRoutes);
app.use('/api/maestros', maestrosRoutes);
app.use('/api/grupos', gruposRoutes);
app.use('/api/inscripciones', inscripcionesRoutes);
app.use('/api/periodos', periodosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/asistencias', asistenciasRoutes);
app.use('/api/niveles', nivelesRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/maestros-dashboard', maestrosDashboardRoutes);
app.use('/api/maestros-alumnos', maestrosAlumnosRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/metricas', metricasRoutes);
app.use('/api/analisis', metricasRoutes); // Usa el mismo router para análisis
app.use('/api/asistente', asistenteRoutes); // 🤖 Asistente IA Contextual
app.use('/api/ia', iaRoutes); // 🤖 IA Predictiva y Análisis Inteligente
app.use('/api/ia-roles', iaRolesRoutes); // 🤖 IA para Maestros y Administrativos
app.use('/api/modelos-ia', modelosIARoutes); // 🤖 Gestión de Modelos Multi-IA
app.use('/api/security', securityDashboardRoutes); // 🔒 Dashboard de Seguridad
app.use('/api/security-test', securityTestRoutes); // 🧪 Pruebas de Seguridad
app.use('/api/auditoria', auditoriaRoutes); // 📋 Bitácora de Auditoría
app.use('/api/auth/2fa', twoFactorRoutes); // 🔐 Autenticación de Dos Factores (2FA)
app.use('/api/intelligence', intelligenceRoutes); // 🧠 Business Intelligence (KPIs)
app.use('/api/search', searchRoutes); // 🔍 Búsqueda Global (Command Palette)
app.use('/api/chat', chatRoutes); // 💬 Chat y Comunicación Interna

// Manejar rutas no encontradas
app.use(notFoundHandler);

// Manejo de errores
app.use(errorHandler);

// Configurar manejadores de errores no capturados
setupUncaughtHandlers();

// Configurar Socket.io para tiempo real
io.on('connection', (socket) => {
  logger.info(`Cliente conectado: ${socket.id}`);
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // Cuando un usuario se conecta, marcar como online
  socket.on('user:online', async (userId) => {
    try {
      socket.userId = userId;
      await pool.query(
        'UPDATE usuarios SET is_online = true, status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
        ['online', userId]
      );
      // Notificar a todos los usuarios conectados
      io.emit('user:status_changed', { userId, isOnline: true, status: 'online' });
      logger.info(`Usuario ${userId} ahora está online`);
    } catch (error) {
      logger.error('Error al actualizar estado online:', error);
    }
  });

  // Cambiar estado de presencia manualmente
  socket.on('user:change_status', async (data) => {
    const { userId, status } = data;
    try {
      const validStatuses = ['online', 'away', 'busy', 'dnd', 'offline'];
      if (!validStatuses.includes(status)) {
        logger.error(`Estado inválido: ${status}`);
        return;
      }
      
      await pool.query(
        'UPDATE usuarios SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
        [status, userId]
      );
      
      // Notificar a todos los usuarios
      io.emit('user:status_changed', { 
        userId, 
        isOnline: status !== 'offline', 
        status,
        lastSeen: new Date()
      });
      logger.info(`Usuario ${userId} cambió su estado a: ${status}`);
    } catch (error) {
      logger.error('Error al cambiar estado:', error);
    }
  });

  // Heartbeat para mantener conexión activa
  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', async () => {
    logger.info(`Cliente desconectado: ${socket.id}`);
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
    
    // Marcar usuario como offline
    if (socket.userId) {
      try {
        await pool.query(
          'UPDATE usuarios SET is_online = false, status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
          ['offline', socket.userId]
        );
        // Notificar a todos los usuarios conectados
        io.emit('user:status_changed', { userId: socket.userId, isOnline: false, status: 'offline', lastSeen: new Date() });
        logger.info(`Usuario ${socket.userId} ahora está offline`);
      } catch (error) {
        logger.error('Error al actualizar estado offline:', error);
      }
    }
  });

  // Manejo de errores en socket
  socket.on('error', (error) => {
    logger.error(`Error en socket ${socket.id}:`, error);
    console.error(`❌ Error en socket ${socket.id}:`, error);
  });

  // --- LOGICA DE CHAT ---
  socket.on('chat:join', (sala_id) => {
    socket.join(sala_id);
    logger.info(`Socket ${socket.id} se unió a la sala: ${sala_id}`);
  });

  socket.on('chat:message', async (data) => {
    const { emisor_id, mensaje, sala_id, receptor_id, emisor_nombre, emisor_rol, metadata } = data;
    
    try {
      // Guardar en DB con estado inicial 'enviado'
      const result = await pool.query(`
        INSERT INTO chat_mensajes (emisor_id, receptor_id, sala_id, mensaje, metadata, estado)
        VALUES ($1, $2, $3, $4, $5, 'enviado')
        RETURNING *
      `, [emisor_id, receptor_id || null, sala_id, mensaje, metadata || {}]);

      const nuevoMensaje = {
        ...result.rows[0],
        emisor_nombre,
        emisor_rol
      };

      // Emitir a los demás en la sala
      io.to(sala_id).emit('chat:message', nuevoMensaje);

      // Si el receptor está online, marcar como 'entregado'
      if (receptor_id) {
        const receptorOnline = await pool.query(
          'SELECT is_online FROM usuarios WHERE id = $1',
          [receptor_id]
        );
        if (receptorOnline.rows[0]?.is_online) {
          await pool.query(
            'UPDATE chat_mensajes SET estado = $1 WHERE id = $2',
            ['entregado', result.rows[0].id]
          );
          // Notificar al emisor del cambio de estado
          io.emit('chat:message_status', { 
            messageId: result.rows[0].id, 
            estado: 'entregado', 
            sala_id 
          });
        }
      }

      // 🧠 PROCESAR CON IA EN BACKGROUND (en corto como pidió el usuario)
      setImmediate(() => {
        procesarMensajeConIA(mensaje, emisor_id, sala_id, io);
      });

    } catch (err) {
      console.error('Error al procesar mensaje de chat:', err);
    }
  });

  // Evento para marcar mensajes como leídos
  socket.on('chat:mark_read', async (data) => {
    const { messageIds, sala_id } = data;
    try {
      await pool.query(
        'UPDATE chat_mensajes SET leido = true, estado = $1 WHERE id = ANY($2)',
        ['leido', messageIds]
      );
      // Notificar al emisor que sus mensajes fueron leídos
      io.to(sala_id).emit('chat:messages_read', { messageIds, sala_id });
    } catch (error) {
      logger.error('Error al marcar mensajes como leídos:', error);
    }
  });

  socket.on('chat:typing', (data) => {
    socket.to(data.sala_id).emit('chat:typing', data);
  });
});

// Iniciar servidor
httpServer.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Servidor iniciado en puerto ${PORT}`);
  logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);

  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Acceso local: http://localhost:${PORT}`);
  
  if (networkIPs.length > 0) {
    console.log('🏠 Acceso en red detectado:');
    networkIPs.forEach(ip => {
      console.log(`   → http://${ip}:${PORT}`);
    });
  }
  
  console.log(`🌍 Dominio local: http://coordinacion-tescha.local:${PORT}`);

  // Inicializar sistema de notificaciones (Solo creación de tabla)
  await inicializarTablaNotificaciones();
  
  // NOTA: El cron de recordatorios y el envío automático se han movido 
  // al proceso independiente 'tescha-recordatorios' en PM2 para evitar duplicados.

  // Inicializar scheduler de métricas
  metricsScheduler.start();
  logger.info('Sistema de métricas automáticas activo');
  console.log('📊 Sistema de métricas automáticas activo');

  // Ejecutar mantenimiento inicial (después de 5 segundos)
  setTimeout(() => {
    runAutoMaintenance();
  }, 5000);
  logger.info('Sistema de mantenimiento automático activo');
  console.log('🔧 Sistema de mantenimiento automático activo');
  console.log('   → Verifica duplicados cada 10 minutos');
  console.log('   → Limpia referencias huérfanas automáticamente');
  console.log('   → Refresca vistas materializadas cada 5 minutos');

  logger.info('✅ Sistema TESCHA completamente inicializado');
});

export default app;
