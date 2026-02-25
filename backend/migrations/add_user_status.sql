-- Agregar campo de estado de presencia
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline' 
CHECK (status IN ('online', 'away', 'busy', 'offline', 'dnd'));

-- Actualizar usuarios online actuales
UPDATE usuarios SET status = 'online' WHERE is_online = true;
UPDATE usuarios SET status = 'offline' WHERE is_online = false;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON usuarios(status);

COMMENT ON COLUMN usuarios.status IS 'Estado de presencia: online (en línea), away (ausente), busy (ocupado), dnd (no molestar), offline (desconectado)';
