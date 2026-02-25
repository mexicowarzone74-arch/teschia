import express from 'express';
import {
  detectarAlumnosEnRiesgo,
  generarProyecciones,
  obtenerRecomendacionesDiarias,
  generarResumenEjecutivo
} from '../services/analisisPredictivo.js';
import { auth } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * 🤖 GET /api/ia/alumnos-riesgo/:periodoId
 * Detecta alumnos en riesgo de deserción
 */
router.get('/alumnos-riesgo/:periodoId', auth, async (req, res) => {
  try {
    const { periodoId } = req.params;
    const resultado = await detectarAlumnosEnRiesgo(periodoId);
    
    res.json(resultado);
  } catch (error) {
    logger.error('Error en /ia/alumnos-riesgo:', error);
    res.status(500).json({ 
      error: 'Error al detectar alumnos en riesgo',
      detalle: error.message 
    });
  }
});

/**
 * 🤖 GET /api/ia/proyecciones/:periodoId
 * Genera proyecciones de ingresos y tendencias
 */
router.get('/proyecciones/:periodoId', auth, async (req, res) => {
  try {
    const { periodoId } = req.params;
    const resultado = await generarProyecciones(periodoId);
    
    res.json(resultado);
  } catch (error) {
    logger.error('Error en /ia/proyecciones:', error);
    res.status(500).json({ 
      error: 'Error al generar proyecciones',
      detalle: error.message 
    });
  }
});

/**
 * 🤖 GET /api/ia/recomendaciones-diarias/:periodoId
 * Obtiene recomendaciones diarias personalizadas
 */
router.get('/recomendaciones-diarias/:periodoId', auth, async (req, res) => {
  try {
    const { periodoId } = req.params;
    const userId = req.user.id;
    
    const resultado = await obtenerRecomendacionesDiarias(periodoId, userId);
    
    res.json(resultado);
  } catch (error) {
    logger.error('Error en /ia/recomendaciones-diarias:', error);
    res.status(500).json({ 
      error: 'Error al obtener recomendaciones diarias',
      detalle: error.message 
    });
  }
});

/**
 * 🤖 GET /api/ia/resumen-ejecutivo/:periodoId
 * Genera resumen ejecutivo inteligente
 */
router.get('/resumen-ejecutivo/:periodoId', auth, async (req, res) => {
  try {
    const { periodoId } = req.params;
    const resultado = await generarResumenEjecutivo(periodoId);
    
    res.json(resultado);
  } catch (error) {
    logger.error('Error en /ia/resumen-ejecutivo:', error);
    res.status(500).json({ 
      error: 'Error al generar resumen ejecutivo',
      detalle: error.message 
    });
  }
});

export default router;
