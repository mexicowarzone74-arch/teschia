import { useState, useEffect } from 'react';
import { pagosService } from '../services/api';
import { FaTimes, FaExclamationTriangle, FaClock, FaCheckCircle, FaInfoCircle, FaEnvelope, FaPhone, FaUser, FaEyeSlash, FaBan, FaMoneyBillWave, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import eventBus from '../utils/eventBus';
import { usePermissions } from '../hooks/usePermissions';

const NotificacionesPanel = ({ isOpen, onClose, onUpdate }) => {
  const { can } = usePermissions();
  const [alertas, setAlertas] = useState({ vencidas: [], porVencer: [], proximos: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('urgente');
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [alumnosIgnorados, setAlumnosIgnorados] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('notificaciones_ignoradas') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (isOpen) {
      cargarNotificaciones();
      
      // Auto-refresh cada 30 segundos mientras el panel esté abierto
      const interval = setInterval(() => {
        if (isOpen) {
          cargarNotificaciones();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const agruparPorAlumno = (pagos, ignoradosOverride = null) => {
    const agrupados = {};
    const hoy = new Date().toISOString().split('T')[0];
    const ignoradosActulizados = ignoradosOverride || alumnosIgnorados;

    pagos.forEach(pago => {
      const key = pago.alumno_id || pago.alumno_nombre;
      
      // Filtrar alumnos ignorados
      if (ignoradosActulizados[key] && ignoradosActulizados[key] >= hoy) {
        return;
      }

      if (!agrupados[key]) {
        agrupados[key] = {
          alumno_id: pago.alumno_id,
          alumno_nombre: pago.alumno_nombre,
          alumno_correo: pago.alumno_correo,
          matricula: pago.matricula,
          telefono: pago.telefono || pago.alumno_telefono,
          pagos: [],
          total: 0,
          fechaMasUrgente: pago.fecha_limite_prorroga
        };
      }
      agrupados[key].pagos.push(pago);
      const monto = parseFloat(pago.monto);
      agrupados[key].total += isNaN(monto) ? 0 : monto;

      if (pago.fecha_limite_prorroga && new Date(pago.fecha_limite_prorroga) < new Date(agrupados[key].fechaMasUrgente)) {
        agrupados[key].fechaMasUrgente = pago.fecha_limite_prorroga;
      }
    });

    return Object.values(agrupados);
  };

  const cargarNotificaciones = async (ignoradosOverride = null) => {
    try {
      setLoading(true);
      const response = await pagosService.getAll({ limit: 500, estatus: 'pendiente,prorroga,vencido' });
      const pagos = Array.isArray(response.data.pagos || response.data) ? (response.data.pagos || response.data) : [];

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Filtrar solo pagos con prórroga que NO estén pagados
      const pagosFiltrados = pagos.filter(p => 
        p.tiene_prorroga && 
        p.fecha_limite_prorroga && 
        p.estatus !== 'pagado' && 
        p.estatus !== 'completado'
      );

      const pagosVencidos = pagosFiltrados.filter(p => {
        const fechaLimite = new Date(p.fecha_limite_prorroga);
        return fechaLimite < hoy;
      });

      const pagosPorVencer = pagosFiltrados.filter(p => {
        const fechaLimite = new Date(p.fecha_limite_prorroga);
        const dias = Math.ceil((fechaLimite - hoy) / (1000 * 60 * 60 * 24));
        return dias >= 0 && dias <= 3;
      });

      const pagosProximos = pagosFiltrados.filter(p => {
        const fechaLimite = new Date(p.fecha_limite_prorroga);
        const dias = Math.ceil((fechaLimite - hoy) / (1000 * 60 * 60 * 24));
        return dias > 3 && dias <= 7;
      });

      setAlertas({
        vencidas: agruparPorAlumno(pagosVencidos, ignoradosOverride),
        porVencer: agruparPorAlumno(pagosPorVencer, ignoradosOverride),
        proximos: agruparPorAlumno(pagosProximos, ignoradosOverride)
      });
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const abrirDetallesAlumno = (alumno) => {
    setAlumnoSeleccionado(alumno);
  };

  const cerrarDetalles = () => {
    setAlumnoSeleccionado(null);
  };

  const ignorarNotificacion = async (alumnoId, dias = 1) => {
    try {
      // 1. PRIMERO: Cerrar modal inmediatamente (mejor UX)
      if (alumnoSeleccionado?.alumno_id === alumnoId) {
        setAlumnoSeleccionado(null);
      }
      
      // 2. Calcular nueva fecha
      const hoy = new Date();
      hoy.setDate(hoy.getDate() + dias);
      const fechaIgnorar = hoy.toISOString().split('T')[0];
      
      const nuevosIgnorados = {
        ...alumnosIgnorados,
        [alumnoId]: fechaIgnorar
      };
      
      // 3. ACTUALIZACIÓN INSTANTÁNEA (Tiempo real)
      // Filtramos localmente para que desaparezca AL INSTANTE
      setAlertas(prev => ({
        vencidas: prev.vencidas.filter(a => (a.alumno_id || a.alumno_nombre) !== alumnoId),
        porVencer: prev.porVencer.filter(a => (a.alumno_id || a.alumno_nombre) !== alumnoId),
        proximos: prev.proximos.filter(a => (a.alumno_id || a.alumno_nombre) !== alumnoId)
      }));
      
      // 4. Guardar estados
      setAlumnosIgnorados(nuevosIgnorados);
      localStorage.setItem('notificaciones_ignoradas', JSON.stringify(nuevosIgnorados));
      
      toast.success(`✅ Notificación ignorada por ${dias} día${dias > 1 ? 's' : ''}`);
      
      // 5. DESPUÉS: Sincronizar con el resto del sistema
      if (onUpdate) onUpdate();
      eventBus.emit('pagos-updated');
      
      // Recarga de fondo para estar seguros
      setTimeout(() => cargarNotificaciones(nuevosIgnorados), 100);
    } catch (error) {
      console.error('Error al ignorar notificación:', error);
      toast.error('Error al ignorar notificación');
    }
  };


  const marcarComoPagado = async (pagos) => {
    // Verificar permisos antes de proceder
    if (!can('pagos', 'editar')) {
      toast.error('❌ No tienes permisos para marcar pagos como pagados');
      return;
    }
    
    try {
      setLoading(true);
      
      // Marcar todos los pagos del alumno como pagados
      for (const pago of pagos) {
        await pagosService.update(pago.id, { 
          estatus: 'pagado',
          fecha_pago: new Date().toISOString()
        });
      }
      
      // Cerrar modal primero para mejor UX
      cerrarDetalles();
      
      // Actualizar notificaciones y sistema
      await cargarNotificaciones();
      if (onUpdate) onUpdate();
      eventBus.emit('pagos-updated');
      
      toast.success('✅ Pagos marcados como pagados correctamente');
    } catch (error) {
      console.error('Error al marcar pagos:', error);
      toast.error('Error al marcar pagos como pagados');
    } finally {
      setLoading(false);
    }
  };

  const calcularDias = (fecha) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaLimite = new Date(fecha);
    return Math.ceil((fechaLimite - hoy) / (1000 * 60 * 60 * 24));
  };

  const totalUrgentes = alertas.vencidas.length + alertas.porVencer.length;
  const totalProximos = alertas.proximos.length;
  
  const contarIgnorados = () => {
    const hoy = new Date().toISOString().split('T')[0];
    return Object.values(alumnosIgnorados).filter(fecha => fecha >= hoy).length;
  };

  const limpiarIgnorados = async () => {
    setAlumnosIgnorados({});
    localStorage.removeItem('notificaciones_ignoradas');
    
    // Actualizar inmediatamente
    await cargarNotificaciones({});
    if (onUpdate) onUpdate();
    eventBus.emit('pagos-updated');
    
    toast.success('✅ Todas las notificaciones han sido restauradas');
  };

  const restaurarNotificacion = async (alumnoId) => {
    const nuevosIgnorados = { ...alumnosIgnorados };
    delete nuevosIgnorados[alumnoId];
    
    setAlumnosIgnorados(nuevosIgnorados);
    localStorage.setItem('notificaciones_ignoradas', JSON.stringify(nuevosIgnorados));
    
    // Actualizar inmediatamente
    await cargarNotificaciones(nuevosIgnorados);
    if (onUpdate) onUpdate();
    eventBus.emit('pagos-updated');
    
    toast.success('✅ Notificación restaurada');
  };


  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
        <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-hidden flex flex-col animate-slide-left">
          <div className="bg-tescha-blue text-white p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold">Notificaciones</h2>
                <p className="text-sm opacity-90">Pagos pendientes y próximos</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            {contarIgnorados() > 0 && (
              <button
                onClick={limpiarIgnorados}
                className="w-full mt-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-xs py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
              >
                <FaEyeSlash />
                {contarIgnorados()} notificación{contarIgnorados() > 1 ? 'es' : ''} ignorada{contarIgnorados() > 1 ? 's' : ''} - Click para restaurar
              </button>
            )}
          </div>

          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setTab('urgente')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                tab === 'urgente'
                  ? 'bg-white text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaExclamationTriangle />
                <span>Urgentes</span>
                {totalUrgentes > 0 && (
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {totalUrgentes}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setTab('proximos')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                tab === 'proximos'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaClock />
                <span>Próximos</span>
                {totalProximos > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {totalProximos}
                  </span>
                )}
              </div>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                Cargando...
              </div>
            ) : (
              <>
                {tab === 'urgente' && (
                  <div className="space-y-3">
                    {totalUrgentes === 0 ? (
                      <div className="text-center py-12">
                        <FaCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">Sin pagos urgentes</p>
                        <p className="text-sm text-gray-500 mt-1">Todo al día</p>
                      </div>
                    ) : (
                      <>
                        {alertas.vencidas.length > 0 && (
                          <div className="mb-4">
                            <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                              <FaExclamationTriangle />
                              Vencidas ({alertas.vencidas.length})
                            </h3>
                            {alertas.vencidas.map((alumno, index) => {
                              const diasVencidos = Math.abs(calcularDias(alumno.fechaMasUrgente));
                              return (
                                <div key={`vencida-${alumno.alumno_id}-${index}`} className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-2">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-800">{alumno.alumno_nombre}</p>
                                      <p className="text-xs text-gray-600">{alumno.matricula}</p>
                                    </div>
                                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">
                                      {diasVencidos}d vencido
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-lg font-bold text-red-600">${alumno.total.toFixed(2)}</span>
                                    <span className="text-xs text-gray-600">{alumno.pagos.length} pago{alumno.pagos.length > 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => abrirDetallesAlumno(alumno)}
                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
                                    >
                                      <FaInfoCircle />
                                      Ver Detalles
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        ignorarNotificacion(alumno.alumno_id, 1);
                                      }}
                                      className="bg-gray-500 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded transition-colors"
                                      title="Ignorar por hoy"
                                    >
                                      <FaEyeSlash />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {alertas.porVencer.length > 0 && (
                          <div>
                            <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-2">
                              <FaClock />
                              Por vencer (3 días) ({alertas.porVencer.length})
                            </h3>
                            {alertas.porVencer.map((alumno, index) => {
                              const diasRestantes = calcularDias(alumno.fechaMasUrgente);
                              return (
                                <div key={`porvencer-${alumno.alumno_id}-${index}`} className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg mb-2">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-800">{alumno.alumno_nombre}</p>
                                      <p className="text-xs text-gray-600">{alumno.matricula}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                                      diasRestantes === 0 ? 'bg-red-100 text-red-800' :
                                      diasRestantes === 1 ? 'bg-orange-100 text-orange-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {diasRestantes === 0 ? '¡Hoy!' :
                                       diasRestantes === 1 ? 'Mañana' :
                                       `${diasRestantes} días`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-lg font-bold text-orange-600">${alumno.total.toFixed(2)}</span>
                                    <span className="text-xs text-gray-600">{alumno.pagos.length} pago{alumno.pagos.length > 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => abrirDetallesAlumno(alumno)}
                                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
                                    >
                                      <FaInfoCircle />
                                      Ver Detalles
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        ignorarNotificacion(alumno.alumno_id, 1);
                                      }}
                                      className="bg-gray-500 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded transition-colors"
                                      title="Ignorar por hoy"
                                    >
                                      <FaEyeSlash />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {tab === 'proximos' && (
                  <div className="space-y-3">
                    {totalProximos === 0 ? (
                      <div className="text-center py-12">
                        <FaCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">Sin pagos próximos</p>
                        <p className="text-sm text-gray-500 mt-1">En los próximos 4-7 días</p>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold text-blue-700 mb-2">
                          Próximos 4-7 días ({alertas.proximos.length})
                        </h3>
                        {alertas.proximos.map((alumno, index) => {
                          const diasRestantes = calcularDias(alumno.fechaMasUrgente);
                          return (
                            <div key={`proximo-${alumno.alumno_id}-${index}`} className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-800">{alumno.alumno_nombre}</p>
                                  <p className="text-xs text-gray-600">{alumno.matricula}</p>
                                </div>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                                  {diasRestantes} días
                                </span>
                              </div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-lg font-bold text-blue-600">${alumno.total.toFixed(2)}</span>
                                <span className="text-xs text-gray-600">{alumno.pagos.length} pago{alumno.pagos.length > 1 ? 's' : ''}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => abrirDetallesAlumno(alumno)}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
                                >
                                  <FaInfoCircle />
                                  Ver Detalles
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    ignorarNotificacion(alumno.alumno_id, 3);
                                  }}
                                  className="bg-gray-500 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded transition-colors"
                                  title="Ignorar por 3 días"
                                >
                  <FaEyeSlash />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {alumnoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-tescha-blue to-blue-600 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{alumnoSeleccionado.alumno_nombre}</h3>
                  <p className="text-blue-100 text-sm">Matrícula: {alumnoSeleccionado.matricula}</p>
                </div>
                <button
                  onClick={cerrarDetalles}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FaUser className="text-tescha-blue" />
                  Información de Contacto
                </h4>
                <div className="space-y-2">
                  {alumnoSeleccionado.alumno_correo && (
                    <div className="flex items-center gap-3 text-sm">
                      <FaEnvelope className="text-gray-400 w-4" />
                      <a href={`mailto:${alumnoSeleccionado.alumno_correo}`} className="text-blue-600 hover:underline">
                        {alumnoSeleccionado.alumno_correo}
                      </a>
                    </div>
                  )}
                  {alumnoSeleccionado.telefono && (
                    <div className="flex items-center gap-3 text-sm">
                      <FaPhone className="text-gray-400 w-4" />
                      <a href={`tel:${alumnoSeleccionado.telefono}`} className="text-blue-600 hover:underline">
                        {alumnoSeleccionado.telefono}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                <h4 className="font-semibold text-red-700 mb-2">Deuda Total</h4>
                <p className="text-3xl font-bold text-red-600">${alumnoSeleccionado.total.toFixed(2)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {alumnoSeleccionado.pagos.length} pago{alumnoSeleccionado.pagos.length > 1 ? 's' : ''} pendiente{alumnoSeleccionado.pagos.length > 1 ? 's' : ''}
                </p>
              </div>

              <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4">
                <h4 className="font-semibold text-orange-700 mb-2">Estado de Prórroga</h4>
                {(() => {
                  const dias = calcularDias(alumnoSeleccionado.fechaMasUrgente);
                  if (dias < 0) {
                    return (
                      <div>
                        <p className="text-red-600 font-semibold">⚠️ VENCIDA hace {Math.abs(dias)} día{Math.abs(dias) > 1 ? 's' : ''}</p>
                        <p className="text-sm text-gray-600 mt-1">Cobrar con urgencia</p>
                      </div>
                    );
                  } else if (dias === 0) {
                    return <p className="text-red-600 font-semibold">⚠️ VENCE HOY</p>;
                  } else if (dias <= 3) {
                    return <p className="text-orange-600 font-semibold">Vence en {dias} día{dias > 1 ? 's' : ''}</p>;
                  } else {
                    return <p className="text-blue-600">Vence en {dias} días</p>;
                  }
                })()}
                <p className="text-xs text-gray-500 mt-2">
                  Fecha límite: {new Date(alumnoSeleccionado.fechaMasUrgente).toLocaleDateString('es-MX', { 
                    year: 'numeric', month: 'long', day: 'numeric' 
                  })}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Pagos Pendientes</h4>
                <div className="space-y-2">
                  {alumnoSeleccionado.pagos.map((pago, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{pago.concepto || 'Pago de inscripción'}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Vence: {new Date(pago.fecha_limite_prorroga).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                        <span className="font-bold text-gray-700">${(parseFloat(pago.monto) || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                {/* Botones de Acción Principal */}
                {can('pagos', 'editar') && (
                  <div className="grid grid-cols-1 gap-2 mb-3">
                    <button
                      onClick={() => marcarComoPagado(alumnoSeleccionado.pagos)}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <FaMoneyBillWave />
                      {loading ? 'Procesando...' : 'Marcar como Pagado'}
                    </button>
                  </div>
                )}

                {/* Botones Ignorar */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => ignorarNotificacion(alumnoSeleccionado.alumno_id, 1)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <FaEyeSlash />
                    Ignorar por hoy
                  </button>
                  <button
                    onClick={() => ignorarNotificacion(alumnoSeleccionado.alumno_id, 7)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <FaBan />
                    Ignorar 7 días
                  </button>
                </div>

                {/* Botones de Contacto */}
                {alumnoSeleccionado.alumno_correo && (
                  <a
                    href={`mailto:${alumnoSeleccionado.alumno_correo}?subject=Recordatorio de Pago - TESCHA&body=Estimado(a) ${alumnoSeleccionado.alumno_nombre},%0D%0A%0D%0ALe recordamos que tiene un pago pendiente de $${alumnoSeleccionado.total.toFixed(2)}.%0D%0A%0D%0APor favor, pase a realizar su pago a la brevedad.%0D%0A%0D%0ASaludos,%0D%0ACoordinación de Inglés - TESCHA`}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <FaEnvelope />
                    Enviar Correo
                  </a>
                )}
                {alumnoSeleccionado.telefono && (
                  <a
                    href={`tel:${alumnoSeleccionado.telefono}`}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <FaPhone />
                    Llamar
                  </a>
                )}
                <button
                  onClick={cerrarDetalles}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificacionesPanel;
