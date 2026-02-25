import { useState, useRef, useEffect } from 'react';
import { FaCircle, FaChevronDown } from 'react-icons/fa';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  { value: 'online', label: 'En línea', color: 'bg-green-500', textColor: 'text-green-600' },
  { value: 'away', label: 'Ausente', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  { value: 'busy', label: 'Ocupado', color: 'bg-red-500', textColor: 'text-red-600' },
  { value: 'dnd', label: 'No molestar', color: 'bg-purple-500', textColor: 'text-purple-600' },
  { value: 'offline', label: 'Desconectado', color: 'bg-gray-400', textColor: 'text-gray-600' }
];

const StatusSelector = ({ currentStatus = 'online', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const { socket } = useSocket();
  const { user } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escuchar cambios de estado
  useEffect(() => {
    if (!socket) return;

    const handleStatusChanged = (data) => {
      if (data.userId === user.id) {
        setStatus(data.status);
      }
    };

    socket.on('user:status_changed', handleStatusChanged);
    return () => socket.off('user:status_changed', handleStatusChanged);
  }, [socket, user]);

  const handleStatusChange = (newStatus) => {
    if (socket && user) {
      socket.emit('user:change_status', { userId: user.id, status: newStatus });
      setStatus(newStatus);
      setIsOpen(false);
    }
  };

  const currentOption = STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[0];

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
        title="Cambiar estado"
      >
        <FaCircle className={`text-xs ${currentOption.color.replace('bg-', 'text-')}`} />
        <span className="font-medium text-gray-700">{currentOption.label}</span>
        <FaChevronDown className={`text-xs text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left ${
                status === option.value ? 'bg-blue-50' : ''
              }`}
            >
              <FaCircle className={`text-xs ${option.color.replace('bg-', 'text-')}`} />
              <span className={`text-sm font-medium ${option.textColor} ${
                status === option.value ? 'font-bold' : ''
              }`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusSelector;
