/**
 * CONFIGURACIÓN MULTI-MODELO INTELIGENTE
 * Sistema de IA con fallback automático entre múltiples proveedores y modelos
 * 
 * Proveedores soportados:
 * - Groq (rápido, gratis con límites)
 * - OpenRouter (acceso a todos los modelos)
 * - Ollama (local, sin internet)
 * 
 * Modelos soportados:
 * - Llama 3 (Meta) - General purpose
 * - Mistral - Razonamiento y código
 * - Gemma (Google) - Eficiente y rápido
 * - Qwen - Multilenguaje y matemáticas
 * - DeepSeek - Código y razonamiento técnico
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno PRIMERO
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

import Groq from 'groq-sdk';
import axios from 'axios';
import logger from '../utils/logger.js';

// ============= CONFIGURACIÓN DE API KEYS =============
const GROQ_API_KEYS = (process.env.GROQ_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';

// ============= DEFINICIÓN DE MODELOS =============
export const MODELOS = {
  // GROQ - Rápido y gratuito (con límites)
  groq: {
    'llama-3.3-70b': {
      id: 'llama-3.3-70b-versatile',
      provider: 'groq',
      nombre: 'Llama 3.3 70B',
      descripcion: 'Modelo general de Meta, excelente para conversación',
      contexto: 8000,
      velocidad: 'muy-rapida',
      calidad: 'alta'
    },
    'llama-3.1-8b': {
      id: 'llama-3.1-8b-instant',
      provider: 'groq',
      nombre: 'Llama 3.1 8B',
      descripcion: 'Rápido y eficiente para tareas simples',
      contexto: 8000,
      velocidad: 'extrema',
      calidad: 'media'
    },
    'llama-3.1-70b': {
      id: 'llama-3.1-70b-versatile',
      provider: 'groq',
      nombre: 'Llama 3.1 70B',
      descripcion: 'Versión alternativa de Llama 3',
      contexto: 8000,
      velocidad: 'rapida',
      calidad: 'alta'
    },
    'llama-guard': {
      id: 'llama-guard-3-8b',
      provider: 'groq',
      nombre: 'Llama Guard 3 8B',
      descripcion: 'Modelo de seguridad y moderación',
      contexto: 8192,
      velocidad: 'muy-rapida',
      calidad: 'media'
    }
  },

  // OPENROUTER - Acceso a todos los modelos (de pago)
  openrouter: {
    'llama-3.1-70b': {
      id: 'meta-llama/llama-3.1-70b-instruct',
      provider: 'openrouter',
      nombre: 'Llama 3.1 70B',
      descripcion: 'Versión completa de Llama 3.1',
      contexto: 8000,
      calidad: 'muy-alta'
    },
    'mistral-large': {
      id: 'mistralai/mistral-large',
      provider: 'openrouter',
      nombre: 'Mistral Large',
      descripcion: 'Modelo grande de Mistral',
      contexto: 32000,
      calidad: 'muy-alta'
    },
    'qwen-2.5-72b': {
      id: 'qwen/qwen-2.5-72b-instruct',
      provider: 'openrouter',
      nombre: 'Qwen 2.5 72B',
      descripcion: 'Excelente para multilenguaje y matemáticas',
      contexto: 32768,
      calidad: 'muy-alta'
    },
    'deepseek-chat': {
      id: 'deepseek/deepseek-chat',
      provider: 'openrouter',
      nombre: 'DeepSeek Chat',
      descripcion: 'Especializado en código y razonamiento',
      contexto: 32000,
      calidad: 'muy-alta'
    },
    'deepseek-coder': {
      id: 'deepseek/deepseek-coder',
      provider: 'openrouter',
      nombre: 'DeepSeek Coder',
      descripcion: 'Optimizado para programación',
      contexto: 16000,
      calidad: 'muy-alta'
    }
  },

  // OLLAMA - Local, sin internet
  ollama: {
    'phi3': {
      id: 'phi3:mini',
      provider: 'ollama',
      nombre: 'Phi-3 Mini',
      descripcion: 'Modelo ligero de Microsoft (2.2GB RAM)',
      contexto: 4000,
      velocidad: 'rapida',
      calidad: 'media-alta'
    },
    'tinyllama': {
      id: 'tinyllama',
      provider: 'ollama',
      nombre: 'Tiny Llama',
      descripcion: 'Ultra ligero (637MB RAM)',
      contexto: 2048,
      velocidad: 'muy-rapida',
      calidad: 'baja'
    },
    'llama3.2': {
      id: 'llama3.2:3b',
      provider: 'ollama',
      nombre: 'Llama 3.2 3B',
      descripcion: 'Versión ligera de Llama (2GB RAM)',
      contexto: 4000,
      velocidad: 'rapida',
      calidad: 'media-alta'
    },
    'llama3': {
      id: 'llama3:8b',
      provider: 'ollama',
      nombre: 'Llama 3 8B Local',
      descripcion: 'Versión completa (4.7GB RAM - puede ser lento)',
      contexto: 8000,
      velocidad: 'media',
      calidad: 'alta'
    }
  }
};

// ============= ESTRATEGIA DE FALLBACK =============
// Orden de prioridad para usar modelos (actualizados a enero 2026)
export const ESTRATEGIA_FALLBACK = [
  // 1. Primero intentar con Groq (gratis y rápido)
  'groq.llama-3.3-70b',       // Modelo principal - el mejor disponible
  'groq.llama-3.1-70b',       // Alternativa robusta
  'groq.llama-3.1-8b',        // Backup rápido
  
  // 2. Si Groq falla, intentar OpenRouter (requiere API key)
  'openrouter.qwen-2.5-72b',
  'openrouter.deepseek-chat',
  'openrouter.mistral-large',
  'openrouter.llama-3.1-70b',
  
  // 3. Último recurso: Ollama local (perfecto para 4GB RAM)
  'ollama.phi3',              // Recomendado (2.2GB)
  'ollama.llama3.2',          // Alternativa (2GB)
  'ollama.tinyllama'          // Ultra ligero (637MB)
];

// ============= ESTADO DEL SISTEMA =============
let currentGroqKeyIndex = 0;
let groqClient = GROQ_API_KEYS.length > 0 ? new Groq({ apiKey: GROQ_API_KEYS[0] }) : null;
let estadisticasModelos = {};

// ============= FUNCIONES AUXILIARES =============

/**
 * Obtiene información de un modelo por su ID completo (provider.modelo)
 */
export function obtenerModelo(modeloId) {
  const [provider, modelo] = modeloId.split('.');
  return MODELOS[provider]?.[modelo];
}

/**
 * Rota la API key de Groq
 */
function rotarGroqKey() {
  if (GROQ_API_KEYS.length > 1) {
    currentGroqKeyIndex = (currentGroqKeyIndex + 1) % GROQ_API_KEYS.length;
    groqClient = new Groq({ apiKey: GROQ_API_KEYS[currentGroqKeyIndex] });
    logger.info(`🔄 Rotando a Groq API Key #${currentGroqKeyIndex + 1}/${GROQ_API_KEYS.length}`);
    return true;
  }
  return false;
}

/**
 * Registra uso de un modelo para estadísticas
 */
function registrarUsoModelo(modeloId, exito, tiempoMs, tokens = 0) {
  if (!estadisticasModelos[modeloId]) {
    estadisticasModelos[modeloId] = {
      usos: 0,
      exitos: 0,
      fallos: 0,
      tiempoPromedio: 0,
      tokensUsados: 0
    };
  }
  
  const stats = estadisticasModelos[modeloId];
  stats.usos++;
  if (exito) {
    stats.exitos++;
    stats.tiempoPromedio = ((stats.tiempoPromedio * (stats.exitos - 1)) + tiempoMs) / stats.exitos;
    stats.tokensUsados += tokens;
  } else {
    stats.fallos++;
  }
}

/**
 * Ejecuta una solicitud con GROQ
 */
async function ejecutarGroq(modelo, messages, tools = [], maxTokens = 1500) {
  if (!groqClient) {
    throw new Error('Groq no está configurado (falta API key)');
  }

  const inicio = Date.now();
  
  try {
    const response = await groqClient.chat.completions.create({
      messages,
      model: modelo.id,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: maxTokens,
    }, { timeout: 15000 });

    const tiempoMs = Date.now() - inicio;
    const tokens = response.usage?.total_tokens || 0;
    registrarUsoModelo(`groq.${modelo.id}`, true, tiempoMs, tokens);
    
    logger.info(`✅ Groq (${modelo.nombre}) - ${tiempoMs}ms - ${tokens} tokens`);
    return response.choices[0].message;
    
  } catch (error) {
    const tiempoMs = Date.now() - inicio;
    registrarUsoModelo(`groq.${modelo.id}`, false, tiempoMs);
    throw error;
  }
}

/**
 * Ejecuta una solicitud con OpenRouter
 */
async function ejecutarOpenRouter(modelo, messages, tools = [], maxTokens = 1500) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter no está configurado (falta API key)');
  }

  const inicio = Date.now();
  
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: modelo.id,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://tescha.edu',
        'X-Title': 'TESCHA Sistema Escolar'
      },
      timeout: 30000
    });

    const tiempoMs = Date.now() - inicio;
    const tokens = response.data.usage?.total_tokens || 0;
    registrarUsoModelo(`openrouter.${modelo.id}`, true, tiempoMs, tokens);
    
    logger.info(`✅ OpenRouter (${modelo.nombre}) - ${tiempoMs}ms - ${tokens} tokens`);
    return response.data.choices[0].message;
    
  } catch (error) {
    const tiempoMs = Date.now() - inicio;
    registrarUsoModelo(`openrouter.${modelo.id}`, false, tiempoMs);
    throw error;
  }
}

/**
 * Ejecuta una solicitud con Ollama (local)
 */
async function ejecutarOllama(modelo, messages, maxTokens = 1500) {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/v1/chat/completions';
  const inicio = Date.now();
  
  try {
    const response = await axios.post(ollamaUrl, {
      model: modelo.id,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content || ''
      })),
      max_tokens: maxTokens,
      temperature: 0.7
    }, { timeout: 300000 }); // 5 minutos para local

    const tiempoMs = Date.now() - inicio;
    registrarUsoModelo(`ollama.${modelo.id}`, true, tiempoMs);
    
    logger.info(`✅ Ollama (${modelo.nombre}) - ${tiempoMs}ms - Local`);
    return response.data.choices[0].message;
    
  } catch (error) {
    const tiempoMs = Date.now() - inicio;
    registrarUsoModelo(`ollama.${modelo.id}`, false, tiempoMs);
    throw error;
  }
}

/**
 * FUNCIÓN PRINCIPAL: Ejecuta chat con fallback inteligente
 */
export async function ejecutarChatInteligente(messages, tools = [], maxTokens = 1500, preferirModelo = null) {
  let estrategia = [...ESTRATEGIA_FALLBACK];
  
  // Si se especifica un modelo preferido, intentar primero con ese
  if (preferirModelo && obtenerModelo(preferirModelo)) {
    estrategia = [preferirModelo, ...estrategia.filter(m => m !== preferirModelo)];
  }
  
  const errores = [];
  
  for (const modeloId of estrategia) {
    const modelo = obtenerModelo(modeloId);
    if (!modelo) continue;
    
    try {
      logger.info(`🤖 Intentando con ${modelo.nombre} (${modelo.provider})...`);
      
      let resultado;
      switch (modelo.provider) {
        case 'groq':
          resultado = await ejecutarGroq(modelo, messages, tools, maxTokens);
          break;
        case 'openrouter':
          resultado = await ejecutarOpenRouter(modelo, messages, tools, maxTokens);
          break;
        case 'ollama':
          resultado = await ejecutarOllama(modelo, messages, maxTokens);
          break;
        default:
          throw new Error(`Provider desconocido: ${modelo.provider}`);
      }
      
      return resultado;
      
    } catch (error) {
      const errorMsg = `${modelo.nombre}: ${error.message}`;
      errores.push(errorMsg);
      logger.warn(`⚠️ ${errorMsg}`);
      
      // Si es Groq y tenemos más keys, rotar
      if (modelo.provider === 'groq' && (error.status === 401 || error.status === 429)) {
        if (rotarGroqKey()) {
          // Reintentar con la nueva key
          try {
            return await ejecutarGroq(modelo, messages, tools, maxTokens);
          } catch (retryError) {
            logger.warn(`⚠️ Reintento fallido: ${retryError.message}`);
          }
        }
      }
      
      // Continuar con el siguiente modelo
      continue;
    }
  }
  
  // Si llegamos aquí, todos los modelos fallaron
  throw new Error(`❌ Todos los modelos fallaron:\n${errores.join('\n')}`);
}

/**
 * Obtiene estadísticas de uso de modelos
 */
export function obtenerEstadisticas() {
  return {
    modelos: estadisticasModelos,
    configuracion: {
      groqKeys: GROQ_API_KEYS.length,
      openrouterConfigured: !!OPENROUTER_API_KEY,
      modelosDisponibles: Object.keys(MODELOS).reduce((acc, provider) => 
        acc + Object.keys(MODELOS[provider]).length, 0)
    }
  };
}

/**
 * Función de compatibilidad con el sistema anterior
 */
export async function generarRespuestaIA(prompt, systemPrompt = '', maxTokens = 1500) {
  const messages = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: prompt });
  
  const respuesta = await ejecutarChatInteligente(messages, [], maxTokens);
  return respuesta.content;
}

export default {
  ejecutarChatInteligente,
  generarRespuestaIA,
  obtenerEstadisticas,
  obtenerModelo,
  MODELOS,
  ESTRATEGIA_FALLBACK
};
