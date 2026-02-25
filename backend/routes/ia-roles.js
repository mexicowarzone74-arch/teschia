import express from 'express';
import {
  analizarMisAlumnos,
  obtenerRecomendacionesMaestro,
  obtenerEstadisticasMaestro
} from '../services/iaMaestros.js';
import {
  obtenerListaPriorizadaCobranza,
  obtenerGuionesLlamada,
  predecirPagosSemana,
  analizarEficienciaCobranza
} from '../services/iaAdministrativos.js';
import { auth } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ==================== RUTAS PARA MAESTROS ====================

/**
 * 🧑‍🏫 GET /api/ia-roles/maestro/mis-alumnos/:periodoId
 * Analizar todos los alumnos del maestro
 */
router.get('/maestro/mis-alumnos/:periodoId', auth, async (req, res) => {
  try {
    const { periodoId } = req.params;
    const maestroId = req.user.id;
    
    const resultado = await analizarMisAlumnos(maestroId, periodoId);
    
    res.json(resultado);
  } catch (error) {
    logger.error('Error en /maestro/mis-alumnos:', error);
    res.status(500).json({ 
      error: 'Error al analizar alumnos',
      detalle: error.message 
    });
  }
});

/**
 * 🧑‍🏫 GET /api/ia-roles/maestro/recomendaciones/:periodoId
 * Obtener recomendaciones personalizadas para el maestro
 */
router.get('/maestro/recomendaciones/:periodoId', auth, async (req, res) => {
  try {
    const { periodoId } = req.params;
    const maestroId = req.user.id;
    
    const recomendaciones = await obtenerRecomendacionesMaestro(maestroId, periodoId);
    
    res.json(recomendaciones);
  } catch (error) {
    logger.error('Error en /maestro/recomendaciones:', error);
    res.status(500).json({ 
      error: 'Error al obtener recomendaciones',
      detalle: error.message 
    });
  }
});

/**
 * 🧑‍🏫 GET /api/ia-roles/maestro/mis-estadisticas/:periodoId
 * Obtener estadísticas de desempeño del maestro
 */
router.get('/maestro/mis-estadisticas/:periodoId', auth, async (req, res) => {
  try {
    const { periodoId } = req.params;
    const maestroId = req.user.id;
    
    const estadisticas = await obtenerEstadisticasMaestro(maestroId, periodoId);
    
    res.json(estadisticas);
  } catch (error) {
    logger.error('Error en /maestro/mis-estadisticas:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      detalle: error.message 
    });
  }
});

// ==================== RUTAS PARA ADMINISTRATIVOS ====================

/**
 * 💰 GET /api/ia-roles/admin/lista-cobranza/:periodoId
 * Obtener lista priorizada de cobranza
 */
router.get('/admin/lista-cobranza/:periodoId', auth, async (req, res) => {
  try {
    const { periodoId } = req.params;
    
    const lista = await obtenerListaPriorizadaCobranza(periodoId);
    
    res.json(lista);
  } catch (error) {
    logger.error('Error en /admin/lista-cobranza:', error);
    res.status(500).json({ 
      error: 'Error al obtener lista de cobranza',
      detalle: error.message 
    });
  }
});

/**
 * 💰 GET /api/ia-roles/admin/guiones-llamada
 * Obtener guiones sugeridos para llamadas
 */
router.get('/admin/guiones-llamada', auth, async (req, res) => {
  try {
    const guiones = obtenerGuionesLlamada();
    
    res.json(guiones);
  } catch (error) {
    logger.error('Error en /admin/guiones-llamada:', error);
    res.status(500).json({ 
      error: 'Error al obtener guiones',
      detalle: error.message 
    });
  }
});

/**
 * 💰 GET /api/ia-roles/admin/prediccion-pagos/:periodoId
 * Predecir pagos probables de la semana
 */
router.get('/admin/prediccion-pagos/:periodoId', auth, async (req, res) => {
  try {
    const { periodoId } = req.params;
    
    const prediccion = await predecirPagosSemana(periodoId);
    
    res.json(prediccion);
  } catch (error) {
    logger.error('Error en /admin/prediccion-pagos:', error);
    res.status(500).json({ 
      error: 'Error al predecir pagos',
      detalle: error.message 
    });
  }
});

/**
 * 💰 GET /api/ia-roles/admin/mi-eficiencia/:periodoId
 * Analizar eficiencia de cobranza
 */
router.get('/admin/mi-eficiencia/:periodoId', auth, async (req, res) => {
  try {
    const { periodoId } = req.params;
    
    const eficiencia = await analizarEficienciaCobranza(periodoId);
    
    res.json(eficiencia);
  } catch (error) {
    logger.error('Error en /admin/mi-eficiencia:', error);
    res.status(500).json({ 
      error: 'Error al analizar eficiencia',
      detalle: error.message 
    });
  }
});

export default router;
