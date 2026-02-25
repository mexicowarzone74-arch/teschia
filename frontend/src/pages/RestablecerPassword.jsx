import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import api from '../services/api';

const RestablecerPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validando, setValidando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);

  useEffect(() => {
    // Verificar que el token existe
    if (!token) {
      toast.error('Token inválido');
      navigate('/login');
    }
    setValidando(false);
    setTokenValido(true);
  }, [token, navigate]);

  const validarPassword = () => {
    if (nuevaPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (nuevaPassword !== confirmarPassword) {
      toast.error('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarPassword()) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/restablecer-contrasena', {
        token,
        nuevaPassword,
      });

      if (response.data.success) {
        toast.success('¡Contraseña restablecida exitosamente!');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(response.data.error || 'Error al restablecer contraseña');
        setLoading(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al restablecer contraseña');
      setLoading(false);
    }
  };

  if (validando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tescha-blue to-blue-900 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p>Validando token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValido) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tescha-blue to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Token Inválido</h2>
          <p className="text-gray-600 mb-6">
            El enlace de recuperación es inválido o ha expirado.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  const requisitos = [
    { texto: 'Al menos 8 caracteres', cumple: nuevaPassword.length >= 8 },
    { texto: 'Las contraseñas coinciden', cumple: nuevaPassword && nuevaPassword === confirmarPassword },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-tescha-blue to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaLock className="text-4xl text-tescha-blue" />
          </div>
          <h1 className="text-3xl font-bold text-tescha-blue mb-2">Nueva Contraseña</h1>
          <p className="text-gray-600">Ingresa tu nueva contraseña</p>
          <div className="w-20 h-1 bg-tescha-gold mx-auto mt-4"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                className="input pr-12"
                placeholder="Mínimo 8 caracteres"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                className="input pr-12"
                placeholder="Repite tu contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showConfirm ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Indicadores de requisitos */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Requisitos:</p>
            {requisitos.map((req, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <FaCheckCircle 
                  className={`${req.cumple ? 'text-green-500' : 'text-gray-300'} transition-colors`} 
                />
                <span className={req.cumple ? 'text-green-700' : 'text-gray-600'}>
                  {req.texto}
                </span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !requisitos.every(r => r.cumple)}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-tescha-blue hover:underline"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Tecnológico de Estudios Superiores de Chalco</p>
        </div>
      </div>
    </div>
  );
};

export default RestablecerPassword;
