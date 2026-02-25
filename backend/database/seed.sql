-- ============================================
-- DATOS DE PRUEBA - SISTEMA TESCHA
-- SOLO PARA DESARROLLO/TEST - NO ejecutar en producción
-- Ejecutar DESPUÉS de schema.sql y supabase-migrations.sql
-- ============================================

-- ============================================
-- USUARIOS (coordinador ya insertado en schema.sql)
-- ============================================

-- Maestro de prueba (password: test123)
INSERT INTO usuarios (username, password, rol)
VALUES ('maestro1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'maestro')
ON CONFLICT (username) DO NOTHING;

-- Administrativo de prueba (password: test123)
INSERT INTO usuarios (username, password, rol)
VALUES ('admin1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrativo')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- PERÍODO ACADÉMICO
-- ============================================

INSERT INTO periodos (nombre, tipo, fecha_inicio_inscripciones, fecha_fin_inscripciones, fecha_inicio_clases, fecha_fin_clases, fecha_inicio_examenes, fecha_fin_examenes, activo)
VALUES ('Enero-Junio 2025', 'semestral', '2024-12-01', '2025-01-15', '2025-01-20', '2025-06-20', '2025-06-10', '2025-06-20', true)
ON CONFLICT DO NOTHING;

-- Tarifas del período
INSERT INTO tarifas (periodo_id, nivel_id, tipo_alumno, monto_inscripcion, monto_mensual, numero_pagos)
VALUES
(1, 1, 'interno',  500.00, 500.00, 6),
(1, 1, 'externo',  800.00, 800.00, 6),
(1, 2, 'interno',  550.00, 550.00, 6),
(1, 2, 'externo',  850.00, 850.00, 6)
ON CONFLICT DO NOTHING;

-- ============================================
-- MAESTROS
-- ============================================

INSERT INTO maestros (usuario_id, nombre, apellido_paterno, apellido_materno, correo, telefono, activo) VALUES
(2,    'María', 'García',    'López',    'maria.garcia@tescha.edu.mx',    '5551234567', true),
(NULL, 'Juan',  'Pérez',     'Martínez', 'juan.perez@tescha.edu.mx',      '5551234568', true),
(NULL, 'Ana',   'Rodríguez', 'Sánchez',  'ana.rodriguez@tescha.edu.mx',   '5551234569', true)
ON CONFLICT (correo) DO NOTHING;

-- Niveles que imparten
INSERT INTO maestros_niveles (maestro_id, nivel_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 3), (2, 4),
(3, 4), (3, 5), (3, 6)
ON CONFLICT DO NOTHING;

-- ============================================
-- ALUMNOS
-- ============================================

INSERT INTO alumnos (tipo_alumno, matricula, nombre, apellido_paterno, apellido_materno, correo, telefono, carrera, semestre, nivel_id, estatus) VALUES
('interno', '2021001', 'Carlos',      'Hernández', 'Flores',   'carlos.hernandez@tescha.edu.mx', '5559876543', 'Ingeniería en Sistemas', 7, 3, 'activo'),
('interno', '2021002', 'Laura',       'Martínez',  'Gómez',    'laura.martinez@tescha.edu.mx',   '5559876544', 'Ingeniería Industrial',  5, 2, 'activo'),
('interno', '2021003', 'Pedro',       'López',     'Ramírez',  'pedro.lopez@tescha.edu.mx',      '5559876545', 'Ingeniería Informática', 3, 1, 'activo'),
('externo', NULL,      'Sofía',       'González',  'Torres',   'sofia.gonzalez@gmail.com',       '5559876546', NULL,                     NULL, 3, 'activo'),
('interno', '2021004', 'Miguel Ángel','Díaz',      'Cruz',     'miguel.diaz@tescha.edu.mx',      '5559876547', 'Ing. Electromecánica',   6, 4, 'activo')
ON CONFLICT (correo) DO NOTHING;

-- ============================================
-- GRUPOS
-- ============================================

INSERT INTO grupos (codigo, periodo_id, nivel_id, maestro_id, modalidad, cupo_maximo, activo) VALUES
('BASICO-M1', 1, 1, 1, 'semestral', 30, true),
('INTER-M1',  1, 2, 1, 'semestral', 30, true),
('AVANZ-M1',  1, 3, 2, 'semestral', 35, true),
('PERF1-M2',  1, 4, 3, 'semestral', 25, true)
ON CONFLICT (codigo) DO NOTHING;

-- Horarios
INSERT INTO grupos_horarios (grupo_id, dia, hora_inicio, hora_fin) VALUES
(1, 'lunes',     '07:00', '09:00'),
(1, 'miercoles', '07:00', '09:00'),
(1, 'viernes',   '07:00', '09:00'),
(2, 'martes',    '14:00', '16:00'),
(2, 'jueves',    '14:00', '16:00'),
(3, 'lunes',     '09:00', '11:00'),
(3, 'miercoles', '09:00', '11:00'),
(3, 'viernes',   '09:00', '11:00'),
(4, 'martes',    '16:00', '18:00'),
(4, 'jueves',    '16:00', '18:00'),
(4, 'sabado',    '16:00', '18:00')
ON CONFLICT DO NOTHING;

-- ============================================
-- INSCRIPCIONES
-- ============================================

INSERT INTO inscripciones (alumno_id, grupo_id, periodo_id, estatus) VALUES
(1, 3, 1, 'activo'),
(2, 2, 1, 'activo'),
(3, 1, 1, 'activo'),
(4, 3, 1, 'activo'),
(5, 4, 1, 'activo')
ON CONFLICT DO NOTHING;

-- ============================================
-- PAGOS
-- ============================================

INSERT INTO pagos (inscripcion_id, numero_pago, concepto, monto, fecha_vencimiento, fecha_pago, estatus, metodo_pago, monto_final) VALUES
(1, 1, 'Inscripción Enero-Junio 2025', 500.00, '2025-01-15', '2025-01-10', 'pagado',   'Transferencia', 500.00),
(2, 1, 'Inscripción Enero-Junio 2025', 500.00, '2025-01-15', '2025-01-12', 'pagado',   'Efectivo',      500.00),
(3, 1, 'Inscripción Enero-Junio 2025', 500.00, '2025-01-15', NULL,         'pendiente', NULL,            500.00),
(4, 1, 'Inscripción Enero-Junio 2025', 800.00, '2025-01-15', '2025-01-15', 'pagado',   'Tarjeta',       800.00),
(5, 1, 'Inscripción Enero-Junio 2025', 500.00, '2025-01-15', NULL,         'prorroga',  NULL,            500.00)
ON CONFLICT DO NOTHING;

INSERT INTO prorrogas (pago_id, motivo, fecha_limite_original, fecha_limite_nueva, estatus, solicitada_por) VALUES
(5, 'Situación económica temporal', '2025-01-15', '2025-02-01', 'aprobada', 5)
ON CONFLICT DO NOTHING;

-- ============================================
-- CALIFICACIONES PARCIALES
-- ============================================

INSERT INTO calificaciones_parciales (inscripcion_id, parcial, calificacion) VALUES
(1, 1, 85.50),
(2, 1, 92.00),
(3, 1, 78.00),
(4, 1, 88.50),
(5, 1, 95.00)
ON CONFLICT DO NOTHING;

-- ============================================
-- ASISTENCIAS
-- ============================================

INSERT INTO asistencias (inscripcion_id, fecha, presente) VALUES
(1, '2025-01-20', true),  (1, '2025-01-22', true),
(1, '2025-01-24', false), (1, '2025-01-27', true),
(2, '2025-01-21', true),  (2, '2025-01-23', true),
(2, '2025-01-28', true),  (2, '2025-01-30', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 'Usuarios'      AS tabla, COUNT(*) AS total FROM usuarios
UNION ALL SELECT 'Períodos',     COUNT(*) FROM periodos
UNION ALL SELECT 'Maestros',     COUNT(*) FROM maestros
UNION ALL SELECT 'Alumnos',      COUNT(*) FROM alumnos
UNION ALL SELECT 'Grupos',       COUNT(*) FROM grupos
UNION ALL SELECT 'Inscripciones',COUNT(*) FROM inscripciones
UNION ALL SELECT 'Pagos',        COUNT(*) FROM pagos;
