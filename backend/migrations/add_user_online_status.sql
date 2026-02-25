-- Agregar campos de estado online y última conexión a usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_online ON usuarios(is_online);
CREATE INDEX IF NOT EXISTS idx_usuarios_last_seen ON usuarios(last_seen);

-- Agregar campo de estado de mensaje (enviado, entregado, leído)
ALTER TABLE chat_mensajes
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'enviado' CHECK (estado IN ('enviado', 'entregado', 'leido'));

-- Actualizar mensajes existentes con leido=true a estado='leido'
UPDATE chat_mensajes SET estado = 'leido' WHERE leido = true;

-- Crear índice para búsquedas de estado
CREATE INDEX IF NOT EXISTS idx_chat_mensajes_estado ON chat_mensajes(estado);

COMMENT ON COLUMN usuarios.is_online IS 'Indica si el usuario está actualmente conectado';
COMMENT ON COLUMN usuarios.last_seen IS 'Última vez que el usuario estuvo activo';
COMMENT ON COLUMN chat_mensajes.estado IS 'Estado del mensaje: enviado, entregado, leido';
