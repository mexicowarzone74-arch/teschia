-- =============================================
-- MIGRACIÓN: ELIMINAR SALONES Y LIBROS
-- SIMPLIFICAR VINCULACIÓN MAESTRO-ALUMNO
-- =============================================
-- Fecha: 2025-12-17
-- Descripción: Elimina completamente salones y libros del sistema
--              Agrega asignación directa maestro-alumno
-- =============================================

BEGIN;

-- =============================================
-- PASO 1: BACKUP DE DATOS (por si acaso)
-- =============================================
SELECT 'PASO 1: Creando tablas de respaldo...' AS paso;

-- Backup de salones (por si se necesita recuperar algo)
CREATE TABLE IF NOT EXISTS _backup_salones AS SELECT * FROM salones;
CREATE TABLE IF NOT EXISTS _backup_historial_salones AS SELECT * FROM historial_salones;
CREATE TABLE IF NOT EXISTS _backup_mantenimientos_salones AS SELECT * FROM mantenimientos_salones;

-- Backup de grupos (antes de eliminar salon_id)
CREATE TABLE IF NOT EXISTS _backup_grupos AS SELECT * FROM grupos;

SELECT 'Respaldos creados exitosamente' AS resultado;

-- =============================================
-- PASO 2: ELIMINAR TRIGGERS Y FUNCIONES DE SALONES
-- =============================================
SELECT 'PASO 2: Eliminando triggers y funciones de salones...' AS paso;

-- Eliminar trigger de validación de traslape de horarios (usa salon_id)
DROP TRIGGER IF EXISTS trigger_validar_traslape_horarios ON grupos_horarios;
DROP FUNCTION IF EXISTS validar_traslape_horarios();

-- Eliminar función de reporte de ocupación de salones
DROP FUNCTION IF EXISTS reporte_ocupacion_salones(INT);

SELECT 'Triggers y funciones eliminados' AS resultado;

-- =============================================
-- PASO 3: ELIMINAR VISTAS QUE USAN SALONES
-- =============================================
SELECT 'PASO 3: Eliminando vistas que referencian salones...' AS paso;

DROP VIEW IF EXISTS grupos_detalle CASCADE;

SELECT 'Vistas eliminadas' AS resultado;

-- =============================================
-- PASO 4: ELIMINAR FOREIGN KEYS DE SALONES
-- =============================================
SELECT 'PASO 4: Eliminando foreign keys de salones...' AS paso;

-- Eliminar FK de grupos a salones
ALTER TABLE grupos DROP CONSTRAINT IF EXISTS grupos_salon_id_fkey;

-- Eliminar FK de eventos a salones
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_salon_id_fkey;

SELECT 'Foreign keys eliminadas' AS resultado;

-- =============================================
-- PASO 5: ELIMINAR COLUMNAS SALON_ID
-- =============================================
SELECT 'PASO 5: Eliminando columnas salon_id...' AS paso;

ALTER TABLE grupos DROP COLUMN IF EXISTS salon_id;
ALTER TABLE eventos DROP COLUMN IF EXISTS salon_id;

SELECT 'Columnas salon_id eliminadas' AS resultado;

-- =============================================
-- PASO 6: ELIMINAR TABLAS DE SALONES
-- =============================================
SELECT 'PASO 6: Eliminando tablas de salones...' AS paso;

DROP TABLE IF EXISTS mantenimientos_salones CASCADE;
DROP TABLE IF EXISTS historial_salones CASCADE;
DROP TABLE IF EXISTS salones CASCADE;

SELECT 'Tablas de salones eliminadas' AS resultado;

-- =============================================
-- PASO 7: ELIMINAR ÍNDICES DE SALONES
-- =============================================
SELECT 'PASO 7: Eliminando índices de salones...' AS paso;

DROP INDEX IF EXISTS idx_salones_estatus;
DROP INDEX IF EXISTS idx_salones_codigo;
DROP INDEX IF EXISTS idx_salones_tipo;
DROP INDEX IF EXISTS idx_grupos_salon;

SELECT 'Índices eliminados' AS resultado;

-- =============================================
-- PASO 8: ELIMINAR PERMISOS DE SALONES
-- =============================================
SELECT 'PASO 8: Eliminando permisos de módulo salones...' AS paso;

DELETE FROM permisos_rol WHERE modulo = 'salones';

SELECT 'Permisos de salones eliminados' AS resultado;

-- =============================================
-- PASO 9: ELIMINAR TODO LO RELACIONADO CON LIBROS
-- =============================================
SELECT 'PASO 9: Eliminando sistema de libros...' AS paso;

-- Backup de libros (por si acaso)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'libros') THEN
        CREATE TABLE IF NOT EXISTS _backup_libros AS SELECT * FROM libros;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_libros') THEN
        CREATE TABLE IF NOT EXISTS _backup_ventas_libros AS SELECT * FROM ventas_libros;
    END IF;
END $$;

-- Eliminar tablas de libros
DROP TABLE IF EXISTS ventas_libros CASCADE;
DROP TABLE IF EXISTS libros CASCADE;

-- Eliminar columna de ingresos_libros si existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'estadisticas_periodo' 
        AND column_name = 'ingresos_libros'
    ) THEN
        ALTER TABLE estadisticas_periodo DROP COLUMN ingresos_libros;
    END IF;
END $$;

-- Eliminar permisos de libros si existen
DELETE FROM permisos_rol WHERE modulo = 'libros';

SELECT 'Sistema de libros eliminado completamente' AS resultado;

-- =============================================
-- PASO 10: AGREGAR ASIGNACIÓN DIRECTA MAESTRO-ALUMNO
-- =============================================
SELECT 'PASO 10: Agregando vinculación directa maestro-alumno...' AS paso;

-- Agregar columna maestro_id a alumnos
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS maestro_id INT REFERENCES maestros(id) ON DELETE SET NULL;

-- Crear índice para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_alumnos_maestro ON alumnos(maestro_id);

SELECT 'Columna maestro_id agregada a alumnos' AS resultado;

-- =============================================
-- PASO 11: MIGRAR DATOS EXISTENTES
-- =============================================
SELECT 'PASO 11: Migrando asignaciones maestro-alumno desde grupos...' AS paso;

-- Asignar maestros a alumnos basándose en sus inscripciones actuales
UPDATE alumnos a
SET maestro_id = (
    SELECT g.maestro_id
    FROM inscripciones i
    JOIN grupos g ON i.grupo_id = g.id
    WHERE i.alumno_id = a.id
    AND i.estatus = 'activo'
    AND g.maestro_id IS NOT NULL
    ORDER BY i.created_at DESC
    LIMIT 1
)
WHERE a.maestro_id IS NULL
AND a.estatus = 'activo';

SELECT COUNT(*) || ' alumnos asignados a maestros' AS resultado
FROM alumnos WHERE maestro_id IS NOT NULL;

-- =============================================
-- PASO 12: RECREAR VISTAS SIN SALONES
-- =============================================
SELECT 'PASO 12: Recreando vistas sin referencias a salones...' AS paso;

-- Vista de grupos sin salones
CREATE OR REPLACE VIEW grupos_detalle AS
SELECT 
    g.*,
    n.nombre as nivel_nombre,
    n.codigo as nivel_codigo,
    p.nombre as periodo_nombre,
    CONCAT(m.nombre, ' ', m.apellido_paterno) as maestro_nombre,
    (SELECT COUNT(*) FROM inscripciones i WHERE i.grupo_id = g.id AND i.estatus = 'activo') as inscritos_actual
FROM grupos g
LEFT JOIN niveles n ON g.nivel_id = n.id
LEFT JOIN periodos p ON g.periodo_id = p.id
LEFT JOIN maestros m ON g.maestro_id = m.id;

-- Nueva vista: maestros con sus alumnos
CREATE OR REPLACE VIEW maestros_alumnos AS
SELECT 
    m.id as maestro_id,
    CONCAT(m.nombre, ' ', m.apellido_paterno, ' ', COALESCE(m.apellido_materno, '')) as maestro_nombre,
    m.correo as maestro_correo,
    a.id as alumno_id,
    CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as alumno_nombre,
    a.correo as alumno_correo,
    a.tipo_alumno,
    n.nombre as nivel_nombre,
    n.codigo as nivel_codigo,
    a.estatus as alumno_estatus
FROM maestros m
LEFT JOIN alumnos a ON m.id = a.maestro_id
LEFT JOIN niveles n ON a.nivel_id = n.id
WHERE m.activo = true;

-- Vista de alumnos completo actualizada
DROP VIEW IF EXISTS alumnos_completo CASCADE;
CREATE OR REPLACE VIEW alumnos_completo AS
SELECT 
    a.*,
    CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
    n.nombre as nivel_nombre,
    n.codigo as nivel_codigo,
    CONCAT(m.nombre, ' ', m.apellido_paterno) as maestro_nombre,
    m.correo as maestro_correo
FROM alumnos a
LEFT JOIN niveles n ON a.nivel_id = n.id
LEFT JOIN maestros m ON a.maestro_id = m.id;

SELECT 'Vistas recreadas exitosamente' AS resultado;

-- =============================================
-- PASO 13: CREAR FUNCIÓN PARA ASIGNAR MAESTRO
-- =============================================
SELECT 'PASO 13: Creando funciones auxiliares...' AS paso;

-- Función para asignar maestro a alumno
CREATE OR REPLACE FUNCTION asignar_maestro_alumno(
    p_alumno_id INT,
    p_maestro_id INT
) RETURNS BOOLEAN AS $$
DECLARE
    nivel_alumno INT;
    puede_impartir BOOLEAN;
BEGIN
    -- Obtener nivel del alumno
    SELECT nivel_id INTO nivel_alumno FROM alumnos WHERE id = p_alumno_id;
    
    -- Verificar que el maestro puede impartir ese nivel
    SELECT EXISTS(
        SELECT 1 FROM maestros_niveles
        WHERE maestro_id = p_maestro_id
        AND nivel_id = nivel_alumno
        AND activo = true
    ) INTO puede_impartir;
    
    IF NOT puede_impartir THEN
        RAISE EXCEPTION 'El maestro no está certificado para impartir el nivel del alumno';
    END IF;
    
    -- Asignar maestro
    UPDATE alumnos SET maestro_id = p_maestro_id WHERE id = p_alumno_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener alumnos de un maestro
CREATE OR REPLACE FUNCTION obtener_alumnos_maestro(p_maestro_id INT)
RETURNS TABLE (
    alumno_id INT,
    nombre_completo TEXT,
    correo VARCHAR,
    nivel_nombre VARCHAR,
    tipo_alumno VARCHAR,
    estatus VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as nombre_completo,
        a.correo,
        n.nombre as nivel_nombre,
        a.tipo_alumno,
        a.estatus
    FROM alumnos a
    LEFT JOIN niveles n ON a.nivel_id = n.id
    WHERE a.maestro_id = p_maestro_id
    ORDER BY n.orden, a.apellido_paterno, a.nombre;
END;
$$ LANGUAGE plpgsql;

SELECT 'Funciones auxiliares creadas' AS resultado;

-- =============================================
-- PASO 14: ACTUALIZAR TRIGGER DE AUDITORÍA
-- =============================================
SELECT 'PASO 14: Actualizando triggers de auditoría...' AS paso;

-- Agregar auditoría para cambios de maestro en alumnos
CREATE OR REPLACE FUNCTION auditar_cambio_maestro()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.maestro_id IS DISTINCT FROM NEW.maestro_id) THEN
        INSERT INTO auditoria (
            usuario_id,
            accion,
            tabla,
            registro_id,
            datos_anteriores,
            datos_nuevos
        ) VALUES (
            NULL,
            'CAMBIO_MAESTRO',
            'alumnos',
            NEW.id,
            jsonb_build_object('maestro_id', OLD.maestro_id),
            jsonb_build_object('maestro_id', NEW.maestro_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auditar_cambio_maestro
AFTER UPDATE ON alumnos
FOR EACH ROW EXECUTE FUNCTION auditar_cambio_maestro();

SELECT 'Triggers de auditoría actualizados' AS resultado;

-- =============================================
-- PASO 15: LIMPIAR DATOS OBSOLETOS
-- =============================================
SELECT 'PASO 15: Limpiando datos obsoletos...' AS paso;

-- Limpiar registros de auditoría relacionados con salones
DELETE FROM auditoria WHERE tabla IN ('salones', 'historial_salones', 'mantenimientos_salones');

SELECT 'Datos obsoletos limpiados' AS resultado;

-- =============================================
-- PASO 16: VERIFICACIÓN FINAL
-- =============================================
SELECT 'PASO 16: Verificación final...' AS paso;

-- Verificar que no existen referencias a salones
SELECT 
    'Tablas restantes:' as verificacion,
    COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%salon%';

-- Verificar que no existen referencias a libros
SELECT 
    'Tablas de libros restantes:' as verificacion,
    COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%libro%';

-- Estadísticas de asignación maestro-alumno
SELECT 
    'Alumnos con maestro asignado:' as estadistica,
    COUNT(*) as total
FROM alumnos 
WHERE maestro_id IS NOT NULL AND estatus = 'activo';

SELECT 
    'Alumnos sin maestro asignado:' as estadistica,
    COUNT(*) as total
FROM alumnos 
WHERE maestro_id IS NULL AND estatus = 'activo';

-- Verificar vistas creadas
SELECT 
    'Vistas nuevas creadas:' as verificacion,
    COUNT(*) as total
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('grupos_detalle', 'maestros_alumnos', 'alumnos_completo');

SELECT 'MIGRACIÓN COMPLETADA EXITOSAMENTE' AS resultado;

COMMIT;

-- =============================================
-- NOTAS IMPORTANTES
-- =============================================
-- 1. Se crearon tablas de backup con prefijo _backup_
-- 2. Para eliminar los backups después de verificar:
--    DROP TABLE _backup_salones, _backup_historial_salones, 
--               _backup_mantenimientos_salones, _backup_grupos,
--               _backup_libros, _backup_ventas_libros;
--
-- 3. Los grupos siguen existiendo pero sin salones asignados
-- 4. Los alumnos ahora tienen asignación directa a maestros
-- 5. Las vistas fueron recreadas sin referencias a salones
-- =============================================
