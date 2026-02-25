import { useAuth } from '../context/AuthContext';

/**
 * Hook para verificar permisos del usuario actual
 */
export const usePermissions = () => {
  const { user } = useAuth();

  // Definición de permisos por rol
  const PERMISOS = {
    coordinador: {
      alumnos: { ver: true, crear: true, editar: true, eliminar: true },
      maestros: { ver: true, crear: true, editar: true, eliminar: true },
      grupos: { ver: true, crear: true, editar: true, eliminar: true },
      inscripciones: { ver: true, crear: true, editar: true, eliminar: true },
      pagos: { ver: true, crear: true, editar: true, eliminar: true },
      calificaciones: { ver: true, crear: true, editar: true, eliminar: true },
      asistencias: { ver: true, crear: true, editar: true, eliminar: true },
      periodos: { ver: true, crear: true, editar: true, eliminar: true },
      reportes: { ver: true, crear: true, editar: true, eliminar: true },
      dashboard: { ver: true, crear: true, editar: true, eliminar: true },
      usuarios: { ver: true, crear: true, editar: true, eliminar: true },
    },
    maestro: {
      alumnos: { ver: true, crear: false, editar: false, eliminar: false },
      grupos: { ver: true, crear: false, editar: false, eliminar: false },
      calificaciones: { ver: true, crear: true, editar: true, eliminar: false },
      asistencias: { ver: true, crear: true, editar: true, eliminar: false },
      dashboard: { ver: true, crear: false, editar: false, eliminar: false },
      pagos: { ver: false, crear: false, editar: false, eliminar: false },
      reportes: { ver: false, crear: false, editar: false, eliminar: false },
      inscripciones: { ver: false, crear: false, editar: false, eliminar: false },
      maestros: { ver: false, crear: false, editar: false, eliminar: false },
      periodos: { ver: false, crear: false, editar: false, eliminar: false },
      usuarios: { ver: false, crear: false, editar: false, eliminar: false },
    },
    administrativo: {
      pagos: { ver: true, crear: false, editar: false, eliminar: false },
      reportes: { ver: true, crear: false, editar: false, eliminar: false },
      dashboard: { ver: true, crear: false, editar: false, eliminar: false },
      alumnos: { ver: true, crear: false, editar: false, eliminar: false },
      inscripciones: { ver: true, crear: false, editar: false, eliminar: false },
      grupos: { ver: false, crear: false, editar: false, eliminar: false },
      maestros: { ver: false, crear: false, editar: false, eliminar: false },
      calificaciones: { ver: false, crear: false, editar: false, eliminar: false },
      asistencias: { ver: false, crear: false, editar: false, eliminar: false },
      periodos: { ver: false, crear: false, editar: false, eliminar: false },
      usuarios: { ver: false, crear: false, editar: false, eliminar: false },
    },
  };

  /**
   * Verificar si el usuario puede realizar una acción en un módulo
   * @param {string} modulo - Nombre del módulo (alumnos, grupos, etc.)
   * @param {string} accion - Acción a verificar (ver, crear, editar, eliminar)
   * @returns {boolean}
   */
  const can = (modulo, accion = 'ver') => {
    if (!user || !user.rol) return false;
    
    const permisos = PERMISOS[user.rol];
    if (!permisos || !permisos[modulo]) return false;
    
    return permisos[modulo][accion] === true;
  };

  /**
   * Verificar si el usuario tiene alguno de los roles especificados
   * @param {...string} roles - Roles a verificar
   * @returns {boolean}
   */
  const hasRole = (...roles) => {
    if (!user || !user.rol) return false;
    return roles.includes(user.rol);
  };

  /**
   * Verificar si es coordinador (admin)
   * @returns {boolean}
   */
  const isCoordinador = () => hasRole('coordinador');

  /**
   * Verificar si es maestro
   * @returns {boolean}
   */
  const isMaestro = () => hasRole('maestro');

  /**
   * Verificar si es administrativo
   * @returns {boolean}
   */
  const isAdministrativo = () => hasRole('administrativo');

  return {
    can,
    hasRole,
    isCoordinador,
    isMaestro,
    isAdministrativo,
    rol: user?.rol
  };
};
