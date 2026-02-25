# 🎓 TESCHA - Asistente IA con Contexto de Negocio

## 📚 ¿Qué entiende ahora la IA?

### 1. CONTEXTO DEL NEGOCIO

La IA ahora comprende completamente que TESCHA es un **Centro de Lenguas Extranjeras** del TecNM Chalco con:

**6 Niveles de Inglés:**
1. Básico (A1-A2)
2. Intermedio (B1)
3. Avanzado (B2)
4. Perfeccionamiento 1 (B2+)
5. Perfeccionamiento 2 (C1)
6. C1 (Avanzado certificable)

**Ciclo Operativo:**
- Periodos cuatrimestrales (Enero-Abril, Mayo-Agosto, etc.)
- Grupos por nivel (ej: A1-01, B2-03)
- Maestros especializados por niveles
- Alumnos con inscripciones y pagos en parcialidades
- Estatus de pagos: pendiente, pagado, vencido, prórroga

**Roles:**
- Coordinador (administra todo)
- Maestros (imparten clases, califican)
- Administrativos (gestionan pagos)

---

## 🎯 Mejoras Implementadas

### 1. Comprensión de Consultas Financieras

**ANTES:**
```
Usuario: "¿Quién debe?"
IA: "No tengo esa información"
```

**AHORA:**
```
Usuario: "¿Quién debe?"
IA: [Llama automáticamente a obtener_estudiantes_adeudos]
    [Muestra tabla con estudiantes que tienen pagos pendientes/vencidos/prórroga]
```

### 2. Interpretación Contextual

La IA ahora entiende que:
- "¿Quién debe?" = Pagos pendientes + vencidos + prórroga
- "Pagos atrasados" = Solo estatus vencido
- "¿Cuánto hemos recaudado?" = Suma de pagos completados
- "Proyección de ingresos" = Inscripciones × costo

### 3. Registro de Maestros Completo

**Plantilla actualizada incluye:**
- ✅ Nombres completos
- ✅ Apellidos (paterno y materno)
- ✅ Correo electrónico
- ✅ Teléfono
- ✅ **Niveles que puede impartir** (Básico, Intermedio, Avanzado, Perf. 1, Perf. 2, C1)

### 4. Flujo de Trabajo Claro

La IA puede guiar paso a paso:
1. Crear Periodo
2. Verificar Niveles
3. Registrar Personal
4. Crear Grupos
5. Inscribir Alumnos
6. Gestionar Pagos/Calificaciones

---

## 💡 Casos de Uso Reales

### Ejemplo 1: Consulta de Adeudos
```
👤 Usuario: "¿Quién tiene pagos vencidos?"

🤖 IA: 
Consultando estudiantes con pagos vencidos...

| Nombre | Matrícula | Estatus | Fecha Vencimiento | Monto |
|--------|-----------|---------|-------------------|-------|
| Eduardo | 201724408 | vencido | 13/01/2026 | $1,500 |

📊 Resumen: 1 estudiante con pago vencido por un total de $1,500 MXN

💡 Sugerencias:
- ¿Desea enviar recordatorio de pago a Eduardo?
- ¿Necesita ver el historial completo de pagos?
```

### Ejemplo 2: Información de Alumno
```
👤 Usuario: "Dame info de 201724408"

🤖 IA:
[Llama a obtener_detalles_alumno_por_matricula]

📋 Información del Estudiante

**Datos Personales:**
- Nombre: Eduardo
- Matrícula: 201724408
- Correo: eduardo@ejemplo.com

**Situación Académica:**
- Grupo: A1-01 (Básico)
- Periodo: Enero-Abril 2026
- Calificación: 85/100

**Situación Financiera:**
- Pagos completados: 2/4
- Pago vencido: $1,500 (13/01/2026)
```

### Ejemplo 3: Registro de Maestro
```
👤 Usuario: "Quiero registrar un maestro"

🤖 IA:
Entendido. Para registrar al nuevo maestro, necesito los siguientes datos:

📋 DATOS PERSONALES:
- Nombres (completos)
- Apellido Paterno
- Apellido Materno
- Correo electrónico
- Teléfono

📚 NIVELES QUE PUEDE IMPARTIR (uno o varios):
• Básico
• Intermedio
• Avanzado
• Perfeccionamiento 1
• Perfeccionamiento 2
• C1

Una vez que proporcione estos datos, procederé con el registro.
```

---

## 🔧 Configuración Técnica

### Proveedores de IA Activos:

1. **Groq** (Principal)
   - Modelo: Llama-3.3-70b-versatile
   - Estado: ⚠️ Límite alcanzado (resetea cada 24h)
   - Velocidad: ⚡⚡⚡⚡⚡

2. **Hugging Face** (Respaldo)
   - Modelo: Llama-3.2-3B-Instruct
   - Estado: ✅ ACTIVO
   - API Key: configurada via variable de entorno `HUGGINGFACE_API_KEY`
   - Límite: Ilimitado gratis

3. **TinyLlama** (Local - Sin Internet)
   - Modelo: tinyllama
   - Estado: ✅ INSTALADO
   - Uso: Modo offline

### Herramientas Disponibles:

- ✅ `obtener_estudiantes_adeudos` - Lista alumnos con pagos pendientes/vencidos
- ✅ `obtener_estadisticas_financieras` - Resumen financiero del periodo
- ✅ `obtener_detalles_alumno_por_matricula` - Info completa de un alumno
- ✅ `buscar_alumno` - Búsqueda por nombre/correo
- ✅ `crear_personal` - Registro de maestros/administrativos
- ✅ `asignar_niveles_maestro` - Asignar niveles a un docente
- ✅ `listar_personal` - Lista de maestros/administrativos
- ✅ `obtener_periodo_activo` - Obtiene el periodo actual
- ✅ `listar_niveles` - Lista de niveles de inglés

---

## 🚀 Próximos Pasos Recomendados

1. **Probar consultas financieras:**
   - "¿Quién debe?"
   - "¿Cómo van las finanzas del periodo?"
   - "Muéstrame los pagos vencidos"

2. **Probar registro de maestros:**
   - "Quiero registrar un maestro"
   - Proporcionar todos los datos incluyendo niveles

3. **Probar consultas de alumnos:**
   - "Dame info de [matrícula]"
   - "Busca al alumno [nombre]"

4. **Probar guía de flujo:**
   - "¿Cuál es el primer paso?"
   - "¿Cómo inicio un nuevo periodo?"

---

## 📊 Monitoreo

Para ver qué proveedor está respondiendo, revisa los logs:

```bash
pm2 logs tescha-ai-engine --lines 50
```

Verás:
- `✅ [GROQ] Respuesta exitosa` - Groq funcionando
- `⚠️ [GROQ] Límite de cuota alcanzado` - Groq agotado
- `✅ [HUGGINGFACE] Respuesta exitosa` - Hugging Face activo
- `✅ [OLLAMA] Respuesta local generada` - Modo offline

---

¡La IA ahora es un verdadero asistente que entiende el negocio de TESCHA! 🎓✨
