import { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket debe ser usado dentro de un SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimerRef = useRef(null);
  const maxReconnectAttempts = 10;
  const heartbeatIntervalRef = useRef(null);
  const lastHeartbeat = useRef(Date.now());

  useEffect(() => {
    let socketInstance = null;

    const connect = () => {
      // Conectar al servidor Socket.io con configuración mejorada
      socketInstance = io('http://coordinacion-tescha.local:5000', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttempts,
        timeout: 20000
      });

      // Eventos de conexión
      socketInstance.on('connect', () => {

        setConnected(true);
        setReconnectAttempts(0);
        lastHeartbeat.current = Date.now();
        
        if (reconnectAttempts > 0) {
          toast.success('🔄 Reconectado exitosamente');
        }

        // Iniciar heartbeat para detectar conexiones zombies
        startHeartbeat(socketInstance);
      });

      socketInstance.on('disconnect', (reason) => {

        setConnected(false);
        stopHeartbeat();

        if (reason === 'io server disconnect') {
          // El servidor cerró la conexión, reconectar manualmente
          socketInstance.connect();
        }
      });

      socketInstance.on('connect_error', (error) => {
        console.error('❌ Error de conexión Socket.io:', error);
        setConnected(false);
        setReconnectAttempts(prev => prev + 1);

        if (reconnectAttempts >= maxReconnectAttempts) {
          toast.error('❌ No se pudo conectar al servidor. Por favor recarga la página.');
        }
      });

      // Respuesta a heartbeat
      socketInstance.on('pong', () => {
        lastHeartbeat.current = Date.now();
      });

      // Detectar anomalías en la conexión
      socketInstance.on('error', (error) => {
        console.error('🚨 Error en Socket.io:', error);
        toast.error('Error de comunicación con el servidor');
      });

      setSocket(socketInstance);
    };

    // Iniciar conexión
    connect();

    // Monitorear estado de conexión cada 30 segundos
    const connectionMonitor = setInterval(() => {
      if (socketInstance && socketInstance.connected) {
        const timeSinceLastHeartbeat = Date.now() - lastHeartbeat.current;
        
        // Si no hay heartbeat en 60 segundos, considerar conexión zombie
        if (timeSinceLastHeartbeat > 60000) {
          console.warn('⚠️ Conexión zombie detectada, reconectando...');
          socketInstance.disconnect();
          socketInstance.connect();
        }
      }
    }, 30000);

    // Cleanup al desmontar
    return () => {
      if (socketInstance) {
        stopHeartbeat();
        socketInstance.disconnect();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      clearInterval(connectionMonitor);
    };
  }, []);

  // Heartbeat para mantener conexión activa
  const startHeartbeat = (socketInstance) => {
    stopHeartbeat();
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketInstance && socketInstance.connected) {
        socketInstance.emit('ping');
      }
    }, 25000); // Cada 25 segundos
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, reconnectAttempts }}>
      {children}
    </SocketContext.Provider>
  );
};
