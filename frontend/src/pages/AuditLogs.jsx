import { useState, useEffect } from 'react';
import { auditoriaService, maestrosService } from '../services/api';
import { toast } from 'react-toastify';
import { 
    FaHistory, FaSearch, FaFilter, FaFileAlt, 
    FaUserShield, FaCalendarAlt, FaTable, FaEye,
    FaArrowLeft, FaArrowRight
} from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [filtros, setFiltros] = useState({
        tabla: '',
        accion: '',
        usuario_id: '',
        fecha_inicio: '',
        fecha_fin: ''
    });
    const [usuarios, setUsuarios] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        cargarLogs();
        cargarStats();
        cargarUsuarios();
    }, [filtros, pagination.page]);

    const cargarLogs = async () => {
        try {
            setLoading(true);
            const res = await auditoriaService.getLogs({
                ...filtros,
                page: pagination.page,
                limit: 50
            });
            setLogs(res.data.data);
            setPagination(res.data.pagination);
        } catch (error) {
            toast.error('Error al cargar logs de auditoría');
        } finally {
            setLoading(false);
        }
    };

    const cargarStats = async () => {
        try {
            const res = await auditoriaService.getStats();
            setStats(res.data);
        } catch (error) {}
    };

    const cargarUsuarios = async () => {
        try {
            const res = await maestrosService.getAll(); // Usamos maestros para obtener lista de usuarios con nombre
            setUsuarios(res.data);
        } catch (error) {}
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFiltros(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const formatDiff = (data) => {
        if (!data) return 'N/A';
        try {
            return JSON.stringify(data, null, 2);
        } catch (e) {
            return String(data);
        }
    };

    const getActionBadge = (accion) => {
        const colors = {
            'INSERT': 'bg-green-100 text-green-800',
            'UPDATE': 'bg-blue-100 text-blue-800',
            'DELETE': 'bg-red-100 text-red-800'
        };
        return `px-2 py-1 rounded-full text-xs font-bold ${colors[accion] || 'bg-gray-100 text-gray-800'}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <FaHistory className="text-tescha-blue" />
                        Bitácora de Auditoría
                    </h1>
                    <p className="text-gray-600 mt-2">Seguimiento detallado de todas las acciones realizadas en el sistema</p>
                </div>
            </div>

            {/* Resumen Estadístico */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card bg-blue-50 border-l-4 border-blue-500 p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-medium text-blue-600 uppercase">Total Eventos</p>
                            <p className="text-2xl font-bold text-gray-800">{pagination.total}</p>
                        </div>
                        <FaFileAlt className="text-2xl text-blue-300" />
                    </div>
                </div>
                {stats?.statsByTable?.slice(0, 3).map(s => (
                    <div key={s.tabla} className="card p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">{s.tabla}</p>
                                <p className="text-2xl font-bold text-gray-800">{s.total}</p>
                                <p className="text-[10px] text-green-600 font-bold">+{s.ultimas_24h} últimas 24h</p>
                            </div>
                            <FaTable className="text-2xl text-gray-200" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tabla</label>
                        <select 
                            name="tabla" 
                            className="input text-sm"
                            value={filtros.tabla}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todas las tablas</option>
                            <option value="alumnos">Alumnos</option>
                            <option value="grupos">Grupos</option>
                            <option value="calificaciones">Calificaciones</option>
                            <option value="pagos">Pagos</option>
                            <option value="maestros">Maestros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Acción</label>
                        <select 
                            name="accion" 
                            className="input text-sm"
                            value={filtros.accion}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todas las acciones</option>
                            <option value="INSERT">Creación (INSERT)</option>
                            <option value="UPDATE">Modificación (UPDATE)</option>
                            <option value="DELETE">Eliminación (DELETE)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                        <input 
                            type="date" 
                            name="fecha_inicio"
                            className="input text-sm"
                            value={filtros.fecha_inicio}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                        <input 
                            type="date" 
                            name="fecha_fin"
                            className="input text-sm"
                            value={filtros.fecha_fin}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={cargarLogs}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            <FaSearch /> Filtrar
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabla de Logs */}
            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Fecha y Hora</th>
                                <th>Usuario</th>
                                <th>Acción</th>
                                <th>Tabla</th>
                                <th>Reg. ID</th>
                                <th>IP Address</th>
                                <th>Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-8">Cargando bitácora...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-8">No se encontraron registros de auditoría</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="text-xs whitespace-nowrap">
                                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                                        </td>
                                        <td className="text-sm font-medium flex items-center gap-2">
                                            <FaUserShield className="text-gray-400" />
                                            {log.usuario_nombre || 'Sistema'}
                                        </td>
                                        <td>
                                            <span className={getActionBadge(log.accion)}>
                                                {log.accion}
                                            </span>
                                        </td>
                                        <td><span className="badge badge-primary text-[10px]">{log.tabla}</span></td>
                                        <td className="font-mono text-xs">{log.registro_id}</td>
                                        <td className="text-[10px] text-gray-500">{log.ip_address}</td>
                                        <td>
                                            <button 
                                                onClick={() => setSelectedLog(log)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <FaEye />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                        Página {pagination.page} de {pagination.pages} ({pagination.total} registros)
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={pagination.page === 1}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            className="btn-secondary py-1 px-3 disabled:opacity-50"
                        >
                            <FaArrowLeft />
                        </button>
                        <button 
                            disabled={pagination.page === pagination.pages}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            className="btn-secondary py-1 px-3 disabled:opacity-50"
                        >
                            <FaArrowRight />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Detalles */}
            {selectedLog && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">Detalles del Cambio - Log #{selectedLog.id}</h3>
                            <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-800">
                                &times;
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Datos Anteriores</h4>
                                <pre className="p-4 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 whitespace-pre-wrap overflow-x-auto">
                                    {formatDiff(selectedLog.datos_anteriores)}
                                </pre>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Datos Nuevos</h4>
                                <pre className="p-4 bg-green-50 text-green-700 text-xs rounded-lg border border-green-100 whitespace-pre-wrap overflow-x-auto">
                                    {formatDiff(selectedLog.datos_nuevos)}
                                </pre>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setSelectedLog(null)} className="btn-secondary">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
