import logger from '../utils/logger.js';

/**
 * MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
 * Captura todos los errores y evita que el servidor se caiga
 */

// Middleware para capturar errores asíncronos
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Async error caught', {
        path: req.path,
        method: req.method,
        error: error.message,
        stack: error.stack,
        user: req.user?.username
      });
      next(error);
    });
  };
};

// Middleware de manejo de errores principal
export const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error('Error handled by global error handler', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
    user: req.user?.username,
    body: req.body,
    query: req.query
  });

  // Determinar código de estado
  const statusCode = err.statusCode || err.status || 500;

  // Respuesta al cliente
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Ha ocurrido un error. Por favor intenta de nuevo.'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware para rutas no encontradas
export const notFoundHandler = (req, res, next) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path
  });
};

// Manejador de errores no capturados
export const setupUncaughtHandlers = () => {
  // Errores no capturados
  process.on('uncaughtException', (error) => {
    logger.error('UNCAUGHT EXCEPTION - Sistema en riesgo', {
      error: error.message,
      stack: error.stack
    });

    // Dar tiempo para que se escriban los logs
    setTimeout(() => {
      console.error('💥 UNCAUGHT EXCEPTION - Reiniciando proceso...');
      process.exit(1); // PM2 o nodemon reiniciará automáticamente
    }, 1000);
  });

  // Promesas rechazadas no manejadas
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED REJECTION - Promesa rechazada', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });

    // No salir del proceso, solo loguear
    console.error('⚠️  UNHANDLED REJECTION detectado y logueado');
  });

  // Señal de terminación
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received - Cerrando servidor gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received - Cerrando servidor gracefully');
    process.exit(0);
  });
};

// Middleware de logging de requests
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Capturar cuando la respuesta termine
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req, res, duration);
  });

  next();
};

// Middleware de health check
export const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
};

export default {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  setupUncaughtHandlers,
  requestLogger,
  healthCheck
};
