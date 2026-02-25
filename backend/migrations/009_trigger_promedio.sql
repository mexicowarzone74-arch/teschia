-- Crear función para calcular promedio automático
CREATE OR REPLACE FUNCTION calcular_promedio_alumno()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular promedio de los 3 parciales y actualizar inscripción
    UPDATE inscripciones
    SET calificacion_final = (
        SELECT ROUND(AVG(calificacion), 2)
        FROM calificaciones
        WHERE inscripcion_id = NEW.inscripcion_id
          AND parcial IN (1, 2, 3)
          AND calificacion IS NOT NULL
        HAVING COUNT(*) > 0
    )
    WHERE id = NEW.inscripcion_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_calcular_promedio ON calificaciones;
CREATE TRIGGER trigger_calcular_promedio
    AFTER INSERT OR UPDATE OF calificacion ON calificaciones
    FOR EACH ROW
    EXECUTE FUNCTION calcular_promedio_alumno();

SELECT 'Trigger de promedio automático creado correctamente' as resultado;
