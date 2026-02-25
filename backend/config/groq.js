/**
 * ARCHIVO LEGACY - AHORA USA SISTEMA MULTI-MODELO
 * Este archivo mantiene compatibilidad con importaciones existentes.
 * Ahora usa modelos-ia.js que soporta Llama, Mistral, Gemma, Qwen, DeepSeek
 */

export { 
  ejecutarChatInteligente as ejecutarChatAgente,
  generarRespuestaIA, 
  obtenerEstadisticas,
  MODELOS
} from './modelos-ia.js';

import { generarRespuestaIA } from './modelos-ia.js';

/**
 * Mantiene la función específica que ya se usaba en otros módulos
 */
export async function analizarContextoSistema(contexto) {
  const systemPrompt = `Eres un asistente experto del Sistema Escolar TESCHA. Tu trabajo es analizar datos y proporcionar insights útiles y accionables.`;
  const prompt = `Analiza el siguiente contexto del sistema escolar y proporciona insights relevantes: ${JSON.stringify(contexto)}`;
  return await generarRespuestaIA(prompt, systemPrompt, 800);
}

/**
 * Permite cambiar el proveedor de IA preferido
 */
export async function setIAProvider(provider) {
  console.log(`ℹ️ El sistema multi-modelo elige automáticamente el mejor proveedor.`);
}

// Por compatibilidad con 'import groq from ...'
import Groq from 'groq-sdk';
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
export default groq;
