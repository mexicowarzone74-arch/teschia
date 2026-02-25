/**
 * RUTAS PARA GESTIÓN DE MODELOS DE IA
 * Permite ver estadísticas, cambiar modelos, probar, etc.
 */

import express from 'express';
import { 
  ejecutarChatInteligente,
  generarRespuestaIA,
  obtenerEstadisticas,
  obtenerModelo,
  MODELOS,
  ESTRATEGIA_FALLBACK
} from '../config/modelos-ia.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/modelos-ia - Lista todos los modelos
router.get('/', auth, (req, res) => {
  try {
    const modelosLista = [];
    
    Object.keys(MODELOS).forEach(provider => {
      Object.keys(MODELOS[provider]).forEach(modeloKey => {
        const modelo = MODELOS[provider][modeloKey];
        modelosLista.push({
          id: `${provider}.${modeloKey}`,
          provider,
          nombre: modelo.nombre,
          descripcion: modelo.descripcion,
          contexto: modelo.contexto,
          velocidad: modelo.velocidad,
          calidad: modelo.calidad
        });
      });
    });
    
    res.json({
      exito: true,
      total: modelosLista.length,
      modelos: modelosLista,
      estrategiaFallback: ESTRATEGIA_FALLBACK
    });
  } catch (error) {
    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener modelos',
      error: error.message
    });
  }
});

// GET /api/modelos-ia/estadisticas - Estadísticas de uso
router.get('/estadisticas', auth, (req, res) => {
  try {
    const stats = obtenerEstadisticas();
    res.json({ exito: true, ...stats });
  } catch (error) {
    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// POST /api/modelos-ia/probar - Prueba un modelo
router.post('/probar', auth, async (req, res) => {
  try {
    const { prompt, systemPrompt, maxTokens, modeloPreferido } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El prompt es requerido'
      });
    }
    
    const inicio = Date.now();
    
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    
    const respuesta = await ejecutarChatInteligente(
      messages,
      [],
      maxTokens || 1500,
      modeloPreferido
    );
    
    const tiempoMs = Date.now() - inicio;
    
    res.json({
      exito: true,
      respuesta: respuesta.content,
      tiempoMs,
      modeloUtilizado: modeloPreferido || 'automático'
    });
  } catch (error) {
    res.status(500).json({
      exito: false,
      mensaje: 'Error al ejecutar prueba',
      error: error.message
    });
  }
});

export default router;
