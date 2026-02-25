import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaTimes, FaUserEdit, FaSave } from 'react-icons/fa';
import api from '../services/api';

const ConfigurarPerfilModal = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    cargarDatosPerfil();
  }, []);

  const cargarDatosPerfil = async () => {
    try {
      const response = await api.get('/auth/perfil');
      
      if (response.data) {
        setFormData({
          nombre: response.data.nombre || '',
          apellido_paterno: response.data.apellido_paterno || '',
          apellido_materno: response.data.apellido_materno || ''
        });
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      toast.error('Error al cargar los datos del perfil');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim() || !formData.apellido_paterno.trim()) {
      toast.error('Nombre y apellido paterno son obligatorios');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/perfil', formData);
      
      toast.success('Perfil actualizado. Por favor, vuelve a iniciar sesión para ver los cambios.');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6">
          <p>Cargando datos del perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-full">
              <FaUserEdit className="text-purple-600 text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Configurar Perfil</h2>
              <p className="text-sm text-gray-600">Actualiza tu información personal</p>
            </div>
          </div>
          <button
            onClick={onSuccess}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-2xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="input w-full"
              placeholder="Tu nombre"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Apellido Paterno *
            </label>
            <input
              type="text"
              value={formData.apellido_paterno}
              onChange={(e) => setFormData({ ...formData, apellido_paterno: e.target.value })}
              className="input w-full"
              placeholder="Tu apellido paterno"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Apellido Materno (Opcional)
            </label>
            <input
              type="text"
              value={formData.apellido_materno}
              onChange={(e) => setFormData({ ...formData, apellido_materno: e.target.value })}
              className="input w-full"
              placeholder="Tu apellido materno"
            />
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
            <p className="text-sm text-blue-800">
              💡 <strong>Nota:</strong> Después de actualizar tu perfil, debes cerrar sesión y volver a iniciar para ver los cambios reflejados.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onSuccess}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                'Guardando...'
              ) : (
                <>
                  <FaSave />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigurarPerfilModal;
