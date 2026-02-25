import { useState } from 'react';
import { authService } from '../services/api';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaLock, FaCheck, FaTimes } from 'react-icons/fa';

const CambioPasswordModal = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);

  // Validaciones de contraseña segura
  const validaciones = {
    longitud: formData.newPassword.length >= 8,
    mayuscula: /[A-Z]/.test(formData.newPassword),
    minuscula: /[a-z]/.test(formData.newPassword),
    numero: /\d/.test(formData.newPassword),
    especial: /[!@#$%&*\-_+=]/.test(formData.newPassword),
    coincide: formData.newPassword === formData.confirmPassword && formData.confirmPassword !== ''
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!Object.values(validaciones).every(v => v)) {
      toast.error('La contraseña no cumple con los requisitos de seguridad');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword
      });

      toast.success('¡Contraseña cambiada exitosamente!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  const ValidacionItem = ({ valido, texto }) => (
    <div className={`flex items-center gap-1.5 text-xs ${valido ? 'text-green-600' : 'text-gray-500'}`}>
      {valido ? <FaCheck className="text-green-600 text-xs" /> : <FaTimes className="text-gray-400 text-xs" />}
      <span>{texto}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 backdrop-blur-sm" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <FaLock className="text-3xl text-orange-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Cambio de Contraseña Obligatorio</h2>
          <p className="text-sm text-gray-600">Por seguridad, debes cambiar tu contraseña temporal antes de continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña Actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              🔒 Contraseña Temporal Actual
            </label>
            <div className="relative">
              <input
                type={showPasswords.old ? 'text' : 'password'}
                value={formData.oldPassword}
                onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
                className="input pr-12 font-mono"
                placeholder="Ingresa tu contraseña temporal"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.old ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              🔑 Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="input pr-12 font-mono"
                placeholder="Crea una contraseña segura"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.new ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ✓ Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="input pr-12 font-mono"
                placeholder="Repite tu nueva contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.confirm ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>
          </div>

          {/* Validaciones */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Requisitos de seguridad:</p>
            <div className="grid grid-cols-2 gap-1.5">
              <ValidacionItem valido={validaciones.longitud} texto="Mínimo 8 caracteres" />
              <ValidacionItem valido={validaciones.mayuscula} texto="Una mayúscula (A-Z)" />
              <ValidacionItem valido={validaciones.minuscula} texto="Una minúscula (a-z)" />
              <ValidacionItem valido={validaciones.numero} texto="Un número (0-9)" />
              <ValidacionItem valido={validaciones.especial} texto="Carácter especial (!@#$%&*-_+=)" />
              <ValidacionItem valido={validaciones.coincide} texto="Las contraseñas coinciden" />
            </div>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || !Object.values(validaciones).every(v => v)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Cambiando contraseña...' : '🔐 Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CambioPasswordModal;
