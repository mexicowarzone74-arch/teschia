/**
 * ARCHIVO LEGACY DE IA (RESPALDO)
 * Este es el sistema anterior que solo usaba Groq con fallback a Ollama
 * Se mantiene por si se necesita revertir cambios
 */

import Groq from 'groq-sdk';
import axios from 'axios';
import logger from '../utils/logger.js';

// Configuración de múltiples llaves
const GROQ_API_KEYS = (process.env.GROQ_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

let currentGroqKeyIndex = 0;

const OLLAMA_CONFIG = {
  url: process.env.OLLAMA_URL || 'http://127.0.0.1:11434/v1/chat/completions',
  model: process.env.OLLAMA_MODEL || 'phi3:mini' 
};

// Proveedor actual (por defecto Groq, fallback a Ollama)
export let useOllama = false;

// Cliente de Groq inicial
let groq = new Groq({ apiKey: GROQ_API_KEYS[0] });

// Modelos disponibles
const MODELS = {
  primary: 'llama-3.1-8b-instant',
  secondary: 'llama-3.3-70b-versatile'
};

// ... resto del código legacy se mantiene igual ...
