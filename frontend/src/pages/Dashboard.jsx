import { useState, useEffect } from 'react';
import { dashboardService, maestrosService, maestroDashboardService, intelligenceService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUserGraduate, FaMoneyBillWave, FaUsers, FaChalkboardTeacher, FaDoorOpen, FaPlus, FaUserPlus, FaCalendarAlt, FaBook, FaChartLine, FaRocket, FaUserTie, FaExclamationTriangle, FaBrain, FaPlayCircle } from 'react-icons/fa';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AlertasProrrogas from '../components/AlertasProrrogas';
import eventBus from '../utils/eventBus';
import { usePermissions } from '../hooks/usePermissions';
import { useTutorial } from '../contexts/TutorialContext';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user } = useAuth();
  const { can, isCoordinador, isMaestro, isAdministrativo } = usePermissions();
  const { startTour } = useTutorial();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tendencias, setTendencias] = useState([]);
  const [personnelCounts, setPersonnelCounts] = useState({ maestros_activos: 0, administrativos_activos: 0, coordinadores: 1 });
  const [alertasAcademicas, setAlertasAcademicas] = useState([]);
  const [intelligenceData, setIntelligenceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(() => {
      loadData();
    }, 5 * 60 * 1000);
    
    // Escuchar eventos de actualización
    const handlePagosUpdate = () => loadData();
    eventBus.on('pagos-updated', handlePagosUpdate);
    
    return () => {
      clearInterval(interval);
      eventBus.off('pagos-updated', handlePagosUpdate);
    };
  }, []);

  const loadData = async () => {
    try {
      // Solo cargar métricas si es coordinador o administrativo
      if (user.rol === 'coordinador' || user.rol === 'administrativo') {
        // Cargar datos en paralelo con try-catch individual para mayor robustez
        const results = await Promise.allSettled([
          dashboardService.getMetricas(),
          dashboardService.getAlumnosPorNivel(),
          dashboardService.getAlertasAcademicas(),
          intelligenceService.getKPIs()
        ]);

        // Procesar métricas básicas
        if (results[0].status === 'fulfilled') {
          const metricas = results[0].value.data;
          setStats({
            alumnos: {
              total: metricas.total_alumnos || 0,
              internos: metricas.alumnos_internos || 0,
              externos: metricas.alumnos_externos || 0,
              por_nivel: results[1].status === 'fulfilled' ? (results[1].value.data || []).map(n => ({
                nivel_actual: n.nivel || n.codigo,
                cantidad: parseInt(n.total) || 0
              })) : []
            },
            grupos_activos: metricas.total_grupos || 0,
            maestros_activos: metricas.total_maestros || 0,
            pagos: {
              ingresos: parseFloat(metricas.ingresos_totales) || 0,
              por_cobrar: parseFloat(metricas.cuentas_por_cobrar) || 0,
              vencidos: parseInt(metricas.pagos_vencidos) || 0,
              pagados: parseInt(metricas.pagos_completados) || 0,
              pendientes: parseInt(metricas.pagos_pendientes_con_prorroga) || 0
            }
          });
        }

        // Procesar alertas y BI
        if (results[2].status === 'fulfilled') setAlertasAcademicas(results[2].value.data);
        if (results[3].status === 'fulfilled') setIntelligenceData(results[3].value.data);

        // Cargar conteos de personal si es coordinador
        if (user.rol === 'coordinador') {
          try {
            const personnelRes = await maestrosService.getPersonnelCounts();
            setPersonnelCounts(personnelRes.data);
          } catch (personnelError) {
            console.error('Error al cargar conteos de personal:', personnelError);
          }
        }

        // Intentar cargar tendencias
        try {
          const tendenciasRes = await dashboardService.getTendencias();
          setTendencias(tendenciasRes.data);
        } catch (tendenciasError) {
          if (tendenciasError.response?.status !== 403) {
            console.error('Error al cargar tendencias:', tendenciasError);
          }
        }
      } else if (user.rol === 'maestro') {
        if (!user.maestro_id) {
          console.error('❌ Error: El usuario maestro no tiene maestro_id');
          toast.warning('Sesión incompleta. Por favor, re-inicia sesión.');
          setStats(null);
          setLoading(false);
          return;
        }

        try {
          const response = await maestroDashboardService.getMetricas();
          const m = response.data;
          setStats({
            alumnos: {
              total: parseInt(m.total_alumnos) || 0,
              internos: parseInt(m.alumnos_internos) || 0,
              externos: parseInt(m.alumnos_externos) || 0,
              por_nivel: (m.por_nivel || []).map(n => ({
                nivel_actual: n.nivel,
                cantidad: parseInt(n.total) || 0
              }))
            },
            grupos_activos: parseInt(m.total_grupos) || 0
          });
        } catch (mErr) {
          console.error('Error al cargar métricas de maestro:', mErr);
          setStats(null);
        }
      }
    } catch (error) {
      console.error('Error crítico al cargar dashboard:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>;
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  
  // Acciones rápidas según permisos
  const accionesRapidas = [
    // COORDINADOR - Control total
    {
      titulo: 'Agregar Alumno',
      descripcion: 'Registra un nuevo alumno en el sistema',
      icono: FaUserPlus,
      color: 'from-blue-500 to-blue-600',
      ruta: '/alumnos',
      accion: () => navigate('/alumnos'),
      mostrar: can('alumnos', 'crear')
    },
    {
      titulo: 'Registrar Pago',
      descripcion: 'Registra el pago de un alumno',
      icono: FaMoneyBillWave,
      color: 'from-green-500 to-green-600',
      ruta: '/pagos',
      accion: () => navigate('/pagos'),
      mostrar: can('pagos', 'crear')
    },
    {
      titulo: 'Crear Grupo',
      descripcion: 'Organiza un nuevo grupo de clases',
      icono: FaUsers,
      color: 'from-yellow-500 to-yellow-600',
      ruta: '/grupos',
      accion: () => navigate('/grupos'),
      mostrar: can('grupos', 'crear')
    },
    {
      titulo: 'Gestionar Periodos',
      descripcion: 'Administra los periodos académicos',
      icono: FaCalendarAlt,
      color: 'from-pink-500 to-pink-600',
      ruta: '/periodos',
      accion: () => navigate('/periodos'),
      mostrar: can('periodos', 'ver')
    },
    {
      titulo: 'Gestionar Personal',
      descripcion: 'Administra maestros y administrativos',
      icono: FaChalkboardTeacher,
      color: 'from-teal-500 to-teal-600',
      ruta: '/maestros',
      accion: () => navigate('/maestros'),
      mostrar: isCoordinador()
    },
    {
      titulo: 'Agregar Maestro',
      descripcion: 'Crea un nuevo maestro con usuario automático',
      icono: FaUserTie,
      color: 'from-cyan-500 to-cyan-600',
      ruta: '/maestros',
      accion: () => navigate('/maestros', { state: { openModal: true, tipo: 'maestro' } }),
      mostrar: isCoordinador()
    },
    // MAESTRO - Ver sus alumnos y subir calificaciones
    {
      titulo: 'Ver Mis Alumnos',
      descripcion: 'Consulta tu lista de alumnos',
      icono: FaUserGraduate,
      color: 'from-purple-500 to-purple-600',
      ruta: '/alumnos',
      accion: () => navigate('/alumnos'),
      mostrar: isMaestro()
    },
    {
      titulo: 'Tomar Asistencia',
      descripcion: 'Registra la asistencia de tus alumnos',
      icono: FaBook,
      color: 'from-indigo-500 to-indigo-600',
      ruta: '/maestro-asistencias',
      accion: () => navigate('/maestro-asistencias'),
      mostrar: can('asistencias', 'crear')
    },
    // ADMINISTRATIVO - Solo reportes
    {
      titulo: 'Ver Reportes',
      descripcion: 'Consulta estadísticas y reportes',
      icono: FaChartLine,
      color: 'from-red-500 to-red-600',
      ruta: '/reportes',
      accion: () => navigate('/reportes'),
      mostrar: can('reportes', 'ver')
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header con bienvenida personalizada */}
      <div className="card bg-gradient-to-r from-tescha-blue to-blue-700 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">¡Hola, {user?.username}! 👋</h1>
            <p className="text-sm sm:text-base text-blue-100 mb-4 tracking-tight">
              {isMaestro()
                ? 'Aquí puedes ver el resumen de tus grupos y alumnos'
                : 'Bienvenido al panel de control. Aquí tienes un resumen de todo el sistema'}
            </p>
            <button
              onClick={() => {
                const tour = isCoordinador() ? 'dashboard-coordinador' : 
                            isMaestro() ? 'dashboard-maestro' : 'dashboard-administrativo';
                startTour(tour);
              }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 border border-white/30 shadow-xl transform active:scale-95"
            >
              <FaPlayCircle className="text-lg" /> Ver Tutorial Interactivo
            </button>
          </div>
          <FaRocket className="text-4xl sm:text-5xl md:text-6xl opacity-20 hidden sm:block" />
        </div>
      </div>

      {/* Acciones Rápidas - "¿Qué quieres hacer hoy?" */}
      {accionesRapidas.filter(a => a.mostrar).length > 0 && (
        <div id="quick-actions" className="card">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaRocket className="text-tescha-blue text-base sm:text-lg" />
            ¿Qué quieres hacer hoy?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {accionesRapidas.filter(a => a.mostrar).map((accion, index) => {
              const Icono = accion.icono;
              return (
                <button
                  key={index}
                  onClick={accion.accion}
                  className={`p-4 sm:p-6 rounded-lg bg-gradient-to-br ${accion.color} text-white hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 text-left group`}
                >
                  <Icono className="text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-base sm:text-lg mb-1">{accion.titulo}</h3>
                  <p className="text-xs sm:text-sm opacity-90">{accion.descripcion}</p>
                  <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm font-medium">
                    Ir ahora <span className="ml-2 group-hover:ml-3 transition-all">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Alertas de Prórrogas */}
      {!isMaestro() && <AlertasProrrogas />}

      {/* Guía Rápida - Solo para coordinadores */}
      {!isMaestro() && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white p-3 rounded-full flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="width" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-2">📚 Guía Rápida del Sistema</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>🎓 Alumnos Activos:</strong> Total de estudiantes inscritos en el periodo académico actual (incluye internos del TESCHA y externos del público general)</p>
                <p><strong>💰 Ingresos:</strong> Suma de todos los pagos completados. "Por cobrar" son los pagos pendientes o vencidos que aún no se han pagado</p>
                <p><strong>👥 Grupos Activos:</strong> Clases que actualmente tienen alumnos inscritos en el periodo actual</p>
                <p><strong>🎓 Maestros Activos:</strong> Profesores que tienen al menos un grupo asignado en el periodo actual</p>
                <p><strong>⚠️ Prórrogas:</strong> Pagos pendientes con extensión de tiempo aprobada. Revisa las alertas arriba para ver cuáles están por vencer</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centro de Personal - Solo Coordinador */}
      {isCoordinador() && stats && (
        <div className="card bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaUserTie className="text-teal-600" />
              Centro de Personal
            </h2>
            <button
              onClick={() => navigate('/maestros')}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
            >
              Ver Todos →
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Maestros Activos */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                  <FaChalkboardTeacher className="text-xl" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{personnelCounts.maestros_activos || 0}</p>
                  <p className="text-xs text-gray-600">Maestros Activos</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/maestros', { state: { openModal: true, tipo: 'maestro' } })}
                className="w-full mt-2 px-3 py-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors text-sm font-medium"
              >
                + Agregar Maestro
              </button>
            </div>

            {/* Administrativos */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <FaUserTie className="text-xl" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{personnelCounts.administrativos_activos || 0}</p>
                  <p className="text-xs text-gray-600">Administrativos</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/maestros', { state: { openModal: true, tipo: 'administrativo' } })}
                className="w-full mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                + Agregar Administrativo
              </button>
            </div>

            {/* Coordinador */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                  <FaRocket className="text-xl" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{personnelCounts.coordinadores || 1}</p>
                  <p className="text-xs text-gray-600">Coordinador</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Acceso total al sistema
              </div>
            </div>
          </div>

          {/* Tip Rápido */}
          <div className="mt-4 bg-teal-100 border-l-4 border-teal-500 p-3 rounded">
            <p className="text-sm text-teal-900">
              <strong>💡 Tip:</strong> Al crear un maestro o administrativo, se genera automáticamente un usuario con contraseña temporal.
            </p>
          </div>
        </div>
      )}

      {/* Business Intelligence & AI Insights - NUEVA SECCIÓN PREMIUM */}
      {(isCoordinador() || isAdministrativo()) && intelligenceData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div className="card bg-gray-900 text-white border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <FaRocket className="text-8xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Calidad Académica</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black">{intelligenceData.academic.score}</span>
                <span className="text-lg font-bold text-gray-500 mb-1">/ 100</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-400">Tasa de Asistencia</span>
                  <span className="text-blue-400 font-bold">{intelligenceData.academic.asistencia}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${intelligenceData.academic.asistencia}%` }}></div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-4 leading-relaxed italic">
                Insight: El rendimiento actual se clasifica como <b className="text-white">"{intelligenceData.academic.status}"</b> basado en promedios y asistencia.
              </p>
            </div>
          </div>

          <div className="card bg-gray-900 text-white border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <FaMoneyBillWave className="text-8xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">Salud Financiera</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black">{intelligenceData.financial.efficiency}%</span>
                <span className="text-lg font-bold text-gray-500 mb-1">Cobro</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Recaudado</p>
                    <p className="text-sm font-bold text-emerald-400">${intelligenceData.financial.total.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Pendiente</p>
                    <p className="text-sm font-bold text-red-400">${intelligenceData.financial.pending.toLocaleString()}</p>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 mt-4 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${intelligenceData.financial.efficiency}%` }}></div>
              </div>
            </div>
          </div>

          <div className="card bg-gray-900 text-white border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <FaUsers className="text-8xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Eficiencia Operativa</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black">{intelligenceData.operational.alumnos_por_maestro}</span>
                <span className="text-lg font-bold text-gray-500 mb-1">Alum/Doc</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-2 rounded">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Grupos</p>
                    <p className="text-xl font-black text-white">{intelligenceData.operational.total_grupos}</p>
                </div>
                <div className="bg-gray-800/50 p-2 rounded">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Total</p>
                    <p className="text-xl font-black text-white">{intelligenceData.operational.total_alumnos}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div id="kpi-cards" className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 ${isMaestro() ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white" title="Total de alumnos inscritos en el periodo académico actual. Incluye internos (alumnos del TESCHA) y externos (público general)">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm opacity-80">{isMaestro() ? 'Mis Alumnos' : 'Alumnos Activos'}</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats?.alumnos?.total || 0}</p>
              <p className="text-xs mt-1">Int: {stats?.alumnos?.internos || 0} | Ext: {stats?.alumnos?.externos || 0}</p>
              <p className="text-xs mt-1 opacity-70">📊 Inscritos en periodo actual</p>
            </div>
            <FaUserGraduate className="text-3xl sm:text-4xl opacity-80 flex-shrink-0 ml-2" />
          </div>
        </div>

        {!isMaestro() && (
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white" title="Ingresos totales: pagos completados en el periodo actual. Por cobrar: saldo pendiente de pagos con prórroga o vencidos">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm opacity-80">Ingresos Totales</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2 break-words">${(stats?.pagos?.ingresos || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs mt-1 opacity-90">💰 Por cobrar: ${(stats?.pagos?.por_cobrar || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
              <FaMoneyBillWave className="text-3xl sm:text-4xl opacity-80 flex-shrink-0 ml-2" />
            </div>
          </div>
        )}

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm opacity-80">{isMaestro() ? 'Mis Grupos' : 'Grupos Activos'}</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats?.grupos_activos || 0}</p>
              <p className="text-xs mt-1 opacity-70 italic">👥 En periodo actual</p>
            </div>
            <FaUsers className="text-3xl sm:text-4xl opacity-80 flex-shrink-0 ml-2" />
          </div>
        </div>

        {!isMaestro() && (
          <>
            <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm opacity-80">Maestros Activos</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats?.maestros_activos || 0}</p>
                  <p className="text-xs mt-1 opacity-70 italic">🎓 Con grupos asignados</p>
                </div>
                <FaChalkboardTeacher className="text-3xl sm:text-4xl opacity-80 flex-shrink-0 ml-2" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Alertas de Riesgo Académico - NUEVO */}
      {(isCoordinador() || isAdministrativo()) && alertasAcademicas.length > 0 && (
        <div className="card border-l-4 border-red-500 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <FaExclamationTriangle className="text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Semáforo de Riesgo Académico</h3>
                <p className="text-sm text-gray-500">Alumnos con bajo desempeño o inasistencias críticas</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase tracking-wider">
              {alertasAcademicas.length} Casos Detectados
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {alertasAcademicas.map((alerta, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                <div className={`w-3 h-12 rounded-full ${alerta.nivel_riesgo === 'Critico' ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`}></div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 uppercase tracking-tight">{alerta.alumno}</p>
                  <p className="text-xs text-gray-500">{alerta.matricula} • {alerta.grupo}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Nota</span>
                    <span className={`text-sm font-black ${alerta.promedio < 70 ? 'text-red-600' : 'text-gray-700'}`}>
                      {parseFloat(alerta.promedio).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Asist</span>
                    <span className={`text-sm font-black ${alerta.asistencia < 80 ? 'text-red-600' : 'text-gray-700'}`}>
                      {parseFloat(alerta.asistencia).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                  alerta.nivel_riesgo === 'Critico' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-yellow-900'
                }`}>
                  {alerta.nivel_riesgo}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t text-right">
            <button 
              onClick={() => navigate('/reportes')}
              className="text-sm font-bold text-tescha-blue hover:underline"
            >
              Ver reporte detallado →
            </button>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Alumnos por nivel */}
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold mb-4">Alumnos por Nivel</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={stats?.alumnos?.por_nivel || []}
              margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="nivel_actual"
                tick={{ fontSize: 11, fontWeight: 500 }}
                stroke="#6b7280"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                allowDecimals={false}
                stroke="#6b7280"
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value;
                }}
              />
              <Tooltip
                contentStyle={{
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                formatter={(value) => [
                  `${parseInt(value).toLocaleString('es-MX')} alumno${value !== 1 ? 's' : ''}`,
                  'Cantidad'
                ]}
                labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
              />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
              <Bar
                dataKey="cantidad"
                fill="#0369a1"
                name="Alumnos"
                radius={[8, 8, 0, 0]}
                maxBarSize={80}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tendencias de ingresos - Solo para coordinadores y administrativos */}
        {!isMaestro() && tendencias.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FaChartLine className="text-green-600 text-lg" />
                  </div>
                  Tendencias de Ingresos
                </h3>
                <p className="text-sm text-gray-600 mt-1">Histórico de ingresos por periodo</p>
              </div>
              <div className="text-right bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Último Periodo</p>
                <p className="text-3xl font-bold text-green-600">
                  ${parseFloat(tendencias[tendencias.length - 1]?.ingresos || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-1">{tendencias[tendencias.length - 1]?.periodo}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={tendencias}
                margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
              >
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="periodo"
                  tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fontSize: 13, fill: '#4b5563', fontWeight: 500 }}
                  stroke="#9ca3af"
                  width={80}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                    return `$${value}`;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #10b981',
                    borderRadius: '16px',
                    boxShadow: '0 12px 30px rgba(16, 185, 129, 0.25)',
                    padding: '16px'
                  }}
                  labelStyle={{
                    fontWeight: 700,
                    color: '#047857',
                    marginBottom: '8px',
                    fontSize: '15px'
                  }}
                  formatter={(value) => [
                    `$${parseFloat(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    'Ingresos'
                  ]}
                  itemStyle={{ color: '#059669', fontWeight: 600, fontSize: '14px' }}
                />
                <Line
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#10b981"
                  strokeWidth={4}
                  dot={{
                    r: 6,
                    fill: '#10b981',
                    strokeWidth: 3,
                    stroke: '#fff'
                  }}
                  activeDot={{
                    r: 8,
                    fill: '#059669',
                    stroke: '#fff',
                    strokeWidth: 4
                  }}
                  fill="url(#colorIngresos)"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
              <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="text-blue-600 font-bold text-xs sm:text-sm uppercase tracking-wide mb-2">Periodos</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-700">{tendencias.length}</div>
                <div className="text-xs text-blue-600 mt-1">registrados</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="text-green-600 font-bold text-xs sm:text-sm uppercase tracking-wide mb-2">Total Acumulado</div>
                <div className="text-xl sm:text-2xl font-bold text-green-700 break-words">
                  ${(tendencias.reduce((sum, t) => sum + parseFloat(t.ingresos || 0), 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-green-600 mt-1">pesos mexicanos</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <div className="text-purple-600 font-bold text-xs sm:text-sm uppercase tracking-wide mb-2">Promedio</div>
                <div className="text-xl sm:text-2xl font-bold text-purple-700 break-words">
                  {tendencias.length > 0
                    ? `$${((tendencias.reduce((sum, t) => sum + parseFloat(t.ingresos || 0), 0) / tendencias.length)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '$0.00'}
                </div>
                <div className="text-xs text-purple-600 mt-1">por periodo</div>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Alertas de Prórrogas Críticas - Solo para coordinadores */}
      {!isMaestro() && stats?.alertas_prorrogas && (
        <div className="card bg-red-50 border-l-4 border-red-500">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="text-red-500 text-xl sm:text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-red-800 mb-2">Alertas de Prórrogas - Periodo Actual</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Alumnos con prórroga que necesitan realizar su pago</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-red-300 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-2xl sm:text-3xl font-bold text-red-600">{stats.alertas_prorrogas.vencidas || 0}</p>
                    <span className="text-xl sm:text-2xl">🚨</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700">Prórrogas Vencidas</p>
                  <p className="text-xs text-red-700 mt-1 font-medium">⚠️ Atención inmediata</p>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-orange-300 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.alertas_prorrogas.por_vencer || 0}</p>
                    <span className="text-xl sm:text-2xl">⏰</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700">Por Vencer (3 días)</p>
                  <p className="text-xs text-orange-700 mt-1 font-medium">📢 Notificar urgente</p>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-yellow-300 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.alertas_prorrogas.activas || 0}</p>
                    <span className="text-xl sm:text-2xl">📅</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700">Prórrogas Vigentes</p>
                  <p className="text-xs text-yellow-700 mt-1 font-medium">✅ Tienen tiempo</p>
                </div>
              </div>


            </div>
          </div>
        </div>
      )}

      {/* Estado de pagos - Solo para coordinadores y administrativos */}
      {!isMaestro() && (
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold mb-2">Estado de Pagos del Período Actual</h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Resumen financiero del periodo en curso</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 shadow-sm">
              <div className="flex items-center justify-center mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-green-500 rounded-full">
                  <FaMoneyBillWave className="text-xl sm:text-2xl text-white" />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-green-600 mb-2">{stats?.pagos?.pagados || 0}</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Completados</p>
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-green-300">
                <p className="text-xs text-gray-600 mb-1">Ingresos del Mes</p>
                <p className="text-base sm:text-lg font-bold text-green-700 break-words">${(stats?.pagos?.ingresos || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-2 border-yellow-200 shadow-sm">
              <div className="flex items-center justify-center mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-yellow-500 rounded-full">
                  <FaMoneyBillWave className="text-xl sm:text-2xl text-white" />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-yellow-600 mb-2">{stats?.pagos?.pendientes || 0}</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Prórrogas Totales</p>
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-yellow-300">
                <p className="text-xs text-gray-600 mb-1">Por Cobrar</p>
                <p className="text-base sm:text-lg font-bold text-yellow-700 break-words">${(stats?.pagos?.por_cobrar || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs sm:text-sm text-gray-700">
              <span className="font-semibold">💡 Nota:</span> Las prórrogas incluyen todos los pagos pendientes y vencidos del período.
              Los ingresos y pagos por cobrar se actualizan en tiempo real según el estado de cada pago.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
