import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { toast } from 'react-toastify';
import { FaChartPie, FaDownload, FaSync } from 'react-icons/fa';
import { reportesService, periodosService } from '../services/api';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Estadisticas = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  useEffect(() => {
    loadPeriodos();
  }, []);

  const loadPeriodos = async () => {
    try {
      const response = await periodosService.getAll();
      const lista = Array.isArray(response.data) ? response.data : [];
      setPeriodos(lista);
      const activo = lista.find(p => p.activo);
      if (activo) {
        setSelectedPeriod(activo.id);
      } else if (lista.length > 0) {
        setSelectedPeriod(lista[0].id);
      } else {
        // No hay periodos — quitar el spinner
        setLoading(false);
      }
    } catch (error) {
      toast.error('Error al cargar periodos');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPeriod !== '') {
      loadEstadisticas();
    }
  }, [selectedPeriod]);

  const loadEstadisticas = async () => {
    try {
      setLoading(true);
      const response = await reportesService.getDemograficas({ periodo_id: selectedPeriod });
      setData(response.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const response = await reportesService.getDemograficasPDF({ periodo_id: selectedPeriod });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estadisticas-demograficas-${data?.periodo.replace(/\s+/g, '_') || 'reporte'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar PDF');
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  // Colores vibrantes para las gráficas
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
    '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
  ];

  const createPieData = (items, labelKey, valueKey) => ({
    labels: items.map(item => item[labelKey]),
    datasets: [{
      // Convertir porcentajes a números y usar cantidad como dato adicional
      data: items.map(item => parseFloat(item[valueKey]) || 0),
      backgroundColor: colors.slice(0, items.length),
      borderColor: '#fff',
      borderWidth: 2,
      // Guardar las cantidades para mostrarlas en el tooltip
      cantidades: items.map(item => item.cantidad)
    }]
  });

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const porcentaje = context.parsed || 0;
            const cantidad = context.dataset.cantidades[context.dataIndex];
            return `${label}: ${cantidad} alumnos (${porcentaje.toFixed(2)}%)`;
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FaChartPie className="text-blue-600" />
            Estadísticas Demográficas
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-gray-600">
              Periodo: <span className="font-bold text-blue-800">{data.periodo}</span>
            </p>
            <span className="text-gray-300">|</span>
            <p className="text-gray-600">
              Total alumnos: <span className="font-bold text-blue-600">{data.total_alumnos}</span>
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white border p-2 rounded-lg shadow-sm">
            <span className="text-sm font-semibold text-gray-500 ml-1">Filtrar por:</span>
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="outline-none bg-transparent text-blue-700 font-bold border-none cursor-pointer"
            >
              {periodos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.activo ? '(Actual)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadEstadisticas}
              className="btn-secondary flex items-center gap-2"
              disabled={loading}
              title="Actualizar datos"
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn-primary flex items-center gap-2 shadow-lg hover:shadow-blue-200 transition-all"
              disabled={downloading}
            >
              <FaDownload />
              {downloading ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid de gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Por Municipio */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            📍 Distribución por Municipio
          </h3>
          <div className="h-80">
            <Pie 
              data={createPieData(data.distribuciones.por_municipio, 'municipio', 'porcentaje')}
              options={pieOptions}
            />
          </div>
        </div>

        {/* Por Nivel */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            📚 Distribución por Nivel
          </h3>
          <div className="h-80">
            <Pie 
              data={createPieData(data.distribuciones.por_nivel, 'nivel', 'porcentaje')}
              options={pieOptions}
            />
          </div>
        </div>

        {/* Por Edad */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            🎂 Distribución por Edad
          </h3>
          <div className="h-80">
            <Pie 
              data={createPieData(data.distribuciones.por_edad, 'rango_edad', 'porcentaje')}
              options={pieOptions}
            />
          </div>
        </div>

        {/* Por Género */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            👥 Distribución por Género
          </h3>
          <div className="h-80">
            <Pie 
              data={createPieData(data.distribuciones.por_genero, 'genero', 'porcentaje')}
              options={pieOptions}
            />
          </div>
        </div>

        {/* Por Carrera */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            🎓 Distribución por Carrera
            <span className="text-sm font-normal text-gray-600">(Solo internos)</span>
          </h3>
          <div className="h-80">
            <Pie 
              data={createPieData(data.distribuciones.por_carrera, 'carrera', 'porcentaje')}
              options={pieOptions}
            />
          </div>
        </div>

        {/* Por Turno */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            🌅 Distribución por Turno
          </h3>
          <div className="h-80">
            <Pie 
              data={createPieData(data.distribuciones.por_turno, 'turno', 'porcentaje')}
              options={pieOptions}
            />
          </div>
        </div>

        {/* Por Tipo */}
        <div className="card lg:col-span-2">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            🎒 Distribución por Tipo de Alumno
          </h3>
          <div className="h-80">
            <Pie 
              data={createPieData(data.distribuciones.por_tipo, 'tipo', 'porcentaje')}
              options={pieOptions}
            />
          </div>
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">📊 Resumen Numérico</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Municipios Top 3 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-gray-700">Top 3 Municipios</h4>
            {data.distribuciones.por_municipio.slice(0, 3).map((m, i) => (
              <div key={i} className="flex justify-between py-1">
                <span className="text-sm">{m.municipio}</span>
                <span className="font-bold text-blue-600">{m.porcentaje}%</span>
              </div>
            ))}
          </div>

          {/* Niveles Top 3 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-gray-700">Top 3 Niveles</h4>
            {data.distribuciones.por_nivel.slice(0, 3).map((n, i) => (
              <div key={i} className="flex justify-between py-1">
                <span className="text-sm">{n.nivel}</span>
                <span className="font-bold text-blue-600">{n.porcentaje}%</span>
              </div>
            ))}
          </div>

          {/* Género */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-gray-700">Por Género</h4>
            {data.distribuciones.por_genero.map((g, i) => (
              <div key={i} className="flex justify-between py-1">
                <span className="text-sm">{g.genero}</span>
                <span className="font-bold text-blue-600">{g.porcentaje}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Estadisticas;
