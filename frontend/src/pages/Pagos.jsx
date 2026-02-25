import { useState, useEffect } from 'react';
import { pagosService, alumnosService } from '../services/api';
import { toast } from 'react-toastify';
import { FaPlus, FaSearch, FaMoneyBillWave, FaEdit } from 'react-icons/fa';
import AlertasProrrogas from '../components/AlertasProrrogas';
import { TooltipIcon } from '../components/Tooltip';
import eventBus from '../utils/eventBus';
import { usePermissions } from '../hooks/usePermissions';

// Catálogo de conceptos y precios
const CONCEPTOS_PRECIOS = {
  'Constancia de Inglés - Celex': 40.00,
  'Credencial para Alumnos Externos - Celex': 93.00,
  'Curso de Idiomas - Celex - Cónyuge e hijos de Docentes y Administrativos': 2227.00,
  'Curso de Idiomas - Celex - Docentes y Administrativos': 1238.00,
  'Curso de Idiomas - Celex - Egresados': 2103.00,
  'Curso de Idiomas - Celex - Estudiantes': 1857.00,
  'Curso de Idiomas - Celex - Externos': 2476.00,
  'Curso de Idiomas - Celex - Sector con convenio con el TESCHA': 2227.00,
  'Examen Escrito para Acreditación - Celex': 914.00,
  'Examen de Colocación - Celex': 187.00,
  'Colegiatura': 0, // Para mantener compatibilidad con registros antiguos
  'Inscripción': 0,
  'Material': 0,
  'Examen': 0,
  'Otro': 0
};

const Pagos = () => {
  const { can } = usePermissions(); // Agregar hook de permisos
  const [pagos, setPagos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerms, setSearchTerms] = useState([]);
  const [currentSearch, setCurrentSearch] = useState('');
  const [alumnoSearchTerm, setAlumnoSearchTerm] = useState('');
  const [estatusFilter, setEstatusFilter] = useState('todos');
  const [stats, setStats] = useState({
    total: 0,
    completados: 0,
    prorrogas: 0,
    prorrogasVencidas: 0,
    prorrogasPorVencer: 0,
    prorrogasActivas: 0,
    ingresosHoy: 0,
    ingresosSemana: 0,
    ingresosMes: 0,
    ingresosMesAnterior: 0,
    ingresosPeriodo: 0
  });
  const [formData, setFormData] = useState({ alumno_id: '', monto: '', metodo_pago: 'Formato Universal', concepto: '', referencia: '', notas: '', tiene_prorroga: false, fecha_limite_prorroga: '', estatus: 'pagado', fecha_pago: '' });
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => { 
    loadData(); 
    
    // Auto-refresh cada 3 minutos
    const interval = setInterval(() => {
      loadData();
    }, 3 * 60 * 1000);
    
    // Escuchar eventos de actualización
    const handlePagosUpdate = () => loadData();
    eventBus.on('pagos-updated', handlePagosUpdate);
    
    return () => {
      clearInterval(interval);
      eventBus.off('pagos-updated', handlePagosUpdate);
    };
  }, [currentPage, estatusFilter, searchTerms]);

  // Función para agregar término de búsqueda
  const handleAddSearch = (e) => {
    if (e.key === 'Enter' && currentSearch.trim()) {
      e.preventDefault();
      if (!searchTerms.includes(currentSearch.trim())) {
        setSearchTerms([...searchTerms, currentSearch.trim()]);
      }
      setCurrentSearch('');
      setCurrentPage(1);
    }
  };

  // Función para quitar término de búsqueda
  const handleRemoveSearch = (term) => {
    setSearchTerms(searchTerms.filter(t => t !== term));
    setCurrentPage(1);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;

      // Preparar parámetros de filtro
      const params = { limit: itemsPerPage, offset };

      // Agregar filtro de estatus si está seleccionado
      if (estatusFilter === 'completado') {
        params.estatus = 'pagado';
      } else if (estatusFilter === 'prorroga' || estatusFilter === 'vencidas') {
        // Para prórrogas y vencidas, traer todos con prórroga (pendiente, prorroga y vencido)
        params.estatus = 'pendiente,prorroga,vencido';
        params.tiene_prorroga = 'true'; // Agregar filtro de prórroga
      } else if (estatusFilter === 'recientes') {
        // Últimos movimientos: ordenar por updated_at sin filtrar por estatus
        params.orden = 'recientes';
      }

      // Agregar búsquedas múltiples
      if (searchTerms.length > 0) {
        params.search = searchTerms.join('|');
      }

      // Obtener pagos filtrados y estadísticas financieras del backend
      const [pagosRes, alumnosRes, estadisticasRes] = await Promise.all([
        pagosService.getAll(params),
        alumnosService.getAll({ limit: 10000 }),
        pagosService.getEstadisticasFinancieras() // Usar el nuevo endpoint
      ]);
      
      // El backend devuelve {pagos: [...], total, limit, offset}
      const pagosData = pagosRes.data.pagos || pagosRes.data;
      setPagos(Array.isArray(pagosData) ? pagosData : []);
      
      const alumnosArray = alumnosRes.data.alumnos || alumnosRes.data;
      setAlumnos(Array.isArray(alumnosArray) ? alumnosArray : []);

      // Usar estadísticas del backend (fuente de verdad)
      const statsBackend = estadisticasRes.data;
      
      // Usar el total real de la respuesta de pagos (más preciso para paginación)
      const totalReal = pagosRes.data.total || pagosData.length;
      
      // Calcular total según el filtro
      let total;
      if (estatusFilter === 'completado') {
        total = totalReal || statsBackend.completados;
      } else if (estatusFilter === 'prorroga') {
        total = totalReal || statsBackend.prorrogas;
      } else {
        total = totalReal || statsBackend.total;
      }

      // Calcular páginas y ajustar página actual si está fuera de rango
      const totalPagesCalc = Math.max(1, Math.ceil(total / itemsPerPage));
      setTotalPages(totalPagesCalc);
      
      // Si la página actual está fuera de rango, ajustar a la última página válida
      if (currentPage > totalPagesCalc) {
        setCurrentPage(totalPagesCalc);
      }

      // Usar estadísticas del backend directamente
      setStats({
        total,
        completados: statsBackend.completados,
        prorrogas: statsBackend.prorrogas,
        prorrogasVencidas: statsBackend.prorrogasVencidas,
        prorrogasPorVencer: statsBackend.prorrogasPorVencer,
        prorrogasActivas: statsBackend.prorrogasActivas,
        // 💰 Métricas financieras verificadas por el backend
        pagosHoy: statsBackend.pagosHoy,
        ingresosHoy: statsBackend.ingresosHoy,
        ingresosSemana: statsBackend.ingresosSemana,
        ingresosMes: statsBackend.ingresosMes,
        ingresosMesAnterior: statsBackend.ingresosMesAnterior,
        ingresosPeriodo: statsBackend.ingresosPeriodo,
        porCobrar: statsBackend.porCobrar,
        vencidos: statsBackend.vencidos,
        // Metadata para auditoría
        fechaCalculo: statsBackend.fechaCalculo,
        periodo: statsBackend.periodo
      });
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
      setPagos([]);
      setAlumnos([]);
      setStats({
        total: 0,
        completados: 0,
        prorrogas: 0,
        prorrogasVencidas: 0,
        prorrogasPorVencer: 0,
        prorrogasActivas: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConceptoChange = (concepto) => {
    const precio = CONCEPTOS_PRECIOS[concepto] || 0;
    setFormData({ ...formData, concepto, monto: precio > 0 ? precio : '' });
  };

  const handleOpenModal = () => {
    setFormData({ alumno_id: '', monto: '', metodo_pago: 'Formato Universal', concepto: '', referencia: '', notas: '', tiene_prorroga: false, fecha_limite_prorroga: '', estatus: 'pagado', fecha_pago: '' });
    setAlumnoSearchTerm('');
    setEditingId(null);
    setShowModal(true);
  };

  const handleEdit = (pago) => {
    setFormData({
      alumno_id: pago.alumno_id,
      monto: pago.monto,
      metodo_pago: pago.metodo_pago || 'Formato Universal',
      concepto: pago.concepto,
      referencia: pago.referencia || '',
      notas: pago.notas || '',
      tiene_prorroga: pago.tiene_prorroga || false,
      fecha_limite_prorroga: pago.fecha_limite_prorroga || '',
      estatus: pago.estatus || 'pendiente',
      fecha_pago: pago.fecha_pago || ''
    });
    setEditingId(pago.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await pagosService.update(editingId, formData);
        toast.success('Pago actualizado correctamente');
      } else {
        // Para crear un pago nuevo
        if (!formData.alumno_id) {
          toast.error('Debes seleccionar un alumno');
          setLoading(false);
          return;
        }

        if (!formData.referencia) {
          toast.error('Debes ingresar la línea de captura (número de pago)');
          setLoading(false);
          return;
        }

        // Buscar los pagos existentes del alumno para obtener su inscripcion_id
        const pagosExistentesRes = await fetch(`/api/pagos?alumno_id=${formData.alumno_id}&limit=1`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!pagosExistentesRes.ok) {
          toast.error('El alumno debe estar inscrito primero en un grupo activo');
          setLoading(false);
          return;
        }

        const pagosExistentesData = await pagosExistentesRes.json();
        const pagosExistentes = pagosExistentesData.pagos || pagosExistentesData || [];
        
        if (pagosExistentes.length === 0) {
          toast.error('El alumno no tiene inscripciones activas. Debe estar inscrito en un grupo primero.');
          setLoading(false);
          return;
        }

        // Obtener el inscripcion_id del primer pago (todos los pagos del periodo tienen la misma inscripción)
        const inscripcion_id = pagosExistentes[0].inscripcion_id;

        // Preparar datos para el backend usando la referencia como numero_pago
        // Validar monto
        const montoNum = parseFloat(formData.monto);
        if (isNaN(montoNum) || montoNum <= 0) {
          toast.error('El monto debe ser un número válido mayor a 0');
          setLoading(false);
          return;
        }
        
        // Validar número de pago
        const numeroPago = parseInt(formData.referencia);
        if (isNaN(numeroPago) || numeroPago <= 0) {
          toast.error('La referencia debe contener un número válido');
          setLoading(false);
          return;
        }
        
        const pagoData = {
          inscripcion_id: inscripcion_id,
          numero_pago: numeroPago,
          concepto: formData.concepto,
          monto: montoNum,
          fecha_vencimiento: new Date().toISOString().split('T')[0], // Fecha de hoy
          metodo_pago: formData.metodo_pago,
          referencia: formData.referencia,
          descuento: 0,
          estatus: formData.estatus, // Usar el estatus que seleccionó el usuario
          fecha_limite_prorroga: formData.fecha_limite_prorroga || null // Enviar fecha de prórroga si existe
        };

        await pagosService.create(pagoData);
        toast.success('Pago registrado correctamente');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error:', error);
      toast.error(editingId ? 'Error al actualizar pago' : 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Control de Pagos</h1>
        {can('pagos', 'crear') && (
          <button onClick={handleOpenModal} className="btn-primary flex items-center space-x-2"><FaPlus /><span>Registrar Pago</span></button>
        )}
      </div>

      {/* Alertas de Prórrogas */}
      <AlertasProrrogas mostrarToast={true} />

      {/* 💰 Métricas Financieras */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Ingresos de Hoy */}
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Ingresos de Hoy</p>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
              <p className="text-xl font-bold text-blue-600 mt-1">
                ${(stats.ingresosHoy || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <FaMoneyBillWave className="text-3xl text-blue-600" />
          </div>
        </div>

        {/* Ingresos de la Semana */}
        <div className="card bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Ingresos de la Semana</p>
              <p className="text-sm text-gray-500">Últimos 7 días</p>
              <p className="text-xl font-bold text-purple-600 mt-1">
                ${(stats.ingresosSemana || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <FaMoneyBillWave className="text-3xl text-purple-600" />
          </div>
        </div>

        {/* Ingresos del Mes */}
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Ingresos del Mes</p>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
              <p className="text-xl font-bold text-green-600 mt-1">
                ${(stats.ingresosMes || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {stats.ingresosMesAnterior > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {((stats.ingresosMes - stats.ingresosMesAnterior) / stats.ingresosMesAnterior * 100).toFixed(1)}% vs mes anterior
                </p>
              )}
            </div>
            <FaMoneyBillWave className="text-3xl text-green-600" />
          </div>
        </div>

        {/* Ingresos del Periodo */}
        <div className="card bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Ingresos del Periodo</p>
              <p className="text-sm text-gray-500">Semestre Activo</p>
              <p className="text-xl font-bold text-orange-600 mt-1">
                ${(stats.ingresosPeriodo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <FaMoneyBillWave className="text-3xl text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="card bg-orange-50 border-orange-300 border-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-semibold">⚠️ Prórrogas Urgentes</p>
              <p className="text-sm text-gray-500 mb-2">Alumnos a los que se les acaba el tiempo</p>
              <p className="text-4xl font-bold text-orange-600 mb-3">
                {(stats.prorrogasVencidas || 0) + (stats.prorrogasPorVencer || 0)}
              </p>
              <div className="space-y-2 bg-white p-3 rounded-lg border border-orange-200">
                {stats.prorrogasVencidas > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-700 font-semibold">🚨 Vencidas</span>
                    <span className="text-lg font-bold text-red-600">{stats.prorrogasVencidas}</span>
                  </div>
                )}
                {stats.prorrogasPorVencer > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-700 font-semibold">⏰ Por vencer (3 días)</span>
                    <span className="text-lg font-bold text-orange-600">{stats.prorrogasPorVencer}</span>
                  </div>
                )}
                {(stats.prorrogasVencidas === 0 && stats.prorrogasPorVencer === 0) && (
                  <p className="text-sm text-green-600 font-medium text-center">
                    ✅ No hay prórrogas urgentes
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Total: {stats.prorrogas || 0} pagos con prórroga
              </p>
            </div>
            <div className="text-5xl">⏰</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col gap-4">
          {/* Buscador con chips */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <FaSearch className="text-gray-400" />
              <input
                type="text"
                className="input flex-1"
                placeholder="Buscar alumno... (presiona Enter para agregar)"
                value={currentSearch}
                onChange={(e) => setCurrentSearch(e.target.value)}
                onKeyDown={handleAddSearch}
              />
            </div>
            {/* Chips de búsqueda */}
            {searchTerms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {searchTerms.map((term, index) => (
                  <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    <span>{term}</span>
                    <button
                      onClick={() => handleRemoveSearch(term)}
                      className="hover:bg-blue-200 rounded-full p-1"
                      title="Quitar búsqueda"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4">

            {/* Filtros de estatus */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setEstatusFilter('todos')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${estatusFilter === 'todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Todos ({stats.total})
              </button>
              <button
                onClick={() => setEstatusFilter('recientes')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${estatusFilter === 'recientes'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                🕒 Últimos Movimientos
              </button>
              <button
                onClick={() => setEstatusFilter('completado')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${estatusFilter === 'completado'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Completados ({stats.completados})
              </button>
              <button
                onClick={() => setEstatusFilter('prorroga')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${estatusFilter === 'prorroga'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Prórrogas Vigentes ({(stats.prorrogas || 0) - (stats.prorrogasVencidas || 0)})
              </button>
              <button
                onClick={() => setEstatusFilter('vencidas')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${estatusFilter === 'vencidas'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                🚨 Vencidas ({stats.prorrogasVencidas || 0})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0">
        {loading ? (
          <div className="p-8 text-center">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-compact w-full text-xs">
              <thead>
                <tr>
                  <th className="text-xs">Fecha</th>
                  <th className="text-xs">Alumno</th>
                  <th className="text-xs">Concepto</th>
                  <th className="text-xs text-right">Monto</th>
                  <th className="text-xs">Método</th>
                  <th className="text-xs">Ref.</th>
                  <th className="text-xs text-center">Días</th>
                  <th className="text-xs text-center">Estatus</th>
                  {can('pagos', 'editar') && (
                    <th className="text-xs text-center">Acción</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pagos.length === 0 ? (
                  <tr>
                    <td colSpan={can('pagos', 'editar') ? "9" : "8"} className="text-center py-8 text-gray-500">
                      {estatusFilter === 'vencidas' 
                        ? '✅ ¡Excelente! No hay prórrogas vencidas'
                        : 'No hay pagos registrados'}
                    </td>
                  </tr>
                ) : (
                  pagos
                    .filter(p => {
                      // Calcular días restantes para todos los pagos con prórroga
                      const diasRestantes = p.tiene_prorroga && p.fecha_limite_prorroga
                        ? Math.ceil((new Date(p.fecha_limite_prorroga) - new Date()) / (1000 * 60 * 60 * 24))
                        : null;
                      
                      // Aplicar filtros específicos
                      if (estatusFilter === 'completado') {
                        // Solo pagos completados/pagados
                        return p.estatus === 'pagado' || p.estatus === 'completado';
                      } else if (estatusFilter === 'prorroga') {
                        // Solo prórrogas VIGENTES (días >= 0)
                        return p.tiene_prorroga && p.estatus !== 'pagado' && p.estatus !== 'completado' && diasRestantes !== null && diasRestantes >= 0;
                      } else if (estatusFilter === 'vencidas') {
                        // Solo prórrogas VENCIDAS (días < 0) o estatus vencido con prórroga
                        return p.tiene_prorroga && p.estatus !== 'pagado' && p.estatus !== 'completado' && diasRestantes !== null && (diasRestantes < 0 || p.estatus === 'vencido');
                      }
                      
                      // Para "todos", mostrar todo
                      return true;
                    })
                    .map(p => {
                    const diasRestantes = p.tiene_prorroga && p.fecha_limite_prorroga
                      ? Math.ceil((new Date(p.fecha_limite_prorroga) - new Date()) / (1000 * 60 * 60 * 24))
                      : null;
                    
                    return (
                      <tr key={p.id} className={
                        p.tiene_prorroga && p.estatus === 'pendiente' 
                          ? (diasRestantes !== null && diasRestantes < 0 
                              ? 'bg-red-50' // Vencida - fondo rojo claro
                              : 'bg-yellow-50') // Vigente - fondo amarillo claro
                          : ''
                      }>
                        <td className="text-xs">
                          {p.fecha_pago 
                            ? new Date(p.fecha_pago).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
                            : p.created_at 
                              ? new Date(p.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
                              : 'N/A'
                          }
                        </td>
                        <td className="text-xs whitespace-nowrap">
                          {p.alumno_nombre || 'Sin nombre'}
                        </td>
                        <td className="text-xs">
                          {p.concepto || 'N/A'}
                        </td>
                        <td className="text-xs font-bold text-green-600 text-right">${(parseFloat(p.monto_final || p.monto) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="text-xs"><span className="badge badge-info badge-sm">FU</span></td>
                        <td className="text-xs">{p.referencia ? p.referencia.substring(0, 5) : '-'}</td>
                        <td className="text-center">
                          {/* Solo mostrar días si tiene prórroga Y NO está completado/pagado */}
                          {p.tiene_prorroga && diasRestantes !== null && p.estatus !== 'pagado' && p.estatus !== 'completado' ? (
                            <span className={`text-xs font-bold ${diasRestantes < 0 ? 'text-red-600' :
                              diasRestantes <= 1 ? 'text-orange-600' :
                                diasRestantes <= 3 ? 'text-yellow-600' :
                                  'text-green-600'
                              }`}>
                              {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d` :
                                diasRestantes === 0 ? 'Hoy' :
                                  `${diasRestantes}d`}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="text-center">
                          {p.tiene_prorroga && p.estatus === 'pendiente' ? (
                            // Si tiene prórroga, verificar si está vencida o vigente
                            diasRestantes !== null && diasRestantes < 0 ? (
                              <span className="badge badge-danger badge-sm">Vencido</span>
                            ) : (
                              <span className="badge badge-warning badge-sm">Prórroga</span>
                            )
                          ) : (
                            <span className={`badge badge-sm ${p.estatus === 'completado' || p.estatus === 'pagado' ? 'badge-success' : p.estatus === 'pendiente' ? 'badge-warning' : 'badge-danger'}`}>
                              {p.estatus === 'completado' || p.estatus === 'pagado' ? 'Completado' : p.estatus || 'pendiente'}
                            </span>
                          )}
                        </td>
                        {can('pagos', 'editar') && (
                          <td className="text-center">
                            <button
                              onClick={() => handleEdit(p)}
                              className="btn btn-xs btn-ghost text-blue-600 hover:bg-blue-50 p-1"
                              title="Editar pago"
                            >
                              <FaEdit size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación ABAJO de la tabla */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {currentPage} de {totalPages} ({stats.total} registros)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-white border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>

              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded text-sm ${currentPage === page
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 3 || page === currentPage + 3) {
                    return <span key={page} className="px-2">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-white border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {
        showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-3xl w-full p-5 my-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-3">{editingId ? 'Editar Pago' : 'Registrar Pago'}</h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">💡</span>
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Instrucciones:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li><strong>Pago completado:</strong> El alumno ya pagó con formato universal. Captura la línea de captura.</li>
                      <li><strong>Pago pendiente con prórroga:</strong> El alumno aún no ha pagado, dale una fecha límite.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1">
                    Alumno *
                    <TooltipIcon text="Busca por matrícula o nombre del alumno" />
                  </label>

                  {/* Campo de búsqueda */}
                  <div className="relative mb-2">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      className="input text-sm pl-10"
                      placeholder="Buscar por matrícula o nombre..."
                      value={alumnoSearchTerm}
                      onChange={(e) => setAlumnoSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Select filtrado */}
                  <select
                    className="input text-sm"
                    value={formData.alumno_id}
                    onChange={(e) => setFormData({ ...formData, alumno_id: e.target.value })}
                    required
                    size="8"
                    style={{ height: '200px' }}
                  >
                    <option value="">Seleccionar alumno</option>
                    {alumnos
                      .filter(a => {
                        if (!alumnoSearchTerm) return true; // Si no hay búsqueda, mostrar todos

                        const searchLower = alumnoSearchTerm.toLowerCase();

                        // Buscar por nombre completo (si existe)
                        const nombreCompleto = (a.nombre_completo || '').toLowerCase();

                        // Buscar por campos separados
                        const nombreSeparado = `${a.nombre || ''} ${a.apellido_paterno || ''} ${a.apellido_materno || ''}`.toLowerCase();

                        // Buscar por matrícula
                        const matricula = (a.matricula || '').toString();

                        return nombreCompleto.includes(searchLower) ||
                          nombreSeparado.includes(searchLower) ||
                          matricula.includes(alumnoSearchTerm); // Búsqueda exacta para matrícula
                      })
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.nombre_completo || `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`} - {a.matricula}
                        </option>
                      ))
                    }
                  </select>

                  {/* Contador de resultados */}
                  <p className="text-xs text-gray-500 mt-1">
                    {alumnos.filter(a => {
                      if (!alumnoSearchTerm) return true;

                      const searchLower = alumnoSearchTerm.toLowerCase();
                      const nombreCompleto = (a.nombre_completo || '').toLowerCase();
                      const nombreSeparado = `${a.nombre || ''} ${a.apellido_paterno || ''} ${a.apellido_materno || ''}`.toLowerCase();
                      const matricula = (a.matricula || '').toString();

                      return nombreCompleto.includes(searchLower) ||
                        nombreSeparado.includes(searchLower) ||
                        matricula.includes(alumnoSearchTerm);
                    }).length} alumno(s) encontrado(s)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1">
                      Concepto *
                      <TooltipIcon text="Selecciona el tipo de pago - el monto se calcula automáticamente" />
                    </label>
                    <select
                      className="input text-sm"
                      value={formData.concepto}
                      onChange={(e) => handleConceptoChange(e.target.value)}
                      required
                    >
                      <option value="">Selecciona...</option>
                      <option value="Constancia de Inglés - Celex">Constancia de Inglés - Celex</option>
                      <option value="Credencial para Alumnos Externos - Celex">Credencial para Alumnos Externos - Celex</option>
                      <option value="Curso de Idiomas - Celex - Cónyuge e hijos de Docentes y Administrativos">Curso de Idiomas - Celex - Cónyuge e hijos de Docentes y Administrativos</option>
                      <option value="Curso de Idiomas - Celex - Docentes y Administrativos">Curso de Idiomas - Celex - Docentes y Administrativos</option>
                      <option value="Curso de Idiomas - Celex - Egresados">Curso de Idiomas - Celex - Egresados</option>
                      <option value="Curso de Idiomas - Celex - Estudiantes">Curso de Idiomas - Celex - Estudiantes</option>
                      <option value="Curso de Idiomas - Celex - Externos">Curso de Idiomas - Celex - Externos</option>
                      <option value="Curso de Idiomas - Celex - Sector con convenio con el TESCHA">Curso de Idiomas - Celex - Sector con convenio con el TESCHA</option>
                      <option value="Examen Escrito para Acreditación - Celex">Examen Escrito para Acreditación - Celex</option>
                      <option value="Examen de Colocación - Celex">Examen de Colocación - Celex</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1">
                      Monto *
                      <TooltipIcon text="Se calcula automáticamente según el concepto (puedes modificarlo si es necesario)" />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input text-sm"
                      value={formData.monto}
                      onChange={(e) => {
                        const valor = e.target.value;
                        if (valor === '' || (!isNaN(parseFloat(valor)) && parseFloat(valor) >= 0)) {
                          setFormData({ ...formData, monto: valor });
                        }
                      }}
                      required
                      placeholder="Selecciona un concepto primero"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1">
                      Método de Pago *
                      <TooltipIcon text="Pago en ventanilla con Formato Universal" />
                    </label>
                    <input
                      type="text"
                      className="input text-sm bg-gray-50"
                      value="Formato Universal"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1">
                      Número de Recibo *
                      <TooltipIcon text="Número único del recibo de pago (no se puede repetir)" />
                    </label>
                    <input
                      type="text"
                      className="input text-sm"
                      value={formData.referencia}
                      onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                      placeholder="Ej: 121285"
                      required={!formData.tiene_prorroga}
                      minLength="3"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notas</label>
                  <textarea className="input text-sm" rows="2" value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} placeholder="Observaciones adicionales" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Estatus *</label>
                  <select 
                    className="input text-sm" 
                    value={formData.estatus} 
                    onChange={(e) => {
                      const nuevoEstatus = e.target.value;
                      const fechaHoy = new Date().toISOString().split('T')[0];
                      setFormData({ 
                        ...formData, 
                        estatus: nuevoEstatus,
                        // Si cambia a pendiente, activar prórroga automáticamente
                        tiene_prorroga: nuevoEstatus === 'pendiente' ? true : false,
                        // Si cambia a pagado, limpiar prórroga y agregar fecha de pago
                        fecha_limite_prorroga: nuevoEstatus === 'pagado' ? null : formData.fecha_limite_prorroga,
                        fecha_pago: nuevoEstatus === 'pagado' ? fechaHoy : null
                      });
                    }} 
                    required
                  >
                    <option value="pagado">Completado</option>
                    <option value="pendiente">Pendiente (con prórroga)</option>
                  </select>
                </div>

                {formData.estatus === 'pendiente' && (
                  <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      📅 Fecha Límite de Prórroga *
                      <TooltipIcon text="Fecha máxima para que el alumno realice el pago" />
                    </label>
                    <input
                      type="date"
                      className="input text-sm"
                      value={formData.fecha_limite_prorroga}
                      onChange={(e) => setFormData({ ...formData, fecha_limite_prorroga: e.target.value })}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      ⚠️ Esta fecha determinará cuándo la prórroga se considera vencida
                    </p>
                  </div>
                )}
                <div className="flex justify-end space-x-2 mt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
                  <button type="submit" className="btn-primary text-sm py-2 px-4" disabled={loading}>
                    {loading ? (editingId ? 'Actualizando...' : 'Registrando...') : (editingId ? 'Actualizar Pago' : 'Registrar Pago')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Pagos;
