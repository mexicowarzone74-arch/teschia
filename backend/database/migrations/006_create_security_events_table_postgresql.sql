-- Migracion para PostgreSQL: Tablas de seguridad
-- Sistema Anti-Pendejos - TESCHA

-- Tabla para registrar eventos de seguridad
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    identifier VARCHAR(255),
    user_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    event_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices para security_events
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_identifier ON security_events(identifier);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

-- Foreign key para user_id (si la tabla usuarios existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
        ALTER TABLE security_events
        ADD CONSTRAINT fk_security_events_user_id 
        FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Trigger para actualizar last_seen automaticamente
CREATE OR REPLACE FUNCTION update_security_events_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_security_events_last_seen ON security_events;
CREATE TRIGGER trg_update_security_events_last_seen
    BEFORE UPDATE ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION update_security_events_last_seen();

-- Tabla para tracking de sesiones sospechosas
CREATE TABLE IF NOT EXISTS suspicious_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    session_token VARCHAR(255),
    fingerprint VARCHAR(64),
    ip_address VARCHAR(45),
    user_agent TEXT,
    suspicious_reason VARCHAR(255),
    blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL
);

-- Indices para suspicious_sessions
CREATE INDEX IF NOT EXISTS idx_suspicious_sessions_user_id ON suspicious_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_sessions_session_token ON suspicious_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_suspicious_sessions_blocked ON suspicious_sessions(blocked);

-- Foreign key para user_id
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
        ALTER TABLE suspicious_sessions
        ADD CONSTRAINT fk_suspicious_sessions_user_id 
        FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Tabla para rate limiting mejorado
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    violation_count INTEGER DEFAULT 1,
    first_violation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_violation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP NULL
);

-- Indice unico compuesto
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_violations_unique 
ON rate_limit_violations(identifier, endpoint);

-- Indice para blocked_until
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_blocked_until 
ON rate_limit_violations(blocked_until);

-- Trigger para actualizar last_violation automaticamente
CREATE OR REPLACE FUNCTION update_rate_limit_violations_last_violation()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_violation = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rate_limit_violations_last_violation ON rate_limit_violations;
CREATE TRIGGER trg_update_rate_limit_violations_last_violation
    BEFORE UPDATE ON rate_limit_violations
    FOR EACH ROW
    EXECUTE FUNCTION update_rate_limit_violations_last_violation();

-- Mensaje de confirmacion
DO $$
BEGIN
    RAISE NOTICE 'Migracion completada: Tablas de seguridad creadas exitosamente';
END $$;
