-- =============================================
-- MIGRACIÓN 008: Tabla de Notificaciones
-- Descripción: Control de notificaciones enviadas para evitar duplicados
-- Fecha: 2025-12-22
-- =============================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
    id SERIAL PRIMARY KEY,
    pago_id INTEGER REFERENCES pagos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('recordatorio', 'vencida')),
    mensaje TEXT,
    metodo VARCHAR(20) DEFAULT 'email' CHECK (metodo IN ('email', 'manual')),
    fecha_envio TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columna metodo si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='notificaciones_enviadas' 
        AND column_name='metodo'
    ) THEN
        ALTER TABLE notificaciones_enviadas 
        ADD COLUMN metodo VARCHAR(20) DEFAULT 'email' CHECK (metodo IN ('email', 'manual'));
    END IF;
END $$;

-- Crear índice único para evitar duplicados en el mismo día (eliminar si existe primero)
DROP INDEX IF EXISTS unique_notificacion_diaria;
CREATE UNIQUE INDEX unique_notificacion_diaria 
ON notificaciones_enviadas (pago_id, tipo, DATE(fecha_envio));

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha 
ON notificaciones_enviadas(fecha_envio);

CREATE INDEX IF NOT EXISTS idx_notificaciones_pago 
ON notificaciones_enviadas(pago_id, tipo);

CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha_date
ON notificaciones_enviadas(DATE(fecha_envio));

-- Comentario descriptivo
COMMENT ON TABLE notificaciones_enviadas IS 
'Control de notificaciones enviadas para evitar duplicados del mismo correo en el mismo día';

COMMENT ON COLUMN notificaciones_enviadas.pago_id IS 
'ID del pago relacionado con la notificación';

COMMENT ON COLUMN notificaciones_enviadas.tipo IS 
'Tipo de notificación: recordatorio (por vencer) o vencida';

COMMENT ON COLUMN notificaciones_enviadas.metodo IS 
'Método de envío: email (automático) o manual';

COMMENT ON CONSTRAINT unique_notificacion_diaria ON notificaciones_enviadas IS 
'Previene enviar el mismo tipo de notificación para el mismo pago más de una vez al día';

-- =============================================
-- VERIFICACIÓN
-- =============================================
SELECT 
    'Tabla creada exitosamente' as status,
    COUNT(*) as registros_existentes
FROM notificaciones_enviadas;

-- =============================================
-- FIN DE MIGRACIÓN
-- =============================================
