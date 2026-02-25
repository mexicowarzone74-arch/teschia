/**
 * Ejemplo de componente usando todas las protecciones
 * Sistema 100% Anti-Pendejos
 */

import { useState } from 'react';
import { toast } from 'react-toastify';
import { useFormValidation } from '../hooks/useFormValidation';
import { usePreventDoubleSubmit } from '../hooks/usePreventDoubleSubmit';
import ConfirmDialog from '../components/ConfirmDialog';
import InlineConfirm from '../components/InlineConfirm';
import { sanitizeObject, isInputSafe } from '../utils/inputSanitizer';

const EjemploFormularioSeguro = () => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQuickConfirm, setShowQuickConfirm] = useState(false);
  const { executeWithProtection } = usePreventDoubleSubmit(2000);

  // Schema de validación
  const validationSchema = {
    nombre: [
      { required: true, message: 'El nombre es requerido' },
      { min: 2, message: 'Mínimo 2 caracteres' },
      { max: 100, message: 'Máximo 100 caracteres' },
      { pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, message: 'Solo letras y espacios' }
    ],
    email: [
      { required: true, message: 'El email es requerido' },
      { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' }
    ],
    telefono: [
      { pattern: /^\d{10}$/, message: 'Debe tener 10 dígitos' }
    ],
    edad: [
      { required: true, message: 'La edad es requerida' },
      { minValue: 15, message: 'Edad mínima: 15 años' },
      { maxValue: 100, message: 'Edad máxima: 100 años' }
    ]
  };

  // Hook de validación
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset
  } = useFormValidation(validationSchema, async (data) => {
    // Ejecutar con protección anti-double-submit
    const result = await executeWithProtection(async () => {
      // Sanitizar datos antes de enviar
      const sanitized = sanitizeObject(data, {
        nombre: 'name',
        email: 'email',
        telefono: 'phone',
        edad: 'integer'
      });

      // Validar que no haya intentos de inyección
      if (!isInputSafe(JSON.stringify(sanitized))) {
        throw new Error('Datos potencialmente peligrosos detectados');
      }

      // Enviar al backend
      const response = await fetch('/api/ejemplo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized)
      });

      if (!response.ok) {
        throw new Error('Error al guardar');
      }

      return await response.json();
    });

    if (result.success) {
      toast.success('✅ Guardado exitosamente');
      reset();
    }
  });

  // Función de eliminación con confirmación fuerte
  const handleDelete = async () => {
    const result = await executeWithProtection(async () => {
      const response = await fetch('/api/ejemplo/123', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      return await response.json();
    });

    if (result.success) {
      toast.success('✅ Eliminado exitosamente');
      setShowDeleteConfirm(false);
    }
  };

  // Función de acción rápida con confirmación inline
  const handleQuickAction = async () => {
    const result = await executeWithProtection(async () => {
      const response = await fetch('/api/ejemplo/quick', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Error en acción rápida');
      }

      return await response.json();
    });

    if (result.success) {
      toast.success('✅ Acción completada');
      setShowQuickConfirm(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        🛡️ Formulario 100% Seguro
      </h1>

      {/* Información de seguridad */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h3 className="font-bold text-blue-900 mb-2">
          🔒 Protecciones Activas
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✅ Validación en tiempo real</li>
          <li>✅ Prevención de double-submit</li>
          <li>✅ Sanitización automática</li>
          <li>✅ Detección de inyecciones</li>
          <li>✅ Rate limiting</li>
        </ul>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo Nombre */}
        <div>
          <label className="block font-medium mb-2">
            Nombre *
          </label>
          <input
            type="text"
            className={`w-full px-3 py-2 border rounded-lg ${
              touched.nombre && errors.nombre
                ? 'border-red-500'
                : touched.nombre
                ? 'border-green-500'
                : 'border-gray-300'
            }`}
            value={values.nombre || ''}
            onChange={(e) => handleChange('nombre', e.target.value)}
            onBlur={() => handleBlur('nombre')}
            disabled={isSubmitting}
          />
          {touched.nombre && errors.nombre && (
            <p className="text-red-500 text-sm mt-1">
              ❌ {errors.nombre}
            </p>
          )}
          {touched.nombre && !errors.nombre && values.nombre && (
            <p className="text-green-500 text-sm mt-1">
              ✅ Válido
            </p>
          )}
        </div>

        {/* Campo Email */}
        <div>
          <label className="block font-medium mb-2">
            Email *
          </label>
          <input
            type="email"
            className={`w-full px-3 py-2 border rounded-lg ${
              touched.email && errors.email
                ? 'border-red-500'
                : touched.email
                ? 'border-green-500'
                : 'border-gray-300'
            }`}
            value={values.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            disabled={isSubmitting}
          />
          {touched.email && errors.email && (
            <p className="text-red-500 text-sm mt-1">
              ❌ {errors.email}
            </p>
          )}
        </div>

        {/* Campo Teléfono */}
        <div>
          <label className="block font-medium mb-2">
            Teléfono (10 dígitos)
          </label>
          <input
            type="tel"
            className={`w-full px-3 py-2 border rounded-lg ${
              touched.telefono && errors.telefono
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
            value={values.telefono || ''}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              handleChange('telefono', digits.slice(0, 10));
            }}
            onBlur={() => handleBlur('telefono')}
            disabled={isSubmitting}
            maxLength="10"
          />
          {touched.telefono && errors.telefono && (
            <p className="text-red-500 text-sm mt-1">
              ❌ {errors.telefono}
            </p>
          )}
        </div>

        {/* Campo Edad */}
        <div>
          <label className="block font-medium mb-2">
            Edad *
          </label>
          <input
            type="number"
            className={`w-full px-3 py-2 border rounded-lg ${
              touched.edad && errors.edad
                ? 'border-red-500'
                : touched.edad
                ? 'border-green-500'
                : 'border-gray-300'
            }`}
            value={values.edad || ''}
            onChange={(e) => handleChange('edad', e.target.value)}
            onBlur={() => handleBlur('edad')}
            disabled={isSubmitting}
            min="15"
            max="100"
          />
          {touched.edad && errors.edad && (
            <p className="text-red-500 text-sm mt-1">
              ❌ {errors.edad}
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ Guardando...' : '💾 Guardar'}
          </button>

          <button
            type="button"
            onClick={() => setShowQuickConfirm(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            disabled={isSubmitting}
          >
            ⚡ Acción Rápida
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            disabled={isSubmitting}
          >
            🗑️ Eliminar
          </button>
        </div>
      </form>

      {/* Confirmación inline para acción rápida */}
      {showQuickConfirm && (
        <div className="mt-4">
          <InlineConfirm
            message="¿Ejecutar acción rápida?"
            onConfirm={handleQuickAction}
            onCancel={() => setShowQuickConfirm(false)}
            autoCancel={5000}
          />
        </div>
      )}

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="¿Eliminar registro?"
        message="Esta acción no se puede deshacer. Para confirmar, escribe ELIMINAR en el campo de abajo y espera 3 segundos."
        type="danger"
        requireTyping={true}
        confirmPhrase="ELIMINAR"
        countdown={3}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default EjemploFormularioSeguro;
