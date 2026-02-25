# 🔍 ANÁLISIS DE RELACIONES DEL SISTEMA TESCHA

## 📊 FLUJO ACTUAL DE DATOS

Basándome en tu tabla que muestra:
```
TEACHER: MARIA GUADALUPE VELAZQUEZ GONZALEZ
INDUSTRIAL - LEVEL: AVANZADO
NOMBRE | COSTO | CARRERA | RECIBO | 1ER PARCIAL | 2DO PARCIAL | 3ER PARCIAL | 
PROMEDIO | PERIODO | GRUPO | TURNO | NIVEL | MODALIDAD | DOCENTE | CORREO | 
TELEFONO | MUNICIPIO | MATRICULA | EDAD
```

---

## ✅ LO QUE ESTÁ BIEN (Relaciones correctas)

### 1. **CALIFICACIONES → Perfectas** ✅
```sql
ALUMNOS → INSCRIPCIONES → CALIFICACIONES_PARCIALES
   ↓           ↓               ↓
   id      alumno_id       inscripcion_id
          grupo_id         parcial (1,2,3)
          periodo_id       calificacion
```

**Cómo funciona:**
- Alumno se inscribe a un grupo (crea INSCRIPCION)
- Las calificaciones se guardan en la INSCRIPCION (no en el alumno directo)
- Cada parcial (1er, 2do, 3er) está ligado a la inscripción
- ✅ **CORRECTO**: Si el alumno cambia de grupo, las calificaciones anteriores se mantienen

**Ejemplo real:**
```
Juan Pérez está inscrito en "Grupo A1-MAT" → inscripcion_id = 45
  → 1er Parcial: 85 (calificaciones_parciales: inscripcion_id=45, parcial=1, calificacion=85)
  → 2do Parcial: 90 (calificaciones_parciales: inscripcion_id=45, parcial=2, calificacion=90)
  → 3er Parcial: 88 (calificaciones_parciales: inscripcion_id=45, parcial=3, calificacion=88)
  → Promedio: 87.67 (se calcula automáticamente)
```

---

### 2. **PAGOS → Perfectas** ✅
```sql
ALUMNOS → INSCRIPCIONES → PAGOS
   ↓           ↓             ↓
   id      alumno_id     inscripcion_id
          grupo_id       numero_pago
          periodo_id     monto
                        recibo_numero
```

**Cómo funciona:**
- Los pagos están ligados a la INSCRIPCION (no al alumno directo)
- Cada pago tiene un número de pago (1, 2, 3, etc.)
- Tiene número de recibo único
- ✅ **CORRECTO**: Un alumno en 2 períodos diferentes tiene pagos separados

**Ejemplo real:**
```
Juan Pérez inscrito en "Grupo A1-MAT" (Período Ene-Abr 2025) → inscripcion_id = 45
  → Pago 1: $500 - Recibo #12345 - PAGADO
  → Pago 2: $500 - Recibo #12346 - PENDIENTE
  → Pago 3: $500 - Recibo #12347 - PRORROGA

Si Juan se inscribe en otro período:
  Nueva inscripción → inscripcion_id = 78
  → Pago 1: $500 - Recibo #12400 - PENDIENTE
  (Son pagos completamente separados)
```

---

### 3. **ASISTENCIAS → Perfectas** ✅
```sql
ALUMNOS → INSCRIPCIONES → ASISTENCIAS
   ↓           ↓              ↓
   id      alumno_id      inscripcion_id
          grupo_id        fecha
          periodo_id      presente (true/false)
```

---

## ❌ LO QUE ESTÁ MAL (Necesita corrección)

### **PROBLEMA CRÍTICO: TURNO**

Tu tabla muestra que necesitas el TURNO en los reportes, pero:

**❌ ACTUAL:**
```sql
alumnos (
    turno VARCHAR(20)  -- ¡INCORRECTO!
)
```

**✅ DEBERÍA SER:**
```sql
grupos (
    turno VARCHAR(20)  -- ✓ CORRECTO
)
```

**¿Por qué es un problema?**

**Caso real que falla:**
```
Alumno: Juan Pérez
- Período Ene-Abr: Toma "Básico" en turno MATUTINO
- Período May-Ago: Toma "Intermedio" en turno VESPERTINO

Si el turno está en ALUMNOS:
  → Solo puede tener UN turno
  → ¿Matutino o Vespertino? ❌ CONFLICTO

Si el turno está en GRUPOS:
  → Grupo "A1-MAT": turno MATUTINO
  → Grupo "B1-VESP": turno VESPERTINO
  → Juan se inscribe al grupo y hereda el turno ✓ CORRECTO
```

---

## 🎯 REPORTE QUE NECESITAS GENERAR

Según tu imagen, necesitas un reporte con:

```sql
SELECT 
    -- Datos del alumno
    a.nombre,
    a.matricula,
    a.correo,
    a.telefono,
    a.municipio,
    a.edad,
    a.carrera,
    
    -- Datos del grupo
    g.codigo as grupo,
    g.turno,           -- ❌ ESTE CAMPO NO EXISTE EN GRUPOS (necesita agregarse)
    g.modalidad,
    
    -- Datos del maestro
    CONCAT(m.nombre, ' ', m.apellido_paterno) as docente,
    
    -- Datos del nivel
    n.nombre as nivel,
    
    -- Datos del período
    p.nombre as periodo,
    
    -- Calificaciones
    (SELECT calificacion FROM calificaciones_parciales 
     WHERE inscripcion_id = i.id AND parcial = 1) as primer_parcial,
    (SELECT calificacion FROM calificaciones_parciales 
     WHERE inscripcion_id = i.id AND parcial = 2) as segundo_parcial,
    (SELECT calificacion FROM calificaciones_parciales 
     WHERE inscripcion_id = i.id AND parcial = 3) as tercer_parcial,
    (SELECT AVG(calificacion) FROM calificaciones_parciales 
     WHERE inscripcion_id = i.id) as promedio,
    
    -- Pagos
    (SELECT SUM(monto) FROM pagos WHERE inscripcion_id = i.id) as costo,
    (SELECT STRING_AGG(recibo_numero, ', ') FROM pagos 
     WHERE inscripcion_id = i.id AND estatus = 'pagado') as recibos

FROM inscripciones i
JOIN alumnos a ON i.alumno_id = a.id
JOIN grupos g ON i.grupo_id = g.id
JOIN maestros m ON g.maestro_id = m.id
JOIN niveles n ON g.nivel_id = n.id
JOIN periodos p ON g.periodo_id = p.id
WHERE g.maestro_id = <ID_MAESTRO>
  AND i.estatus = 'activo'
ORDER BY a.apellido_paterno, a.nombre;
```

---

## 🔧 CORRECCIONES NECESARIAS

### **Opción 1: SOLUCIÓN RÁPIDA (30 minutos)**

```sql
-- 1. Agregar turno a grupos
ALTER TABLE grupos 
ADD COLUMN turno VARCHAR(20) 
CHECK (turno IN ('matutino', 'vespertino', 'nocturno', 'mixto'))
DEFAULT 'matutino';

-- 2. Migrar datos existentes (si hay alumnos con turno)
UPDATE grupos g
SET turno = (
    SELECT DISTINCT a.turno 
    FROM inscripciones i
    JOIN alumnos a ON i.alumno_id = a.id
    WHERE i.grupo_id = g.id
    LIMIT 1
)
WHERE g.turno IS NULL;

-- 3. Eliminar turno de alumnos (DESPUÉS de verificar)
ALTER TABLE alumnos DROP COLUMN turno;
```

**Modificar el formulario de GRUPOS:**
```javascript
// frontend/src/pages/Grupos.jsx
const [formData, setFormData] = useState({
  codigo: '',
  periodo_id: '',
  nivel_id: '',
  maestro_id: '',
  turno: 'matutino',  // ← AGREGAR
  modalidad: 'escolarizado',
  cupo_maximo: 25,
  // ...
});
```

---

### **Opción 2: SOLUCIÓN COMPLETA (2 horas)**

Además de lo anterior, agregar campos opcionales:

```sql
-- Agregar carrera a grupos (opcional pero útil)
ALTER TABLE grupos 
ADD COLUMN carrera VARCHAR(100);  -- 'INDUSTRIAL', 'SISTEMAS', etc.

-- O crear tabla de programas
CREATE TABLE programas_academicos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(100),
    carrera VARCHAR(100),
    descripcion TEXT
);

ALTER TABLE grupos 
ADD COLUMN programa_id INT REFERENCES programas_academicos(id);
```

---

## 📋 VERIFICACIÓN DE RELACIONES

### ✅ Checklist de integridad:

- [x] **Calificaciones:** ¿Se guardan por inscripción? **SÍ** ✓
- [x] **Pagos:** ¿Se guardan por inscripción? **SÍ** ✓
- [x] **Asistencias:** ¿Se guardan por inscripción? **SÍ** ✓
- [x] **Promedio:** ¿Se calcula automáticamente? **SÍ** (con trigger) ✓
- [x] **Un alumno puede estar en solo 1 grupo:** **SÍ** (validación agregada) ✓
- [ ] **Turno está en grupos:** **NO** ❌ (está en alumnos)
- [x] **Recibo único por pago:** **SÍ** ✓
- [x] **Histórico de inscripciones:** **SÍ** (no se eliminan, cambian estatus) ✓

---

## 🚀 PLAN DE ACCIÓN RECOMENDADO

### **PRIORIDAD ALTA (Hacer YA):**
1. ✅ Mover campo `turno` de alumnos a grupos
2. ✅ Actualizar formulario de grupos para incluir turno
3. ✅ Actualizar vistas/reportes para leer turno desde grupos

### **PRIORIDAD MEDIA (Hacer después):**
4. ⚠️ Agregar campo `carrera` a grupos (opcional)
5. ⚠️ Crear vista materializada para reportes rápidos

### **PRIORIDAD BAJA (Nice to have):**
6. 💡 Crear tabla de programas académicos
7. 💡 Agregar más campos de auditoría

---

## 💬 RESPUESTA DIRECTA

### **¿Las relaciones están bien para calificaciones, pagos, asistencias?**
**SÍ** ✅ - Todo está perfecto porque usan `inscripciones` como tabla pivote.

### **¿Qué necesita corrección urgente?**
**Solo el campo TURNO** ❌ - Debe estar en `grupos`, no en `alumnos`.

### **¿Puedo generar el reporte que necesito?**
**SÍ**, solo necesitas agregar el campo `turno` a grupos y ya todo funciona.

---

## 🎓 DIAGRAMA DE RELACIONES FINAL

```
MAESTRO
   ↓
GRUPOS (tiene: turno, modalidad, carrera)
   ↓
INSCRIPCIONES (1 alumno = 1 grupo por período)
   ├→ CALIFICACIONES_PARCIALES (1er, 2do, 3er parcial)
   ├→ PAGOS (pago 1, 2, 3... con recibo)
   ├→ ASISTENCIAS (por fecha)
   └→ PRÓRROGAS (si hay pagos atrasados)
```

**TODO gira alrededor de INSCRIPCIONES** ✓

¿Quieres que implemente la corrección del turno ahora mismo? Te toma 15 minutos.
