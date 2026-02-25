-- Tabla para tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expira_en TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT false,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_usuario_token UNIQUE (usuario_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_usuario ON password_reset_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expira ON password_reset_tokens(expira_en);

-- Agregar columna email a usuarios si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='usuarios' AND column_name='email') THEN
        ALTER TABLE usuarios ADD COLUMN email VARCHAR(255);
        CREATE INDEX idx_usuarios_email ON usuarios(email);
    END IF;
END $$;

COMMENT ON TABLE password_reset_tokens IS 'Tokens para recuperación de contraseña por email';
COMMENT ON COLUMN password_reset_tokens.token IS 'Token único de recuperación (válido por 1 hora)';
COMMENT ON COLUMN password_reset_tokens.expira_en IS 'Fecha y hora de expiración del token';
COMMENT ON COLUMN password_reset_tokens.usado IS 'Indica si el token ya fue utilizado';
