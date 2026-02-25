/**
 * CONFIGURACIÓN DE IA - Wrapper simplificado para modelos-ia.js
 * Mantiene compatibilidad con código existente
 */

export {
  ejecutarChatInteligente as ejecutarChatAgente,
  generarRespuestaIA,
  obtenerEstadisticas,
  obtenerModelo,
  MODELOS,
  ESTRATEGIA_FALLBACK
} from './modelos-ia.js';

import { generarRespuestaIA } from './modelos-ia.js';

/**
 * Cambia el proveedor (informativo, el sistema elige automáticamente)
 */
export async function setIAProvider(provider) {
  console.log(`ℹ️ El sistema multi-modelo elige automáticamente el mejor proveedor.`);
}

/**
 * Analiza contexto del sistema
 */
export async function analizarContextoSistema(contexto) {
  const systemPrompt = `Eres un asistente experto del Sistema Escolar TESCHA. Tu trabajo es analizar datos y proporcionar insights útiles y accionables.`;
  const prompt = `Analiza el siguiente contexto del sistema escolar y proporciona insights relevantes: ${JSON.stringify(contexto)}`;
  return await generarRespuestaIA(prompt, systemPrompt, 800);
}
