import { useState, useEffect } from 'react';
import { reportesService, periodosService, maestrosService, gruposService } from '../services/api';
import { toast } from 'react-toastify';
import { FaFileDownload, FaFilePdf, FaChartBar, FaChartLine, FaChartPie, FaFilter, FaEye, FaFileExcel, FaTimes, FaListAlt } from 'react-icons/fa';

const Reportes = () => {
  const [loading, setLoading] = useState(false);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [selectedMaestro, setSelectedMaestro] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [maestros, setMaestros] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState({ id: '', title: '', rows: [], headers: [] });

  const handlePreview = async (reportId, title) => {
    setLoading(true);
    try {
      const response = await reportesService.exportar(reportId, { 
        formato: 'json',
        periodo_id: selectedPeriodo,
        maestro_id: selectedMaestro,
        grupo_id: selectedGrupo
      });
      
      const rows = response.data;
      if (rows.length === 0) {
        toast.info('No hay datos para mostrar en este reporte');
        return;
      }

      const headers = Object.keys(rows[0]);
      setPreviewData({ id: reportId, title, rows, headers });
      setShowPreview(true);
    } catch (error) {
      console.error('Error al cargar vista previa:', error);
      toast.error('Error al cargar vista previa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriodos();
    fetchMaestros();
  }, []);

  useEffect(() => {
    if (selectedPeriodo) {
      fetchGrupos();
    } else {
      setGrupos([]);
      setSelectedGrupo('');
    }
  }, [selectedPeriodo]);

  const fetchPeriodos = async () => {
    try {
      const response = await periodosService.getAll();
      setPeriodos(response.data);
      const activo = response.data.find(p => p.activo);
      if (activo) setSelectedPeriodo(activo.id);
    } catch (error) {
      console.error('Error al cargar periodos:', error);
      toast.error('No se pudieron cargar los periodos');
    }
  };

  const fetchMaestros = async () => {
    try {
      const response = await maestrosService.getAll();
      // Filtrar para mostrar solo los que tienen rol de maestro
      const soloMaestros = response.data.filter(m => (m.rol_usuario || m.rol) === 'maestro');
      setMaestros(soloMaestros);
    } catch (error) {
      console.error('Error al cargar maestros:', error);
    }
  };

  const fetchGrupos = async () => {
    try {
      const response = await gruposService.getAll({ periodo_id: selectedPeriodo, activo: true });
      setGrupos(response.data);
    } catch (error) {
      console.error('Error al cargar grupos:', error);
    }
  };

  const reportTypes = [
    {
      id: 'reprobacion',
      title: 'Índice de Reprobación',
      description: 'Alumnos que no han acreditado el nivel actual',
      icon: FaChartBar,
      color: 'red',
      categoria: 'Académicos'
    },
    {
      id: 'desercion',
      title: 'Tasa de Deserción',
      description: 'Alumnos que abandonaron el curso',
      icon: FaChartLine,
      color: 'orange',
      categoria: 'Académicos'
    },
    {
      id: 'asistencias-bajas',
      title: 'Bajas Asistencias',
      description: 'Alumnos con asistencia menor al 80%',
      icon: FaChartLine,
      color: 'red',
      categoria: 'Académicos'
    },
    {
      id: 'asistencias-resumen',
      title: 'Resumen de Asistencia',
      description: 'Porcentaje de asistencia por grupo',
      icon: FaChartPie,
      color: 'blue',
      categoria: 'Académicos'
    },
    {
      id: 'asistencias-alumnos',
      title: 'Lista de Asistencias Detallada',
      description: 'Lista completa de alumnos con conteo de faltas y asistencias',
      icon: FaChartBar,
      color: 'blue',
      categoria: 'Académicos'
    },
    {
      id: 'calificaciones-grupo',
      title: 'Boleta de Calificaciones',
      description: 'Lista detallada de notas por alumno y grupo',
      icon: FaChartBar,
      color: 'green',
      categoria: 'Académicos'
    },
    {
      id: 'sabana-global',
      title: 'Sábana de Calificaciones y Asistencias',
      description: 'Matriz maestra con calificaciones de 3 parciales y % de asistencia',
      icon: FaListAlt,
      color: 'purple',
      categoria: 'Académicos'
    },
    {
      id: 'ingresos',
      title: 'Reporte de Ingresos',
      description: 'Análisis financiero de pagos y prórroga',
      icon: FaChartBar,
      color: 'yellow',
      categoria: 'Financieros'
    },
    {
      id: 'prorrogas-activas',
      title: 'Prórrogas de Pago',
      description: 'Seguimiento de prórrogas activas y vencidas',
      icon: FaChartLine,
      color: 'orange',
      categoria: 'Financieros'
    },
    {
      id: 'adeudos-criticos',
      title: 'Adeudos Críticos',
      description: 'Alumnos con pagos pendientes y vencidos',
      icon: FaChartBar,
      color: 'red',
      categoria: 'Financieros'
    },
    {
      id: 'carga-maestros',
      title: 'Carga de Maestros',
      description: 'Grupos y horas asignadas por maestro',
      icon: FaChartLine,
      color: 'green',
      categoria: 'Administración'
    },
    {
      id: 'eficiencia-terminal',
      title: 'Eficiencia Terminal',
      description: 'Alumnos que completaron todos los niveles',
      icon: FaChartPie,
      color: 'teal',
      categoria: 'Administración'
    },
    {
      id: 'sin-requisito',
      title: 'Alumnos Sin Requisito',
      description: 'Alumnos externos sin documento requerido',
      icon: FaChartBar,
      color: 'purple',
      categoria: 'Administración'
    }
  ];

  const handleGenerateReport = async (reportId, format = 'excel') => {
    setLoading(true);
    try {
      const response = await reportesService.exportar(reportId, { 
        formato: format,
        periodo_id: selectedPeriodo,
        maestro_id: selectedMaestro,
        grupo_id: selectedGrupo
      });
      
      // Crear descarga del archivo binario
      const blob = new Blob([response.data], {
        type: format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_${reportId}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Reporte ${format === 'excel' ? 'Excel' : 'PDF'} generado exitosamente`);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast.error('Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      red: 'from-red-500 to-red-600',
      orange: 'from-orange-500 to-orange-600',
      blue: 'from-blue-500 to-blue-600',
      purple: 'from-purple-500 to-purple-600',
      green: 'from-green-500 to-green-600',
      teal: 'from-teal-500 to-teal-600',
      yellow: 'from-yellow-500 to-yellow-600'
    };
    return colors[color] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reportes y Estadísticas</h1>
          <p className="text-gray-600 mt-2">Genera reportes académicos y financieros del sistema</p>
        </div>
      </div>

      {/* Filtro de período */}
      <div className="card bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex items-center gap-2 mb-4 text-blue-700 font-semibold">
          <FaFilter />
          <span>Filtros de Reporte</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              1. Período Académico:
            </label>
            <select 
              className="input bg-white font-semibold text-gray-700 h-11 border-2 border-gray-100 hover:border-blue-200 transition-all shadow-sm"
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
            >
              <option value="">Cualquier período</option>
              {periodos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.activo ? '(Actual)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              2. Filtrar por Docente:
            </label>
            <select 
              className="input bg-white font-semibold text-gray-700 h-11 border-2 border-gray-100 hover:border-blue-200 transition-all shadow-sm"
              value={selectedMaestro}
              onChange={(e) => setSelectedMaestro(e.target.value)}
            >
              <option value="">Todos los docentes</option>
              {maestros.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre} {m.apellido_paterno}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              3. Filtrar por Grupo:
            </label>
            <select 
              className="input bg-white font-semibold text-gray-700 h-11 border-2 border-gray-100 hover:border-blue-200 transition-all shadow-sm"
              value={selectedGrupo}
              onChange={(e) => setSelectedGrupo(e.target.value)}
              disabled={!selectedPeriodo}
            >
              <option value="">{!selectedPeriodo ? 'Selecciona un periodo' : 'Cualquier grupo'}</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>
                  {g.codigo_grupo || g.codigo} - {g.nivel_nombre || g.nivel}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="text-xs text-blue-600 font-medium italic">
                La información de los reportes se ajustará según los filtros (Periodo, Maestro o Grupo) seleccionados arriba.
            </p>
        </div>
      </div>

      {/* Grid de reportes categorizados */}
      {['Académicos', 'Financieros', 'Administración'].map((cat) => (
        <div key={cat} className="space-y-4">
          <div className="flex items-center gap-3 py-2 border-b-2 border-gray-100">
            <h2 className="text-xl font-bold text-gray-700 uppercase tracking-tight">{cat}</h2>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">
              {reportTypes.filter(r => r.categoria === cat).length} reportes
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTypes
              .filter(report => report.categoria === cat)
              .map((report) => {
                const Icon = report.icon;
                return (
                  <div key={report.id} className="card hover:shadow-lg transition-all duration-300 border-t-4 border-t-transparent hover:border-t-tescha-blue">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 bg-gradient-to-br ${getColorClasses(report.color)} rounded-xl shadow-md`}>
                        <Icon className="text-2xl text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-lg font-bold text-gray-800 leading-tight">
                            {report.title}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">
                          {report.description}
                        </p>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handlePreview(report.id, report.title)}
                            disabled={loading}
                            className="btn-secondary text-[10px] py-2 flex items-center justify-center space-x-1 hover:bg-gray-100"
                            title="Vista Previa"
                          >
                            <FaEye size={12} />
                            <span>VER</span>
                          </button>
                          <button
                            onClick={() => handleGenerateReport(report.id, 'pdf')}
                            disabled={loading}
                            className="btn-secondary text-[10px] py-2 flex items-center justify-center space-x-1 border-red-100 text-red-600 hover:bg-red-50"
                            title="Descargar PDF"
                          >
                            <FaFilePdf size={12} />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => handleGenerateReport(report.id, 'excel')}
                            disabled={loading}
                            className="btn-secondary text-[10px] py-2 flex items-center justify-center space-x-1 border-green-100 text-green-600 hover:bg-green-50"
                            title="Descargar Excel"
                          >
                            <FaFileExcel size={12} />
                            <span>XLSX</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Modal de Vista Previa */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{previewData.title}</h3>
                <p className="text-sm text-gray-500">Vista previa de los primeros registros</p>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FaTimes className="text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-[10px] border-b">
                    <tr>
                      {previewData.headers.map(h => (
                        <th key={h} className="px-4 py-3">{h.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition-colors">
                        {previewData.headers.map(h => (
                          <td key={`${idx}-${h}`} className="px-4 py-3 text-gray-600 font-medium">
                            {typeof row[h] === 'boolean' ? (row[h] ? 'Sí' : 'No') : String(row[h] || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
              <button 
                onClick={() => setShowPreview(false)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 font-bold transition-all text-gray-700"
              >
                Cerrar
              </button>
              <button 
                onClick={() => { handleGenerateReport(previewData.id, 'pdf'); setShowPreview(false); }}
                className="px-6 py-2 bg-tescha-blue text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg transition-all"
              >
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="card bg-blue-50 border-l-4 border-tescha-blue">
        <div className="flex items-start space-x-3">
          <FaFileDownload className="text-2xl text-tescha-blue mt-1" />
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Información sobre los reportes</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Los reportes en PDF son ideales para impresión y presentación</li>
              <li>• Utiliza el filtro de período para reportes específicos</li>
              <li>• Los datos se actualizan en tiempo real desde la base de datos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;
