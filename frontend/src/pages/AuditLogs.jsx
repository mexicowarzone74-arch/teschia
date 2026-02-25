import { useState, useEffect, useRef, useCallback } from 'react';
import { auditoriaService } from '../services/api';
import { toast } from 'react-toastify';
import { useSocket } from '../contexts/SocketContext';
import {
  FaHistory, FaFilter, FaFileAlt,
  FaTable, FaEye, FaArrowLeft, FaArrowRight,
  FaDownload, FaSyncAlt, FaUser
} from 'react-icons/fa';

// ── Hora México ────────────────────────────────────────
const formatMX = (isoStr) => {
  if (!isoStr) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).format(new Date(isoStr));
};

// ── Descripción legible ────────────────────────────────
const descripcionLegible = (log) => {
  const { accion, tabla, datos_nuevos, datos_anteriores } = log;
  const n = datos_nuevos || {};
  const a = datos_anteriores || {};
  const nombre = n.nombre_completo || n.nombre || a.nombre_completo || a.nombre || '';
  const map = {
    alumnos:       { INSERT: `Alumno registrado${nombre ? ': ' + nombre : ''}`, UPDATE: `Alumno modificado${nombre ? ': ' + nombre : ''}`, DELETE: `Alumno eliminado${nombre ? ': ' + nombre : ''}` },
    maestros:      { INSERT: `Personal agregado${nombre ? ': ' + nombre : ''}`, UPDATE: `Personal modificado${nombre ? ': ' + nombre : ''}`, DELETE: `Personal eliminado${nombre ? ': ' + nombre : ''}` },
    grupos:        { INSERT: `Grupo creado${n.codigo ? ': ' + n.codigo : ''}`, UPDATE: `Grupo modificado${a.codigo ? ': ' + a.codigo : ''}`, DELETE: `Grupo eliminado` },
    pagos:         { INSERT: `Pago registrado${n.monto ? ' ($' + n.monto + ')' : ''}`, UPDATE: `Pago modificado${n.monto ? ' ($' + n.monto + ')' : ''}`, DELETE: `Pago eliminado` },
    calificaciones:{ INSERT: `Calificación registrada`, UPDATE: `Calificación modificada`, DELETE: `Calificación eliminada` },
    inscripciones: { INSERT: `Inscripción creada`, UPDATE: `Inscripción modificada`, DELETE: `Inscripción cancelada` },
    periodos:      { INSERT: `Período creado${n.nombre ? ': ' + n.nombre : ''}`, UPDATE: `Período modificado`, DELETE: `Período eliminado` },
    usuarios:      { INSERT: `Usuario creado${n.username ? ': @' + n.username : ''}`, UPDATE: `Usuario modificado${a.username ? ': @' + a.username : ''}`, DELETE: `Usuario eliminado` },
    asistencias:   { INSERT: `Asistencia registrada`, UPDATE: `Asistencia modificada`, DELETE: `Asistencia eliminada` },
  };
  return map[tabla]?.[accion] || `${accion} en ${tabla}`;
};

const ActionBadge = ({ accion }) => {
  const cfg = {
    INSERT: { cls: 'bg-green-100 text-green-800 border border-green-200', label: '+ ALTA' },
    UPDATE: { cls: 'bg-blue-100 text-blue-800 border border-blue-200', label: '✏ EDICIÓN' },
    DELETE: { cls: 'bg-red-100 text-red-800 border border-red-200', label: '✕ BAJA' },
  };
  const { cls, label } = cfg[accion] || { cls: 'bg-gray-100 text-gray-700', label: accion };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{label}</span>;
};

const RolBadge = ({ rol }) => {
  const cfg = { coordinador: 'bg-purple-100 text-purple-800', maestro: 'bg-blue-100 text-blue-800', administrativo: 'bg-orange-100 text-orange-800' };
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${cfg[rol] || 'bg-gray-100 text-gray-600'}`}>{rol || 'sistema'}</span>;
};

const tablaBadge = (tabla) => {
  const c = { alumnos:'bg-indigo-100 text-indigo-800', maestros:'bg-teal-100 text-teal-800', pagos:'bg-yellow-100 text-yellow-800', grupos:'bg-pink-100 text-pink-800', calificaciones:'bg-green-100 text-green-800', inscripciones:'bg-orange-100 text-orange-800', periodos:'bg-purple-100 text-purple-800', usuarios:'bg-red-100 text-red-800', asistencias:'bg-cyan-100 text-cyan-800' };
  return `px-2 py-0.5 rounded text-[10px] font-bold ${c[tabla] || 'bg-gray-100 text-gray-700'}`;
};

const exportarCSV = (logs) => {
  const headers = ['ID','Fecha/Hora (México)','Usuario','Rol','Acción','Tabla','Descripción','IP'];
  const rows = logs.map(l => [ l.id, formatMX(l.created_at_mx || l.created_at), l.usuario_nombre_real ? `${l.usuario_nombre_real} ${l.usuario_apellido||''}`.trim() : (l.usuario_nombre||'Sistema'), l.usuario_rol||'', l.accion, l.tabla, descripcionLegible(l), l.ip_address||'' ]);
  const csv = [headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`auditoria_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
};

// ══════════════════════════════════════════════════════
const AuditLogs = () => {
  const { socket } = useSocket();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filtros, setFiltros] = useState({ tabla:'', accion:'', usuario_id:'', fecha_inicio:'', fecha_fin:'' });
  const [usuariosAudit, setUsuariosAudit] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const autoRefreshRef = useRef(null);
  const currentPage = useRef(1);

  const cargarLogs = useCallback(async (page) => {
    const p = page ?? currentPage.current;
    try {
      setLoading(true);
      const res = await auditoriaService.getLogs({ ...filtros, page: p, limit: 50 });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
      currentPage.current = p;
      setLastRefresh(new Date());
    } catch {
      toast.error('Error al cargar logs de auditoría');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarLogs(1);
    auditoriaService.getStats().then(r => setStats(r.data)).catch(()=>{});
    auditoriaService.getUsuarios().then(r => setUsuariosAudit(r.data)).catch(()=>{});
  }, [filtros]);

  // Auto-refresh cada 30s
  useEffect(() => {
    autoRefreshRef.current = setInterval(() => { if (!selectedLog) cargarLogs(); }, 30000);
    return () => clearInterval(autoRefreshRef.current);
  }, [cargarLogs, selectedLog]);

  // Socket: nuevo evento
  useEffect(() => {
    if (!socket) return;
    const handler = () => { if (currentPage.current === 1) cargarLogs(1); };
    socket.on('auditoria:nueva', handler);
    return () => socket.off('auditoria:nueva', handler);
  }, [socket, cargarLogs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FaHistory className="text-tescha-blue" /> Bitácora de Auditoría
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Todo queda registrado — nada se pierde. Hora: México (UTC&#8209;6)
            <span className="ml-2 text-gray-400 text-xs">Actualizado: {formatMX(lastRefresh.toISOString())}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => cargarLogs()} className="btn-secondary flex items-center gap-2 py-2 px-3 text-sm">
            <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          {logs.length > 0 && (
            <button onClick={() => exportarCSV(logs)} className="btn-secondary flex items-center gap-2 py-2 px-3 text-sm">
              <FaDownload /> Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card bg-blue-50 border-l-4 border-blue-500 p-4">
          <p className="text-xs font-bold text-blue-600 uppercase">Total Eventos</p>
          <p className="text-2xl font-bold text-gray-800">{pagination.total.toLocaleString()}</p>
          <FaFileAlt className="text-blue-200 text-lg mt-1" />
        </div>
        {stats?.statsByTable?.slice(0, 3).map(s => (
          <div key={s.tabla} className="card p-4">
            <span className={tablaBadge(s.tabla)}>{s.tabla}</span>
            <p className="text-2xl font-bold text-gray-800 mt-1">{s.total}</p>
            <p className="text-[10px] text-green-600 font-bold">+{s.ultimas_24h} hoy</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <FaFilter className="text-gray-400" />
          <span className="font-semibold text-gray-700 text-sm">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tabla</label>
            <select name="tabla" className="input text-sm" value={filtros.tabla} onChange={handleFilterChange}>
              <option value="">Todas</option>
              <option value="alumnos">Alumnos</option>
              <option value="grupos">Grupos</option>
              <option value="calificaciones">Calificaciones</option>
              <option value="pagos">Pagos</option>
              <option value="maestros">Personal</option>
              <option value="inscripciones">Inscripciones</option>
              <option value="periodos">Períodos</option>
              <option value="usuarios">Usuarios</option>
              <option value="asistencias">Asistencias</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Acción</label>
            <select name="accion" className="input text-sm" value={filtros.accion} onChange={handleFilterChange}>
              <option value="">Todas</option>
              <option value="INSERT">Alta (INSERT)</option>
              <option value="UPDATE">Edición (UPDATE)</option>
              <option value="DELETE">Baja (DELETE)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
            <select name="usuario_id" className="input text-sm" value={filtros.usuario_id} onChange={handleFilterChange}>
              <option value="">Todos</option>
              {usuariosAudit.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nombre ? `${u.nombre} ${u.apellido_paterno||''}`.trim() : u.username} ({u.rol})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input type="date" name="fecha_inicio" className="input text-sm" value={filtros.fecha_inicio} onChange={handleFilterChange} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" name="fecha_fin" className="input text-sm" value={filtros.fecha_fin} onChange={handleFilterChange} />
          </div>
          <div className="flex items-end">
            <button onClick={() => setFiltros({ tabla:'', accion:'', usuario_id:'', fecha_inicio:'', fecha_fin:'' })} className="btn-secondary w-full text-sm py-2">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table text-sm">
            <thead>
              <tr className="text-xs">
                <th className="w-40">Fecha/Hora MX</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Tabla</th>
                <th className="min-w-[220px]">Descripción</th>
                <th className="w-28 text-center hidden md:table-cell">IP</th>
                <th className="w-10 text-center">Ver</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10 text-gray-400">Cargando bitácora...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-gray-400">No hay registros con los filtros actuales</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="text-xs font-mono whitespace-nowrap">
                    {formatMX(log.created_at_mx || log.created_at)}
                  </td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-xs font-medium">
                        <FaUser className="text-gray-400 text-[10px]" />
                        {log.usuario_nombre_real ? `${log.usuario_nombre_real} ${log.usuario_apellido||''}`.trim() : (log.usuario_nombre||'Sistema')}
                      </span>
                      <RolBadge rol={log.usuario_rol} />
                    </div>
                  </td>
                  <td><ActionBadge accion={log.accion} /></td>
                  <td><span className={tablaBadge(log.tabla)}>{log.tabla}</span></td>
                  <td className="text-xs text-gray-600 max-w-xs truncate">{descripcionLegible(log)}</td>
                  <td className="text-[10px] text-gray-400 text-center hidden md:table-cell">{log.ip_address || '—'}</td>
                  <td className="text-center">
                    <button onClick={() => setSelectedLog(log)} className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded" title="Ver detalles">
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Página {pagination.page} de {pagination.pages} &bull; {pagination.total.toLocaleString()} registros totales
          </p>
          <div className="flex gap-2">
            <button disabled={pagination.page===1} onClick={() => cargarLogs(pagination.page-1)} className="btn-secondary py-1 px-3 disabled:opacity-40"><FaArrowLeft /></button>
            <button disabled={pagination.page===pagination.pages} onClick={() => cargarLogs(pagination.page+1)} className="btn-secondary py-1 px-3 disabled:opacity-40"><FaArrowRight /></button>
          </div>
        </div>
      </div>

      {/* ── MODAL FIXED — no causa scroll ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target===e.currentTarget) setSelectedLog(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-800">Detalles del Cambio — Log #{selectedLog.id}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <ActionBadge accion={selectedLog.accion} />
                  <span className={tablaBadge(selectedLog.tabla)}>{selectedLog.tabla}</span>
                  <span className="text-xs text-gray-500">{formatMX(selectedLog.created_at_mx || selectedLog.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                  <FaUser className="text-gray-400 text-xs" />
                  {selectedLog.usuario_nombre_real ? `${selectedLog.usuario_nombre_real} ${selectedLog.usuario_apellido||''}`.trim() : (selectedLog.usuario_nombre||'Sistema')}
                  <RolBadge rol={selectedLog.usuario_rol} />
                  {selectedLog.ip_address && <span className="text-gray-400 text-xs">IP: {selectedLog.ip_address}</span>}
                </p>
                <p className="text-sm font-medium text-indigo-700 mt-1">📝 {descripcionLegible(selectedLog)}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none ml-4">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold text-red-500 uppercase mb-2">● Datos Anteriores</h4>
                <pre className="p-4 bg-red-50 text-red-800 text-xs rounded-lg border border-red-100 whitespace-pre-wrap break-all overflow-auto max-h-72">
                  {selectedLog.datos_anteriores ? JSON.stringify(selectedLog.datos_anteriores, null, 2) : 'N/A'}
                </pre>
              </div>
              <div>
                <h4 className="text-xs font-bold text-green-600 uppercase mb-2">● Datos Nuevos</h4>
                <pre className="p-4 bg-green-50 text-green-800 text-xs rounded-lg border border-green-100 whitespace-pre-wrap break-all overflow-auto max-h-72">
                  {selectedLog.datos_nuevos ? JSON.stringify(selectedLog.datos_nuevos, null, 2) : 'N/A'}
                </pre>
              </div>
            </div>
            <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;