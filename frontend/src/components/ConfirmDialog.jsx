/**
 * Componente de diálogo de confirmación para acciones críticas
 * Previene eliminaciones y cambios accidentales
 */

import { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaCheckCircle, FaTimes } from 'react-icons/fa';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '¿Estás seguro?',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning', // 'warning', 'danger', 'info'
  requireTyping = false,
  confirmPhrase = 'CONFIRMAR',
  countdown = 0 // Segundos de espera antes de poder confirmar
}) => {
  const [typedText, setTypedText] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(countdown);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTypedText('');
      setRemainingSeconds(countdown);
    }
  }, [isOpen, countdown]);

  useEffect(() => {
    if (remainingSeconds > 0) {
      const timer = setTimeout(() => {
        setRemainingSeconds(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [remainingSeconds]);

  if (!isOpen) return null;

  const canConfirm = (!requireTyping || typedText === confirmPhrase) && remainingSeconds === 0 && !loading;

  const typeConfig = {
    warning: {
      icon: FaExclamationTriangle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    danger: {
      icon: FaExclamationTriangle,
      color: 'text-red-600',
      bg: 'bg-red-100',
      buttonColor: 'bg-red-600 hover:bg-red-700'
    },
    info: {
      icon: FaCheckCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error en confirmación:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && canConfirm) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyPress}
      >
        {/* Icono y Título */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`${config.bg} p-3 rounded-full`}>
            <Icon className={`text-2xl ${config.color}`} />
          </div>
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>

        {/* Mensaje */}
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          {message}
        </p>

        {/* Cuenta regresiva */}
        {remainingSeconds > 0 && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              Podrás confirmar en <span className="font-bold text-lg">{remainingSeconds}</span> segundo{remainingSeconds !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Campo de confirmación por escritura */}
        {requireTyping && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Para confirmar, escribe: <span className="font-bold">{confirmPhrase}</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value.toUpperCase())}
              placeholder={confirmPhrase}
              autoFocus
            />
            {typedText && typedText !== confirmPhrase && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <FaTimes className="text-xs" />
                No coincide
              </p>
            )}
            {typedText === confirmPhrase && (
              <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                <FaCheckCircle className="text-xs" />
                Correcto
              </p>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition ${config.buttonColor} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? '⏳ Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
