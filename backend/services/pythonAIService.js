import axios from 'axios';
import logger from '../utils/logger.js';

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5050';

/**
 * Servicio para comunicarse con el motor de IA en Python
 */
export const consultarMotorPython = async (pregunta, contexto) => {
    try {
        const response = await axios.post(`${AI_ENGINE_URL}/pregunta`, {
            pregunta,
            contexto,
            historial: contexto.historial || []
        }, { 
            timeout: 360000,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json; charset=utf-8'
            },
            responseType: 'json',
            responseEncoding: 'utf8'
        });

        // Asegurar que la respuesta se maneje como UTF-8
        const data = response.data;
        
        // Si hay un campo 'respuesta', asegurarse de que sea string UTF-8 válido
        if (data && data.respuesta && typeof data.respuesta === 'string') {
            // Normalizar y limpiar cualquier carácter problemático
            data.respuesta = Buffer.from(data.respuesta, 'utf8').toString('utf8');
        }
        
        return data;
    } catch (error) {
        logger.error('Error al contactar al motor de IA en Python:', error.message);
        throw new Error('El motor de inteligencia especializado no está respondiendo.');
    }
};

export default {
    consultarMotorPython
};
