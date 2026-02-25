/**
 * Utilidades para sanitizar y validar inputs en el cliente
 * Previene inyección de código y datos maliciosos
 */

/**
 * Sanitiza texto eliminando caracteres peligrosos
 */
export const sanitizeText = (text) => {
  if (!text) return '';
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

/**
 * Sanitiza HTML eliminando tags peligrosos pero permitiendo formato básico
 */
export const sanitizeHTML = (html) => {
  if (!html) return '';
  
  const allowedTags = ['b', 'i', 'u', 'br', 'p', 'strong', 'em'];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const cleanHTML = (node) => {
    const tagName = node.tagName?.toLowerCase();
    
    if (node.nodeType === 3) { // Text node
      return node.textContent;
    }
    
    if (node.nodeType === 1 && allowedTags.includes(tagName)) { // Element node
      const children = Array.from(node.childNodes)
        .map(cleanHTML)
        .join('');
      return `<${tagName}>${children}</${tagName}>`;
    }
    
    return Array.from(node.childNodes || [])
      .map(cleanHTML)
      .join('');
  };
  
  return cleanHTML(tempDiv);
};

/**
 * Valida y sanitiza email
 */
export const sanitizeEmail = (email) => {
  if (!email) return '';
  
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
};

/**
 * Valida y sanitiza número de teléfono (formato mexicano)
 */
export const sanitizePhone = (phone) => {
  if (!phone) return '';
  
  // Eliminar todo excepto dígitos
  const digits = phone.replace(/\D/g, '');
  
  // Validar longitud (10 dígitos para México)
  return digits.length === 10 ? digits : '';
};

/**
 * Valida y sanitiza matrícula
 */
export const sanitizeMatricula = (matricula) => {
  if (!matricula) return '';
  
  // Solo dígitos
  const digits = matricula.replace(/\D/g, '');
  
  // Longitud entre 9-10 dígitos
  return (digits.length >= 9 && digits.length <= 10) ? digits : '';
};

/**
 * Valida y sanitiza nombres (solo letras y espacios)
 */
export const sanitizeName = (name) => {
  if (!name) return '';
  
  return name
    .replace(/[^a-záéíóúñüA-ZÁÉÍÓÚÑÜ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Valida y sanitiza números enteros
 */
export const sanitizeInteger = (value, min = null, max = null) => {
  const num = parseInt(value);
  
  if (isNaN(num)) return null;
  if (min !== null && num < min) return min;
  if (max !== null && num > max) return max;
  
  return num;
};

/**
 * Valida y sanitiza números decimales
 */
export const sanitizeDecimal = (value, decimals = 2, min = null, max = null) => {
  const num = parseFloat(value);
  
  if (isNaN(num)) return null;
  
  let rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  
  if (min !== null && rounded < min) rounded = min;
  if (max !== null && rounded > max) rounded = max;
  
  return rounded;
};

/**
 * Valida y sanitiza fecha
 */
export const sanitizeDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return '';
  
  // Formato YYYY-MM-DD
  return date.toISOString().split('T')[0];
};

/**
 * Previene inyección SQL básica (la validación real debe ser en backend)
 */
export const detectSQLInjection = (text) => {
  if (!text) return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\bOR\b.*=.*)/gi,
    /(\bAND\b.*=.*)/gi
  ];
  
  return sqlPatterns.some(pattern => pattern.test(text));
};

/**
 * Previene XSS básico
 */
export const detectXSS = (text) => {
  if (!text) return false;
  
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[\s\S]*?onerror[\s\S]*?>/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(text));
};

/**
 * Valida que el input sea seguro
 */
export const isInputSafe = (text) => {
  return !detectSQLInjection(text) && !detectXSS(text);
};

/**
 * Sanitiza objeto completo recursivamente
 */
export const sanitizeObject = (obj, schema = {}) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeText(String(obj));
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    const fieldType = schema[key] || 'text';
    
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, schema[key]);
    } else {
      switch (fieldType) {
        case 'email':
          sanitized[key] = sanitizeEmail(value);
          break;
        case 'phone':
          sanitized[key] = sanitizePhone(value);
          break;
        case 'name':
          sanitized[key] = sanitizeName(value);
          break;
        case 'integer':
          sanitized[key] = sanitizeInteger(value);
          break;
        case 'decimal':
          sanitized[key] = sanitizeDecimal(value);
          break;
        case 'date':
          sanitized[key] = sanitizeDate(value);
          break;
        case 'html':
          sanitized[key] = sanitizeHTML(value);
          break;
        default:
          sanitized[key] = sanitizeText(value);
      }
    }
  }
  
  return sanitized;
};

export default {
  sanitizeText,
  sanitizeHTML,
  sanitizeEmail,
  sanitizePhone,
  sanitizeMatricula,
  sanitizeName,
  sanitizeInteger,
  sanitizeDecimal,
  sanitizeDate,
  detectSQLInjection,
  detectXSS,
  isInputSafe,
  sanitizeObject
};
