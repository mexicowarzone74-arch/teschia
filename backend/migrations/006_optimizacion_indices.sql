-- Migración de Optimización de Rendimiento
-- Crear índices compuestos para mejorar velocidad de consultas

-- Índices para maestros_alumnos y relaciones maestro-alumno
CREATE INDEX IF NOT EXISTS idx_alumnos_maestro_estatus ON alumnos(maestro_id, estatus) WHERE estatus = 'activo';
CREATE INDEX IF NOT EXISTS idx_alumnos_nivel_estatus ON alumnos(nivel_id, estatus) WHERE estatus = 'activo';

-- Índices compuestos para inscripciones (queries más frecuentes)
CREATE INDEX IF NOT EXISTS idx_inscripciones_grupo_estatus ON inscripciones(grupo_id, estatus) WHERE estatus = 'activo';
CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno_estatus ON inscripciones(alumno_id, estatus) WHERE estatus = 'activo';
CREATE INDEX IF NOT EXISTS idx_inscripciones_periodo_estatus ON inscripciones(periodo_id, estatus) WHERE estatus = 'activo';

-- Índices para grupos con maestros
CREATE INDEX IF NOT EXISTS idx_grupos_maestro_periodo ON grupos(maestro_id, periodo_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_grupos_maestro_activo ON grupos(maestro_id, activo);
CREATE INDEX IF NOT EXISTS idx_grupos_periodo_activo ON grupos(periodo_id, activo);

-- Índices para pagos (consultas de cobranza)
CREATE INDEX IF NOT EXISTS idx_pagos_inscripcion_estatus ON pagos(inscripcion_id, estatus);
CREATE INDEX IF NOT EXISTS idx_pagos_vencimiento_estatus ON pagos(fecha_vencimiento, estatus) WHERE estatus = 'pendiente';

-- Índices para calificaciones
CREATE INDEX IF NOT EXISTS idx_calificaciones_inscripcion ON calificaciones(inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_componente ON calificaciones(componente_id);

-- Índices para calificaciones parciales
CREATE INDEX IF NOT EXISTS idx_calificaciones_parciales_inscripcion ON calificaciones_parciales(inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_parciales_parcial ON calificaciones_parciales(parcial);

-- Índices para asistencias
CREATE INDEX IF NOT EXISTS idx_asistencias_inscripcion ON asistencias(inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_presente ON asistencias(presente);

-- Índices para búsquedas de texto (nombres, matrículas)
CREATE INDEX IF NOT EXISTS idx_alumnos_nombre_busqueda ON alumnos USING gin(to_tsvector('spanish', nombre || ' ' || apellido_paterno || ' ' || COALESCE(apellido_materno, '')));
CREATE INDEX IF NOT EXISTS idx_maestros_nombre_busqueda ON maestros USING gin(to_tsvector('spanish', nombre || ' ' || apellido_paterno || ' ' || COALESCE(apellido_materno, '')));

-- Índice para horarios de grupos (consultas de conflictos)
CREATE INDEX IF NOT EXISTS idx_grupos_horarios_dia_hora ON grupos_horarios(dia, hora_inicio, hora_fin);

-- Índices para maestros_niveles (certificaciones)
CREATE INDEX IF NOT EXISTS idx_maestros_niveles_maestro_activo ON maestros_niveles(maestro_id, activo);
CREATE INDEX IF NOT EXISTS idx_maestros_niveles_nivel_activo ON maestros_niveles(nivel_id, activo);

-- Índice para usuarios activos
CREATE INDEX IF NOT EXISTS idx_usuarios_activo_rol ON usuarios(activo, rol);

-- Índice para periodos activos
CREATE INDEX IF NOT EXISTS idx_periodos_activo ON periodos(activo) WHERE activo = true;

-- Estadísticas actualizadas para mejor plan de ejecución
ANALYZE alumnos;
ANALYZE maestros;
ANALYZE grupos;
ANALYZE inscripciones;
ANALYZE pagos;
ANALYZE calificaciones;
ANALYZE asistencias;

-- Comentario de migración
COMMENT ON INDEX idx_alumnos_maestro_estatus IS 'Optimización para queries de maestros-alumnos';
COMMENT ON INDEX idx_inscripciones_grupo_estatus IS 'Optimización para queries de inscripciones activas por grupo';
