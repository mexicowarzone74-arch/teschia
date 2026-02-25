import { useState, useEffect } from 'react';
import { gruposService, maestrosService, periodosService } from '../services/api';
import { toast } from 'react-toastify';
import { FaUserTie, FaUsers, FaClock, FaExclamationTriangle, FaCheck, FaSync, FaCalendarAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Asignaciones = () => {
    const { user } = useAuth();
    const [maestros, setMaestros] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [periodos, setPeriodos] = useState([]);
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
    const [loading, setLoading] = useState(true);
    const [conflictos, setConflictos] = useState([]);
    const [draggedGroup, setDraggedGroup] = useState(null);

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
            // Solo coordinador puede ver asignaciones
            if (user?.rol !== 'coordinador') {
                toast.error('No tienes permisos para acceder a esta página');
                setLoading(false);
                return;
            }
            
            const [maestrosRes, periodosRes] = await Promise.all([
                maestrosService.getAll(),
                periodosService.getAll()
            ]);
            
            // Usar todo el personal retornado (ya filtrado por el backend para excluir coordinadores)
            setMaestros(maestrosRes.data);
            
            const periodosActivos = periodosRes.data.filter(p => p.activo);
            setPeriodos(periodosActivos);
            
            if (periodosActivos.length > 0) {
                setPeriodoSeleccionado(periodosActivos[0].id);
            }
        } catch (error) {
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const cargarGrupos = async () => {
        try {
            const gruposRes = await gruposService.getAll();
            const periodoId = parseInt(periodoSeleccionado);
            const gruposFiltrados = !isNaN(periodoId) ? gruposRes.data.filter(g => g.periodo_id === periodoId) : [];
            setGrupos(gruposFiltrados);
            detectarConflictos(gruposFiltrados);
        } catch (error) {
            toast.error('Error al cargar grupos');
        }
    };

    const detectarConflictos = (gruposData) => {
        const conflictosEncontrados = [];
        const maestrosConGrupos = {};

        gruposData.forEach(grupo => {
            if (grupo.maestro_id) {
                if (!maestrosConGrupos[grupo.maestro_id]) {
                    maestrosConGrupos[grupo.maestro_id] = [];
                }
                maestrosConGrupos[grupo.maestro_id].push(grupo);
            }
        });

        // Detectar conflictos de horario
        Object.entries(maestrosConGrupos).forEach(([maestroId, gruposMaestro]) => {
            for (let i = 0; i < gruposMaestro.length; i++) {
                for (let j = i + 1; j < gruposMaestro.length; j++) {
                    const g1 = gruposMaestro[i];
                    const g2 = gruposMaestro[j];
                    
                    // Aquí podrías agregar lógica más compleja para detectar conflictos de horario
                    if (g1.horarios && g2.horarios && g1.horarios === g2.horarios) {
                        conflictosEncontrados.push({
                            maestro_id: maestroId,
                            grupos: [g1.codigo, g2.codigo],
                            tipo: 'horario'
                        });
                    }
                }
            }
        });

        setConflictos(conflictosEncontrados);
    };

    const handleDragStart = (grupo) => {
        setDraggedGroup(grupo);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (maestroId) => {
        if (!draggedGroup) return;
        
        if (user?.rol !== 'coordinador') {
            toast.error('No tienes permisos para realizar esta acción');
            return;
        }

        try {
            await gruposService.update(draggedGroup.id, {
                ...draggedGroup,
                maestro_id: maestroId
            });
            
            toast.success(`Grupo ${draggedGroup.codigo} asignado correctamente`);
            cargarGrupos();
            setDraggedGroup(null);
        } catch (error) {
            toast.error('Error al asignar grupo');
        }
    };

    const asignarGrupo = async (grupoId, maestroId) => {
        if (user?.rol !== 'coordinador') {
            toast.error('No tienes permisos para realizar esta acción');
            return;
        }
        
        try {
            const grupo = grupos.find(g => g.id === grupoId);
            await gruposService.update(grupoId, {
                ...grupo,
                maestro_id: maestroId
            });
            
            toast.success('Grupo asignado correctamente');
            cargarGrupos();
        } catch (error) {
            toast.error('Error al asignar grupo');
        }
    };

    const desasignarGrupo = async (grupoId) => {
        if (user?.rol !== 'coordinador') {
            toast.error('No tienes permisos para realizar esta acción');
            return;
        }
        
        try {
            const grupo = grupos.find(g => g.id === grupoId);
            await gruposService.update(grupoId, {
                ...grupo,
                maestro_id: null
            });
            
            toast.success('Grupo desasignado correctamente');
            cargarGrupos();
        } catch (error) {
            toast.error('Error al desasignar grupo');
        }
    };

    const gruposSinAsignar = grupos.filter(g => !g.maestro_id);
    const gruposAsignados = grupos.filter(g => g.maestro_id);

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
                        <FaUserTie className="text-tescha-blue" />
                        Dashboard de Asignaciones
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Asigna maestros a grupos de forma rápida y visual
                    </p>
                </div>
                <button
                    onClick={cargarGrupos}
                    className="btn-secondary flex items-center gap-2"
                >
                    <FaSync />
                    Actualizar
                </button>
            </div>

            {/* Selector de Periodo */}
            <div className="card">
                <div className="flex items-center gap-4">
                    <FaCalendarAlt className="text-2xl text-tescha-blue" />
                    <div className="flex-1">
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
                </div>
            </div>

            {/* Alertas de Conflictos */}
            {conflictos.length > 0 && (
                <div className="card bg-yellow-50 border-l-4 border-yellow-500">
                    <div className="flex items-start gap-3">
                        <FaExclamationTriangle className="text-2xl text-yellow-500 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2">
                                ⚠️ Conflictos Detectados ({conflictos.length})
                            </h3>
                            <ul className="text-sm text-gray-700 space-y-1">
                                {conflictos.map((c, i) => (
                                    <li key={i}>
                                        • Grupos {c.grupos.join(' y ')} tienen el mismo horario
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Estadísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card bg-blue-50 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Total Grupos</p>
                            <p className="text-3xl font-bold text-blue-600">{grupos.length}</p>
                        </div>
                        <FaUsers className="text-4xl text-blue-300" />
                    </div>
                </div>

                <div className="card bg-green-50 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Grupos Asignados</p>
                            <p className="text-3xl font-bold text-green-600">{gruposAsignados.length}</p>
                        </div>
                        <FaCheck className="text-4xl text-green-300" />
                    </div>
                </div>

                <div className="card bg-orange-50 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Sin Asignar</p>
                            <p className="text-3xl font-bold text-orange-600">{gruposSinAsignar.length}</p>
                        </div>
                        <FaExclamationTriangle className="text-4xl text-orange-300" />
                    </div>
                </div>

                <div className="card bg-purple-50 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Maestros Activos</p>
                            <p className="text-3xl font-bold text-purple-600">{maestros.length}</p>
                        </div>
                        <FaUserTie className="text-4xl text-purple-300" />
                    </div>
                </div>
            </div>

            {/* Panel Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel de Maestros */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="card">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <FaUserTie className="text-tescha-blue" />
                            Maestros y sus Grupos
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            💡 Arrastra grupos desde el panel derecho para asignarlos
                        </p>

                        <div className="space-y-3">
                            {maestros.map(maestro => {
                                const gruposMaestro = grupos.filter(g => g.maestro_id === maestro.id);
                                const tieneConflicto = conflictos.some(c => c.maestro_id === maestro.id);

                                return (
                                    <div
                                        key={maestro.id}
                                        className={`border-2 rounded-lg p-4 transition-all ${
                                            tieneConflicto ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-blue-400'
                                        }`}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(maestro.id)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                                    <FaUserTie className="text-tescha-blue" />
                                                    {maestro.nombre_completo}
                                                </h3>
                                                <p className="text-sm text-gray-500">{maestro.email}</p>
                                            </div>
                                            <span className="badge badge-primary">
                                                {gruposMaestro.length} grupo{gruposMaestro.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {gruposMaestro.length > 0 ? (
                                            <div className="space-y-2">
                                                {gruposMaestro.map(grupo => (
                                                    <div
                                                        key={grupo.id}
                                                        className="flex items-center justify-between bg-white p-3 rounded border border-gray-200"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-medium text-tescha-blue">{grupo.codigo}</span>
                                                            <span className="badge badge-secondary">{grupo.nivel_nombre}</span>
                                                            <span className="text-sm text-gray-600 flex items-center gap-1">
                                                                <FaClock className="text-xs" />
                                                                {grupo.horarios || 'Sin horario'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => desasignarGrupo(grupo.id)}
                                                            className="text-red-600 hover:text-red-800 text-sm"
                                                        >
                                                            Desasignar
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                                                <p className="text-sm text-gray-500">
                                                    Sin grupos asignados. Arrastra un grupo aquí.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Panel de Grupos Sin Asignar */}
                <div className="space-y-4">
                    <div className="card sticky top-4">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <FaUsers className="text-orange-600" />
                            Grupos Sin Asignar
                            <span className="badge badge-warning ml-auto">{gruposSinAsignar.length}</span>
                        </h2>

                        {gruposSinAsignar.length > 0 ? (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {gruposSinAsignar.map(grupo => (
                                    <div
                                        key={grupo.id}
                                        draggable
                                        onDragStart={() => handleDragStart(grupo)}
                                        className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 cursor-move hover:bg-orange-100 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-gray-800">{grupo.codigo}</span>
                                            <span className="badge badge-primary">{grupo.nivel_nombre}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 space-y-1">
                                            <p className="flex items-center gap-1">
                                                <FaClock />
                                                {grupo.horarios || 'Sin horario'}
                                            </p>
                                            <p>
                                                 {grupo.alumnos_inscritos || 0}/{grupo.cupo_maximo}
                                            </p>
                                        </div>

                                        {/* Asignación Rápida */}
                                        <div className="mt-3 pt-3 border-t border-orange-300">
                                            <label className="text-xs font-medium text-gray-700 block mb-1">
                                                Asignación rápida:
                                            </label>
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        const maestroId = parseInt(e.target.value);
                                                        if (!isNaN(maestroId)) asignarGrupo(grupo.id, maestroId);
                                                    }
                                                }}
                                                className="input text-xs"
                                                defaultValue=""
                                            >
                                                <option value="">Seleccionar maestro...</option>
                                                {maestros.map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.nombre_completo}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-green-50 rounded border-2 border-dashed border-green-300">
                                <FaCheck className="text-4xl text-green-500 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">
                                    ¡Todos los grupos están asignados!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Asignaciones;
