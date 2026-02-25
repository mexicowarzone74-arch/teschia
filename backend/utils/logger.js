import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear carpeta de logs si no existe
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Función para obtener nombre de archivo de log por fecha
const getLogFileName = (type = 'general') => {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(logsDir, `${type}-${dateStr}.log`);
};

// Función para formatear mensaje de log
const formatLogMessage = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? `\n  Meta: ${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
};

// Función para escribir en archivo de log
const writeToFile = (fileName, message) => {
    try {
        fs.appendFileSync(fileName, message, 'utf8');
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
};

// Logger principal
class Logger {
    constructor() {
        this.levels = {
            ERROR: 'ERROR',
            WARN: 'WARN',
            INFO: 'INFO',
            DEBUG: 'DEBUG'
        };
    }

    error(message, meta = {}) {
        const logMessage = formatLogMessage(this.levels.ERROR, message, meta);
        console.error(logMessage);
        writeToFile(getLogFileName('error'), logMessage);
        writeToFile(getLogFileName('general'), logMessage);
    }

    warn(message, meta = {}) {
        const logMessage = formatLogMessage(this.levels.WARN, message, meta);
        console.warn(logMessage);
        writeToFile(getLogFileName('general'), logMessage);
    }

    info(message, meta = {}) {
        const logMessage = formatLogMessage(this.levels.INFO, message, meta);
        console.log(logMessage);
        writeToFile(getLogFileName('general'), logMessage);
    }

    debug(message, meta = {}) {
        if (process.env.NODE_ENV === 'development') {
            const logMessage = formatLogMessage(this.levels.DEBUG, message, meta);
            console.log(logMessage);
            writeToFile(getLogFileName('debug'), logMessage);
        }
    }

    // Log de requests HTTP
    request(req, res, duration) {
        const logMessage = formatLogMessage('REQUEST', `${req.method} ${req.path}`, {
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            user: req.user?.username || 'anonymous'
        });
        writeToFile(getLogFileName('requests'), logMessage);
    }

    // Log de errores de base de datos
    database(operation, error, query = null) {
        const logMessage = formatLogMessage('DB_ERROR', `Database error in ${operation}`, {
            error: error.message,
            stack: error.stack,
            query: query ? query.substring(0, 200) : null
        });
        console.error(logMessage);
        writeToFile(getLogFileName('database'), logMessage);
        writeToFile(getLogFileName('error'), logMessage);
    }

    // Log de seguridad
    security(type, details) {
        const logMessage = formatLogMessage('SECURITY', type, details);
        console.warn(logMessage);
        writeToFile(getLogFileName('security'), logMessage);
    }

    // Limpiar logs antiguos (más de 30 días)
    cleanOldLogs() {
        try {
            const files = fs.readdirSync(logsDir);
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

            files.forEach(file => {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);

                if (stats.mtimeMs < thirtyDaysAgo) {
                    fs.unlinkSync(filePath);
                    this.info(`Deleted old log file: ${file}`);
                }
            });
        } catch (error) {
            this.error('Error cleaning old logs', { error: error.message });
        }
    }
}

// Exportar instancia única
const logger = new Logger();

// Limpiar logs antiguos al iniciar (cada 24 horas)
setInterval(() => {
    logger.cleanOldLogs();
}, 24 * 60 * 60 * 1000);

export default logger;
