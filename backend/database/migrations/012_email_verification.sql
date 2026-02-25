-- Agregar campo de verificación de email y tabla de tokens de verificación
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado_en TIMESTAMP;

-- Tabla para tokens de verificación de email
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    expira_en TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT false,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_usuario_verification UNIQUE (usuario_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_usuario ON email_verification_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email_verificado ON usuarios(email_verificado);

COMMENT ON TABLE email_verification_tokens IS 'Tokens para verificación de email de usuarios';
COMMENT ON COLUMN usuarios.email_verificado IS 'Indica si el email del usuario ha sido verificado';
COMMENT ON COLUMN usuarios.email_verificado_en IS 'Fecha y hora cuando se verificó el email';
