/**
 * Utilidad para construir queries UPDATE de forma segura
 * Previene inyección SQL mediante whitelisting de campos permitidos
 */

/**
 * Construye un query UPDATE seguro con validación de campos
 * @param {string} tableName - Nombre de la tabla
 * @param {Array<string>} allowedFields - Array de campos permitidos (whitelist)
 * @param {Object} requestBody - Objeto con los campos a actualizar
 * @param {string} idField - Nombre del campo ID (default: 'id')
 * @returns {Object} - {query, values, fieldCount}
 */
export const buildSecureUpdate = (tableName, allowedFields, requestBody, idField = 'id') => {
  const fields = {};
  
  // Filtrar solo campos permitidos (WHITELIST)
  Object.keys(requestBody).forEach(key => {
    if (allowedFields.includes(key)) {
      fields[key] = requestBody[key];
    }
  });
  
  if (Object.keys(fields).length === 0) {
    throw new Error('No se proporcionaron campos válidos para actualizar');
  }
  
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
  
  return {
    query: `UPDATE ${tableName} SET ${setClause} WHERE ${idField} = $${keys.length + 1} RETURNING *`,
    values: [...values],
    fieldCount: keys.length
  };
};

/**
 * Sanitiza y valida entrada de strings para prevenir inyecciones
 * @param {string} input - String a sanitizar
 * @param {number} maxLength - Longitud máxima permitida
 * @returns {string} - String sanitizado
 */
export const sanitizeString = (input, maxLength = 255) => {
  if (typeof input !== 'string') return '';
  
  // Remover caracteres peligrosos
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remover < y > para prevenir XSS también
};

/**
 * Valida que un array de IDs sean números enteros positivos
 * @param {Array} ids - Array de IDs a validar
 * @returns {Array<number>} - Array de IDs validados
 */
export const validateIds = (ids) => {
  if (!Array.isArray(ids)) {
    throw new Error('Los IDs deben ser un array');
  }
  
  const validIds = ids
    .map(id => parseInt(id))
    .filter(id => Number.isInteger(id) && id > 0);
  
  if (validIds.length !== ids.length) {
    throw new Error('Todos los IDs deben ser números enteros positivos');
  }
  
  return validIds;
};

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida formato de teléfono mexicano
 * @param {string} phone - Teléfono a validar
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

/**
 * Construye cláusula WHERE segura para filtros dinámicos
 * @param {Object} filters - Objeto con filtros
 * @param {Array<string>} allowedFilters - Array de filtros permitidos
 * @returns {Object} - {whereClause, params}
 */
export const buildSecureWhere = (filters, allowedFilters) => {
  const conditions = [];
  const params = [];
  let paramCount = 1;
  
  Object.keys(filters).forEach(key => {
    if (allowedFilters.includes(key) && filters[key] !== undefined && filters[key] !== '') {
      conditions.push(`${key} = $${paramCount}`);
      params.push(filters[key]);
      paramCount++;
    }
  });
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  return { whereClause, params, paramCount };
};
