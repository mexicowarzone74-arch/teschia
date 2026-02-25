import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaBell, FaUserCircle, FaSignOutAlt, FaQuestionCircle, FaKey, FaChevronDown, FaBars, FaUserEdit } from 'react-icons/fa';
import CambioPasswordModal from './CambioPasswordModal';
import ConfigurarPerfilModal from './ConfigurarPerfilModal';
import NotificacionesPanel from './NotificacionesPanel';
import { pagosService } from '../services/api';
import eventBus from '../utils/eventBus';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showConfigProfile, setShowConfigProfile] = useState(false);
  const [showNotificaciones, setShowNotificaciones] = useState(false);
  const [notificacionesCount, setNotificacionesCount] = useState(0);
  const profileMenuRef = useRef(null);

  // Cargar contador de notificaciones
  useEffect(() => {
    if (user?.rol === 'coordinador' || user?.rol === 'administrativo') {
      cargarContadorNotificaciones();
      
      // Actualizar cada 2 minutos
      const interval = setInterval(cargarContadorNotificaciones, 2 * 60 * 1000);
      
      // Escuchar eventos de actualización
      const handlePagosUpdate = () => cargarContadorNotificaciones();
      eventBus.on('pagos-updated', handlePagosUpdate);
      
      return () => {
        clearInterval(interval);
        eventBus.off('pagos-updated', handlePagosUpdate);
      };
    }
  }, [user]);

  const cargarContadorNotificaciones = async () => {
    try {
      const response = await pagosService.getEstadisticasFinancieras();
      const stats = response.data;
      let total = (stats.prorrogasVencidas || 0) + (stats.prorrogasPorVencer || 0);
      
      // Restar notificaciones ignoradas
      try {
        const ignorados = JSON.parse(localStorage.getItem('notificaciones_ignoradas') || '{}');
        const hoy = new Date().toISOString().split('T')[0];
        const ignoradosActivos = Object.values(ignorados).filter(fecha => fecha >= hoy).length;
        total = Math.max(0, total - ignoradosActivos);
      } catch (e) {
        console.error('Error al filtrar ignorados:', e);
      }
      
      setNotificacionesCount(total);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  };

  // Cerrar menú de perfil al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 md:py-4">
        {/* Botón de menú para móviles */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FaBars className="w-6 h-6" />
        </button>

        <div className="hidden sm:block">
          <h2 className="text-base sm:text-lg md:text-2xl font-semibold text-gray-800">
            Sistema de Coordinación de Inglés
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Tecnológico de Estudios Superiores de Chalco
          </p>
        </div>
        
        {/* Logo móvil */}
        <div className="sm:hidden flex-1 text-center">
          <h2 className="text-base font-bold text-tescha-blue">TESCHA</h2>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <button 
            onClick={() => setShowHelp(true)}
            className="relative p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            title="Ayuda"
          >
            <FaQuestionCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Campana de notificaciones - Solo para coordinador y administrativo */}
          {(user?.rol === 'coordinador' || user?.rol === 'administrativo') && (
            <button 
              onClick={() => setShowNotificaciones(true)}
              className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Notificaciones"
            >
              <FaBell className="w-5 h-5 sm:w-6 sm:h-6" />
              {notificacionesCount > 0 && (
                <>
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notificacionesCount > 9 ? '9+' : notificacionesCount}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Menú de Perfil */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaUserCircle className="w-7 h-7 sm:w-8 sm:h-8 text-gray-600" />
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-gray-800">{user?.nombre_completo || user?.username}</p>
                <p className="text-xs text-gray-600 capitalize">{user?.rol}</p>
              </div>
              <FaChevronDown className={`w-3 h-3 text-gray-600 transition-transform hidden md:block ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown del perfil */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-800">{user?.nombre_completo || user?.username}</p>
                  <p className="text-xs text-gray-600 capitalize">{user?.rol}</p>
                </div>
                
                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowConfigProfile(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors"
                  >
                    <FaUserEdit className="w-4 h-4 text-purple-600" />
                    <span>Configurar Perfil</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowChangePassword(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <FaKey className="w-4 h-4 text-blue-600" />
                    <span>Cambiar Contraseña</span>
                  </button>
                </div>

                <div className="border-t border-gray-200 py-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Cambio de Contraseña */}
      {showChangePassword && (
        <CambioPasswordModal onSuccess={() => setShowChangePassword(false)} />
      )}

      {/* Modal de Configurar Perfil */}
      {showConfigProfile && (
        <ConfigurarPerfilModal onSuccess={() => setShowConfigProfile(false)} />
      )}

      {/* Modal de Ayuda */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold">📚 Manual de Usuario</h2>
                <p className="text-sm opacity-90 mt-1">Guía completa del sistema TESCHA</p>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Contenido del Manual */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Introducción */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="text-xl font-bold text-blue-900 mb-2">👋 ¡Bienvenido Coordinador!</h3>
                <p className="text-blue-800 mb-2">
                  Este manual te guiará paso a paso en todas las funciones del sistema. 
                  Sigue el orden recomendado para evitar errores.
                </p>
                <div className="bg-white rounded p-3 mt-3">
                  <p className="text-xs text-gray-700">
                    <strong>📌 Credenciales iniciales:</strong> Usuario: <code className="bg-gray-200 px-1">coordinador</code> | Contraseña: <code className="bg-gray-200 px-1">admin123</code>
                  </p>
                  <p className="text-xs text-red-600 font-semibold mt-1">
                    ⚠️ IMPORTANTE: Cambia tu contraseña al iniciar sesión por primera vez desde tu perfil.
                  </p>
                </div>
              </div>

              {/* PASO 1: CONFIGURACIÓN INICIAL */}
              <div className="border-2 border-green-200 rounded-lg p-5 bg-green-50">
                <h3 className="text-2xl font-bold text-green-900 mb-3">🎯 PASO 1: Configuración Inicial</h3>
                
                <div className="space-y-4">
                  <div className="bg-white rounded p-4 border-l-4 border-green-500">
                    <h4 className="font-bold text-green-900 mb-2">1.1 Crear Período Académico</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Ve a <strong>"Períodos"</strong> en el menú lateral</li>
                      <li>Clic en <strong>"Nuevo Período"</strong></li>
                      <li>Llena: Nombre (ej: 2025-02), fechas, tarifas</li>
                      <li>Activa el período (solo uno puede estar activo)</li>
                    </ol>
                  </div>



                  <div className="bg-white rounded p-4 border-l-4 border-green-500">
                    <h4 className="font-bold text-green-900 mb-2">1.3 Crear Maestros</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Ve a <strong>"Maestros"</strong></li>
                      <li>Clic en <strong>"Nuevo Maestro"</strong></li>
                      <li>Llena datos personales y selecciona niveles que puede impartir</li>
                      <li>⚠️ El sistema crea usuario automático con el correo</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* PASO 2: CREAR GRUPOS */}
              <div className="border-2 border-purple-200 rounded-lg p-5 bg-purple-50">
                <h3 className="text-2xl font-bold text-purple-900 mb-3">👥 PASO 2: Crear Grupos</h3>
                
                <div className="bg-white rounded p-4 border-l-4 border-purple-500">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Ve a <strong>"Grupos"</strong></li>
                    <li>Clic en <strong>"Nuevo Grupo"</strong></li>
                    <li>Llena:
                      <ul className="list-disc list-inside ml-6 mt-1">
                        <li><strong>Código:</strong> ej: E10, A1-01</li>
                        <li><strong>Nivel:</strong> Basico, Intermedio, Avanzado, Perfeccionamiento 1, Perfeccionamiento 2, C1</li>
                        <li><strong>Maestro:</strong> Selecciona uno</li>
                        <li><strong>Horario:</strong> ej: Lun-Mar 8:00-10:00</li>
                        <li><strong>Cupo:</strong> ej: 25 alumnos</li>
                      </ul>
                    </li>
                  </ol>
                  
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-xs text-yellow-800">
                      <strong>💡 TIP:</strong> Crea TODOS los grupos que necesites antes de inscribir alumnos.
                    </p>
                  </div>
                </div>
              </div>

              {/* PASO 3: GESTIONAR ALUMNOS */}
              <div className="border-2 border-orange-200 rounded-lg p-5 bg-orange-50">
                <h3 className="text-2xl font-bold text-orange-900 mb-3">🎓 PASO 3: Gestionar Alumnos</h3>
                
                <div className="space-y-4">
                  <div className="bg-white rounded p-4 border-l-4 border-orange-500">
                    <h4 className="font-bold text-orange-900 mb-2">3.1 Agregar Alumnos al Sistema</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Ve a <strong>"Alumnos"</strong></li>
                      <li>Opción A: <strong>"Nuevo Alumno"</strong> (uno por uno)</li>
                      <li>Opción B: <strong>"Importar Excel"</strong> (masivo para inscripciones)</li>
                      <li>Llena datos: matrícula, nombre, nivel actual, carrera, semestre</li>
                      <li>Selecciona tipo: <strong>Interno</strong> (TecNM) o <strong>Externo</strong></li>
                    </ol>
                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                      <p className="text-xs text-yellow-800">
                        <strong>💡 TIP:</strong> Para alumnos internos, asegúrate de que la carrera y semestre sean correctos para verificar si cumplen el requisito de inglés (8° o 9° semestre).
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-orange-500">
                    <h4 className="font-bold text-orange-900 mb-2">3.2 Inscribir Alumnos a Grupos (SÚPER FÁCIL)</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Ve a <strong>"Maestros"</strong></li>
                      <li>Busca al maestro y clic en botón <strong>👥 (Gestionar Alumnos)</strong></li>
                      <li>Selecciona un grupo del maestro</li>
                      <li>En la lista de abajo, busca alumnos disponibles (filtra por nombre o matrícula)</li>
                      <li>Clic en <strong>"Inscribir"</strong> ✅</li>
                      <li>Para desinscribir: clic en <strong>"Desinscribir"</strong> en la lista de arriba</li>
                    </ol>
                    
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-xs text-blue-800">
                        <strong>⚡ RÁPIDO:</strong> El sistema solo muestra alumnos del mismo nivel que el grupo, evitando errores de inscripción.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-orange-500">
                    <h4 className="font-bold text-orange-900 mb-2">3.3 Búsqueda y Filtros Avanzados</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li><strong>Búsqueda rápida:</strong> Por nombre, matrícula, carrera o nivel</li>
                      <li><strong>Filtro por estado:</strong> Activos, Inactivos, o Todos</li>
                      <li><strong>Filtro por tipo:</strong> Internos, Externos, o ambos</li>
                      <li><strong>Ver perfil completo:</strong> Clic en el botón "Ver" (👁️) de cada alumno</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* PASO 4: PAGOS Y PRÓRROGAS */}
              <div className="border-2 border-red-200 rounded-lg p-5 bg-red-50">
                <h3 className="text-2xl font-bold text-red-900 mb-3">💰 PASO 4: Control de Pagos y Prórrogas</h3>
                
                <div className="space-y-4">
                  <div className="bg-white rounded p-4 border-l-4 border-red-500">
                    <h4 className="font-bold text-red-900 mb-2">4.1 Registrar Pago Completo</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Ve a <strong>"Pagos"</strong></li>
                      <li>Clic en <strong>"Registrar Pago"</strong></li>
                      <li>Selecciona el alumno (busca por nombre o matrícula)</li>
                      <li>Selecciona el grupo inscrito</li>
                      <li>El monto se calcula automáticamente según el período y tipo de alumno</li>
                      <li>Selecciona método de pago: Efectivo, Transferencia, Tarjeta</li>
                      <li>Estado: <strong>"Pagado"</strong></li>
                      <li>Agrega folio o referencia del pago</li>
                      <li>Guarda el registro</li>
                    </ol>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-red-500">
                    <h4 className="font-bold text-red-900 mb-2">4.2 Otorgar Prórroga de Pago</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>En <strong>"Registrar Pago"</strong>, llena los datos del alumno</li>
                      <li>Activa el switch <strong>"Tiene Prórroga"</strong></li>
                      <li>Selecciona la <strong>fecha límite de prórroga</strong></li>
                      <li>Estado: <strong>"Prórroga"</strong></li>
                      <li>Agrega <strong>motivo de la prórroga</strong> (opcional pero recomendado)</li>
                      <li>Guarda - El sistema enviará notificaciones automáticas</li>
                    </ol>
                    <div className="mt-2 bg-red-50 border border-red-300 rounded p-2">
                      <p className="text-xs text-red-700">
                        <strong>⚠️ IMPORTANTE:</strong> Una vez vencida la prórroga, el alumno aparecerá en alertas críticas hasta que pague.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-red-500">
                    <h4 className="font-bold text-red-900 mb-2">4.3 Sistema de Alertas de Prórrogas</h4>
                    <p className="text-sm text-gray-700 mb-2">El Dashboard muestra alertas automáticas:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>🔴 <strong>Prórrogas Vencidas:</strong> Requieren atención INMEDIATA</li>
                      <li>🟠 <strong>Por Vencer (3 días):</strong> Notificar al alumno</li>
                      <li>🟡 <strong>Prórrogas Activas:</strong> En seguimiento normal</li>
                      <li><strong>Columna "Días Restantes":</strong> Código de colores visual (Rojo/Amarillo/Verde)</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-red-500">
                    <h4 className="font-bold text-red-900 mb-2">4.4 Notificaciones Automáticas por Email</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>📧 <strong>Automático:</strong> El sistema envía emails a alumnos con prórroga</li>
                      <li>⏰ <strong>3 días antes:</strong> Recordatorio de prórroga próxima a vencer</li>
                      <li>🔴 <strong>Al vencer:</strong> Notificación de vencimiento</li>
                      <li>📊 <strong>Monitoreo:</strong> Revisa el Dashboard diariamente para ver alertas</li>
                    </ul>
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-xs text-blue-700">
                        <strong>💡 TIP:</strong> Configura los emails automáticos en variables de entorno del backend (SMTP).
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-red-500">
                    <h4 className="font-bold text-red-900 mb-2">4.5 Actualizar Estado de Pago</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>En la lista de Pagos, busca el registro</li>
                      <li>Clic en el botón <strong>"Editar"</strong> (✏️)</li>
                      <li>Actualiza el estado: Pendiente → Pagado</li>
                      <li>Si pagó con prórroga activa, cambia a "Pagado" y guarda</li>
                      <li>El sistema actualiza automáticamente las alertas</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* PASO 5: CALIFICACIONES Y ASISTENCIAS */}
              <div className="border-2 border-indigo-200 rounded-lg p-5 bg-indigo-50">
                <h3 className="text-2xl font-bold text-indigo-900 mb-3">📝 PASO 5: Calificaciones y Asistencias</h3>
                
                <div className="space-y-4">
                  <div className="bg-white rounded p-4 border-l-4 border-indigo-500">
                    <h4 className="font-bold text-indigo-900 mb-2">5.1 Roles y Permisos</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li><strong>👨‍🏫 Maestros:</strong> Suben calificaciones y asistencias de SUS grupos</li>
                      <li><strong>👤 Coordinador (tú):</strong> Puedes ver y editar TODO el sistema</li>
                      <li><strong>📊 Acceso total:</strong> Todos los grupos, todos los maestros</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-indigo-500">
                    <h4 className="font-bold text-indigo-900 mb-2">5.2 Capturar Calificaciones (Como Coordinador)</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Ve a <strong>"Calificaciones"</strong></li>
                      <li>Selecciona el <strong>grupo</strong></li>
                      <li>Selecciona el <strong>parcial</strong> (1, 2, o 3)</li>
                      <li><strong>Opción A - Captura Manual:</strong>
                        <ul className="list-disc list-inside ml-6 mt-1">
                          <li>Clic en pestaña <strong>"✍️ Manual"</strong></li>
                          <li>Ingresa calificaciones directamente (0-100)</li>
                          <li>Clic en <strong>"Guardar Calificaciones"</strong></li>
                        </ul>
                      </li>
                      <li><strong>Opción B - Importar desde archivo:</strong>
                        <ul className="list-disc list-inside ml-6 mt-1">
                          <li>Clic en pestaña <strong>"📁 Archivo"</strong></li>
                          <li>Descarga la plantilla CSV</li>
                          <li>Llena el archivo con las calificaciones</li>
                          <li>Arrastra el archivo o haz clic para seleccionarlo</li>
                          <li>El sistema valida automáticamente los datos</li>
                          <li>Revisa la vista previa y guarda</li>
                        </ul>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-indigo-500">
                    <h4 className="font-bold text-indigo-900 mb-2">5.3 Registrar Asistencias</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Ve a <strong>"Asistencias"</strong></li>
                      <li>Selecciona el <strong>grupo</strong></li>
                      <li>Selecciona la <strong>fecha</strong></li>
                      <li><strong>Captura Manual:</strong>
                        <ul className="list-disc list-inside ml-6 mt-1">
                          <li>Marca estado: Asistencia, Falta, Retardo, Justificada</li>
                          <li>Agrega observaciones si es necesario</li>
                          <li>Guarda el registro</li>
                        </ul>
                      </li>
                      <li><strong>Importar desde archivo:</strong> Similar a calificaciones, descarga plantilla y sube</li>
                    </ol>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-indigo-500">
                    <h4 className="font-bold text-indigo-900 mb-2">5.4 Consultar Progreso de Alumnos</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>Ve a <strong>"Alumnos"</strong> → Selecciona un alumno → Ver perfil</li>
                      <li>Verás su historial completo de calificaciones y asistencias</li>
                      <li>Identifica alumnos en riesgo (bajas calificaciones o muchas faltas)</li>
                      <li>Exporta el historial si lo necesitas</li>
                    </ul>
                  </div>
                </div>
              </div>



              {/* REPORTES */}
              <div className="border-2 border-teal-200 rounded-lg p-5 bg-teal-50">
                <h3 className="text-2xl font-bold text-teal-900 mb-3">📊 PASO 7: Reportes y Dashboard</h3>
                
                <div className="space-y-4">
                  <div className="bg-white rounded p-4 border-l-4 border-teal-500">
                    <h4 className="font-bold text-teal-900 mb-2">7.1 Dashboard Principal</h4>
                    <p className="text-sm text-gray-700 mb-2">Al iniciar sesión verás el Dashboard con:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li><strong>Estadísticas en tiempo real:</strong> Alumnos activos, ingresos, grupos, maestros</li>
                      <li><strong>Gráficas interactivas:</strong> Alumnos por nivel, tendencias de ingresos</li>
                      <li><strong>Alertas de prórrogas:</strong> Vencidas, por vencer, activas</li>
                      <li><strong>Estado de pagos:</strong> Completados, pendientes, cancelados</li>
                      <li><strong>Acciones rápidas:</strong> Accesos directos a funciones comunes</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-teal-500">
                    <h4 className="font-bold text-teal-900 mb-2">7.2 Módulo de Reportes</h4>
                    <p className="text-sm text-gray-700 mb-2">Ve a <strong>"Reportes"</strong> para generar:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li><strong>Reportes Académicos:</strong>
                        <ul className="list-disc list-inside ml-6">
                          <li>Reprobación por grupo/maestro/nivel</li>
                          <li>Deserción por grupo</li>
                          <li>Alumnos en riesgo (bajas calificaciones o muchas faltas)</li>
                          <li>Alumnos que cumplen requisito de inglés</li>
                        </ul>
                      </li>
                      <li><strong>Reportes Financieros:</strong>
                        <ul className="list-disc list-inside ml-6">
                          <li>Ingresos totales por período</li>
                          <li>Comparativa entre períodos</li>
                          <li>Alumnos con adeudo</li>
                          <li>Prórrogas activas y vencidas</li>
                        </ul>
                      </li>
                      <li><strong>Reportes Operativos:</strong>
                        <ul className="list-disc list-inside ml-6">
                          <li>Carga horaria de maestros</li>
                          <li>Grupos con bajo/alto cupo</li>
                        </ul>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-teal-500">
                    <h4 className="font-bold text-teal-900 mb-2">7.3 Exportar Datos</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>Todos los módulos tienen botón <strong>"Exportar"</strong></li>
                      <li>Formatos disponibles: Excel (.xlsx) y PDF</li>
                      <li>Los reportes incluyen filtros aplicados</li>
                      <li>Útil para respaldos o enviar a dirección</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* PASO 8: SEGURIDAD Y USUARIOS */}
              <div className="border-2 border-purple-200 rounded-lg p-5 bg-purple-50">
                <h3 className="text-2xl font-bold text-purple-900 mb-3">🔐 PASO 8: Seguridad y Gestión de Usuarios</h3>
                
                <div className="space-y-4">
                  <div className="bg-white rounded p-4 border-l-4 border-purple-500">
                    <h4 className="font-bold text-purple-900 mb-2">8.1 Cambiar Tu Contraseña</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Clic en tu perfil (esquina superior derecha)</li>
                      <li>Selecciona <strong>"Cambiar Contraseña"</strong></li>
                      <li>Ingresa contraseña actual y nueva contraseña</li>
                      <li>La contraseña debe tener mínimo 8 caracteres</li>
                      <li>Guarda - Se cerrará sesión automáticamente</li>
                    </ol>
                    <div className="mt-2 bg-red-50 border border-red-300 rounded p-2">
                      <p className="text-xs text-red-700">
                        <strong>⚠️ CRÍTICO:</strong> Cambia la contraseña predeterminada "admin123" inmediatamente.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-purple-500">
                    <h4 className="font-bold text-purple-900 mb-2">8.2 Usuarios Automáticos de Maestros</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>Al crear un maestro, se genera <strong>usuario automáticamente</strong></li>
                      <li><strong>Usuario:</strong> Su correo electrónico</li>
                      <li><strong>Contraseña inicial:</strong> "maestro123" (deben cambiarla al entrar)</li>
                      <li>Los maestros solo ven sus grupos asignados</li>
                      <li>Pueden capturar calificaciones y asistencias</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-purple-500">
                    <h4 className="font-bold text-purple-900 mb-2">8.3 Crear Usuario Administrativo</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Ve a <strong>"Configuración"</strong> o módulo de usuarios</li>
                      <li>Clic en <strong>"Nuevo Usuario"</strong></li>
                      <li>Selecciona rol: <strong>"Administrativo"</strong></li>
                      <li>Define username y contraseña temporal</li>
                      <li>Los administrativos pueden gestionar pagos y libros</li>
                    </ol>
                  </div>

                  <div className="bg-white rounded p-4 border-l-4 border-purple-500">
                    <h4 className="font-bold text-purple-900 mb-2">8.4 Sistema de Auditoría</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>Todas las acciones importantes quedan registradas</li>
                      <li>Se guardan: usuario, acción, fecha, IP</li>
                      <li>Útil para rastrear cambios y resolver problemas</li>
                      <li>Accede a los logs desde el módulo de seguridad</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* SOLUCIÓN DE PROBLEMAS */}
              <div className="border-2 border-gray-300 rounded-lg p-5 bg-gray-50">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">🛠️ Solución de Problemas Comunes</h3>
                
                <div className="space-y-3">
                  <div className="bg-white rounded p-3 border-l-4 border-gray-400">
                    <h4 className="font-bold text-gray-800 text-sm mb-1">❓ No puedo crear un grupo</h4>
                    <p className="text-xs text-gray-600">✅ Verifica que hayas creado el período y maestros primero</p>
                  </div>

                  <div className="bg-white rounded p-3 border-l-4 border-gray-400">
                    <h4 className="font-bold text-gray-800 text-sm mb-1">❓ No aparecen alumnos para inscribir</h4>
                    <p className="text-xs text-gray-600">✅ Solo se muestran alumnos del mismo nivel que el grupo seleccionado</p>
                  </div>



                  <div className="bg-white rounded p-3 border-l-4 border-gray-400">
                    <h4 className="font-bold text-gray-800 text-sm mb-1">❓ No puedo eliminar un período</h4>
                    <p className="text-xs text-gray-600">✅ No se puede eliminar un período con datos (grupos, pagos). Márcalo como inactivo</p>
                  </div>

                  <div className="bg-white rounded p-3 border-l-4 border-gray-400">
                    <h4 className="font-bold text-gray-800 text-sm mb-1">❓ Las notificaciones por email no funcionan</h4>
                    <p className="text-xs text-gray-600">✅ Verifica la configuración SMTP en variables de entorno del backend</p>
                  </div>

                  <div className="bg-white rounded p-3 border-l-4 border-gray-400">
                    <h4 className="font-bold text-gray-800 text-sm mb-1">❓ No puedo subir archivo Excel</h4>
                    <p className="text-xs text-gray-600">✅ Descarga primero la plantilla, llénala exactamente como se indica y vuelve a subir</p>
                  </div>
                </div>
              </div>

              {/* TIPS FINALES */}
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-lg p-5">
                <h3 className="text-2xl font-bold text-yellow-900 mb-4">💡 Mejores Prácticas y Tips Pro</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3">
                    <h4 className="font-bold text-yellow-900 text-sm mb-2">🎯 Orden de Configuración</h4>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-gray-700">
                      <li>Período académico</li>
                      <li>Maestros</li>
                      <li>Grupos</li>
                      <li>Alumnos</li>
                      <li>Inscripciones</li>
                      <li>Pagos</li>
                    </ol>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <h4 className="font-bold text-yellow-900 text-sm mb-2">💾 Respaldos</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                      <li>Exporta datos semanalmente</li>
                      <li>Guarda reportes de cada período</li>
                      <li>Respaldo de base de datos mensual</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <h4 className="font-bold text-yellow-900 text-sm mb-2">⏰ Tareas Diarias</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                      <li>Revisar Dashboard al iniciar</li>
                      <li>Verificar alertas de prórrogas</li>
                      <li>Monitorear días restantes en Pagos</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <h4 className="font-bold text-yellow-900 text-sm mb-2">🔒 Seguridad</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                      <li>Cambia tu contraseña regularmente</li>
                      <li>No compartas credenciales</li>
                      <li>Cierra sesión al terminar</li>
                      <li>Revisa logs de auditoría</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <h4 className="font-bold text-yellow-900 text-sm mb-2">📊 Monitoreo</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                      <li>Tendencias de ingresos mensuales</li>
                      <li>Alumnos en riesgo académico</li>
                      <li>Carga de trabajo de maestros</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <h4 className="font-bold text-yellow-900 text-sm mb-2">✨ Optimización</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                      <li>Usa búsqueda rápida con filtros</li>
                      <li>Importación masiva para inscripciones</li>
                      <li>Plantillas CSV para calificaciones</li>
                      <li>Accesos directos del Dashboard</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 bg-yellow-50 rounded p-3 border border-yellow-300">
                  <p className="text-xs font-semibold text-yellow-900">
                    🏆 <strong>RECUERDA:</strong> Los maestros solo ven sus grupos. Tú como coordinador tienes acceso completo a todo el sistema.
                  </p>
                </div>
              </div>

              {/* ATAJOS DE TECLADO */}
              <div className="border-2 border-blue-200 rounded-lg p-5 bg-blue-50">
                <h3 className="text-xl font-bold text-blue-900 mb-3">⌨️ Atajos de Teclado</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white rounded p-2">
                    <strong className="text-blue-700">Ctrl + K:</strong> Búsqueda rápida
                  </div>
                  <div className="bg-white rounded p-2">
                    <strong className="text-blue-700">Ctrl + N:</strong> Nuevo registro
                  </div>
                  <div className="bg-white rounded p-2">
                    <strong className="text-blue-700">Ctrl + S:</strong> Guardar cambios
                  </div>
                  <div className="bg-white rounded p-2">
                    <strong className="text-blue-700">Esc:</strong> Cerrar modal
                  </div>
                </div>
              </div>

              {/* Soporte */}
              <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg p-6 text-center">
                <div className="text-4xl mb-3">📞</div>
                <h3 className="text-xl font-bold mb-2">¿Necesitas Ayuda?</h3>
                <p className="text-sm opacity-90 mb-4">
                  Si tienes dudas o problemas que no se resuelven con este manual:
                </p>
                <ul className="text-sm space-y-2">
                  <li>✉️ Contacta al soporte técnico del sistema</li>
                  <li>📧 Envía un correo con capturas de pantalla del error</li>
                  <li>📝 Revisa los logs de auditoría para más detalles</li>
                </ul>
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <p className="text-xs opacity-75">
                    Sistema TESCHA - Tecnológico de Estudios Superiores de Chalco<br />
                    Versión 1.0.0 - Diciembre 2025
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Panel de Notificaciones */}
      <NotificacionesPanel 
        isOpen={showNotificaciones} 
        onClose={() => {
          setShowNotificaciones(false);
          cargarContadorNotificaciones(); // Actualizar contador al cerrar
        }}
        onUpdate={cargarContadorNotificaciones} // Actualizar en tiempo real
      />
    </header>
  );
};

export default Header;
