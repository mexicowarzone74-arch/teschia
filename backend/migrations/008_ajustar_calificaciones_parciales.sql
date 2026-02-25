-- =============================================
-- MIGRACIÓN: Ajustar sistema de calificaciones a 3 parciales
-- Fecha: 2025-12-25
-- Descripción: Simplificar calificaciones a sistema de 3 parciales
-- =============================================

-- 1. Agregar columna parcial si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calificaciones' AND column_name = 'parcial') THEN
        ALTER TABLE calificaciones ADD COLUMN parcial INT;
    END IF;
END $$;

-- 2. Agregar campos necesarios si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calificaciones' AND column_name = 'alumno_id') THEN
        ALTER TABLE calificaciones ADD COLUMN alumno_id INT REFERENCES alumnos(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calificaciones' AND column_name = 'grupo_id') THEN
        ALTER TABLE calificaciones ADD COLUMN grupo_id INT REFERENCES grupos(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Poblar alumno_id y grupo_id desde inscripciones
UPDATE calificaciones c
SET alumno_id = i.alumno_id,
    grupo_id = i.grupo_id
FROM inscripciones i
WHERE c.inscripcion_id = i.id
  AND c.alumno_id IS NULL;

-- 4. Hacer columnas NOT NULL después de poblarlas
ALTER TABLE calificaciones ALTER COLUMN alumno_id SET NOT NULL;
ALTER TABLE calificaciones ALTER COLUMN grupo_id SET NOT NULL;
ALTER TABLE calificaciones ALTER COLUMN parcial SET NOT NULL;

-- 5. Agregar constraint para 3 parciales
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificaciones_parcial_check') THEN
        ALTER TABLE calificaciones ADD CONSTRAINT calificaciones_parcial_check 
        CHECK (parcial BETWEEN 1 AND 3);
    END IF;
END $$;

-- 6. Eliminar constraint antiguo de 1-4 parciales si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificaciones_parcial_check1') THEN
        ALTER TABLE calificaciones DROP CONSTRAINT calificaciones_parcial_check1;
    END IF;
END $$;

-- 7. Eliminar unique constraint antiguo y crear uno nuevo
DO $$
BEGIN
    -- Eliminar constraint antiguo si existe
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificaciones_inscripcion_id_componente_id_key') THEN
        ALTER TABLE calificaciones DROP CONSTRAINT calificaciones_inscripcion_id_componente_id_key;
    END IF;
    
    -- Crear nuevo constraint único
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificaciones_inscripcion_parcial_unique') THEN
        ALTER TABLE calificaciones ADD CONSTRAINT calificaciones_inscripcion_parcial_unique 
        UNIQUE (inscripcion_id, parcial);
    END IF;
END $$;

-- 8. Hacer componente_id nullable (ya no es obligatorio)
ALTER TABLE calificaciones ALTER COLUMN componente_id DROP NOT NULL;

-- 9. Crear trigger para calcular promedio automáticamente
CREATE OR REPLACE FUNCTION calcular_promedio_alumno()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular promedio de los 3 parciales y actualizar inscripción
    UPDATE inscripciones
    SET calificacion_final = (
        SELECT AVG(calificacion)
        FROM calificaciones
        WHERE inscripcion_id = NEW.inscripcion_id
          AND parcial IN (1, 2, 3)
    )
    WHERE id = NEW.inscripcion_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe y recrearlo
DROP TRIGGER IF EXISTS trigger_calcular_promedio ON calificaciones;
CREATE TRIGGER trigger_calcular_promedio
    AFTER INSERT OR UPDATE ON calificaciones
    FOR EACH ROW
    EXECUTE FUNCTION calcular_promedio_alumno();

-- 10. Comentarios para documentación
COMMENT ON COLUMN calificaciones.parcial IS 'Número de parcial (1, 2 o 3)';
COMMENT ON COLUMN calificaciones.calificacion IS 'Calificación de 0 a 100';
COMMENT ON CONSTRAINT calificaciones_parcial_check ON calificaciones IS 'El sistema maneja 3 parciales';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Migración completada: Sistema configurado para 3 parciales (0-100)';
    RAISE NOTICE 'Promedio se calcula automáticamente al guardar calificaciones';
END $$;
