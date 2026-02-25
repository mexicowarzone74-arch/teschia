/**
 * CONFIGURACIÓN DE IA - Solo Groq
 * Rotación automática entre múltiples API keys para máxima disponibilidad.
 *
 * Formatos de configuración (se pueden combinar):
 *   GROQ_API_KEY=key1,key2,key3   (coma separado)
 *   GROQ_API_KEY=key1             (una sola)
 *   GROQ_API_KEY_2=key2           (variables adicionales hasta _5)
 *
 * Cuando una key recibe 429 (rate-limit) o 401 (inválida)
 * se pone en cooldown 60 s y se usa la siguiente automáticamente.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

import Groq from 'groq-sdk';
import logger from '../utils/logger.js';

// ============= API KEYS =============
// Soporta: GROQ_API_KEY=k1,k2,k3  ó  GROQ_API_KEY=k1 + GROQ_API_KEY_2=k2 ...
const _keysComa  = (process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
const _keysExtra = [2, 3, 4, 5]
  .map(n => (process.env[`GROQ_API_KEY_${n}`] || '').trim())
  .filter(Boolean);
const GROQ_API_KEYS = [...new Set([..._keysComa, ..._keysExtra])];

if (GROQ_API_KEYS.length === 0) {
  logger.warn('⚠️  GROQ_API_KEY no está definida. El asistente IA no funcionará.');
}

// ============= MODELOS DISPONIBLES =============
export const MODELOS = {
  groq: {
    'llama-3.3-70b': {
      id: 'llama-3.3-70b-versatile',
      provider: 'groq',
      nombre: 'Llama 3.3 70B',
      descripcion: 'Modelo principal — excelente para conversación y análisis',
      contexto: 8000,
      velocidad: 'muy-rapida',
      calidad: 'alta'
    },
    'llama-3.1-70b': {
      id: 'llama-3.1-70b-versatile',
      provider: 'groq',
      nombre: 'Llama 3.1 70B',
      descripcion: 'Alternativa robusta de alta calidad',
      contexto: 8000,
      velocidad: 'rapida',
      calidad: 'alta'
    },
    'llama-3.1-8b': {
      id: 'llama-3.1-8b-instant',
      provider: 'groq',
      nombre: 'Llama 3.1 8B',
      descripcion: 'Respuesta ultrArrápida para consultas simples',
      contexto: 8000,
      velocidad: 'extrema',
      calidad: 'media'
    }
  }
};

// Orden de intento: mejor modelo primero, más ligero al final
export const ESTRATEGIA_FALLBACK = [
  'groq.llama-3.3-70b',
  'groq.llama-3.1-70b',
  'groq.llama-3.1-8b'
];

// ============= ESTADO =============
const groqKeyCooldowns = {};       // { keyIndex: timestampLibreEn }
const GROQ_COOLDOWN_MS = 60_000;   // 60 s cooldown por key
let estadisticasModelos = {};

// ============= HELPERS =============

export function obtenerModelo(modeloId) {
  const [provider, modelo] = modeloId.split('.');
  return MODELOS[provider]?.[modelo];
}

function getGroqClient(index) {
  return new Groq({ apiKey: GROQ_API_KEYS[index] });
}

function ponerEnCooldown(index) {
  groqKeyCooldowns[index] = Date.now() + GROQ_COOLDOWN_MS;
  logger.warn(`⚠️  Groq key #${index + 1}/${GROQ_API_KEYS.length} en cooldown ${GROQ_COOLDOWN_MS / 1000}s`);
}

function getKeysDisponibles() {
  const ahora = Date.now();
  return GROQ_API_KEYS.map((_, i) => i).filter(i => ahora >= (groqKeyCooldowns[i] || 0));
}

function registrarUsoModelo(modeloId, exito, tiempoMs, tokens = 0) {
  if (!estadisticasModelos[modeloId]) {
    estadisticasModelos[modeloId] = { usos: 0, exitos: 0, fallos: 0, tiempoPromedio: 0, tokensUsados: 0 };
  }
  const s = estadisticasModelos[modeloId];
  s.usos++;
  if (exito) {
    s.exitos++;
    s.tiempoPromedio = ((s.tiempoPromedio * (s.exitos - 1)) + tiempoMs) / s.exitos;
    s.tokensUsados += tokens;
  } else {
    s.fallos++;
  }
}

// ============= EJECUCIÓN GROQ =============
/**
 * Intenta la petición con cada key disponible en orden.
 * 429/401 → cooldown + siguiente key. Timeout/red → lanza inmediatamente.
 */
async function ejecutarGroq(modelo, messages, tools = [], maxTokens = 1500) {
  if (GROQ_API_KEYS.length === 0) {
    throw new Error('Groq no configurado — añade GROQ_API_KEY en las variables de entorno.');
  }

  const disponibles = getKeysDisponibles();
  if (disponibles.length === 0) {
    const proxima  = Math.min(...Object.values(groqKeyCooldowns));
    const restanS  = Math.ceil(Math.max(0, proxima - Date.now()) / 1000);
    throw new Error(`Todas las Groq API keys en cooldown. Reintenta en ~${restanS}s`);
  }

  let lastError;
  for (const keyIndex of disponibles) {
    const client = getGroqClient(keyIndex);
    const inicio  = Date.now();

    try {
      const response = await client.chat.completions.create({
        messages,
        model: modelo.id,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: maxTokens
      }, { timeout: 15000 });

      const tiempoMs = Date.now() - inicio;
      const tokens   = response.usage?.total_tokens || 0;
      registrarUsoModelo(`groq.${modelo.id}`, true, tiempoMs, tokens);
      logger.info(`✅ Groq key #${keyIndex + 1} (${modelo.nombre}) — ${tiempoMs}ms — ${tokens} tokens`);
      return response.choices[0].message;

    } catch (error) {
      registrarUsoModelo(`groq.${modelo.id}`, false, Date.now() - inicio);
      lastError = error;

      if (error.status === 429 || error.status === 401) {
        ponerEnCooldown(keyIndex);
        logger.warn(`🔁 Key #${keyIndex + 1} HTTP ${error.status} — probando siguiente...`);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Groq: todas las keys disponibles fallaron');
}

// ============= FUNCIÓN PRINCIPAL =============
/**
 * Ejecuta chat con fallback a modelos más ligeros si el principal falla.
 */
export async function ejecutarChatInteligente(messages, tools = [], maxTokens = 1500, preferirModelo = null) {
  let estrategia = [...ESTRATEGIA_FALLBACK];

  if (preferirModelo && obtenerModelo(preferirModelo)) {
    estrategia = [preferirModelo, ...estrategia.filter(m => m !== preferirModelo)];
  }

  const errores = [];

  for (const modeloId of estrategia) {
    const modelo = obtenerModelo(modeloId);
    if (!modelo) continue;

    try {
      logger.info(`🤖 Intentando con ${modelo.nombre}...`);
      return await ejecutarGroq(modelo, messages, tools, maxTokens);
    } catch (error) {
      errores.push(`${modelo.nombre}: ${error.message}`);
      logger.warn(`⚠️  ${modelo.nombre} falló: ${error.message}`);
    }
  }

  throw new Error(`❌ Todos los modelos Groq fallaron: ${errores.join(' | ')}`);
}

/**
 * Obtiene estadísticas de uso de modelos
 */
export function obtenerEstadisticas() {
  const ahora = Date.now();
  const keysEstado = GROQ_API_KEYS.map((_, i) => {
    const cooldownHasta = groqKeyCooldowns[i] || 0;
    const enCooldown = ahora < cooldownHasta;
    return {
      index: i + 1,
      disponible: !enCooldown,
      cooldownRestanteS: enCooldown ? Math.ceil((cooldownHasta - ahora) / 1000) : 0
    };
  });

  return {
    modelos: estadisticasModelos,
    configuracion: {
      groqKeys: GROQ_API_KEYS.length,
      groqKeysDisponibles: keysEstado.filter(k => k.disponible).length,
      groqKeysEstado: keysEstado,
      modelosDisponibles: Object.keys(MODELOS.groq).length
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
