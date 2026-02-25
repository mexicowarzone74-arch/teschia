/**
 * Componente de notificación de confirmación in-line
 * Para acciones que requieren confirmación sin modal
 */

import { useState, useEffect } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';

const InlineConfirm = ({ 
  message = '¿Estás seguro?',
  onConfirm,
  onCancel,
  confirmText = 'Sí',
  cancelText = 'No',
  autoCancel = 5000, // Auto-cancelar después de 5 segundos
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState(autoCancel / 1000);

  useEffect(() => {
    if (autoCancel && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      onCancel();
    }
  }, [timeLeft, autoCancel, onCancel]);

  return (
    <div className={`inline-flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 shadow-sm ${className}`}>
      <span className="text-sm text-gray-700">{message}</span>
      {autoCancel && (
        <span className="text-xs text-gray-500">({timeLeft}s)</span>
      )}
      <div className="flex gap-1 ml-2">
        <button
          onClick={onConfirm}
          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center gap-1 transition"
        >
          <FaCheck />
          {confirmText}
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded flex items-center gap-1 transition"
        >
          <FaTimes />
          {cancelText}
        </button>
      </div>
    </div>
  );
};

export default InlineConfirm;
