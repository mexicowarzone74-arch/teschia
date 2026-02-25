-- ================================================================
-- SUPABASE - MIGRACIONES POST-SCHEMA
-- Ejecutar EN ORDEN DESPUÉS de schema.sql en el SQL Editor
-- ================================================================

-- ----------------------------------------------------------------
-- 1. COLUMNAS FALTANTES EN TABLA usuarios
--    El código usa estas columnas pero no están en schema.sql
-- ----------------------------------------------------------------

-- Renombrar cambio_password_requerido → debe_cambiar_password
-- (El código backend usa debe_cambiar_password)
ALTER TABLE usuarios 
  RENAME COLUMN cambio_password_requerido TO debe_cambiar_password;

-- Agregar nombre/apellidos/email al usuario (usados al crear maestros)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS nombre VARCHAR(100),
  ADD COLUMN IF NOT EXISTS apellido_paterno VARCHAR(100),
  ADD COLUMN IF NOT EXISTS apellido_materno VARCHAR(100),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline'
    CHECK (status IN ('online','away','busy','offline','dnd')),
  ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verificado_en TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_usuarios_email    ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_online   ON usuarios(is_online);
CREATE INDEX IF NOT EXISTS idx_usuarios_last_seen ON usuarios(last_seen);
CREATE INDEX IF NOT EXISTS idx_usuarios_status   ON usuarios(status);
CREATE INDEX IF NOT EXISTS idx_usuarios_email_verificado ON usuarios(email_verificado);


-- ----------------------------------------------------------------
-- 2. RECREAR VISTA maestros_completo CON rol_usuario
--    El código la usa en: WHERE rol_usuario != 'coordinador'
-- ----------------------------------------------------------------
DROP VIEW IF EXISTS maestros_completo CASCADE;

CREATE VIEW maestros_completo AS
SELECT
  m.*,
  CONCAT(m.nombre, ' ', m.apellido_paterno, ' ', COALESCE(m.apellido_materno, '')) AS nombre_completo,
  u.username         AS username,
  u.rol              AS rol_usuario,
  u.activo           AS usuario_activo,
  u.is_online        AS is_online,
  u.last_seen        AS last_seen,
  u.status           AS user_status,
  u.email            AS usuario_email
FROM maestros m
LEFT JOIN usuarios u ON m.usuario_id = u.id;


-- ----------------------------------------------------------------
-- 3. RECREAR VISTA grupos_detalle SIN salon_id
--    (salones fueron eliminados del sistema)
-- ----------------------------------------------------------------
DROP VIEW IF EXISTS grupos_detalle CASCADE;

CREATE VIEW grupos_detalle AS
SELECT
  g.*,
  n.nombre AS nivel_nombre,
  n.codigo AS nivel_codigo,
  p.nombre AS periodo_nombre,
  CONCAT(m.nombre, ' ', m.apellido_paterno) AS maestro_nombre,
  (SELECT COUNT(*) FROM inscripciones i
   WHERE i.grupo_id = g.id AND i.estatus = 'activo') AS inscritos_actual
FROM grupos g
LEFT JOIN niveles n   ON g.nivel_id   = n.id
LEFT JOIN periodos p  ON g.periodo_id = p.id
LEFT JOIN maestros m  ON g.maestro_id = m.id;


-- ----------------------------------------------------------------
-- 4. TABLA: password_reset_tokens
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token       VARCHAR(255) NOT NULL UNIQUE,
  expira_en   TIMESTAMP NOT NULL,
  usado       BOOLEAN DEFAULT false,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_usuario_token UNIQUE (usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_password_reset_token   ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_usuario ON password_reset_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expira  ON password_reset_tokens(expira_en);


-- ----------------------------------------------------------------
-- 5. TABLA: email_verification_tokens
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token       VARCHAR(255) NOT NULL UNIQUE,
  email       VARCHAR(255) NOT NULL,
  expira_en   TIMESTAMP NOT NULL,
  usado       BOOLEAN DEFAULT false,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_usuario_verification UNIQUE (usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_email_verification_token   ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_usuario ON email_verification_tokens(usuario_id);


-- ----------------------------------------------------------------
-- 6. TABLA: security_events
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_events (
  id          SERIAL PRIMARY KEY,
  event_type  VARCHAR(100) NOT NULL,
  identifier  VARCHAR(255),
  user_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  details     JSONB,
  event_count INTEGER DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_security_events_type       ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_identifier ON security_events(identifier);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id    ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

CREATE TABLE IF NOT EXISTS suspicious_sessions (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  session_token      VARCHAR(255),
  fingerprint        VARCHAR(64),
  ip_address         VARCHAR(45),
  user_agent         TEXT,
  suspicious_reason  VARCHAR(255),
  blocked            BOOLEAN DEFAULT false,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at         TIMESTAMP
);


-- ----------------------------------------------------------------
-- 7. TABLA: notificaciones_enviadas
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
  id          SERIAL PRIMARY KEY,
  pago_id     INTEGER REFERENCES pagos(id) ON DELETE CASCADE,
  tipo        VARCHAR(50) NOT NULL CHECK (tipo IN ('recordatorio','vencida')),
  mensaje     TEXT,
  metodo      VARCHAR(20) DEFAULT 'email' CHECK (metodo IN ('email','manual')),
  fecha_envio TIMESTAMP DEFAULT NOW(),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DROP INDEX IF EXISTS unique_notificacion_diaria;
CREATE UNIQUE INDEX unique_notificacion_diaria
  ON notificaciones_enviadas (pago_id, tipo, DATE(fecha_envio));
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones_enviadas(fecha_envio);
CREATE INDEX IF NOT EXISTS idx_notificaciones_pago  ON notificaciones_enviadas(pago_id, tipo);


-- ----------------------------------------------------------------
-- 8. PERMISOS COMPLETOS (reemplaza los del schema.sql)
-- ----------------------------------------------------------------
TRUNCATE TABLE permisos_rol;

INSERT INTO permisos_rol (rol, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
-- Coordinador: todo
('coordinador','alumnos',true,true,true,true),
('coordinador','maestros',true,true,true,true),
('coordinador','grupos',true,true,true,true),
('coordinador','inscripciones',true,true,true,true),
('coordinador','pagos',true,true,true,true),
('coordinador','calificaciones',true,true,true,true),
('coordinador','asistencias',true,true,true,true),
('coordinador','periodos',true,true,true,true),
('coordinador','reportes',true,true,true,true),
('coordinador','dashboard',true,true,true,true),
('coordinador','usuarios',true,true,true,true),
('coordinador','estadisticas',true,true,true,true),
('coordinador','finanzas',true,true,true,true),
-- Maestro: solo sus grupos/calificaciones
('maestro','alumnos',true,false,false,false),
('maestro','grupos',true,false,false,false),
('maestro','calificaciones',true,true,true,false),
('maestro','asistencias',true,true,true,false),
('maestro','dashboard',true,false,false,false),
('maestro','pagos',false,false,false,false),
('maestro','reportes',false,false,false,false),
('maestro','inscripciones',false,false,false,false),
('maestro','maestros',false,false,false,false),
('maestro','periodos',false,false,false,false),
('maestro','usuarios',false,false,false,false),
-- Administrativo: solo finanzas lectura
('administrativo','pagos',true,false,false,false),
('administrativo','reportes',true,false,false,false),
('administrativo','dashboard',true,false,false,false),
('administrativo','alumnos',true,false,false,false),
('administrativo','inscripciones',true,false,false,false),
('administrativo','finanzas',true,false,false,false),
('administrativo','estadisticas',true,false,false,false),
('administrativo','grupos',false,false,false,false),
('administrativo','maestros',false,false,false,false),
('administrativo','calificaciones',false,false,false,false),
('administrativo','asistencias',false,false,false,false),
('administrativo','periodos',false,false,false,false),
('administrativo','usuarios',false,false,false,false);


-- ----------------------------------------------------------------
-- 9. ELIMINAR TRIGGER que referencia salones (ya no existen)
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_actualizar_salones ON salones;
DROP TRIGGER IF EXISTS trigger_validar_traslape_horarios ON grupos_horarios;
DROP FUNCTION IF EXISTS validar_traslape_horarios();
DROP FUNCTION IF EXISTS reporte_ocupacion_salones(INT);


-- ----------------------------------------------------------------
-- 10. VERIFICACIÓN FINAL
-- ----------------------------------------------------------------
SELECT
  'usuarios' AS tabla,
  COUNT(*) AS columnas
FROM information_schema.columns
WHERE table_name = 'usuarios' AND table_schema = 'public'

UNION ALL

SELECT 'Columnas debe_cambiar_password' AS tabla,
  COUNT(*) AS columnas
FROM information_schema.columns
WHERE table_name='usuarios' AND column_name='debe_cambiar_password'

UNION ALL

SELECT 'Vista maestros_completo con rol_usuario' AS tabla,
  COUNT(*) AS columnas
FROM information_schema.columns
WHERE table_name='maestros_completo' AND column_name='rol_usuario';
