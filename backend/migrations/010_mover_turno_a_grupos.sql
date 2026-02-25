-- =============================================
-- MIGRACIÓN: Mover campo TURNO de alumnos a grupos
-- Fecha: 30/12/2025
-- Razón: El turno es del GRUPO, no del alumno
-- =============================================

BEGIN;

-- PASO 1: Agregar campo turno a grupos
ALTER TABLE grupos 
ADD COLUMN IF NOT EXISTS turno VARCHAR(20) 
CHECK (turno IN ('matutino', 'vespertino', 'nocturno', 'mixto'))
DEFAULT 'matutino';

-- PASO 2: Migrar datos existentes de alumnos a grupos
-- Para cada grupo, tomar el turno del primer alumno inscrito
UPDATE grupos g
SET turno = COALESCE(
    (
        SELECT DISTINCT a.turno 
        FROM inscripciones i
        JOIN alumnos a ON i.alumno_id = a.id
        WHERE i.grupo_id = g.id
          AND a.turno IS NOT NULL
        LIMIT 1
    ),
    'matutino'  -- Por defecto si no hay datos
)
WHERE g.turno IS NULL;

-- PASO 3: Asegurar que todos los grupos tengan turno
UPDATE grupos SET turno = 'matutino' WHERE turno IS NULL;

-- PASO 4: Hacer el campo NOT NULL ahora que todos tienen valor
ALTER TABLE grupos ALTER COLUMN turno SET NOT NULL;

-- PASO 5: Eliminar campo turno de alumnos (con CASCADE para eliminar dependencias)
ALTER TABLE alumnos DROP COLUMN IF EXISTS turno CASCADE;

-- PASO 6: Agregar índice para búsquedas rápidas por turno
CREATE INDEX IF NOT EXISTS idx_grupos_turno ON grupos(turno);

COMMIT;

-- =============================================
-- VERIFICACIÓN
-- =============================================
-- SELECT turno, COUNT(*) FROM grupos GROUP BY turno;
