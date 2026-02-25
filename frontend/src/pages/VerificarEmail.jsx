import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaSpinner, 
  FaEnvelope,
  FaHome
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function VerificarEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [estado, setEstado] = useState('verificando'); // 'verificando', 'exitoso', 'error'
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    verificarEmail();
  }, [token]);

  const verificarEmail = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/verificar-email`, { token });
      
      if (response.data.success) {
        setEstado('exitoso');
        setMensaje(response.data.message || 'Email verificado exitosamente');
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      setEstado('error');
      setMensaje(
        error.response?.data?.error || 
        'El enlace de verificación es inválido o ha expirado'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <FaEnvelope className="text-4xl text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">TESCHA</h1>
          <p className="text-gray-500 mt-1">Verificación de Email</p>
        </div>

        {/* Estado: Verificando */}
        {estado === 'verificando' && (
          <div className="text-center py-8">
            <FaSpinner className="text-6xl text-green-500 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Verificando tu email...
            </h2>
            <p className="text-gray-600">
              Por favor espera un momento mientras confirmamos tu correo electrónico.
            </p>
          </div>
        )}

        {/* Estado: Exitoso */}
        {estado === 'exitoso' && (
          <div className="text-center py-8">
            <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-6 animate-pulse" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              ¡Email Verificado!
            </h2>
            <p className="text-gray-600 mb-6">
              {mensaje}
            </p>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FaCheckCircle className="text-green-500 mt-0.5" />
                </div>
                <div className="ml-3 text-left">
                  <p className="text-sm text-green-700">
                    Tu correo electrónico ha sido confirmado exitosamente.
                    Ahora puedes usar todas las funciones del sistema.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Serás redirigido al inicio de sesión en 3 segundos...
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
            >
              <FaHome />
              Ir al Login
            </button>
          </div>
        )}

        {/* Estado: Error */}
        {estado === 'error' && (
          <div className="text-center py-8">
            <FaTimesCircle className="text-6xl text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Verificación Fallida
            </h2>
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FaTimesCircle className="text-red-500 mt-0.5" />
                </div>
                <div className="ml-3 text-left">
                  <p className="text-sm text-red-700">
                    {mensaje}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-sm text-gray-600 text-left mb-6">
              <p className="font-semibold">Posibles razones:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>El enlace ha expirado (válido por 24 horas)</li>
                <li>El enlace ya fue utilizado</li>
                <li>El enlace no es válido</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              <FaHome />
              Volver al Login
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Si necesitas ayuda, contacta al coordinador del sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
