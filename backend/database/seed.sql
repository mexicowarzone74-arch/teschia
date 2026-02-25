# ============================================
# SCRIPT DE DATOS DE PRUEBA - SISTEMA TESCHA
# ============================================
# Este archivo contiene datos de ejemplo para probar el sistema
# VERSIÓN 2.0 - SIN SALONES NI LIBROS

# NOTA: Ejecutar DESPUÉS de haber inicializado el schema.sql

# ============================================
# USUARIO COORDINADOR (Ya incluido en schema.sql)
# ============================================
# Usuario: coordinador
# Password: admin123 (hash bcrypt)

# ============================================
# CREAR USUARIOS ADICIONALES
# ============================================

-- Maestro de prueba
INSERT INTO usuarios (username, password, rol) 
VALUES ('maestro1', '$2a$10$X8qF.Kq8KZ7Z3Q9Z3Q9Z3.YZ3Q9Z3Q9Z3Q9Z3Q9Z3Q9Z3Q9Z3Q9Z3', 'maestro');

-- Administrativo de prueba
INSERT INTO usuarios (username, password, rol) 
VALUES ('admin1', '$2a$10$X8qF.Kq8KZ7Z3Q9Z3Q9Z3.YZ3Q9Z3Q9Z3Q9Z3Q9Z3Q9Z3Q9Z3Q9Z3', 'administrativo');

-- Alumno de prueba
INSERT INTO usuarios (username, password, rol) 
VALUES ('alumno1', '$2a$10$X8qF.Kq8KZ7Z3Q9Z3Q9Z3.YZ3Q9Z3Q9Z3Q9Z3Q9Z3Q9Z3Q9Z3Q9Z3', 'alumno');

# ============================================
# PERÍODO ACADÉMICO ACTUAL
# ============================================

INSERT INTO periodos (nombre, tipo, fecha_inicio_inscripciones, fecha_fin_inscripciones, fecha_inicio_clases, fecha_fin_clases, fecha_inicio_examenes, fecha_fin_examenes, activo)
VALUES 
('Enero-Junio 2025', 'semestral', '2024-12-01', '2025-01-15', '2025-01-20', '2025-06-20', '2025-06-10', '2025-06-20', true);

-- Configurar tarifas del período
INSERT INTO tarifas (periodo_id, nivel_id, tipo_alumno, monto_inscripcion, monto_mensual, numero_pagos)
VALUES 
(1, 1, 'interno', 500.00, 500.00, 6),
(1, 1, 'externo', 800.00, 800.00, 6),
(1, 2, 'interno', 550.00, 550.00, 6),
(1, 2, 'externo', 850.00, 850.00, 6);

# ============================================
# MAESTROS
# ============================================

INSERT INTO maestros (usuario_id, nombre, apellido_paterno, apellido_materno, rfc, correo, telefono, activo) VALUES
(2, 'María', 'García', 'López', 'GALM850315HDF', 'maria.garcia@tescha.edu.mx', '5551234567', true),
(NULL, 'Juan', 'Pérez', 'Martínez', 'PEMJ800420HDF', 'juan.perez@tescha.edu.mx', '5551234568', true),
(NULL, 'Ana', 'Rodríguez', 'Sánchez', 'ROSA900512MDF', 'ana.rodriguez@tescha.edu.mx', '5551234569', true);

-- Niveles que imparten
INSERT INTO maestros_niveles (maestro_id, nivel_id) VALUES
(1, 1), (1, 2), (1, 3),  -- María: Básico, Intermedio, Avanzado
(2, 3), (2, 4),          -- Juan: Avanzado, Perf1
(3, 4), (3, 5), (3, 6);  -- Ana: Perf1, Perf2, C1

# ============================================
# ALUMNOS DE EJEMPLO
# ============================================

INSERT INTO alumnos (usuario_id, tipo_alumno, matricula, nombre, apellido_paterno, apellido_materno, correo, telefono, carrera, semestre, nivel_id, maestro_id, estatus) VALUES
(4, 'interno', '2021001', 'Carlos', 'Hernández', 'Flores', 'carlos.hernandez@tescha.edu.mx', '5559876543', 'Ingeniería en Sistemas Computacionales', 7, 3, 1, 'activo'),
(NULL, 'interno', '2021002', 'Laura', 'Martínez', 'Gómez', 'laura.martinez@tescha.edu.mx', '5559876544', 'Ingeniería Industrial', 5, 2, 1, 'activo'),
(NULL, 'interno', '2021003', 'Pedro', 'López', 'Ramírez', 'pedro.lopez@tescha.edu.mx', '5559876545', 'Ingeniería en Informática', 3, 1, 1, 'activo'),
(NULL, 'externo', NULL, 'Sofía', 'González', 'Torres', 'sofia.gonzalez@gmail.com', '5559876546', NULL, NULL, 3, 2, 'activo'),
(NULL, 'interno', '2021004', 'Miguel Ángel', 'Díaz', 'Cruz', 'miguel.diaz@tescha.edu.mx', '5559876547', 'Ingeniería Electromecánica', 6, 4, 2, 'activo');

# ============================================
# GRUPOS (SIN SALONES)
# ============================================

INSERT INTO grupos (codigo, periodo_id, nivel_id, maestro_id, modalidad, cupo_maximo, activo) VALUES
('BASICO-M1', 1, 1, 1, 'semestral', 30, true),
('INTER-M1', 1, 2, 1, 'semestral', 30, true),
('AVANZ-M1', 1, 3, 2, 'semestral', 35, true),
('PERF1-M2', 1, 4, 3, 'semestral', 25, true);

-- Horarios de los grupos (Lunes, Miércoles, Viernes)
INSERT INTO grupos_horarios (grupo_id, dia, hora_inicio, hora_fin) VALUES
-- Grupo BASICO-M1 (Lun-Mie-Vie 7:00-9:00)
(1, 'lunes', '07:00:00', '09:00:00'),
(1, 'miercoles', '07:00:00', '09:00:00'),
(1, 'viernes', '07:00:00', '09:00:00'),

-- Grupo INTER-M1 (Mar-Jue 14:00-16:00)
(2, 'martes', '14:00:00', '16:00:00'),
(2, 'jueves', '14:00:00', '16:00:00'),

-- Grupo AVANZ-M1 (Lun-Mie-Vie 9:00-11:00)
(3, 'lunes', '09:00:00', '11:00:00'),
(3, 'miercoles', '09:00:00', '11:00:00'),
(3, 'viernes', '09:00:00', '11:00:00'),

-- Grupo PERF1-M2 (Mar-Jue-Sab 16:00-18:00)
(4, 'martes', '16:00:00', '18:00:00'),
(4, 'jueves', '16:00:00', '18:00:00'),
(4, 'sabado', '16:00:00', '18:00:00');

# ============================================
# INSCRIPCIONES
# ============================================

INSERT INTO inscripciones (alumno_id, grupo_id, periodo_id, estatus) VALUES
(1, 3, 1, 'activo'),  -- Carlos en Avanzado
(2, 2, 1, 'activo'),  -- Laura en Intermedio
(3, 1, 1, 'activo'),  -- Pedro en Básico
(4, 3, 1, 'activo'),  -- Sofía en Avanzado
(5, 4, 1, 'activo');  -- Miguel en Perf1

# ============================================
# PAGOS
# ============================================

INSERT INTO pagos (inscripcion_id, numero_pago, concepto, monto, fecha_vencimiento, fecha_pago, estatus, metodo_pago, monto_final) VALUES
(1, 1, 'Inscripción Enero-Junio 2025', 500.00, '2025-01-15', '2025-01-10', 'pagado', 'Transferencia', 500.00),
(2, 1, 'Inscripción Enero-Junio 2025', 500.00, '2025-01-15', '2025-01-12', 'pagado', 'Efectivo', 500.00),
(3, 1, 'Inscripción Enero-Junio 2025', 500.00, '2025-01-15', NULL, 'pendiente', NULL, 500.00),
(4, 1, 'Inscripción Enero-Junio 2025', 800.00, '2025-01-15', '2025-01-15', 'pagado', 'Tarjeta', 800.00),
(5, 1, 'Inscripción Enero-Junio 2025', 500.00, '2025-01-15', NULL, 'prorroga', NULL, 500.00);

-- Prórroga para Miguel
INSERT INTO prorrogas (pago_id, motivo, fecha_limite_original, fecha_limite_nueva, estatus, solicitada_por) VALUES
(5, 'Situación económica temporal', '2025-01-15', '2025-02-01', 'aprobada', 5);

# ============================================
# CALIFICACIONES (Primer parcial)
# ============================================

INSERT INTO calificaciones_parciales (inscripcion_id, parcial, calificacion) VALUES
(1, 1, 85.50),
(2, 1, 92.00),
(3, 1, 78.00),
(4, 1, 88.50),
(5, 1, 95.00);

# ============================================
# ASISTENCIAS (Últimas 5 clases)
# ============================================

-- Carlos (alumno 1)
INSERT INTO asistencias (inscripcion_id, fecha, presente) VALUES
(1, '2025-01-20', true),
(1, '2025-01-22', true),
(1, '2025-01-24', false),
(1, '2025-01-27', true),
(1, '2025-01-29', true);

-- Laura (alumno 2)
INSERT INTO asistencias (inscripcion_id, fecha, presente) VALUES
(2, '2025-01-21', true),
(2, '2025-01-23', true),
(2, '2025-01-28', true),
(2, '2025-01-30', true);

# ============================================
# FIN DE DATOS DE PRUEBA
# ============================================

-- Verificar datos insertados
SELECT 'Usuarios creados:' as info, COUNT(*) as total FROM usuarios
UNION ALL
SELECT 'Períodos creados:', COUNT(*) FROM periodos
UNION ALL
SELECT 'Maestros creados:', COUNT(*) FROM maestros
UNION ALL
SELECT 'Alumnos creados:', COUNT(*) FROM alumnos
UNION ALL
SELECT 'Grupos creados:', COUNT(*) FROM grupos
UNION ALL
SELECT 'Inscripciones:', COUNT(*) FROM inscripciones
UNION ALL
SELECT 'Pagos registrados:', COUNT(*) FROM pagos
UNION ALL
SELECT 'Alumnos con maestro:', COUNT(*) FROM alumnos WHERE maestro_id IS NOT NULL;
