/**
 * Hook personalizado para validación avanzada de formularios
 * Previene errores comunes y proporciona feedback inmediato
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';

export const useFormValidation = (schema, onSubmit) => {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitAttempts = useRef(0);
  const lastSubmitTime = useRef(0);

  // Validar un campo individual
  const validateField = useCallback((name, value) => {
    const fieldSchema = schema[name];
    if (!fieldSchema) return null;

    for (const rule of fieldSchema) {
      if (rule.required && !value) {
        return rule.message || `${name} es requerido`;
      }

      if (rule.pattern && value && !rule.pattern.test(value)) {
        return rule.message || `${name} no tiene el formato correcto`;
      }

      if (rule.min && value && value.length < rule.min) {
        return rule.message || `${name} debe tener al menos ${rule.min} caracteres`;
      }

      if (rule.max && value && value.length > rule.max) {
        return rule.message || `${name} no puede exceder ${rule.max} caracteres`;
      }

      if (rule.minValue && value && parseFloat(value) < rule.minValue) {
        return rule.message || `${name} debe ser al menos ${rule.minValue}`;
      }

      if (rule.maxValue && value && parseFloat(value) > rule.maxValue) {
        return rule.message || `${name} no puede exceder ${rule.maxValue}`;
      }

      if (rule.custom && !rule.custom(value, values)) {
        return rule.message || `${name} no es válido`;
      }
    }

    return null;
  }, [schema, values]);

  // Validar todo el formulario
  const validate = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    for (const name in schema) {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [schema, values, validateField]);

  // Manejar cambio de valor
  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validar en tiempo real si el campo ya fue tocado
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  }, [touched, validateField]);

  // Manejar cuando un campo pierde el foco
  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, [values, validateField]);

  // Prevenir double-submit y spam
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();

    // Prevenir double-submit
    const now = Date.now();
    if (isSubmitting) {
      toast.warning('⏳ Espera a que termine la operación anterior');
      return;
    }

    // Detectar spam (más de 3 intentos en menos de 5 segundos)
    if (now - lastSubmitTime.current < 5000) {
      submitAttempts.current++;
      if (submitAttempts.current > 3) {
        toast.error('🛑 Demasiados intentos. Espera un momento.');
        setTimeout(() => {
          submitAttempts.current = 0;
        }, 10000);
        return;
      }
    } else {
      submitAttempts.current = 1;
    }

    lastSubmitTime.current = now;

    // Validar formulario
    const isValid = validate();
    if (!isValid) {
      toast.error('❌ Por favor corrige los errores en el formulario');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
      submitAttempts.current = 0;
    } catch (error) {
      console.error('Error en submit:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, validate, onSubmit, values]);

  // Resetear formulario
  const reset = useCallback((newValues = {}) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    submitAttempts.current = 0;
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValues
  };
};
