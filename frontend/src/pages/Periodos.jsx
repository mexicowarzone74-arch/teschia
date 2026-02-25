import { useState, useEffect } from 'react';
import { periodosService } from '../services/api';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { TooltipIcon } from '../components/Tooltip';

const Periodos = () => {
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    tipo: 'escolarizado', 
    fecha_inicio_clases: '', 
    fecha_fin_clases: ''
  });

  useEffect(() => { 
    loadPeriodos();
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(() => {
      loadPeriodos();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadPeriodos = async () => {
    try {
      const response = await periodosService.getAll();
      setPeriodos(response.data);
    } catch (error) {
      toast.error('Error al cargar períodos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (periodo = null) => {
    if (periodo) {
      setEditing(periodo);
      setFormData({ 
        nombre: periodo.nombre, 
        tipo: periodo.tipo, 
        fecha_inicio_clases: periodo.fecha_inicio_clases?.split('T')[0], 
        fecha_fin_clases: periodo.fecha_fin_clases?.split('T')[0]
      });
    } else {
      setEditing(null);
      setFormData({ 
        nombre: '', 
        tipo: 'escolarizado', 
        fecha_inicio_clases: '', 
        fecha_fin_clases: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await periodosService.update(editing.id, formData);
        toast.success('Período actualizado');
      } else {
        await periodosService.create(formData);
        toast.success('Período creado');
      }
      setShowModal(false);
      loadPeriodos();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (id, activo) => {
    try {
      await periodosService.toggle(id, !activo);
      toast.success(activo ? 'Período desactivado' : 'Período activado');
      loadPeriodos();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este período? Esta acción no se puede deshacer.')) return;
    try {
      await periodosService.delete(id);
      toast.success('Período eliminado correctamente');
      loadPeriodos();
    } catch (error) {
      const mensaje = error.response?.data?.error || 'Error al eliminar período';
      toast.error(mensaje, { autoClose: 5000 });
    }
  };

  // Función para obtener el color del badge según el tipo
  const getBadgeColor = (tipo) => {
    switch(tipo) {
      case 'escolarizado': return 'badge-success';
      case 'semestral': return 'badge-info';
      case 'intensivo': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  // Función para capitalizar el tipo
  const capitalizeTipo = (tipo) => {
    return tipo.charAt(0).toUpperCase() + tipo.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Períodos</h1>
        <button onClick={() => handleOpenModal()} className="btn-primary flex items-center space-x-2">
          <FaPlus />
          <span>Nuevo Período</span>
        </button>
      </div>

      <div className="card p-0">
        {loading ? (
          <div className="p-8 text-center">Cargando...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Inicio Clases</th>
                <th>Fin Clases</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {periodos.map(p => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>
                    <span className={`badge ${getBadgeColor(p.tipo)}`}>
                      {capitalizeTipo(p.tipo)}
                    </span>
                  </td>
                  <td>{new Date(p.fecha_inicio_clases).toLocaleDateString()}</td>
                  <td>{new Date(p.fecha_fin_clases).toLocaleDateString()}</td>
                  <td>
                    <button 
                      onClick={() => handleToggleActivo(p.id, p.activo)} 
                      className={p.activo ? 'text-green-600' : 'text-gray-400'}
                    >
                      {p.activo ? <FaToggleOn size={24} /> : <FaToggleOff size={24} />}
                    </button>
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <button onClick={() => handleOpenModal(p)} className="text-blue-600">
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">{editing ? 'Editar' : 'Nuevo'} Período</h2>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-2">💡</span>
                <p className="text-sm text-blue-900">
                  Define el período escolar con sus fechas de inicio y fin de clases.
                </p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    Nombre *
                    <TooltipIcon text="Nombre del período (Ej: Enero-Junio 2024)" />
                  </label>
                  <input 
                    type="text" 
                    className="input" 
                    value={formData.nombre} 
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo *</label>
                  <select 
                    className="input" 
                    value={formData.tipo} 
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})} 
                    required
                  >
                    <option value="escolarizado">Escolarizado</option>
                    <option value="semestral">Semestral</option>
                    <option value="intensivo">Intensivo</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Inicio Clases *</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={formData.fecha_inicio_clases} 
                    onChange={(e) => setFormData({...formData, fecha_inicio_clases: e.target.value})} 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Fin Clases *</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={formData.fecha_fin_clases} 
                    onChange={(e) => setFormData({...formData, fecha_fin_clases: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Periodos;
