import { useState, useEffect } from 'react';
import DashboardInteligente from '../components/DashboardInteligente';
import { periodosService } from '../services/api';

function IADashboard() {
  const [periodoActivo, setPeriodoActivo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPeriodoActivo();
  }, []);

  const cargarPeriodoActivo = async () => {
    try {
      const res = await periodosService.getAll();
      const periodoActual = res.data.find(p => p.activo);
      
      if (periodoActual) {
        setPeriodoActivo(periodoActual);
      }
    } catch (error) {
      console.error('Error al cargar periodo:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <DashboardInteligente periodoActivo={periodoActivo} />
    </div>
  );
}

export default IADashboard;
