import pool from '../config/database.js';
import logger from '../utils/logger.js';
import { ejecutarChatAgente } from '../config/groq.js';
import { aiToolsImplementations } from './aiTools.js';

/**
 * Procesa un mensaje de chat con IA si detecta intención de consulta o error
 */
export const procesarMensajeConIA = async (mensaje, emisor_id, sala_id, io) => {
    try {
        const mensajeLow = mensaje.toLowerCase();
        
        // Detectar si el mensaje requiere intervención de la IA (proactivo)
        // Buscamos palabras clave de consulta técnica
        const disparadores = [
            'error', 'equivoc', 'corregir', 'buscar', 'calificacion', 
            'pago', 'donde esta', 'info de', 'matricula', 'vencido',
            'prorroga', 'ayuda', 'maestro', 'alumno'
        ];
        
        const requiereIA = disparadores.some(d => mensajeLow.includes(d)) || mensajeLow.startsWith('ia');
        
        if (!requiereIA) return;

        logger.info(`🤖 IA CHAT activada por mensaje en sala ${sala_id}: "${mensaje}"`);

        // Obtener contexto de quién habla
        const emisorResult = await pool.query('SELECT username, rol FROM usuarios WHERE id = $1', [emisor_id]);
        const emisor = emisorResult.rows[0];

        // System prompt especializado para CHAT
        const systemPrompt = `
            Eres el Asistente Inteligente oficial del chat de TESCHA.
            Tu misión es ayudar a coordinadores y maestros a encontrar información rápidamente "en corto".
            
            Contexto del usuario actual:
            - Nombre: ${emisor.username}
            - Rol: ${emisor.rol}
            
            Instrucciones:
            1. Si detectas que el usuario menciona un error o busca un alumno/pago, usa tus herramientas para buscar datos reales.
            2. Sé extremadamente breve. Responde con los datos clave y un lenguaje amable pero profesional.
            3. Si un maestro dice que se equivocó, busca al alumno mencionado (o pide el nombre si no está claro) y muestra su estado actual.
            4. Responde en ESPAÑOL.
        `;

        // Ejecutar agente con acceso a herramientas
        const response = await ejecutarChatAgente([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: mensaje }
        ], emisor.rol); 

        if (response && response.content) {
            // Guardar la respuesta de la IA en la DB como un mensaje del "Asistente IA"
            // Buscamos un ID de usuario IA o usamos el de un administrativo/coordinador
            const systemUser = await pool.query("SELECT id FROM usuarios WHERE username = 'admin' OR rol = 'coordinador' LIMIT 1");
            const aiSenderId = systemUser.rows[0]?.id || emisor_id;

            const savedMsg = await pool.query(`
                INSERT INTO chat_mensajes (emisor_id, sala_id, mensaje, metadata)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `, [aiSenderId, sala_id, `🤖 [IA]: ${response.content}`, { es_ia: true }]);

            const fullMsg = {
                ...savedMsg.rows[0],
                emisor_nombre: 'Asistente IA',
                emisor_rol: 'ia'
            };

            // Emitir a la sala
            if (io) {
                io.to(sala_id).emit('chat:message', fullMsg);
                logger.info(`✅ IA respondió en chat sala ${sala_id}`);
            }
        }

    } catch (error) {
        logger.error('Error en procesarMensajeConIA:', error);
    }
};
