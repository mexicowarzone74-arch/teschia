/**
 * ============================================================================
 * MÓDULO DE VALIDACIÓN FINANCIERA Y MATEMÁTICA
 * ============================================================================
 * Sistema de validación de 200% para operaciones con dinero real
 * Previene errores de redondeo, valores negativos, overflow, y fraude
 * ============================================================================
 */

/**
 * CONSTANTES FINANCIERAS
 */
const PRECISION_DECIMALES = 2;
const MONTO_MINIMO = 0.01; // 1 centavo
const MONTO_MAXIMO = 999999.99; // Prevenir overflow
const REGEX_MONTO = /^\d+(\.\d{1,2})?$/; // Solo números con máximo 2 decimales

/**
 * Valida y sanitiza un monto financiero
 * @param {any} value - Valor a validar
 * @param {string} fieldName - Nombre del campo para mensajes de error
 * @returns {Object} { valid: boolean, value: number, error: string }
 */
export const validateMonto = (value, fieldName = 'monto') => {
  // 1. Verificar que existe
  if (value === null || value === undefined || value === '') {
    return {
      valid: false,
      value: null,
      error: `${fieldName} es requerido`
    };
  }

  // 2. Convertir a string y limpiar
  let montoStr = String(value).trim();
  
  // 3. Eliminar símbolos de moneda y comas
  montoStr = montoStr.replace(/[$,]/g, '');

  // 4. Validar que sea un número válido (permite más de 2 decimales para redondear después)
  if (!/^\d+(\.\d+)?$/.test(montoStr)) {
    return {
      valid: false,
      value: null,
      error: `${fieldName} tiene formato inválido. Use solo números (ej: 1857.50)`
    };
  }

  // 5. Convertir a número con precisión
  const monto = parseFloat(montoStr);

  // 6. Validar NaN
  if (isNaN(monto)) {
    return {
      valid: false,
      value: null,
      error: `${fieldName} no es un número válido`
    };
  }

  // 7. Validar monto negativo
  if (monto < 0) {
    return {
      valid: false,
      value: null,
      error: `${fieldName} no puede ser negativo`
    };
  }

  // 8. Validar monto cero
  if (monto === 0) {
    return {
      valid: false,
      value: null,
      error: `${fieldName} debe ser mayor a cero`
    };
  }

  // 9. Validar monto mínimo
  if (monto < MONTO_MINIMO) {
    return {
      valid: false,
      value: null,
      error: `${fieldName} debe ser al menos $${MONTO_MINIMO}`
    };
  }

  // 10. Validar monto máximo (prevenir overflow)
  if (monto > MONTO_MAXIMO) {
    return {
      valid: false,
      value: null,
      error: `${fieldName} excede el máximo permitido ($${MONTO_MAXIMO})`
    };
  }

  // 11. Redondear a 2 decimales (CRÍTICO para finanzas)
  // Usar Number.EPSILON para evitar errores de punto flotante
  const montoRedondeado = Math.round((monto + Number.EPSILON) * 100) / 100;

  // 12. Validar que no se perdió precisión
  if (Math.abs(monto - montoRedondeado) > 0.001) {
    console.warn(`⚠️  Monto redondeado de ${monto} a ${montoRedondeado}`);
  }

  return {
    valid: true,
    value: montoRedondeado,
    error: null
  };
};

/**
 * Suma segura de montos (previene errores de punto flotante)
 * @param {...number} montos - Montos a sumar
 * @returns {number} Suma redondeada a 2 decimales
 */
export const sumaSegura = (...montos) => {
  // Convertir todo a centavos (enteros) para evitar errores de punto flotante
  const sumaCentavos = montos.reduce((total, monto) => {
    const centavos = Math.round((monto || 0) * 100);
    return total + centavos;
  }, 0);
  
  // Convertir de vuelta a pesos y redondear
  return Math.round(sumaCentavos) / 100;
};

/**
 * Resta segura de montos
 * @param {number} monto1 - Monto inicial
 * @param {number} monto2 - Monto a restar
 * @returns {number} Diferencia redondeada a 2 decimales
 */
export const restaSegura = (monto1, monto2) => {
  const centavos1 = Math.round((monto1 || 0) * 100);
  const centavos2 = Math.round((monto2 || 0) * 100);
  return Math.round(centavos1 - centavos2) / 100;
};

/**
 * Multiplicación segura de monto por cantidad
 * @param {number} monto - Monto unitario
 * @param {number} cantidad - Cantidad
 * @returns {number} Total redondeado a 2 decimales
 */
export const multiplicacionSegura = (monto, cantidad) => {
  const centavos = Math.round((monto || 0) * 100);
  const totalCentavos = centavos * (cantidad || 0);
  return Math.round(totalCentavos) / 100;
};

/**
 * Calcula porcentaje de forma segura
 * @param {number} monto - Monto base
 * @param {number} porcentaje - Porcentaje (ej: 15 para 15%)
 * @returns {number} Resultado redondeado a 2 decimales
 */
export const calcularPorcentaje = (monto, porcentaje) => {
  const centavos = Math.round((monto || 0) * 100);
  const porcentajeCentavos = Math.round(centavos * (porcentaje / 100));
  return Math.round(porcentajeCentavos) / 100;
};

/**
 * Valida que un total sea correcto (suma de detalles)
 * @param {number} totalDeclarado - Total que se declara
 * @param {Array<number>} detalles - Array de montos individuales
 * @returns {Object} { valid: boolean, totalCalculado: number, diferencia: number }
 */
export const validarTotal = (totalDeclarado, detalles) => {
  const totalCalculado = sumaSegura(...detalles);
  const diferencia = Math.abs(restaSegura(totalDeclarado, totalCalculado));
  
  // Tolerancia de 1 centavo por errores de redondeo
  const valid = diferencia <= 0.01;
  
  return {
    valid,
    totalCalculado,
    diferencia,
    error: valid ? null : `El total declarado ($${totalDeclarado}) no coincide con la suma de detalles ($${totalCalculado}). Diferencia: $${diferencia}`
  };
};

/**
 * Formatea un monto para mostrar en UI
 * @param {number} monto - Monto a formatear
 * @param {string} locale - Locale para formato (default: 'es-MX')
 * @returns {string} Monto formateado
 */
export const formatearMonto = (monto, locale = 'es-MX') => {
  if (monto === null || monto === undefined || isNaN(monto)) {
    return '$0.00';
  }
  
  return monto.toLocaleString(locale, {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Valida fechas de prórroga
 * @param {Date|string} fechaLimite - Fecha límite de prórroga
 * @returns {Object} { valid: boolean, fecha: Date, error: string }
 */
export const validarFechaProrroga = (fechaLimite) => {
  if (!fechaLimite) {
    return {
      valid: false,
      fecha: null,
      error: 'Fecha de prórroga requerida'
    };
  }

  const fecha = new Date(fechaLimite);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Validar fecha válida
  if (isNaN(fecha.getTime())) {
    return {
      valid: false,
      fecha: null,
      error: 'Fecha de prórroga inválida'
    };
  }

  // Validar que sea fecha futura
  if (fecha < hoy) {
    return {
      valid: false,
      fecha: null,
      error: 'La fecha de prórroga debe ser futura'
    };
  }

  // Validar que no sea más de 1 año
  const unAnioDespues = new Date(hoy);
  unAnioDespues.setFullYear(unAnioDespues.getFullYear() + 1);
  
  if (fecha > unAnioDespues) {
    return {
      valid: false,
      fecha: null,
      error: 'La fecha de prórroga no puede ser mayor a 1 año'
    };
  }

  return {
    valid: true,
    fecha,
    error: null
  };
};

/**
 * Middleware para validar monto en request
 */
export const validateMontoMiddleware = (req, res, next) => {
  const { monto } = req.body;
  
  if (monto !== undefined && monto !== null) {
    const validation = validateMonto(monto);
    
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        field: 'monto',
        code: 'INVALID_MONTO'
      });
    }
    
    // Reemplazar con valor validado y redondeado
    req.body.monto = validation.value;
  }
  
  next();
};

/**
 * Valida rango de fechas
 * @param {Date|string} fechaInicio - Fecha de inicio
 * @param {Date|string} fechaFin - Fecha de fin
 * @returns {Object} { valid: boolean, error: string }
 */
export const validarRangoFechas = (fechaInicio, fechaFin) => {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return {
      valid: false,
      error: 'Fechas inválidas'
    };
  }

  if (fin < inicio) {
    return {
      valid: false,
      error: 'La fecha de fin debe ser posterior a la fecha de inicio'
    };
  }

  return {
    valid: true,
    error: null
  };
};

/**
 * Detecta posibles intentos de fraude en montos
 * @param {number} monto - Monto a verificar
 * @param {number} montoPromedio - Monto promedio histórico
 * @param {number} umbral - Umbral de desviación permitido (default: 5x)
 * @returns {Object} { suspicious: boolean, razon: string }
 */
export const detectarFraude = (monto, montoPromedio, umbral = 5) => {
  if (!montoPromedio || montoPromedio === 0) {
    return { suspicious: false, razon: null };
  }

  const desviacion = monto / montoPromedio;

  if (desviacion > umbral) {
    return {
      suspicious: true,
      razon: `Monto ${desviacion.toFixed(1)}x mayor al promedio histórico`,
      severidad: 'ALTA'
    };
  }

  if (monto === montoPromedio) {
    // Múltiples pagos con el mismo monto exacto pueden ser sospechosos
    return {
      suspicious: true,
      razon: 'Monto exactamente igual al promedio (posible duplicado)',
      severidad: 'MEDIA'
    };
  }

  return { suspicious: false, razon: null };
};

/**
 * Calcula el total de una consulta SQL de forma segura
 * @param {Array} rows - Filas de la consulta
 * @param {string} column - Nombre de la columna con montos
 * @returns {number} Total calculado de forma segura
 */
export const calcularTotalSQL = (rows, column = 'monto') => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0.00;
  }

  const montos = rows.map(row => {
    const valor = row[column];
    const validation = validateMonto(valor || 0, column);
    return validation.valid ? validation.value : 0;
  });

  return sumaSegura(...montos);
};

/**
 * Logging de operaciones financieras (auditoría)
 */
export const logOperacionFinanciera = (operacion, datos) => {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    operacion,
    datos: {
      ...datos,
      monto: datos.monto ? formatearMonto(datos.monto) : null
    }
  };
  
  console.log(`💰 [FINANZAS] ${JSON.stringify(log)}`);
  
  // TODO: Guardar en tabla de auditoría
  return log;
};

export default {
  validateMonto,
  sumaSegura,
  restaSegura,
  multiplicacionSegura,
  calcularPorcentaje,
  validarTotal,
  formatearMonto,
  validarFechaProrroga,
  validateMontoMiddleware,
  validarRangoFechas,
  detectarFraude,
  calcularTotalSQL,
  logOperacionFinanciera,
  MONTO_MINIMO,
  MONTO_MAXIMO,
  PRECISION_DECIMALES
};
