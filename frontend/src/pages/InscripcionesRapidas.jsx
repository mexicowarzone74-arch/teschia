import { useState, useEffect } from 'react';
import { alumnosService, gruposService, periodosService, inscripcionesService } from '../services/api';
import { toast } from 'react-toastify';
import { FaSearch, FaUsers, FaUserPlus, FaFilter, FaCheckCircle, FaTimesCircle, FaSync } from 'react-icons/fa';

const InscripcionesRapidas = () => {
    const [alumnos, setAlumnos] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [periodos, setPeriodos] = useState([]);
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Filtros y búsqueda
    const [busqueda, setBusqueda] = useState('');
    const [filtroNivel, setFiltroNivel] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroEstatus, setFiltroEstatus] = useState('activo');
    
    // Selección
    const [alumnosSeleccionados, setAlumnosSeleccionados] = useState([]);
    const [grupoDestino, setGrupoDestino] = useState('');

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        if (periodoSeleccionado) {
            cargarGrupos();
        }
    }, [periodoSeleccionado]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [alumnosRes, periodosRes] = await Promise.all([
                alumnosService.getAll(),
                periodosService.getAll()
            ]);
            
            // Extraer alumnos (el endpoint devuelve { alumnos: [...], total, page, pages })
            const alumnosData = alumnosRes.data?.alumnos || alumnosRes.data?.data || alumnosRes.data || [];
            setAlumnos(Array.isArray(alumnosData) ? alumnosData : []);
            
            const periodosActivos = (periodosRes.data || []).filter(p => p.activo);
            setPeriodos(periodosActivos);
            
            if (periodosActivos.length > 0) {
                setPeriodoSeleccionado(periodosActivos[0].id);
            }
        } catch (error) {
            toast.error('Error al cargar datos');
            setAlumnos([]);
            setPeriodos([]);
        } finally {
            setLoading(false);
        }
    };

    const cargarGrupos = async () => {
        try {
            const gruposRes = await gruposService.getAll();
            const periodoId = parseInt(periodoSeleccionado);
            const gruposFiltrados = !isNaN(periodoId) 
                ? gruposRes.data.filter(g => g.periodo_id === periodoId)
                : [];
            setGrupos(gruposFiltrados);
        } catch (error) {
            toast.error('Error al cargar grupos');
        }
    };

    const inscribirAlumnos = async () => {
        if (alumnosSeleccionados.length === 0) {
            toast.warning('Selecciona al menos un alumno');
            return;
        }
        if (!grupoDestino) {
            toast.warning('Selecciona un grupo');
            return;
        }

        try {
            setLoading(true);
            
            // Validar IDs primero
            const grupoId = parseInt(grupoDestino);
            const periodoId = parseInt(periodoSeleccionado);
            
            if (isNaN(grupoId) || isNaN(periodoId)) {
                toast.error('Grupo o período inválido');
                setLoading(false);
                return;
            }
            
            // Inscribir cada alumno
            const promesas = alumnosSeleccionados.map(alumnoId =>
                inscripcionesService.create({
                    alumno_id: alumnoId,
                    grupo_id: grupoId,
                    periodo_id: periodoId
                })
            );

            await Promise.all(promesas);
            
            toast.success(`${alumnosSeleccionados.length} alumno(s) inscrito(s) correctamente`);
            setAlumnosSeleccionados([]);
            setGrupoDestino('');
            cargarGrupos(); // Actualizar cupos
        } catch (error) {
            toast.error('Error al inscribir: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const toggleSeleccion = (alumnoId) => {
        if (alumnosSeleccionados.includes(alumnoId)) {
            setAlumnosSeleccionados(alumnosSeleccionados.filter(id => id !== alumnoId));
        } else {
            setAlumnosSeleccionados([...alumnosSeleccionados, alumnoId]);
        }
    };

    const seleccionarTodos = () => {
        const alumnosFiltradosIds = alumnosFiltrados.map(a => a.id);
        setAlumnosSeleccionados(alumnosFiltradosIds);
    };

    const limpiarSeleccion = () => {
        setAlumnosSeleccionados([]);
    };

    // Filtrado de alumnos
    const alumnosFiltrados = (Array.isArray(alumnos) ? alumnos : []).filter(alumno => {
        // Búsqueda por texto
        const coincideBusqueda = busqueda === '' || 
            alumno.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
            alumno.matricula?.toLowerCase().includes(busqueda.toLowerCase()) ||
            alumno.correo?.toLowerCase().includes(busqueda.toLowerCase());

        // Filtro por nivel
        const coincideNivel = filtroNivel === '' || alumno.nivel_nombre === filtroNivel;

        // Filtro por tipo
        const coincideTipo = filtroTipo === '' || alumno.tipo_alumno === filtroTipo;

        // Filtro por estatus
        const coincideEstatus = filtroEstatus === '' || alumno.estatus === filtroEstatus;

        return coincideBusqueda && coincideNivel && coincideTipo && coincideEstatus;
    });

    const niveles = ['Basico', 'Intermedio', 'Avanzado', 'Perfeccionamiento 1', 'Perfeccionamiento 2', 'C1'];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tescha-blue"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <FaUserPlus className="text-tescha-blue" />
                        Inscripciones Rápidas
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Inscribe alumnos a grupos de forma masiva y eficiente
                    </p>
                </div>
                <button
                    onClick={cargarDatos}
                    className="btn-secondary flex items-center gap-2"
                >
                    <FaSync />
                    Actualizar
                </button>
            </div>

            {/* Selector de Periodo */}
            <div className="card">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Período Académico
                </label>
                <select
                    value={periodoSeleccionado}
                    onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                    className="input max-w-md"
                >
                    {periodos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Panel de Inscripción */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel Izquierdo: Búsqueda y Filtros */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Búsqueda */}
                    <div className="card">
                        <div className="flex items-center gap-2 mb-4">
                            <FaSearch className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, matrícula o email..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="input flex-1"
                            />
                        </div>

                        {/* Filtros */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    <FaFilter className="inline mr-1" /> Nivel
                                </label>
                                <select
                                    value={filtroNivel}
                                    onChange={(e) => setFiltroNivel(e.target.value)}
                                    className="input text-sm"
                                >
                                    <option value="">Todos los niveles</option>
                                    {niveles.map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Tipo de Alumno
                                </label>
                                <select
                                    value={filtroTipo}
                                    onChange={(e) => setFiltroTipo(e.target.value)}
                                    className="input text-sm"
                                >
                                    <option value="">Todos</option>
                                    <option value="interno">Internos</option>
                                    <option value="externo">Externos</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Estatus
                                </label>
                                <select
                                    value={filtroEstatus}
                                    onChange={(e) => setFiltroEstatus(e.target.value)}
                                    className="input text-sm"
                                >
                                    <option value="">Todos</option>
                                    <option value="activo">Activos</option>
                                    <option value="inactivo">Inactivos</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <p className="text-sm text-gray-600">
                                {alumnosFiltrados.length} alumno(s) encontrado(s)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={seleccionarTodos}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    Seleccionar todos
                                </button>
                                <button
                                    onClick={limpiarSeleccion}
                                    className="text-sm text-red-600 hover:text-red-800"
                                >
                                    Limpiar selección
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Alumnos */}
                    <div className="card">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FaUsers className="text-tescha-blue" />
                            Alumnos ({alumnosSeleccionados.length} seleccionados)
                        </h3>

                        <div className="max-h-[500px] overflow-y-auto space-y-2">
                            {alumnosFiltrados.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No se encontraron alumnos
                                </div>
                            ) : (
                                alumnosFiltrados.map(alumno => {
                                    const seleccionado = alumnosSeleccionados.includes(alumno.id);
                                    return (
                                        <div
                                            key={alumno.id}
                                            onClick={() => toggleSeleccion(alumno.id)}
                                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                                seleccionado
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {seleccionado ? (
                                                            <FaCheckCircle className="text-blue-600" />
                                                        ) : (
                                                            <FaTimesCircle className="text-gray-300" />
                                                        )}
                                                        <span className="font-medium text-gray-800">
                                                            {alumno.nombre_completo}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                                        <span>📋 {alumno.matricula}</span>
                                                        <span className="badge badge-primary text-xs">
                                                            {alumno.nivel_nombre}
                                                        </span>
                                                        <span className={`badge text-xs ${
                                                            alumno.tipo_alumno === 'interno' ? 'badge-info' : 'badge-warning'
                                                        }`}>
                                                            {alumno.tipo_alumno}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel Derecho: Selección de Grupo e Inscripción */}
                <div className="space-y-4">
                    <div className="card sticky top-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <FaUserPlus className="text-green-600" />
                            Inscribir a Grupo
                        </h3>

                        {/* Resumen de Selección */}
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
                            <p className="text-sm font-medium text-blue-900">
                                {alumnosSeleccionados.length} alumno(s) seleccionado(s)
                            </p>
                        </div>

                        {/* Selector de Grupo */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Grupo de Destino *
                            </label>
                            {(() => {
                                // Obtener niveles únicos de los alumnos seleccionados
                                const nivelesUnicos = [...new Set(
                                    alumnosSeleccionados.map(id => {
                                        const a = alumnos.find(al => al.id === id);
                                        return a?.nivel_nombre;
                                    }).filter(Boolean)
                                )];

                                if (nivelesUnicos.length > 1) {
                                    return (
                                        <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg text-xs text-red-700">
                                            ⚠️ Has seleccionado alumnos de diferentes niveles ({nivelesUnicos.join(', ')}). 
                                            Para inscribir, todos los seleccionados deben ser del mismo nivel.
                                        </div>
                                    );
                                }

                                const nivelFiltro = nivelesUnicos[0];
                                const gruposMostrados = nivelFiltro 
                                    ? grupos.filter(g => g.nivel_nombre === nivelFiltro)
                                    : grupos;

                                return (
                                    <>
                                        <select
                                            value={grupoDestino}
                                            onChange={(e) => setGrupoDestino(e.target.value)}
                                            className="input"
                                        >
                                            <option value="">
                                                {nivelFiltro 
                                                    ? `Seleccionar grupo de nivel ${nivelFiltro}...` 
                                                    : 'Seleccionar grupo...'}
                                            </option>
                                            {gruposMostrados.map(g => {
                                                const cupoDisponible = g.cupo_maximo - (g.alumnos_inscritos || 0);
                                                const tieneCupo = cupoDisponible > 0;
                                                
                                                return (
                                                    <option 
                                                        key={g.id} 
                                                        value={g.id}
                                                        disabled={!tieneCupo}
                                                    >
                                                        {g.codigo} - {g.nivel_nombre} 
                                                        ({g.alumnos_inscritos || 0}/{g.cupo_maximo})
                                                        {!tieneCupo && ' - SIN CUPO'}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {nivelFiltro && gruposMostrados.length === 0 && (
                                            <p className="text-xs text-red-600 mt-1">
                                                No hay grupos disponibles para el nivel {nivelFiltro} en este periodo.
                                            </p>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Información del Grupo Seleccionado */}
                        {grupoDestino && (
                            <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
                                {(() => {
                                    const grupoId = parseInt(grupoDestino);
                                    const grupo = !isNaN(grupoId) ? grupos.find(g => g.id === grupoId) : null;
                                    if (!grupo) return null;
                                    
                                    return (
                                        <>
                                            <p className="font-medium text-gray-800 mb-2">{grupo.codigo}</p>
                                            <div className="space-y-1 text-gray-600">
                                                <p>📚 Nivel: {grupo.nivel_nombre}</p>
                                                <p>👨‍🏫 Maestro: {grupo.maestro_nombre || 'Sin asignar'}</p>
                                                <p>⏰ {grupo.horarios || 'Sin horario'}</p>
                                                <p className="font-medium">
                                                    👥 Cupo: {grupo.alumnos_inscritos || 0}/{grupo.cupo_maximo}
                                                </p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Botón de Inscripción */}
                        <button
                            onClick={inscribirAlumnos}
                            disabled={alumnosSeleccionados.length === 0 || !grupoDestino || loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            <FaUserPlus />
                            {loading ? 'Inscribiendo...' : `Inscribir ${alumnosSeleccionados.length} alumno(s)`}
                        </button>

                        {/* Tips */}
                        <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-xs">
                            <p className="font-medium text-yellow-900 mb-1">💡 Tips:</p>
                            <ul className="text-yellow-800 space-y-1">
                                <li>• Usa los filtros para encontrar alumnos rápido</li>
                                <li>• Haz clic en "Seleccionar todos" para inscripción masiva</li>
                                <li>• Verifica el cupo disponible antes de inscribir</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InscripcionesRapidas;
