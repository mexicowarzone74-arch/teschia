import { useState, useEffect } from 'react';
import { maestrosAlumnosService } from '../services/api';
import { toast } from 'react-toastify';
import { FaUserPlus, FaTrash, FaTimes, FaUsers, FaSearch, FaChevronLeft, FaCheckCircle } from 'react-icons/fa';

const GestionarAlumnosMaestro = ({ maestro, onClose }) => {
  const [grupos, setGrupos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [alumnosGrupo, setAlumnosGrupo] = useState([]);
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscador, setBuscador] = useState('');
  const [loadingDisponibles, setLoadingDisponibles] = useState(false);
  const [inscribiendoId, setInscribiendoId] = useState(null); // ID del alumno siendo inscrito
  const [ultimoInscrito, setUltimoInscrito] = useState(null); // Para mostrar animación de éxito
  
  // Estado para navegación móvil (tabs)
  const [vistaMovil, setVistaMovil] = useState('grupos'); // 'grupos', 'inscritos', 'disponibles'

  useEffect(() => {
    cargarGrupos();
  }, [maestro.id]);

  const cargarGrupos = async () => {
    try {
      const response = await maestrosAlumnosService.getGruposConAlumnos(maestro.id);
      setGrupos(response.data);
    } catch (error) {
      toast.error('Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarGrupo = async (grupo) => {
    setGrupoSeleccionado(grupo);
    setLoading(true);
    setBuscador(''); // Limpiar búsqueda
    // En móvil, cambiar automáticamente a la vista de inscritos
    setVistaMovil('inscritos');
    
    try {
      // Cargar alumnos inscritos y disponibles en paralelo
      const [alumnosRes, disponiblesRes] = await Promise.all([
        maestrosAlumnosService.getAlumnosGrupo(maestro.id, grupo.id),
        maestrosAlumnosService.getAlumnosDisponibles(maestro.id, grupo.id, '')
      ]);
      setAlumnosGrupo(alumnosRes.data);
      setAlumnosDisponibles(disponiblesRes.data);
    } catch (error) {
      toast.error('Error al cargar alumnos');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Búsqueda dinámica de alumnos disponibles
  const buscarAlumnosDisponibles = async (searchTerm) => {
    if (!grupoSeleccionado) return;
    
    setLoadingDisponibles(true);
    try {
      const response = await maestrosAlumnosService.getAlumnosDisponibles(
        maestro.id, 
        grupoSeleccionado.id, 
        searchTerm
      );
      setAlumnosDisponibles(response.data);
    } catch (error) {
      console.error('Error buscando alumnos:', error);
    } finally {
      setLoadingDisponibles(false);
    }
  };

  const inscribirAlumno = async (alumno) => {
    // Confirmación antes de inscribir
    const confirmar = window.confirm(
      `¿Confirmas inscribir a ${alumno.nombre_completo} en el grupo ${grupoSeleccionado.codigo}?\n\n` +
      `Matrícula: ${alumno.matricula}\n` +
      `Tipo: ${alumno.tipo_alumno}\n` +
      `Nivel: ${alumno.nivel_nombre || grupoSeleccionado.nivel}`
    );
    
    if (!confirmar) return;
    
    setInscribiendoId(alumno.id);
    
    try {
      await maestrosAlumnosService.inscribirAlumno(maestro.id, grupoSeleccionado.id, alumno.id);
      
      // Animación de éxito
      setUltimoInscrito(alumno.id);
      setTimeout(() => setUltimoInscrito(null), 3000);
      
      toast.success(
        `✅ ¡${alumno.nombre_completo} inscrito exitosamente!`,
        { autoClose: 3000 }
      );
      
      // Recargar datos del grupo
      await seleccionarGrupo(grupoSeleccionado);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error al inscribir alumno';
      toast.error(
        `❌ Error: ${errorMsg}`,
        { autoClose: 5000 }
      );
      console.error('Error inscribiendo alumno:', error);
    } finally {
      setInscribiendoId(null);
    }
  };

  const removerAlumno = async (inscripcionId, alumnoNombre) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas remover a ${alumnoNombre} del grupo ${grupoSeleccionado.codigo}?\n\n` +
      `Esta acción puede revertirse volviendo a inscribir al alumno.`
    );
    
    if (!confirmar) return;
    
    try {
      await maestrosAlumnosService.removerAlumno(maestro.id, grupoSeleccionado.id, inscripcionId);
      toast.success(`${alumnoNombre} removido del grupo`);
      await seleccionarGrupo(grupoSeleccionado); // Recargar
    } catch (error) {
      toast.error('Error al remover alumno');
      console.error('Error:', error);
    }
  };

  const alumnosFiltrados = alumnosDisponibles;

  // Componente de lista de grupos (reutilizable)
  const ListaGrupos = () => (
    <div className="h-full overflow-y-auto p-2">
      <h3 className="text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
        <FaUsers className="text-blue-600" />
        Grupos del Maestro
      </h3>
      {loading && !grupoSeleccionado ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando grupos...</p>
        </div>
      ) : grupos.length === 0 ? (
        <div className="text-center py-8 px-4">
          <FaUsers size={48} className="mx-auto mb-4 text-gray-300" />
          <h4 className="text-base sm:text-lg font-bold text-gray-700 mb-2">
            ⚠️ Sin grupos asignados
          </h4>
          <p className="text-xs sm:text-sm text-gray-600 mb-4">
            Primero debes crear grupos antes de inscribir alumnos.
          </p>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 text-left mb-4">
            <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">📋 Pasos:</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Ve a <strong>"Grupos"</strong></li>
              <li>Crea un grupo</li>
              <li>Asigna este maestro</li>
              <li>Regresa aquí</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.href = '/grupos'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition shadow-lg hover:shadow-xl text-sm sm:text-base w-full sm:w-auto"
          >
            🚀 Ir a Crear Grupos
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {grupos.map(grupo => (
            <button
              key={grupo.id}
              onClick={() => seleccionarGrupo(grupo)}
              className={`w-full text-left p-2.5 rounded-lg border-2 transition-all duration-200 ${
                grupoSeleccionado?.id === grupo.id
                  ? 'bg-blue-100 border-blue-500 shadow-md scale-[1.02]'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-bold text-gray-800 text-sm">{grupo.codigo}</div>
                  <div className="text-xs text-gray-600">Nivel: {grupo.nivel}</div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <FaUsers className="text-blue-500" />
                    {grupo.total_alumnos} alumno{grupo.total_alumnos !== 1 ? 's' : ''}
                  </div>
                </div>
                {grupoSeleccionado?.id === grupo.id && (
                  <FaCheckCircle className="text-blue-600 text-xl flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Componente de alumnos inscritos
  const AlumnosInscritos = () => (
    <div className="h-full overflow-y-auto p-2">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FaCheckCircle className="text-green-600" />
          Alumnos Inscritos
          <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">
            {alumnosGrupo.length}
          </span>
        </h3>
        {grupoSeleccionado && (
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Grupo: <strong>{grupoSeleccionado.codigo}</strong> - {grupoSeleccionado.nivel}
          </p>
        )}
      </div>

      {alumnosGrupo.length === 0 ? (
        <div className="text-center py-12 px-4">
          <FaUsers size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-400 text-sm">No hay alumnos inscritos aún</p>
          <p className="text-xs text-gray-500 mt-2">
            Usa la pestaña "Disponibles" para inscribir alumnos
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alumnosGrupo.map(alumno => (
            <div
              key={alumno.id}
              className="flex items-center justify-between p-3 bg-green-50 border-2 border-green-200 rounded-lg hover:shadow-md transition-all"
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className="font-medium text-gray-800 text-sm sm:text-base truncate">
                  {alumno.nombre_completo}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {alumno.matricula}
                </div>
              </div>
              <button
                onClick={() => removerAlumno(alumno.inscripcion_id, alumno.nombre_completo)}
                className="text-red-600 hover:text-white hover:bg-red-600 p-2 sm:p-2.5 rounded-lg transition-all flex-shrink-0 border-2 border-red-200 hover:border-red-600"
                title="Remover del grupo"
              >
                <FaTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Componente de alumnos disponibles
  const AlumnosDisponibles = () => (
    <div className="h-full overflow-y-auto p-2">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <FaUserPlus className="text-blue-600" />
          Alumnos Disponibles
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
            {alumnosFiltrados.length}
          </span>
        </h3>
        
        {/* Buscador */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o matrícula..."
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
            value={buscador}
            onChange={(e) => {
              setBuscador(e.target.value);
              // Búsqueda dinámica con debounce
              const timeoutId = setTimeout(() => {
                buscarAlumnosDisponibles(e.target.value);
              }, 500);
              return () => clearTimeout(timeoutId);
            }}
          />
          {loadingDisponibles && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          )}
        </div>
        
        {grupoSeleccionado && (
          <p className="text-xs text-gray-600 mt-2">
            Mostrando alumnos del nivel <strong>{grupoSeleccionado.nivel}</strong>
          </p>
        )}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando alumnos...</p>
          </div>
        ) : alumnosFiltrados.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FaSearch size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-400 text-sm">
              {buscador 
                ? 'No se encontraron alumnos con ese criterio' 
                : `No hay alumnos disponibles del nivel ${grupoSeleccionado?.nivel || ''}`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alumnosFiltrados.map(alumno => (
              <div
                key={alumno.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm sm:text-base">
                    {alumno.nombre_completo}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                    <span className="bg-gray-200 px-2 py-0.5 rounded">{alumno.matricula}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{alumno.tipo_alumno}</span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Sem. {alumno.semestre}</span>
                  </div>
                </div>
                <button
                  onClick={() => inscribirAlumno(alumno)}
                  disabled={inscribiendoId === alumno.id || ultimoInscrito === alumno.id}
                  className={`px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg w-full sm:w-auto min-h-[44px] font-medium ${
                    ultimoInscrito === alumno.id
                      ? 'bg-green-600 text-white cursor-default'
                      : inscribiendoId === alumno.id
                      ? 'bg-gray-400 text-white cursor-wait'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {inscribiendoId === alumno.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Inscribiendo...</span>
                    </>
                  ) : ultimoInscrito === alumno.id ? (
                    <>
                      <FaCheckCircle className="animate-bounce" />
                      <span>¡Inscrito!</span>
                    </>
                  ) : (
                    <>
                      <FaUserPlus />
                      <span>Inscribir</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] max-h-[650px] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2.5 flex justify-between items-center flex-shrink-0">
          <div className="flex-1 min-w-0 mr-2">
            <h2 className="text-lg font-bold truncate">Gestionar Alumnos</h2>
            <p className="text-xs opacity-90 truncate">{maestro.nombre_completo}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-white/20 p-2 rounded-lg transition flex-shrink-0"
          >
            <FaTimes size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Navegación por Tabs (Solo móvil/tablet) */}
        <div className="lg:hidden border-b bg-gray-50 flex-shrink-0">
          <div className="flex">
            <button
              onClick={() => setVistaMovil('grupos')}
              className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-all ${
                vistaMovil === 'grupos'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FaUsers className="inline mr-1" />
              Grupos
            </button>
            <button
              onClick={() => setVistaMovil('inscritos')}
              disabled={!grupoSeleccionado}
              className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-all ${
                vistaMovil === 'inscritos'
                  ? 'bg-white text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${!grupoSeleccionado ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FaCheckCircle className="inline mr-1" />
              Inscritos
              {alumnosGrupo.length > 0 && (
                <span className="ml-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {alumnosGrupo.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setVistaMovil('disponibles')}
              disabled={!grupoSeleccionado}
              className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-all ${
                vistaMovil === 'disponibles'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${!grupoSeleccionado ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FaUserPlus className="inline mr-1" />
              Disponibles
              {alumnosFiltrados.length > 0 && (
                <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {alumnosFiltrados.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 overflow-hidden flex">
          {/* Vista Desktop - 3 Columnas */}
          <div className="hidden lg:flex flex-1 overflow-hidden">
            {/* Columna 1: Grupos */}
            <div className="w-1/3 bg-gray-50 border-r overflow-hidden">
              <ListaGrupos />
            </div>

            {/* Columna 2 y 3: Contenido del grupo */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
              {!grupoSeleccionado ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
                  <div className="text-center">
                    <FaUsers size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg sm:text-xl">Selecciona un grupo para gestionar sus alumnos</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Alumnos Inscritos - Parte superior (35% altura) */}
                  <div className="h-[35%] min-h-[200px] border-b-2 border-gray-300 bg-white overflow-hidden flex flex-col">
                    <AlumnosInscritos />
                  </div>

                  {/* Alumnos Disponibles - Parte inferior (65% altura) */}
                  <div className="flex-1 min-h-[250px] bg-white overflow-hidden flex flex-col">
                    <AlumnosDisponibles />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vista Móvil/Tablet - Tabs */}
          <div className="lg:hidden flex-1 overflow-hidden">
            {vistaMovil === 'grupos' && <ListaGrupos />}
            {vistaMovil === 'inscritos' && grupoSeleccionado && <AlumnosInscritos />}
            {vistaMovil === 'disponibles' && grupoSeleccionado && <AlumnosDisponibles />}
            
            {/* Mensaje si no hay grupo seleccionado */}
            {!grupoSeleccionado && vistaMovil !== 'grupos' && (
              <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
                <div className="text-center">
                  <FaUsers size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Primero selecciona un grupo</p>
                  <button
                    onClick={() => setVistaMovil('grupos')}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Ver Grupos
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionarAlumnosMaestro;
