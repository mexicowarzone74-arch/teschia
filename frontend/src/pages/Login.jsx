import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaLock, FaShieldAlt, FaEnvelope } from 'react-icons/fa';
import CambioPasswordModal from '../components/CambioPasswordModal';
import api from '../services/api';

const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [tfaCode, setTfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [tempUserId, setTempUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false);
  const [emailRecuperacion, setEmailRecuperacion] = useState('');
  const { login, login2FA, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirigir si ya está autenticado, pero solo si no está esperando cambio de contraseña
  useEffect(() => {
    if (isAuthenticated && !mostrarCambioPassword) {
      navigate('/');
    }
  }, [isAuthenticated, mostrarCambioPassword, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(credentials);
      
      if (result.success) {
        if (result.require2FA) {
          setRequire2FA(true);
          setTempUserId(result.userId);
          setLoading(false);
          toast.info('Verificación de dos factores requerida');
        } else if (result.debe_cambiar_password) {
          setCredentials({ ...credentials, usuario: result.usuario });
          setMostrarCambioPassword(true);
          setLoading(false);
        } else {
          toast.success('¡Bienvenido!');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 500);
        }
      } else {
        toast.error(result.error || 'Contraseña incorrecta o usuario no encontrado');
        setLoading(false);
      }
    } catch (error) {
      toast.error('Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login2FA(tempUserId, tfaCode);
      if (result.success) {
        toast.success('¡Bienvenido! Verificación exitosa');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } else {
        toast.error(result.error);
        setLoading(false);
      }
    } catch (error) {
      toast.error('Error en la verificación 2FA');
      setLoading(false);
    }
  };

  const handlePasswordChanged = (usuario) => {
    if (usuario) {
      localStorage.setItem('user', JSON.stringify(usuario));
    }
    setMostrarCambioPassword(false);
    toast.success('¡Bienvenido! Tu contraseña ha sido actualizada');
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  const handleSolicitarRecuperacion = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/solicitar-recuperacion', { email: emailRecuperacion });
      if (response.data.success) {
        toast.success('Se ha enviado un correo con instrucciones para restablecer tu contraseña');
        setMostrarRecuperacion(false);
        setEmailRecuperacion('');
      } else {
        toast.error(response.data.error || 'No se pudo enviar el correo');
      }
    } catch (error) {
      toast.error('Error al solicitar recuperación de contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {mostrarCambioPassword && <CambioPasswordModal onSuccess={() => handlePasswordChanged(credentials.usuario)} />}
      
      <div className="min-h-screen bg-gradient-to-br from-tescha-blue to-blue-900 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-tescha-blue mb-2">TESCHA</h1>
            <p className="text-sm sm:text-base text-gray-600">Sistema de Coordinación de Inglés</p>
            <div className="w-16 sm:w-20 h-1 bg-tescha-gold mx-auto mt-3 sm:mt-4"></div>
          </div>

          {!require2FA ? (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="input"
                  placeholder="Ingrese su usuario"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="input pr-12"
                    placeholder="Ingrese su contraseña"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-2.5 sm:py-3"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setMostrarRecuperacion(true)}
                  className="text-sm text-tescha-blue hover:underline focus:outline-none"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handle2FASubmit} className="space-y-6 animate-fadeIn">
              <div className="text-center mb-4">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaShieldAlt className="text-3xl text-tescha-blue" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Verificación 2FA</h2>
                <p className="text-sm text-gray-600">Ingresa el código de 6 dígitos de tu aplicación autenticadora</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Código de Seguridad
                </label>
                <input
                  type="text"
                  maxLength="6"
                  value={tfaCode}
                  onChange={(e) => setTfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="input text-center text-3xl tracking-[0.5em] font-bold py-4"
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || tfaCode.length < 6}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {loading ? 'Verificando...' : 'Verificar y Entrar'}
                </button>
                <button
                  type="button"
                  onClick={() => setRequire2FA(false)}
                  className="w-full text-sm text-blue-600 hover:underline"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600">
            <p>Tecnológico de Estudios Superiores de Chalco</p>
          </div>
        </div>
      </div>

      {/* Modal de Recuperación de Contraseña */}
      {mostrarRecuperacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <div className="text-center mb-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaEnvelope className="text-3xl text-tescha-blue" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Recuperar Contraseña</h2>
              <p className="text-sm text-gray-600">
                Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña
              </p>
            </div>

            <form onSubmit={handleSolicitarRecuperacion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={emailRecuperacion}
                  onChange={(e) => setEmailRecuperacion(e.target.value)}
                  className="input"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarRecuperacion(false);
                    setEmailRecuperacion('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary py-2 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
