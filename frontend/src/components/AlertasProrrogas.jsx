import { useState, useEffect } from 'react';
import { pagosService } from '../services/api';
import { FaExclamationTriangle, FaClock, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Variable global para rastrear si ya se mostró la notificación (persiste entre montajes)
let notificacionGlobalMostrada = false;

const AlertasProrrogas = ({ compacto = false, mostrarSiempre = false, mostrarToast = false }) => {
  const [alertas, setAlertas] = useState({ vencidas: [], porVencer: [] });
  const [loading, setLoading] = useState(true);
  const [mostrarAlertas, setMostrarAlertas] = useState(true);
  const [expandido, setExpandido] = useState(!compacto);

  useEffect(() => {
    cargarAlertas();
    // Actualizar cada 5 minutos
    const interval = setInterval(cargarAlertas, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const agruparPorAlumno = (pagos) => {
    const agrupados = {};

    pagos.forEach(pago => {
      const key = pago.alumno_id || pago.alumno_nombre;
      if (!agrupados[key]) {
        agrupados[key] = {
          alumno_id: pago.alumno_id,
          alumno_nombre: pago.alumno_nombre,
          pagos: [],
          total: 0,
          fechaMasUrgente: pago.fecha_limite_prorroga
        };
      }
      agrupados[key].pagos.push(pago);
      const monto = parseFloat(pago.monto);
      agrupados[key].total += isNaN(monto) ? 0 : monto;

      // Mantener la fecha más urgente
      if (new Date(pago.fecha_limite_prorroga) < new Date(agrupados[key].fechaMasUrgente)) {
        agrupados[key].fechaMasUrgente = pago.fecha_limite_prorroga;
      }
    });

    return Object.values(agrupados);
  };

  const cargarAlertas = async () => {
    try {
      // Traer suficientes registros para capturar todos los pagos con prórroga
      const response = await pagosService.getAll({ limit: 2000 });
      const pagos = Array.isArray(response.data) ? response.data : [];

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const pagosVencidos = pagos.filter(p => {
        if (!p.tiene_prorroga || !p.fecha_limite_prorroga) return false;
        // Incluir pagos con prórroga independientemente del estatus
        if (p.estatus === 'completado' || p.estatus === 'pagado') return false; // Ya pagaron
        const fechaLimite = new Date(p.fecha_limite_prorroga);
        return fechaLimite < hoy;
      });

      const pagosPorVencer = pagos.filter(p => {
        if (!p.tiene_prorroga || !p.fecha_limite_prorroga) return false;
        // Incluir pagos con prórroga independientemente del estatus
        if (p.estatus === 'completado' || p.estatus === 'pagado') return false; // Ya pagaron
        const fechaLimite = new Date(p.fecha_limite_prorroga);
        const dias = Math.ceil((fechaLimite - hoy) / (1000 * 60 * 60 * 24));
        return dias >= 0 && dias <= 3;
      });

      // Agrupar por alumno para evitar duplicados
      const vencidas = agruparPorAlumno(pagosVencidos);
      const porVencer = agruparPorAlumno(pagosPorVencer);

      setAlertas({ vencidas, porVencer });

      // Mostrar notificación SOLO UNA VEZ por sesión Y solo si mostrarToast es true
      if (vencidas.length > 0 && mostrarAlertas && mostrarToast && !notificacionGlobalMostrada) {
        notificacionGlobalMostrada = true;
        toast.warning(`⚠️ ${vencidas.length} alumno${vencidas.length > 1 ? 's' : ''} con prórroga${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''}`, {
          autoClose: 8000,
          position: 'top-right',
          toastId: 'alertas-prorrogas-vencidas' // ID único para evitar duplicados
        });
      }
    } catch (error) {
      console.error('Error al cargar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const totalAlertas = alertas.vencidas.length + alertas.porVencer.length;

  if (totalAlertas === 0 && !mostrarSiempre) return null;

  // Modo compacto (para tarjetas)
  if (compacto) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setExpandido(!expandido)}
          className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FaClock className="text-orange-600" />
            <span className="text-sm font-semibold text-gray-700">
              {totalAlertas > 0 ? `Ver ${totalAlertas} alumno${totalAlertas > 1 ? 's' : ''}` : 'No hay alumnos urgentes'}
            </span>
          </div>
          {totalAlertas > 0 && (
            expandido ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />
          )}
        </button>

        {expandido && totalAlertas > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Vencidas */}
            {alertas.vencidas.map((grupo, index) => {
              const diasVencidos = Math.abs(Math.ceil((new Date(grupo.fechaMasUrgente) - new Date()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={`vencida-${grupo.alumno_id}-${index}`} className="bg-red-50 p-3 rounded border border-red-200 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-gray-800">{grupo.alumno_nombre}</span>
                      <span className="text-gray-600"> - ${grupo.total.toFixed(2)}</span>
                    </div>
                    <span className="text-red-600 font-semibold text-xs">
                      🚨 {diasVencidos}d vencido
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Por vencer */}
            {alertas.porVencer.map((grupo, index) => {
              const diasRestantes = Math.ceil((new Date(grupo.fechaMasUrgente) - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div key={`porvencer-${grupo.alumno_id}-${index}`} className="bg-orange-50 p-3 rounded border border-orange-200 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-gray-800">{grupo.alumno_nombre}</span>
                      <span className="text-gray-600"> - ${grupo.total.toFixed(2)}</span>
                    </div>
                    <span className={`font-semibold text-xs ${diasRestantes === 0 ? 'text-red-600' :
                      diasRestantes === 1 ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                      ⏰ {diasRestantes === 0 ? '¡Hoy!' :
                        diasRestantes === 1 ? 'Mañana' :
                          `${diasRestantes} días`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Modo normal (para páginas)
  return (
    <div className="mb-6 space-y-3">
      {/* Prórrogas Vencidas */}
      {alertas.vencidas.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
          <div className="flex items-start">
            <FaExclamationTriangle className="text-red-500 text-xl mt-1 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-red-800 font-semibold">
                  ⚠️ Prórrogas Vencidas ({alertas.vencidas.length})
                </h3>
              </div>
              <div className="space-y-2">
                {alertas.vencidas.slice(0, 3).map((grupo, index) => {
                  const diasVencidos = Math.abs(Math.ceil((new Date(grupo.fechaMasUrgente) - new Date()) / (1000 * 60 * 60 * 24)));
                  const cantidadPagos = grupo.pagos.length;
                  return (
                    <div key={`vencida-${grupo.alumno_id}-${index}`} className="bg-white p-3 rounded border border-red-200 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-gray-800">{grupo.alumno_nombre}</span>
                          <span className="text-gray-600"> - ${grupo.total.toFixed(2)}</span>
                          {cantidadPagos > 1 && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded ml-2">
                              {cantidadPagos} pago{cantidadPagos > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <span className="text-red-600 font-semibold text-xs">
                          {diasVencidos} día{diasVencidos !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {alertas.vencidas.length > 3 && (
                  <p className="text-xs text-red-700 italic">
                    Y {alertas.vencidas.length - 3} alumno{alertas.vencidas.length - 3 !== 1 ? 's' : ''} más...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prórrogas Por Vencer */}
      {alertas.porVencer.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg shadow-sm">
          <div className="flex items-start">
            <FaClock className="text-orange-500 text-xl mt-1 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-orange-800 font-semibold">
                  ⏰ Prórrogas Por Vencer (3 días) ({alertas.porVencer.length})
                </h3>
              </div>
              <div className="space-y-2">
                {alertas.porVencer.slice(0, 3).map((grupo, index) => {
                  const diasRestantes = Math.ceil((new Date(grupo.fechaMasUrgente) - new Date()) / (1000 * 60 * 60 * 24));
                  const cantidadPagos = grupo.pagos.length;
                  return (
                    <div key={`porvencer-${grupo.alumno_id}-${index}`} className="bg-white p-3 rounded border border-orange-200 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-gray-800">{grupo.alumno_nombre}</span>
                          <span className="text-gray-600"> - ${grupo.total.toFixed(2)}</span>
                          {cantidadPagos > 1 && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded ml-2">
                              {cantidadPagos} pago{cantidadPagos > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <span className={`font-semibold text-xs ${diasRestantes === 0 ? 'text-red-600' :
                          diasRestantes === 1 ? 'text-orange-600' :
                            'text-yellow-600'
                          }`}>
                          {diasRestantes === 0 ? '¡Hoy!' :
                            diasRestantes === 1 ? 'Mañana' :
                              `${diasRestantes} días`}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {alertas.porVencer.length > 3 && (
                  <p className="text-xs text-orange-700 italic">
                    Y {alertas.porVencer.length - 3} alumno{alertas.porVencer.length - 3 !== 1 ? 's' : ''} más...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertasProrrogas;
