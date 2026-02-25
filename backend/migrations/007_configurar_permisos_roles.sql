-- =============================================
-- MIGRACIÓN: Configurar Permisos por Rol
-- =============================================

-- Limpiar permisos existentes
TRUNCATE TABLE permisos_rol;

-- =============================================
-- PERMISOS: COORDINADOR (Control Total)
-- =============================================
INSERT INTO permisos_rol (rol, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
('coordinador', 'alumnos', true, true, true, true),
('coordinador', 'maestros', true, true, true, true),
('coordinador', 'grupos', true, true, true, true),
('coordinador', 'inscripciones', true, true, true, true),
('coordinador', 'pagos', true, true, true, true),
('coordinador', 'calificaciones', true, true, true, true),
('coordinador', 'asistencias', true, true, true, true),
('coordinador', 'periodos', true, true, true, true),
('coordinador', 'reportes', true, true, true, true),
('coordinador', 'dashboard', true, true, true, true),
('coordinador', 'usuarios', true, true, true, true);

-- =============================================
-- PERMISOS: MAESTRO (Solo sus grupos)
-- =============================================
INSERT INTO permisos_rol (rol, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
('maestro', 'alumnos', true, false, false, false),        -- Ver solo sus alumnos
('maestro', 'grupos', true, false, false, false),          -- Ver solo sus grupos
('maestro', 'calificaciones', true, true, true, false),    -- Subir/editar calificaciones
('maestro', 'asistencias', true, true, true, false),       -- Subir/editar asistencias
('maestro', 'dashboard', true, false, false, false),       -- Ver su dashboard
('maestro', 'pagos', false, false, false, false),          -- NO ver pagos
('maestro', 'reportes', false, false, false, false),       -- NO ver reportes
('maestro', 'inscripciones', false, false, false, false),  -- NO ver inscripciones
('maestro', 'maestros', false, false, false, false),       -- NO ver otros maestros
('maestro', 'periodos', false, false, false, false),       -- NO ver períodos
('maestro', 'usuarios', false, false, false, false);       -- NO ver usuarios

-- =============================================
-- PERMISOS: ADMINISTRATIVO (Solo Finanzas - Lectura)
-- =============================================
INSERT INTO permisos_rol (rol, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
('administrativo', 'pagos', true, false, false, false),           -- Ver pagos
('administrativo', 'reportes', true, false, false, false),        -- Ver reportes financieros
('administrativo', 'dashboard', true, false, false, false),       -- Ver dashboard financiero
('administrativo', 'alumnos', true, false, false, false),         -- Ver alumnos (para consultas)
('administrativo', 'inscripciones', true, false, false, false),   -- Ver inscripciones
('administrativo', 'grupos', false, false, false, false),         -- NO ver grupos
('administrativo', 'maestros', false, false, false, false),       -- NO ver maestros
('administrativo', 'calificaciones', false, false, false, false), -- NO ver calificaciones
('administrativo', 'asistencias', false, false, false, false),    -- NO ver asistencias
('administrativo', 'periodos', false, false, false, false),       -- NO ver períodos
('administrativo', 'usuarios', false, false, false, false);       -- NO ver usuarios

-- =============================================
-- Crear usuario administrativo de prueba
-- =============================================
INSERT INTO usuarios (username, password, rol, activo)
VALUES (
    'financiero',
    crypt('financiero123', gen_salt('bf')),  -- Contraseña: financiero123
    'administrativo',
    true
) ON CONFLICT (username) DO NOTHING;

SELECT 'Permisos configurados exitosamente' as resultado;
