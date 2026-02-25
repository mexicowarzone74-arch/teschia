/**
 * Hook para prevenir double-submit y operaciones duplicadas
 */

import { useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

export const usePreventDoubleSubmit = (delay = 2000) => {
  const isProcessing = useRef(false);
  const lastSubmit = useRef(0);

  const executeWithProtection = useCallback(async (fn, options = {}) => {
    const {
      showWarning = true,
      minDelay = delay,
      identifier = 'default'
    } = options;

    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmit.current;

    // Prevenir si ya está procesando
    if (isProcessing.current) {
      if (showWarning) {
        toast.warning('⏳ Espera a que termine la operación anterior');
      }
      return { success: false, prevented: true };
    }

    // Prevenir si fue muy rápido
    if (timeSinceLastSubmit < minDelay) {
      if (showWarning) {
        const remainingMs = minDelay - timeSinceLastSubmit;
        toast.warning(`⏱️ Espera ${Math.ceil(remainingMs / 1000)}s antes de continuar`);
      }
      return { success: false, prevented: true };
    }

    isProcessing.current = true;
    lastSubmit.current = now;

    try {
      const result = await fn();
      return { success: true, prevented: false, result };
    } catch (error) {
      throw error;
    } finally {
      // Liberar después del delay mínimo
      setTimeout(() => {
        isProcessing.current = false;
      }, minDelay);
    }
  }, [delay]);

  const reset = useCallback(() => {
    isProcessing.current = false;
    lastSubmit.current = 0;
  }, []);

  return {
    executeWithProtection,
    reset,
    isProcessing: isProcessing.current
  };
};
