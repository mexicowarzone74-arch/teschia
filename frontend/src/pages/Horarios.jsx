import { useState, useEffect } from 'react';
import { periodosService } from '../services/api';
import HorariosCalendario from '../components/HorariosCalendario';
import { FaCalendar, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Horarios = () => {
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPeriodos();
  }, []);

  const cargarPeriodos = async () => {
    try {
      const res = await periodosService.getAll();
      const periodosActivos = res.data.filter(p => p.activo);
      setPeriodos(periodosActivos);
      
      // Seleccionar el periodo activo por defecto
      if (periodosActivos.length > 0) {
        setSelectedPeriodo(periodosActivos[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar periodos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FaCalendar className="text-blue-600" />
          Horarios Semanales
        </h1>
        <button 
          onClick={() => window.print()}
          className="btn-secondary flex items-center gap-2"
        >
          <FaDownload />
          Exportar
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <div className="flex items-start gap-2">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-medium text-blue-900">Vista de Calendario Semanal</p>
            <p className="text-sm text-blue-800 mt-1">
              Visualiza todos los horarios de clases organizados por día y hora. 
              Útil para detectar conflictos y espacios disponibles.
            </p>
          </div>
        </div>
      </div>

      {/* Selector de periodo */}
      {periodos.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <label className="block font-medium mb-2">
                {periodos.length > 1 ? 'Seleccionar período:' : 'Período Actual:'}
              </label>
              {periodos.length > 1 ? (
                <select 
                  value={selectedPeriodo || ''}
                  onChange={(e) => setSelectedPeriodo(parseInt(e.target.value))}
                  className="input max-w-md"
                >
                  {periodos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-lg font-semibold text-blue-600">{periodos[0]?.nombre}</p>
              )}
            </div>
            {selectedPeriodo && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Clases</p>
                <p className="font-medium text-gray-800">
                  {new Date(periodos.find(p => p.id === selectedPeriodo)?.fecha_inicio_clases).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {' - '}
                  {new Date(periodos.find(p => p.id === selectedPeriodo)?.fecha_fin_clases).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Inscripciones: {new Date(periodos.find(p => p.id === selectedPeriodo)?.fecha_inicio_inscripciones).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  {' - '}
                  {new Date(periodos.find(p => p.id === selectedPeriodo)?.fecha_fin_inscripciones).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendario */}
      {selectedPeriodo && <HorariosCalendario periodoId={selectedPeriodo} />}
    </div>
  );
};

export default Horarios;
