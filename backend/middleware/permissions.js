import pool from '../config/database.js';

/**
 * Obtener permisos de un rol para un módulo específico
 */
export const getPermisos = async (rol, modulo) => {
  try {
    const result = await pool.query(
      'SELECT * FROM permisos_rol WHERE rol = $1 AND modulo = $2',
      [rol, modulo]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    return null;
  }
};

/**
 * Middleware: Verificar que el usuario tenga un rol específico
 */
export const requireRole = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        mensaje: `Se requiere rol: ${rolesPermitidos.join(' o ')}`
      });
    }

    next();
  };
};

/**
 * Middleware: Verificar permisos específicos para una acción
 */
export const checkPermission = (modulo, accion) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Coordinador siempre tiene acceso total
    if (req.user.rol === 'coordinador') {
      return next();
    }

    // Obtener permisos del rol
    const permisos = await getPermisos(req.user.rol, modulo);

    if (!permisos) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        mensaje: `No tienes acceso al módulo: ${modulo}`
      });
    }

    // Verificar acción específica
    const tienePermiso = {
      'ver': permisos.puede_ver,
      'crear': permisos.puede_crear,
      'editar': permisos.puede_editar,
      'eliminar': permisos.puede_eliminar
    }[accion];

    if (!tienePermiso) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        mensaje: `No tienes permiso para ${accion} en ${modulo}`
      });
    }

    next();
  };
};

/**
 * Middleware: Filtrar datos según rol
 * Los maestros solo ven sus propios datos
 */
export const filterByRole = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  // Si es maestro, agregar filtro de maestro_id
  if (req.user.rol === 'maestro') {
    req.maestroFilter = { maestro_id: req.user.maestro_id };
  }

  next();
};

export default {
  requireRole,
  checkPermission,
  filterByRole,
  getPermisos
};
