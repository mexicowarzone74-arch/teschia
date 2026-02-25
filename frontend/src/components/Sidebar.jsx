import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import {
  FaHome, FaUserGraduate, FaChalkboardTeacher, FaUsers,
  FaDoorOpen, FaCalendar, FaMoneyBillWave, FaClipboardCheck,
  FaUserCheck, FaChartBar, FaChartLine, FaChartPie, FaUpload, FaTimes, FaUsersCog, FaBolt, FaClock, FaBrain, FaHistory, FaShieldAlt,
  FaComments
} from 'react-icons/fa';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, hasRole } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      // Si el mensaje es para nosotros, refrescar conteo
      if (newMsg.receptor_id === user?.id) {
        fetchUnreadCount();
      }
    };

    const handleUnreadUpdate = () => {
      fetchUnreadCount();
    };

    socket.on('chat:message', handleNewMessage);
    socket.on(`chat:unread_update:${user?.id}`, handleUnreadUpdate);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off(`chat:unread_update:${user?.id}`, handleUnreadUpdate);
    };
  }, [socket, user, location.pathname]);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/chat/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const menuItems = [
    { path: '/', icon: FaHome, label: 'Dashboard', roles: ['coordinador', 'maestro', 'administrativo', 'alumno'] },
    { path: '/ia-dashboard', icon: FaBrain, label: 'Dashboard IA', roles: ['coordinador'], badge: '🤖' },
    { path: '/alumnos', icon: FaUserGraduate, label: 'Alumnos', roles: ['coordinador', 'maestro'] },
    { path: '/grupos', icon: FaUsers, label: 'Grupos', roles: ['coordinador', 'maestro'] },
    { path: '/horarios', icon: FaClock, label: 'Horarios', roles: ['coordinador'] },
    { path: '/inscripciones', icon: FaBolt, label: 'Inscripciones Rápidas', roles: ['coordinador'] },
    { path: '/asignaciones', icon: FaUsersCog, label: 'Asignaciones', roles: ['coordinador'] },
    { path: '/maestro-calificaciones', icon: FaUpload, label: 'Subir Calificaciones', roles: ['maestro'] },
    { path: '/maestro-asistencias', icon: FaUpload, label: 'Subir Asistencias', roles: ['maestro'] },
    { path: '/maestros', icon: FaChalkboardTeacher, label: 'Personal', roles: ['coordinador'] },
    { path: '/chat', icon: FaComments, label: 'Chat Interno', roles: ['coordinador', 'maestro', 'administrativo'] },

    { path: '/periodos', icon: FaCalendar, label: 'Períodos', roles: ['coordinador'] },
    { path: '/pagos', icon: FaMoneyBillWave, label: 'Pagos', roles: ['coordinador', 'administrativo'] },
    { path: '/calificaciones', icon: FaClipboardCheck, label: 'Calificaciones', roles: ['coordinador'] },
    { path: '/asistencias', icon: FaUserCheck, label: 'Asistencias', roles: ['coordinador'] },
    { path: '/reportes', icon: FaChartBar, label: 'Reportes', roles: ['coordinador', 'administrativo'] },
    { path: '/estadisticas', icon: FaChartPie, label: 'Estadísticas', roles: ['coordinador', 'administrativo'] },
    { path: '/tendencias', icon: FaChartLine, label: 'Tendencias', roles: ['coordinador', 'administrativo'] },
    { path: '/auditoria', icon: FaHistory, label: 'Auditoría', roles: ['coordinador'] },
    { path: '/seguridad', icon: FaShieldAlt, label: 'Seguridad', roles: ['coordinador', 'maestro', 'administrativo', 'alumno'] }
  ];

  const filteredMenuItems = menuItems.filter(item => hasRole(item.roles));

  return (
    <div className={`
      bg-tescha-blue text-white w-64 flex-shrink-0 flex flex-col h-screen
      fixed lg:static inset-y-0 left-0 z-30
      transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="p-4 sm:p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-tescha-gold">TESCHA</h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-1">Coordinación de Inglés</p>
        </div>
        <button 
          onClick={onClose}
          className="lg:hidden text-white hover:text-tescha-gold transition-colors"
        >
          <FaTimes className="w-6 h-6" />
        </button>
      </div>

      <nav id="sidebar-menu" className="flex-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              id={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              to={item.path}
              onClick={() => onClose()}
              className={`flex items-center justify-between px-4 sm:px-6 py-3 text-sm sm:text-base text-gray-300 hover:bg-blue-800 hover:text-white transition-colors ${isActive ? 'bg-blue-800 text-white border-l-4 border-tescha-gold' : ''
                }`}
            >
              <div className="flex items-center">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-xs">{item.badge}</span>
              )}
              {item.path === '/chat' && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 sm:p-6 bg-blue-900 border-t border-blue-800">
        <div className="flex items-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-tescha-gold flex items-center justify-center text-tescha-blue font-bold text-sm sm:text-base">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="text-xs sm:text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-gray-300 capitalize">{user?.rol}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
