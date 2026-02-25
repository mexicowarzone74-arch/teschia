import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService } from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext();
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos en milisegundos
const WARNING_TIME = 60 * 1000; // Advertir 1 minuto antes

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  // Sistema de detección de inactividad
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      // Limpiar timers existentes
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
      setShowWarning(false);

      // Timer de advertencia (4 minutos)
      warningTimer.current = setTimeout(() => {
        setShowWarning(true);
        toast.warning('Tu sesión expirará en 1 minuto por inactividad', {
          autoClose: 10000,
          closeButton: true
        });
      }, INACTIVITY_TIMEOUT - WARNING_TIME);

      // Timer de cierre de sesión (5 minutos)
      inactivityTimer.current = setTimeout(() => {
        toast.error('Sesión cerrada por inactividad');
        logout();
      }, INACTIVITY_TIMEOUT);
    };

    // Eventos que detectan actividad del usuario
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Iniciar el timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, [user]);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      
      const { token, usuario, debe_cambiar_password, require2FA, userId } = response.data;
      
      if (require2FA) {
        return {
          success: true,
          require2FA: true,
          userId,
          username: credentials.username
        };
      }

      // Solo guardar token temporalmente si requiere cambio de contraseña
      if (debe_cambiar_password) {
        localStorage.setItem('token', token);
        // NO guardamos el usuario aún para evitar redirección automática
      } else {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(usuario));
        setUser(usuario);
      }
      
      return { 
        success: true,
        debe_cambiar_password: debe_cambiar_password || false,
        usuario: usuario // Devolver usuario para guardarlo después del cambio de contraseña
      };
    } catch (error) {
      console.error('❌ AuthContext: Error en login:', error);
      // Determinar el mensaje de error apropiado
      let errorMsg = 'Contraseña incorrecta o usuario no encontrado';
      
      if (error.response) {
        const status = error.response.status;
        const serverError = error.response.data?.error;
        
        if (status === 401 || status === 400) {
          // Errores de autenticación o validación
          errorMsg = 'Contraseña incorrecta o usuario no encontrado';
        } else if (status === 429) {
          errorMsg = serverError || 'Demasiados intentos. Por favor, espera un momento';
        } else if (status >= 500) {
          errorMsg = 'Error en el servidor. Intenta más tarde';
        } else if (serverError) {
          errorMsg = serverError;
        }
      } else if (error.request) {
        errorMsg = 'No se pudo conectar con el servidor';
      }
      
      return { 
        success: false, 
        error: errorMsg
      };
    }
  };

  const login2FA = async (userId, token) => {
    try {
      const response = await authService.login2FA({ userId, token });
      const { token: jwtToken, usuario } = response.data;

      localStorage.setItem('token', jwtToken);
      localStorage.setItem('user', JSON.stringify(usuario));
      setUser(usuario);

      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Error en login 2FA:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Código 2FA incorrecto' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.rol);
  };

  const value = {
    user,
    loading,
    login,
    login2FA,
    logout,
    hasRole,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
