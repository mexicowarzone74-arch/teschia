import { useState, useEffect } from 'react';
import { maestrosService } from '../services/api';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaKey, FaUsers, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import GestionarAlumnosMaestro from '../components/GestionarAlumnosMaestro';
import { useSocket } from '../contexts/SocketContext';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const Maestros = () => {
  const { user } = useAuth();
  // Sistema de creación de credenciales automáticas
  const { socket } = useSocket();
  const location = useLocation();
  const [maestros, setMaestros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaestro, setEditingMaestro] = useState(null);
  const [credencialesCreadas, setCredencialesCreadas] = useState(null);
  const [passwordReseteada, setPasswordReseteada] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'activos', 'inactivos'
  const [tipoUsuario, setTipoUsuario] = useState('maestro'); // 'maestro' o 'administrativo'
  const [formData, setFormData] = useState({ nombre: '', apellido_paterno: '', apellido_materno: '', correo: '', telefono: '', niveles: [] });
  const [validationState, setValidationState] = useState({});
  const nivelesDisponibles = ['Básico', 'Intermedio', 'Avanzado', 'Perfeccionamiento 1', 'Perfeccionamiento 2', 'C1'];
  const [maestroGestionAlumnos, setMaestroGestionAlumnos] = useState(null);

  // Abrir modal automáticamente si viene del dashboard
  useEffect(() => {
    if (location.state?.openModal) {
      handleOpenModal(null, location.state?.tipo || 'maestro');
      // Limpiar el state para evitar que se abra de nuevo al regresar
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const validateField = (name, value) => {
    switch(name) {
      case 'nombre':
      case 'apellido_paterno':
        return value.length >= 2;
      case 'correo':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'telefono':
        return !value || /^\d{10}$/.test(value.replace(/\D/g, ''));
      default:
        return true;
    }
  };

  const handleFieldChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    // Validar siempre, incluso cuando esté vacío
    const isValid = value ? validateField(name, value) : false;
    setValidationState({ ...validationState, [name]: isValid });
  };

  useEffect(() => { 
    loadMaestros();
    
    // Escuchar eventos de Socket.io para actualizaciones en tiempo real
    if (socket) {
      socket.on('maestro:created', (data) => {
        loadMaestros();
        const tipo = data.rol === 'maestro' ? 'Maestro' : 'Administrativo';
        toast.info(`Nuevo ${tipo.toLowerCase()} agregado: ${data.nombre_completo}`);
      });

      socket.on('maestro:updated', (data) => {
        loadMaestros();
        const tipo = data.rol === 'maestro' ? 'Maestro' : 'Administrativo';
        toast.info(`${tipo} actualizado: ${data.nombre_completo}`);
      });

      socket.on('maestro:deleted', (data) => {
        loadMaestros();
        toast.info(`Maestro eliminado`);
      });

      socket.on('maestro:status_changed', (data) => {
        loadMaestros();
      });
    }

    // Auto-refresh cada 5 minutos como respaldo
    const interval = setInterval(() => {
      loadMaestros();
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      // Limpiar listeners de socket
      if (socket) {
        socket.off('maestro:created');
        socket.off('maestro:updated');
        socket.off('maestro:deleted');
        socket.off('maestro:status_changed');
      }
    };
  }, [socket]);

  const loadMaestros = async () => {
    try {
      // Solo coordinador puede ver todos los maestros
      if (user?.rol !== 'coordinador') {
        toast.error('No tienes permisos para acceder a esta página');
        setLoading(false);
        return;
      }
      
      const response = await maestrosService.getAll();
      setMaestros(response.data);
    } catch (error) {
      toast.error('Error al cargar maestros');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (maestro = null, tipoInicial = 'maestro') => {
    if (maestro) {
      setEditingMaestro(maestro);
      setFormData({ nombre: maestro.nombre || '', apellido_paterno: maestro.apellido_paterno || '', apellido_materno: maestro.apellido_materno || '', correo: maestro.correo || '', telefono: maestro.telefono || '', niveles: maestro.niveles || [] });
      setTipoUsuario(maestro.rol_usuario || 'maestro');
      // Validar campos existentes
      setValidationState({
        nombre: !!maestro.nombre,
        apellido_paterno: !!maestro.apellido_paterno,
        correo: validateField('correo', maestro.correo || ''),
        telefono: validateField('telefono', maestro.telefono || '')
      });
    } else {
      setEditingMaestro(null);
      setFormData({ nombre: '', apellido_paterno: '', apellido_materno: '', correo: '', telefono: '', niveles: [] });
      setTipoUsuario(tipoInicial);
      // Inicializar validación como false para campos vacíos
      setValidationState({});
    }
    setCredencialesCreadas(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingMaestro) {
        await maestrosService.update(editingMaestro.id, formData);
        const tipo = tipoUsuario === 'maestro' ? 'Maestro' : 'Administrativo';
        toast.success(`${tipo} actualizado`);
        setShowModal(false);
      } else {
        // Añadir el rol según el tipo de usuario seleccionado
        const dataToSend = {
          ...formData,
          rol: tipoUsuario
        };
        
        const response = await maestrosService.create(dataToSend);
        toast.success(`${tipoUsuario === 'administrativo' ? 'Administrativo' : 'Maestro'} creado exitosamente`);
        
        // Mostrar credenciales si se crearon
        if (response.data.usuario_creado) {
          setCredencialesCreadas(response.data.usuario_creado);
        } else {
          setShowModal(false);
        }
      }
      loadMaestros();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este maestro? Esta acción no se puede deshacer.')) return;
    try {
      await maestrosService.delete(id);
      toast.success('Maestro eliminado correctamente');
      loadMaestros();
    } catch (error) {
      const mensaje = error.response?.data?.error || 'Error al eliminar maestro';
      toast.error(mensaje, { autoClose: 5000 });
    }
  };

  const handleToggleStatus = async (maestro) => {
    const accion = maestro.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Desea ${accion} a ${maestro.nombre_completo}?`)) return;
    
    setLoading(true);
    try {
      const response = await maestrosService.toggleStatus(maestro.id);
      toast.success(response.data.message);
      
      // Esperar un momento para que la BD se actualice
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Recargar la lista
      await loadMaestros();
    } catch (error) {
      toast.error(`Error al ${accion} maestro`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (maestro) => {
    if (!window.confirm(`¿Restablecer contraseña de ${maestro.nombre_completo}?`)) return;
    
    try {
      const response = await maestrosService.resetPassword(maestro.id);
      toast.success('Contraseña restablecida');
      
      // Mostrar modal con nueva contraseña
      setPasswordReseteada({
        maestro: maestro.nombre_completo,
        password: response.data.password || response.data.nueva_password
      });
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      toast.error('Error al restablecer contraseña');
    }
  };

  const toggleNivel = (nivel) => {
    setFormData(prev => ({ ...prev, niveles: prev.niveles.includes(nivel) ? prev.niveles.filter(n => n !== nivel) : [...prev.niveles, nivel] }));
  };

  const maestrosFiltrados = maestros.filter(m => {
    if (filtroEstado === 'activos') return m.activo === true;
    if (filtroEstado === 'inactivos') return m.activo === false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Personal</h1>
          <p className="text-sm text-gray-600 mt-1">Administra maestros y personal administrativo</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleOpenModal(null, 'maestro')} 
            className="btn-primary flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
          >
            <FaPlus />
            <span>👨‍🏫 Nuevo Maestro</span>
          </button>
          <button 
            onClick={() => handleOpenModal(null, 'administrativo')} 
            className="btn-primary flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
          >
            <FaPlus />
            <span>💼 Nuevo Administrativo</span>
          </button>
        </div>
      </div>

      {/* Panel de ayuda rápida */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500 text-white p-3 rounded-full flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-2">💡 ¿Cómo funciona?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <span className="text-xl">👨‍🏫</span>
                <div>
                  <strong>Maestros:</strong> Pueden subir calificaciones, tomar asistencia y ver sus grupos asignados
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xl">💼</span>
                <div>
                  <strong>Administrativos:</strong> Acceso de solo lectura a finanzas y reportes del sistema
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xl">🔑</span>
                <div>
                  <strong>Usuario Automático:</strong> Se genera usuario y contraseña temporal al crear personal
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xl">🔄</span>
                <div>
                  <strong>Restablecer Contraseña:</strong> Genera nueva contraseña temporal en caso de olvido
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-sm border border-gray-200 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 uppercase">Filtrar:</span>
          <div className="flex gap-1.5">
            <button 
              onClick={() => setFiltroEstado('todos')} 
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filtroEstado === 'todos' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos <span className={`ml-1 ${filtroEstado === 'todos' ? 'opacity-80' : ''}`}>({maestros.length})</span>
            </button>
            <button 
              onClick={() => setFiltroEstado('activos')} 
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filtroEstado === 'activos' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Activos <span className={`ml-1 ${filtroEstado === 'activos' ? 'opacity-80' : ''}`}>({maestros.filter(m => m.activo).length})</span>
            </button>
            <button 
              onClick={() => setFiltroEstado('inactivos')} 
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filtroEstado === 'inactivos' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Inactivos <span className={`ml-1 ${filtroEstado === 'inactivos' ? 'opacity-80' : ''}`}>({maestros.filter(m => !m.activo).length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 font-medium">Cargando maestros...</p>
          </div>
        ) : maestrosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg font-medium">
              No se encontraron maestros {filtroEstado === 'activos' ? 'activos' : filtroEstado === 'inactivos' ? 'inactivos' : ''}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap w-48">Personal / Usuario</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap w-32">Rol</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap w-56">Correo Electrónico</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap w-32">Teléfono</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-48">Niveles</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap w-28">Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap w-40">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {maestrosFiltrados.map(m => (
                  <tr key={m.id} className={`transition-all duration-200 ${m.activo ? 'hover:bg-blue-50' : 'bg-gray-50 opacity-75 hover:bg-gray-100'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{m.nombre_completo}</div>
                      <div className="text-xs text-blue-600 font-medium whitespace-nowrap">@{m.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        m.rol_usuario === 'maestro' 
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : m.rol_usuario === 'administrativo'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-green-100 text-green-800 border border-green-300'
                      }`}>
                        {m.rol_usuario === 'maestro' ? '👨‍🏫 Maestro' : m.rol_usuario === 'administrativo' ? '💼 Administrativo' : '👑 Coordinador'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{m.correo}</div>
                      {m.email_verificado
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-300 rounded-full px-2 py-0.5 mt-1"><FaCheckCircle size={10} /> Verificado</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-300 rounded-full px-2 py-0.5 mt-1"><FaTimesCircle size={10} /> Sin verificar</span>
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{m.telefono || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {m.rol_usuario === 'maestro' ? (
                        <div className="flex flex-wrap gap-2 min-w-[180px]">
                          {m.niveles && m.niveles.length > 0 ? (
                            m.niveles.map(n => (
                              <span key={n} className="px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                                {n}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sin niveles asignados</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                        m.activo 
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                          : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                      }`}>
                        {m.activo ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex justify-center space-x-2">
                        {m.rol_usuario === 'maestro' && (
                          <button 
                            onClick={() => setMaestroGestionAlumnos(m)} 
                            className="p-2.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-all duration-200 transform hover:scale-110" 
                            title="Gestionar Alumnos"
                          >
                            <FaUsers size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenModal(m)} 
                          className="p-2.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200 transform hover:scale-110" 
                          title="Editar Maestro"
                        >
                          <FaEdit size={18} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(m)} 
                          className={`p-2.5 rounded-lg transition-all duration-200 transform hover:scale-110 ${
                            m.activo 
                              ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-100' 
                              : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                          }`}
                          title={m.activo ? 'Desactivar Maestro' : 'Activar Maestro'}
                        >
                          {m.activo ? <FaToggleOff size={18} /> : <FaToggleOn size={18} />}
                        </button>
                        <button 
                          onClick={() => handleResetPassword(m)} 
                          className="p-2.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-all duration-200 transform hover:scale-110" 
                          title="Restablecer Contraseña"
                        >
                          <FaKey size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(m.id)} 
                          className="p-2.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-all duration-200 transform hover:scale-110" 
                          title="Eliminar Maestro"
                        >
                          <FaTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {passwordReseteada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-3">
                <span className="text-5xl">🔑</span>
              </div>
              <h3 className="text-2xl font-bold text-purple-600">Contraseña Restablecida</h3>
              <p className="text-sm text-gray-600 mt-2">Nueva contraseña temporal para {passwordReseteada.maestro}</p>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border-2 border-red-300 mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">🔑 Nueva Contraseña Temporal:</label>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xl font-mono font-bold text-red-700 break-all flex-1">{passwordReseteada.password}</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(passwordReseteada.password);
                      toast.success('¡Contraseña copiada!');
                    } catch (err) {
                      // Fallback: seleccionar el texto
                      const textarea = document.createElement('textarea');
                      textarea.value = passwordReseteada.password;
                      textarea.style.position = 'fixed';
                      textarea.style.opacity = '0';
                      document.body.appendChild(textarea);
                      textarea.select();
                      try {
                        document.execCommand('copy');
                        toast.success('¡Contraseña copiada!');
                      } catch (e) {
                        toast.error('No se pudo copiar. Copia manualmente');
                      }
                      document.body.removeChild(textarea);
                    }
                  }}
                  className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-semibold whitespace-nowrap"
                >
                  📋 Copiar
                </button>
              </div>
            </div>
            
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
              <div className="flex gap-3">
                <span className="text-3xl">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-yellow-900 mb-1">¡Importante!</p>
                  <p className="text-sm text-yellow-800 leading-relaxed">
                    Esta es una contraseña <strong>temporal</strong>. El maestro debe cambiarla en su primer acceso.
                    Copia y envía esta contraseña de forma segura.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={() => setPasswordReseteada(null)} 
                className="btn-primary px-8 py-3 text-lg font-semibold"
              >
                ✓ Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">
              {editingMaestro ? 'Editar' : 'Nuevo'} {tipoUsuario === 'administrativo' ? 'Administrativo' : 'Maestro'}
            </h2>
            
            {credencialesCreadas ? (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-5xl">🔐</span>
                  </div>
                  <h3 className="text-2xl font-bold text-green-600">¡Usuario Creado!</h3>
                  <p className="text-sm text-gray-600 mt-2">Se ha generado una contraseña temporal segura</p>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">👤 Usuario:</label>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-mono font-bold text-blue-900">{credencialesCreadas.username}</p>
                      <button
                        type="button"
                        onClick={() => {
                          // Fallback para navegadores sin clipboard API o HTTP
                          if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(credencialesCreadas.username)
                              .then(() => toast.success('Usuario copiado'))
                              .catch(() => {
                                const textarea = document.createElement('textarea');
                                textarea.value = credencialesCreadas.username;
                                textarea.style.position = 'fixed';
                                textarea.style.opacity = '0';
                                document.body.appendChild(textarea);
                                textarea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textarea);
                                toast.success('Usuario copiado');
                              });
                          } else {
                            const textarea = document.createElement('textarea');
                            textarea.value = credencialesCreadas.username;
                            textarea.style.position = 'fixed';
                            textarea.style.opacity = '0';
                            document.body.appendChild(textarea);
                            textarea.select();
                            try {
                              document.execCommand('copy');
                              toast.success('Usuario copiado');
                            } catch (err) {
                              toast.error('No se pudo copiar. Selecciona y copia manualmente.');
                            }
                            document.body.removeChild(textarea);
                          }
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full transition"
                      >
                        📋 Copiar
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border-2 border-red-300">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">🔑 Contraseña Temporal:</label>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xl font-mono font-bold text-red-700 break-all flex-1">{credencialesCreadas.password}</p>
                      <button
                        type="button"
                        onClick={() => {
                          // Fallback para navegadores sin clipboard API o HTTP
                          if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(credencialesCreadas.password)
                              .then(() => toast.success('¡Contraseña copiada!'))
                              .catch(() => {
                                // Fallback manual
                                const textarea = document.createElement('textarea');
                                textarea.value = credencialesCreadas.password;
                                textarea.style.position = 'fixed';
                                textarea.style.opacity = '0';
                                document.body.appendChild(textarea);
                                textarea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textarea);
                                toast.success('¡Contraseña copiada!');
                              });
                          } else {
                            // Método alternativo para contextos no seguros
                            const textarea = document.createElement('textarea');
                            textarea.value = credencialesCreadas.password;
                            textarea.style.position = 'fixed';
                            textarea.style.opacity = '0';
                            document.body.appendChild(textarea);
                            textarea.select();
                            try {
                              document.execCommand('copy');
                              toast.success('¡Contraseña copiada!');
                            } catch (err) {
                              toast.error('No se pudo copiar. Selecciona y copia manualmente.');
                            }
                            document.body.removeChild(textarea);
                          }
                        }}
                        className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-semibold whitespace-nowrap"
                      >
                        📋 Copiar
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                    <div className="flex gap-3">
                      <span className="text-3xl">📧</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900 mb-1">Correo de verificación enviado</p>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          Se envió un correo de verificación a <strong>{credencialesCreadas?.email}</strong>.<br/>
                          El usuario <strong>NO podrá iniciar sesión</strong> hasta que verifique su correo.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-4">
                    <div className="flex gap-3">
                      <span className="text-2xl">📂</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-orange-900 mb-1">¡Aviso importante!</p>
                        <p className="text-sm text-orange-800 leading-relaxed">
                          El correo de verificación podría llegar a la carpeta de <strong>Spam o Correo no deseado</strong>.<br/>
                          Indícale al usuario que revise esa carpeta si no lo encuentra en su bandeja de entrada.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                    <div className="flex gap-3">
                      <span className="text-3xl">⚠️</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-yellow-900 mb-1">¡Importante!</p>
                        <p className="text-sm text-yellow-800 leading-relaxed">
                          Esta contraseña es <strong>temporal y segura</strong>. El usuario <strong>DEBE cambiarla</strong> en su primer acceso. 
                          Copia y envía estas credenciales de forma segura.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowModal(false);
                      setCredencialesCreadas(null);
                    }} 
                    className="btn-primary px-8 py-3 text-lg font-semibold"
                  >
                    ✓ Entendido
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingMaestro && (
                  <div className={`border-2 rounded-lg p-4 mb-4 ${
                    tipoUsuario === 'maestro' 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300' 
                      : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`text-4xl ${tipoUsuario === 'maestro' ? 'text-blue-600' : 'text-purple-600'}`}>
                        {tipoUsuario === 'maestro' ? '👨‍🏫' : '💼'}
                      </div>
                      <div>
                        <p className="font-bold text-lg">
                          {tipoUsuario === 'maestro' ? 'Nuevo Maestro' : 'Nuevo Administrativo'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {tipoUsuario === 'maestro' 
                            ? 'Podrá subir calificaciones, asistencias y gestionar sus alumnos'
                            : 'Tendrá acceso de solo lectura a finanzas y reportes'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">💡</span>
                    <p className="text-sm text-blue-900">
                      Los campos marcados con * son obligatorios. Verás un <span className="text-green-600 font-bold">✓</span> verde cuando un campo esté correcto.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2">
                      Nombre *
                    </label>
                    <div className="relative">
                      <input type="text" className="input pr-10" value={formData.nombre} onChange={(e) => handleFieldChange('nombre', e.target.value)} required />
                      {formData.nombre && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {validationState.nombre ? <FaCheckCircle className="text-green-500" /> : <FaTimesCircle className="text-red-500" />}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2">
                      Apellido Paterno *
                    </label>
                    <div className="relative">
                      <input type="text" className="input pr-10" value={formData.apellido_paterno} onChange={(e) => handleFieldChange('apellido_paterno', e.target.value)} required />
                      {formData.apellido_paterno && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {validationState.apellido_paterno ? <FaCheckCircle className="text-green-500" /> : <FaTimesCircle className="text-red-500" />}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2">
                      Apellido Materno
                    </label>
                    <input type="text" className="input" value={formData.apellido_materno} onChange={(e) => setFormData({...formData, apellido_materno: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2">
                      Correo *
                    </label>
                    <div className="relative">
                      <input type="email" className="input pr-10" value={formData.correo} onChange={(e) => handleFieldChange('correo', e.target.value)} required placeholder="ejemplo@tescha.edu.mx" />
                      {formData.correo && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {validationState.correo ? <FaCheckCircle className="text-green-500" /> : <FaTimesCircle className="text-red-500" />}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2">
                      Teléfono
                    </label>
                    <div className="relative">
                      <input type="tel" className="input pr-10" value={formData.telefono} onChange={(e) => handleFieldChange('telefono', e.target.value)} placeholder="5512345678" />
                      {formData.telefono && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {validationState.telefono ? <FaCheckCircle className="text-green-500" /> : <FaTimesCircle className="text-red-500" />}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Solo mostrar niveles si es maestro */}
                {(tipoUsuario === 'maestro' || (editingMaestro && (editingMaestro.rol_usuario || editingMaestro.rol) === 'maestro')) && (
                  <div>
                    <label className="text-sm font-medium mb-2">
                      Niveles que puede impartir
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {nivelesDisponibles.map(nivel => (
                        <label key={nivel} className="flex items-center space-x-2 cursor-pointer">
                          <input type="checkbox" checked={formData.niveles.includes(nivel)} onChange={() => toggleNivel(nivel)} className="rounded" />
                          <span>{nivel}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : editingMaestro ? 'Actualizar' : 'Crear'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Gestión de Alumnos */}
      {maestroGestionAlumnos && (
        <GestionarAlumnosMaestro
          maestro={maestroGestionAlumnos}
          onClose={() => setMaestroGestionAlumnos(null)}
        />
      )}
    </div>
  );
};

export default Maestros;
