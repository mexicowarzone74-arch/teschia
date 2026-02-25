import express from 'express';
import { auth } from '../middleware/auth.js';
import { obtenerAyudaContextual, responderPregunta } from '../services/asistenteIA.js';
import { aiToolsImplementations } from '../services/aiTools.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ... (rutas anteriores)

// =============================================
// POST /api/asistente/herramienta
// Ejecutar herramienta técnica (Solo para motor Python)
// =============================================
router.post('/herramienta', async (req, res) => {
  try {
    const { nombre, args, contexto, secret } = req.body;

    if (secret !== process.env.INTERNAL_SECRET) {
      logger.warn(`SEGURIDAD: Intento de acceso denegado a herramienta IA. Secret mismatch.`);
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (!aiToolsImplementations[nombre]) {
      return res.status(400).json({ error: `Herramienta ${nombre} no encontrada` });
    }

    logger.info(`PYTHON_IA_REQUEST -> ${nombre}`);

    // 🛡️ GUARDIÁN DE DATOS (Protección contra alucinaciones)
    const creativeTools = ['crear_personal', 'crear_alumno', 'registrar_pago', 'crear_grupo', 'asignar_maestro_a_grupo'];
    if (creativeTools.includes(nombre)) {
        const historial = contexto.historial || [];
        const userTexts = historial
            .filter(m => m.tipo === 'usuario' || m.role === 'user')
            .map(m => (m.mensaje || m.content || '').toLowerCase())
            .join(' ');
        
        const promptCompleto = (userTexts + ' ' + (contexto.preguntaActual || '')).toLowerCase();
        
        const dataToCheck = [
            args.nombre, 
            args.correo, 
            args.apellido_paterno, 
            args.monto, 
            args.codigo, 
            args.matricula,
            args.referencia
        ].filter(val => val !== undefined && val !== null && val !== '');

        // LOG DE DEPURACIÓN EN CONSOLA (Visible en PM2 logs)
        console.log(`[GUARDIAN] Validando ${nombre}:`);
        console.log(` > dataToCheck:`, dataToCheck);
        console.log(` > Longitud prompt: ${promptCompleto.length}`);

        const dataVerified = dataToCheck.every(val => {
            const valStr = val.toString().toLowerCase();
            const exists = promptCompleto.includes(valStr);
            if (!exists) console.log(` [BLOQUEO] "${valStr}" no encontrado en el historial del usuario.`);
            return exists;
        });

        // Verificar también el uso de IDs técnicos que no estén en el historial
        const idsToCheck = [args.maestro_id, args.grupo_id, args.alumno_id, args.periodo_id, args.inscripcion_id].filter(Boolean).map(String);
        if (idsToCheck.length > 0) {
            const historialCompleto = historial.map(m => 
                (m.mensaje || m.content || '') + ' ' + JSON.stringify(m.args || '')
            ).join(' ').toLowerCase();
            
            const idsVerified = idsToCheck.every(id => historialCompleto.includes(id.toLowerCase()));
            if (!idsVerified) {
                logger.warn(`SEGURIDAD: Bloqueando uso de ID técnico malicioso/inventado: ${idsToCheck}`);
                return res.json({ 
                    error: "ALTO: Estás intentando usar identificadores (IDs) técnicos que no has buscado previamente. Primero debes usar una herramienta de búsqueda para obtener los datos reales del sistema." 
                });
            }
        }
        
        if (!dataVerified && dataToCheck.length > 0) {
            logger.warn(`SEGURIDAD: Bloqueando alucinación de ${nombre}. Datos no encontrados en prompt.`);
            return res.json({ 
                error: "ALTO: No puedo realizar esta acción porque te faltan datos reales. NO INVENTES información. Pide amablemente al usuario los datos que faltan usando la plantilla de tu sistema." 
            });
        }
    }

    const resultado = await aiToolsImplementations[nombre](args, contexto);
    res.json(resultado);
  } catch (error) {
    logger.error(`Error en herramienta ${req.body.nombre}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Original /pregunta y /ayuda-contextual permanecen igual pero los actualizo para asegurar consistencia
router.get('/ayuda-contextual', auth, async (req, res) => {
  try {
    const { pagina } = req.query;
    const rol = req.user.rol;
    const userId = req.user.id;
    if (!pagina) return res.status(400).json({ error: 'Se requiere página' });
    const ayuda = await obtenerAyudaContextual(pagina, rol, userId);
    res.json(ayuda);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pregunta', auth, async (req, res) => {
  try {
    const { pregunta, contexto, historial } = req.body;
    if (!pregunta) return res.status(400).json({ error: 'Se requiere pregunta' });
    const respuesta = await responderPregunta(pregunta, {
      ...contexto,
      historial: historial || [],
      userId: req.user.id,
      rol: req.user.rol
    });
    res.json(respuesta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
