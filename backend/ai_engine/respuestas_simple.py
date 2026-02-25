# -*- coding: utf-8 -*-
"""
Respuestas rápidas sin emojis para evitar problemas de encoding
Estas respuestas se devuelven SIN llamar a la IA
"""

RESPUESTAS_SIMPLE = {
    "registrar maestro": {
        "respuesta": """**Cómo Agregar un Nuevo Maestro**

**Paso a Paso:**

1. Ve a Menú -> "Maestros" (Personal)
2. Haz clic en botón "+ Nuevo Maestro"
3. Completa el formulario:

**Información Personal:**
   - Nombre(s)
   - Apellido Paterno
   - Apellido Materno

**Información de Contacto:**
   - Correo electrónico
   - Teléfono

**Información Académica:**
   - Niveles que imparte (Básico, Intermedio, Avanzado, etc.)
   - Marca todos los niveles que puede enseñar

4. Haz clic en "Guardar"

**Después de crear el maestro:**
- Podrás asignarle grupos desde "Grupos" o "Asignaciones"
- Su perfil estará disponible para consultar horarios y carga de trabajo
- El sistema lo considerará en sugerencias automáticas de asignación

**Nota:** Si necesitas darle acceso al sistema, después debes crear su usuario en Menú -> "Usuarios".""",
        "acciones": [
            {"texto": "Ir a Maestros", "ruta": "/maestros"}
        ]
    },
    
    "registrar alumno": {
        "respuesta": """Para registrar un nuevo alumno:

**Proceso correcto:**
1. Menú -> "Alumnos"
2. Botón "+ Nuevo Alumno"
3. Completa el formulario:
   - Nombre, Apellidos
   - Matrícula (DEBES ingresarla manualmente - 9 o 10 dígitos)
   - Correo, Teléfono
   - Tipo: Interno o Externo
   - Si es interno: Carrera y Semestre
   - Nivel actual (Básico, Intermedio, etc.)
4. Guardar
5. Después inscríbelo en un grupo desde "Inscripciones Rápidas"

**Nota:** "Inscripciones Rápidas" sirve para inscribir alumnos YA REGISTRADOS a grupos, NO para crear nuevos alumnos.""",
        "acciones": [
            {"texto": "Ir a Alumnos", "ruta": "/alumnos"},
            {"texto": "Ir a Inscripciones", "ruta": "/inscripciones"}
        ]
    },
    
    "crear grupo": {
        "respuesta": """Para crear un nuevo grupo:

1. Menú -> "Grupos"
2. Botón "+ Nuevo Grupo"
3. Datos obligatorios:
   - Código del grupo (ej: B1-01, I2-03)
   - Nivel (Básico, Intermedio, etc.)
   - Periodo académico
   - Días de clase (selecciona los días)
   - Horario (se ajusta automáticamente)

**IMPORTANTE - Turnos Automáticos:**
- Si seleccionas Sábado = Turno SABATINO (8am-4pm)
- Si seleccionas días entre semana = Turno MATUTINO (7am-1pm)
- El turno se determina automáticamente según los días

4. Maestro: Puedes asignarlo ahora o después

**Para asignar maestro:**
- Opción A: Durante la creación del grupo
- Opción B: Desde lista de grupos -> Botón "Asignar Maestro"
- Opción C: Asignación masiva (varios grupos a la vez)""",
        "acciones": [
            {"texto": "Ir a Grupos", "ruta": "/grupos"}
        ]
    },
    
    "registrar pago": {
        "respuesta": """Para registrar un pago:

1. Menú -> "Pagos"
2. Botón "+ Nuevo Pago"
3. Busca al alumno por nombre o matrícula
4. Selecciona:
   - Periodo
   - Concepto (Inscripción, Mensualidad, Extraordinario)
   - Método de pago: Formato Universal (ventanilla de gobierno)
5. Ingresa el monto
6. Opcional: Adjunta comprobante
7. Guardar -> Se genera recibo automático

El sistema envía notificaciones automáticas 3 días antes del vencimiento.

Para otorgar prórroga: Desde la lista de pagos, selecciona el pago y usa la opción "Extender Fecha".""",
        "acciones": [
            {"texto": "Ir a Pagos", "ruta": "/pagos"}
        ]
    },
    
    "enviar recordatorio": {
        "respuesta": """**Cómo Enviar Recordatorio de Pago**

El sistema tiene recordatorios automáticos, pero también puedes enviarlos manualmente.

**Recordatorios Automáticos:**
- El sistema envía automáticamente recordatorios:
  - 3 días antes del vencimiento
  - El día del vencimiento
  - 1 día después del vencimiento (si no ha pagado)
- Se envían por correo electrónico al alumno

**Enviar Recordatorio Manual:**

**Opción 1: Desde Lista de Pagos**
1. Ve a Menú -> "Pagos"
2. Filtra por "Pendientes" o "Vencidos"
3. Selecciona el pago (o varios pagos)
4. Botón "Enviar Recordatorio" o ícono de campana
5. Confirma el envío
6. Se envía email inmediato al alumno

**Opción 2: Desde Perfil del Alumno**
1. Ve a Menú -> "Alumnos"
2. Busca al alumno
3. Ve a sección "Pagos"
4. Haz clic en el pago pendiente
5. Botón "Enviar Recordatorio"

**Opción 3: Recordatorios Masivos**
1. Ve a Menú -> "Notificaciones" o "Mensajes Masivos"
2. Selecciona "Alumnos con Adeudos"
3. El sistema filtra automáticamente alumnos que deben
4. Personaliza el mensaje (opcional)
5. Enviar a todos

**¿Qué incluye el recordatorio?**
- Nombre del alumno
- Monto adeudado
- Fecha de vencimiento
- Concepto (Inscripción, Mensualidad, etc.)
- Enlace para ver su estado de cuenta (si aplica)
- Métodos de pago disponibles

**Configurar Recordatorios Automáticos:**
- Ve a Menú -> "Configuración" -> "Notificaciones"
- Puedes ajustar:
  - Días antes del vencimiento
  - Frecuencia de envío
  - Plantilla del mensaje
  - Activar/desactivar recordatorios

**Tip:** Pregunta al asistente "quien debe" para ver rápidamente todos los adeudos y enviar recordatorios masivos.""",
        "acciones": [
            {"texto": "Ir a Pagos", "ruta": "/pagos"},
            {"texto": "Ir a Notificaciones", "ruta": "/notificaciones"}
        ]
    },
    
    "otorgar prorroga": {
        "respuesta": """**Cómo Otorgar Prórroga de Pago**

Una prórroga extiende la fecha de vencimiento de un pago sin generar intereses o penalización.

**Paso a Paso:**

1. Ve a Menú -> "Pagos"
2. Busca el pago del alumno:
   - Por nombre del alumno
   - Por matrícula
   - O filtra por "Vencidos" o "Próximos a Vencer"

3. Haz clic en el pago que necesita prórroga

4. Botón "Extender Fecha" o "Otorgar Prórroga"

5. Completa el formulario:

**Nueva Fecha de Vencimiento:**
   - Selecciona la nueva fecha límite
   - Debe ser posterior a la fecha original

**Motivo de la Prórroga (opcional):**
   - Problema económico
   - Cambio de horario
   - Enfermedad
   - Otro (especifica)

**Notificar al Alumno:**
   - ✅ Enviar correo con nueva fecha
   - El alumno recibe notificación automática

6. Guardar

**¿Qué sucede después?**
- La fecha de vencimiento se actualiza
- El pago ya NO aparece como vencido
- Los recordatorios automáticos se ajustan a la nueva fecha
- Se registra en el historial del pago

**Prórroga Masiva (Varios Alumnos):**
1. Ve a Menú -> "Pagos"
2. Filtra los pagos que necesitan prórroga
3. Selecciona múltiples pagos (checkboxes)
4. Botón "Extender Fecha Masiva"
5. Define la nueva fecha para todos
6. Guardar

**Límites de Prórroga:**
- Puedes otorgar varias prórrogas al mismo pago
- El sistema registra cada extensión
- Solo coordinadores pueden otorgar prórrogas

**Ver Historial de Prórrogas:**
- En los detalles del pago
- Verás todas las extensiones otorgadas
- Con fechas y motivos

**IMPORTANTE:**
- La prórroga NO cambia el monto
- NO genera recargos ni intereses
- El pago sigue siendo el mismo, solo cambia la fecha

**Tip:** Si un alumno tiene problemas económicos recurrentes, considera ofrecerle un plan de pagos o beca parcial.""",
        "acciones": [
            {"texto": "Ir a Pagos", "ruta": "/pagos"}
        ]
    },
    
    "crear periodo": {
        "respuesta": """**Cómo Crear un Nuevo Periodo Académico**

Los periodos académicos organizan las inscripciones, grupos y pagos por cuatrimestre.

**Paso a Paso:**

1. Ve a Menú -> "Configuración" o "Periodos"
2. Haz clic en "+ Nuevo Periodo"
3. Completa el formulario:

**Información del Periodo:**
   - **Nombre**: Ej: "Enero-Abril 2026", "Cuatrimestre 1 2026"
   - **Clave**: Código corto (ej: "2026-1", "ENE-ABR-26")
   - **Fecha de Inicio**: Día que inician clases
   - **Fecha de Fin**: Día que terminan clases
   - **Tipo**: Cuatrimestre / Semestre

**Configuración de Pagos:**
   - Costo de inscripción
   - Costo de mensualidad
   - Número de parcialidades (generalmente 4)
   - Fechas de vencimiento de cada mensualidad

**Estado Inicial:**
   - Inactivo (para configurarlo antes de usarlo)
   - O Activo (si lo quieres usar de inmediato)

4. Guardar

**Después de crear el periodo:**
- Debes activarlo si lo creaste inactivo
- Puedes crear grupos para ese periodo
- Los alumnos podrán inscribirse
- Los pagos se calcularán automáticamente según la configuración

**IMPORTANTE:**
- Solo puede haber UN periodo activo a la vez
- Al activar un periodo nuevo, el anterior se marca como "Finalizado"
- Los datos históricos se conservan para reportes

**Tip:** Crea el periodo con anticipación (1-2 semanas antes) para tener tiempo de configurar grupos y horarios.""",
        "acciones": [
            {"texto": "Ir a Periodos", "ruta": "/periodos"},
            {"texto": "Ir a Configuración", "ruta": "/configuracion"}
        ]
    },
    
    "activar periodo": {
        "respuesta": """**Cómo Activar un Periodo Académico**

Activar un periodo lo marca como el periodo actual del sistema.

**Paso a Paso:**

1. Ve a Menú -> "Periodos" o "Configuración" -> "Periodos"
2. Verás la lista de periodos:
   - **Activo** (periodo actual - solo uno)
   - **Inactivos** (periodos futuros o en preparación)
   - **Finalizados** (periodos pasados)

3. Localiza el periodo que quieres activar
4. Haz clic en "Activar" o botón de acción
5. Confirma la acción

**¿Qué sucede al activar un periodo?**
- El periodo anterior se marca automáticamente como "Finalizado"
- Todos los nuevos registros usarán el nuevo periodo:
  - Inscripciones
  - Pagos
  - Calificaciones
  - Grupos
- El Dashboard mostrará estadísticas del nuevo periodo
- Los reportes por defecto usarán el periodo activo

**IMPORTANTE - Antes de Activar:**
✅ Verifica que el periodo tenga:
   - Fechas correctas configuradas
   - Costos de inscripción y mensualidades definidos
   - Grupos creados (al menos algunos)
   - Fechas de vencimiento de pagos

⚠️ **Precaución:**
- Al activar, el periodo anterior se cierra
- Los alumnos del periodo anterior NO se transfieren automáticamente
- Debes inscribir manualmente a los alumnos que continúan
- O usar inscripciones masivas

**Periodo de Transición:**
- Generalmente se activa el nuevo periodo 1-2 semanas antes del inicio de clases
- Esto permite hacer inscripciones anticipadas
- Y cobrar inscripciones antes del inicio

**Tip:** Puedes tener varios periodos creados (inactivos) para planificar con anticipación, pero solo uno puede estar activo.""",
        "acciones": [
            {"texto": "Ir a Periodos", "ruta": "/periodos"}
        ]
    },
    
    "registrar calificacion": {
        "respuesta": """**Cómo Registrar Calificaciones**

**Opción 1: Registro Individual (Por Alumno)**
1. Ve a Menú -> "Calificaciones" o "Grupos"
2. Selecciona el grupo
3. Haz clic en "Calificaciones" o "Capturar Calificaciones"
4. Verás lista de alumnos inscritos en el grupo
5. Para cada alumno, ingresa calificación en cada parcial:
   - Parcial 1 (0-100)
   - Parcial 2 (0-100)
   - Parcial 3 (0-100)
   - Parcial 4 (0-100)
6. El sistema calcula el promedio automáticamente
7. Guardar

**Opción 2: Registro por Parcial (Todos los Alumnos)**
1. Ve al grupo -> "Calificaciones"
2. Selecciona el parcial (1, 2, 3 o 4)
3. Captura todas las calificaciones de ese parcial
4. Guardar
5. Repite para cada parcial

**Opción 3: Desde Perfil del Alumno**
1. Ve a Menú -> "Alumnos"
2. Busca al alumno
3. Sección "Calificaciones"
4. Selecciona el grupo
5. Ingresa calificaciones por parcial
6. Guardar

**Validaciones del Sistema:**
- Calificaciones válidas: 0 a 100
- Promedio mínimo aprobatorio: 70 (generalmente)
- El promedio se calcula automáticamente: (P1 + P2 + P3 + P4) / 4
- Si el promedio < 70 = Reprobado
- Si el promedio >= 70 = Aprobado

**Calificaciones Especiales:**
- **NA** (No Asistió) - Alumno no presentó parcial
- **NP** (No Presentó) - Similar a NA
- **0** - Presentó pero obtuvo calificación mínima

**Para Editar Calificaciones:**
- Ve al grupo -> "Calificaciones"
- Haz clic en la calificación que quieres modificar
- Actualiza el valor
- Guardar (se registra la modificación en el historial)

**Tip:** Solo los maestros asignados al grupo y coordinadores pueden capturar calificaciones.""",
        "acciones": [
            {"texto": "Ir a Grupos", "ruta": "/grupos"},
            {"texto": "Ir a Calificaciones", "ruta": "/calificaciones"}
        ]
    },
    
    "cargar csv masivo": {
        "respuesta": """**Cómo Cargar Calificaciones Masivamente por CSV**

Para capturar calificaciones de muchos alumnos a la vez usando un archivo CSV/Excel.

**Paso 1: Descargar Plantilla**
1. Ve a Menú -> "Calificaciones" o "Grupos"
2. Selecciona el grupo
3. Busca "Importar Calificaciones" o "Carga Masiva"
4. Haz clic en "Descargar Plantilla CSV" o "Descargar Plantilla Excel"
5. Se descarga archivo con:
   - Columna: Matrícula del alumno
   - Columna: Nombre del alumno (solo referencia)
   - Columna: Parcial 1
   - Columna: Parcial 2
   - Columna: Parcial 3
   - Columna: Parcial 4

**Paso 2: Llenar el Archivo**
1. Abre el archivo descargado en Excel o programa similar
2. NO modifiques las columnas de Matrícula y Nombre
3. Llena las calificaciones en cada parcial (0-100)
4. Deja vacío si no tienes la calificación de ese parcial
5. Guarda el archivo como .CSV o .XLSX

**Paso 3: Subir el Archivo**
1. Regresa a Menú -> "Calificaciones" -> Grupo
2. Botón "Importar Calificaciones"
3. Haz clic en "Seleccionar Archivo" o arrastra el archivo
4. El sistema valida el archivo:
   - ✅ Verifica que las matrículas existan
   - ✅ Valida calificaciones (0-100)
   - ⚠️ Muestra errores si hay datos incorrectos
5. Vista previa de datos a importar
6. Confirmar importación
7. Las calificaciones se registran masivamente

**Formato del CSV:**
```
Matricula,Nombre,Parcial1,Parcial2,Parcial3,Parcial4
201724408,Juan Pérez,85,90,88,92
201724409,María López,78,82,80,85
201724410,Pedro García,90,95,93,91
```

**Validaciones Automáticas:**
- Solo se actualizan alumnos inscritos en el grupo
- Calificaciones fuera de rango (0-100) se rechazan
- El sistema calcula promedios automáticamente
- Se notifica al alumno si está configurado

**Errores Comunes:**
- ❌ Matrícula no existe en el grupo
- ❌ Formato de archivo incorrecto
- ❌ Calificaciones con letras o símbolos
- ❌ Columnas en orden diferente

**Tip:** Usa la plantilla descargada del sistema, no crees el archivo desde cero. Esto garantiza formato correcto.""",
        "acciones": [
            {"texto": "Ir a Grupos", "ruta": "/grupos"},
            {"texto": "Ir a Calificaciones", "ruta": "/calificaciones"}
        ]
    },
    
    "ver promedios grupo": {
        "respuesta": """**Cómo Ver Promedios del Grupo**

**Opción 1: Vista de Calificaciones del Grupo**
1. Ve a Menú -> "Grupos"
2. Selecciona el grupo
3. Haz clic en "Calificaciones" o "Ver Calificaciones"
4. Verás tabla con:
   - Nombre de cada alumno
   - Calificaciones por parcial (P1, P2, P3, P4)
   - **Promedio Final** (calculado automáticamente)
   - Estado: Aprobado / Reprobado
5. Al final de la tabla verás estadísticas del grupo:
   - Promedio general del grupo
   - Alumnos aprobados / reprobados
   - Porcentaje de aprobación

**Opción 2: Reporte de Calificaciones**
1. Ve a Menú -> "Reportes"
2. Selecciona "Reporte de Calificaciones"
3. Filtra por:
   - Grupo específico
   - Periodo académico
   - Nivel
4. Genera reporte (PDF/Excel)
5. Incluye:
   - Calificaciones individuales
   - Promedios por alumno
   - Promedio general del grupo
   - Gráficas de rendimiento

**Opción 3: Dashboard del Grupo**
1. Ve a Menú -> "Grupos"
2. Haz clic en el grupo
3. En el dashboard del grupo verás:
   - Gráfica de promedios
   - Mejor promedio del grupo
   - Promedio más bajo
   - Promedio general
   - Distribución de calificaciones

**Estadísticas Disponibles:**
- **Promedio General**: Suma de todos los promedios / número de alumnos
- **Índice de Aprobación**: % de alumnos aprobados
- **Calificación Más Alta**: Mejor promedio del grupo
- **Calificación Más Baja**: Promedio más bajo
- **Distribución**: Cuántos alumnos en cada rango (90-100, 80-89, 70-79, <70)

**Comparar Grupos:**
1. Ve a Menú -> "Reportes" -> "Comparativa de Grupos"
2. Selecciona múltiples grupos del mismo nivel
3. Verás promedios lado a lado
4. Identifica grupos con mejor/peor rendimiento

**Exportar Datos:**
- Desde la vista de calificaciones
- Botón "Exportar a Excel" o "Exportar a PDF"
- Incluye todos los promedios y estadísticas

**Tip:** El promedio del grupo se actualiza automáticamente cada vez que capturas o modificas una calificación.""",
        "acciones": [
            {"texto": "Ir a Grupos", "ruta": "/grupos"},
            {"texto": "Ir a Reportes", "ruta": "/reportes"}
        ]
    },
    
    "cerrar ciclo escolar": {
        "respuesta": """**Cómo Cerrar un Ciclo Escolar**

Cerrar el ciclo escolar marca el fin definitivo de un periodo académico y consolida los datos.

**Proceso Recomendado:**

**1. Antes de Cerrar - Verificaciones:**

   ✅ Todas las calificaciones capturadas
   ✅ Todos los pagos registrados o marcados como perdidos
   ✅ Asistencias completas
   ✅ Reportes finales generados
   ✅ Certificados o constancias impresos (si aplica)

**2. Generar Reportes Finales:**
   - Ve a Menú -> "Reportes"
   - Genera y descarga:
     - Reporte de calificaciones final
     - Estado financiero del periodo
     - Lista de alumnos aprobados/reprobados
     - Reporte de maestros y carga horaria
   - Guarda estos reportes como respaldo

**3. Activar el Siguiente Periodo:**
   - Ve a Menú -> "Periodos"
   - Activa el periodo siguiente
   - Esto cerrará automáticamente el periodo actual

**4. El Periodo Cerrado Queda como "Finalizado":**
   - Ya no se pueden hacer inscripciones
   - No se pueden agregar pagos nuevos
   - Las calificaciones quedan bloqueadas (solo lectura)
   - Los grupos se archivan

**5. Consultas Posteriores:**
   - Los datos se conservan PERMANENTEMENTE
   - Puedes consultar históricos en cualquier momento:
     - Historial de alumno
     - Reportes por periodo específico
     - Calificaciones pasadas

**Pasos Técnicos (si hay botón explícito de cerrar):**
1. Ve a Menú -> "Periodos"
2. Selecciona el periodo que terminó
3. Haz clic en "Cerrar Periodo" o "Marcar como Finalizado"
4. Confirma la acción
5. El sistema archiva el periodo

**¿Qué pasa con los alumnos?**
- Los alumnos NO se eliminan
- Sus historiales académicos se conservan
- Debes reinscribirlos en el nuevo periodo
- Puedes hacerlo masivamente desde "Inscripciones Rápidas"

**IMPORTANTE:**
- Haz backup de la base de datos ANTES de cerrar
- Genera todos los reportes finales
- El cierre es IRREVERSIBLE (no se puede reabrir un periodo cerrado)

**Tip:** El sistema mantiene el histórico completo, así que puedes generar reportes de periodos antiguos en cualquier momento.""",
        "acciones": [
            {"texto": "Ir a Periodos", "ruta": "/periodos"},
            {"texto": "Ir a Reportes", "ruta": "/reportes"}
        ]
    },
    
    "resumen ejecutivo": {
        "respuesta": """**Resumen Ejecutivo del Sistema TESCHA**

El Dashboard de IA proporciona un resumen ejecutivo basado en los datos actuales del sistema:

**Como generar el resumen:**
1. Ve al Dashboard principal
2. En la sección "Dashboard de IA"
3. El resumen se genera automáticamente con:
   - Total de alumnos activos
   - Ingresos del periodo
   - Pagos pendientes/vencidos
   - Estado de grupos y maestros
   - Alertas críticas

**Datos en tiempo real:**
- Puedes preguntar "quien debe" para ver adeudos
- Pregunta "cuanto hemos recaudado" para finanzas
- Usa "dame informacion del alumno [matricula]" para datos específicos

**Nota:** El sistema analiza toda la base de datos para generar insights inteligentes.""",
        "acciones": [
            {"texto": "Ir al Dashboard", "ruta": "/dashboard"}
        ]
    },
    
    "alertas ia": {
        "respuesta": """**Sistema de Alertas Inteligentes**

El asistente de IA monitorea constantemente el sistema y genera alertas sobre:

**Alertas Financieras:**
- Pagos próximos a vencer (3 días antes)
- Pagos vencidos sin gestionar
- Adeudos acumulados

**Alertas Académicas:**
- Grupos sin maestro asignado
- Alumnos sin calificaciones
- Periodos por cerrar

**Alertas Operativas:**
- Inscripciones pendientes de confirmar
- Documentos faltantes

**Como ver alertas:**
- Pregúntame "quien debe" para ver adeudos
- Pregunta "que grupos no tienen maestro"
- El sistema notifica automáticamente en el Dashboard

Las alertas se actualizan en tiempo real según los datos del sistema.""",
        "acciones": [
            {"texto": "Ver Dashboard", "ruta": "/dashboard"}
        ]
    },
    
    "personalizar ia": {
        "respuesta": """**Personalización del Asistente IA**

El sistema aprende del contexto de tu escuela de inglés TESCHA:

**Configuración actual:**
- 6 Niveles de inglés (Básico, Intermedio, Avanzado, Perf 1, Perf 2, C1)
- Periodos cuatrimestrales
- Sistema de pagos en parcialidades
- Notificaciones automáticas

**Como personalizar:**

1. **Respuestas Automáticas:**
   - El sistema reconoce automáticamente consultas sobre alumnos, maestros, pagos
   - Usa lenguaje natural como "dame info del alumno 201724408"

2. **Consultas Personalizadas:**
   - Pregunta por matrícula, nombre, grupo, nivel
   - Solicita reportes: "quien debe", "cuanto recaudado"
   - Pide tutoriales: "como registro un maestro"

3. **Datos del Negocio:**
   - El sistema conoce la estructura de niveles y periodos
   - Interpreta contexto educativo específico de TESCHA

**Nota:** Las sugerencias se adaptan según el rol (Coordinador, Maestro, Administrativo).""",
        "acciones": [
            {"texto": "Ver funciones de IA", "ruta": "/dashboard"}
        ]
    },
    
    "editar informacion": {
        "respuesta": """**Como Editar Información en el Sistema**

**Para editar ALUMNOS:**
1. Menú -> "Alumnos"
2. Busca al alumno (por nombre o matrícula)
3. Clic en el botón "Editar" (ícono de lápiz)
4. Modifica los campos necesarios
5. Guardar

**Para editar MAESTROS:**
1. Menú -> "Maestros" (Personal)
2. Localiza al maestro
3. Clic en "Editar"
4. Actualiza datos o niveles que imparte
5. Guardar

**Para editar GRUPOS:**
1. Menú -> "Grupos"
2. Selecciona el grupo
3. Clic en "Editar"
4. Modifica horario, maestro, cupo, etc.
5. Guardar

**Para editar PAGOS:**
- Los pagos NO se editan directamente
- Puedes extender fecha de vencimiento (prórroga)
- Contacta al coordinador para cambios mayores

**Nota:** Solo el coordinador puede editar toda la información. Los maestros solo pueden editar calificaciones y asistencias de sus grupos.""",
        "acciones": [
            {"texto": "Ir a Alumnos", "ruta": "/alumnos"},
            {"texto": "Ir a Maestros", "ruta": "/personal"}
        ]
    },
    
    "exportar boletas masivas": {
        "respuesta": """**Cómo Exportar Boletas de Calificaciones Masivamente**

Para generar boletas de calificaciones de múltiples alumnos a la vez.

**Opción 1: Boletas por Grupo**
1. Ve a Menú -> "Calificaciones" o "Grupos"
2. Selecciona el grupo
3. Haz clic en "Generar Boletas" o "Exportar Boletas"
4. Selecciona opciones:
   - Todos los alumnos del grupo
   - Solo alumnos aprobados
   - Solo alumnos reprobados
5. Formato: PDF (un archivo con todas las boletas)
6. Descargar

**Opción 2: Boletas Masivas (Todos los Grupos)**
1. Ve a Menú -> "Reportes"
2. Selecciona "Boletas de Calificaciones" o "Kardex"
3. Filtra por:
   - Periodo académico
   - Nivel (Básico, Intermedio, etc.)
   - Turno (Matutino, Vespertino, Sabatino)
4. Opción "Generar Todas"
5. El sistema genera:
   - Un PDF por alumno (archivo ZIP con todos)
   - O un PDF único con todas las boletas
6. Descargar

**Opción 3: Desde Perfil del Alumno**
Para boletas individuales:
1. Ve a "Alumnos"
2. Selecciona al alumno
3. Sección "Calificaciones" o "Historial"
4. Botón "Generar Boleta"
5. Descarga PDF individual

**¿Qué Incluye la Boleta?**
- Datos del alumno (nombre, matrícula)
- Grupo y nivel
- Calificaciones por parcial (P1, P2, P3, P4)
- Promedio final
- Estado: Aprobado / Reprobado
- Porcentaje de asistencia
- Observaciones del maestro (si aplica)
- Fecha de emisión
- Logo de la institución

**Formatos Disponibles:**
- **PDF Individual**: Una boleta por alumno (para entregar)
- **PDF Consolidado**: Todas las boletas en un archivo
- **Excel**: Tabla con todas las calificaciones

**Envío Automático:**
- Opción para enviar boletas por correo
- Se envía automáticamente a cada alumno
- PDF adjunto en el correo

**Imprimir Boletas:**
- El PDF está listo para imprimir
- Tamaño carta u oficio
- Orientación vertical

**Firmar Boletas Digitalmente:**
- Si está configurado
- Firma electrónica del maestro
- Firma electrónica del coordinador
- Sello de la institución

**Tip:** Genera las boletas al finalizar el periodo académico para entregar a todos los alumnos a la vez.""",
        "acciones": [
            {"texto": "Ir a Calificaciones", "ruta": "/calificaciones"},
            {"texto": "Ir a Reportes", "ruta": "/reportes"}
        ]
    },
    
    "descargar reporte ingresos": {
        "respuesta": """**Cómo Descargar Reporte de Ingresos**

Para generar reportes financieros detallados del sistema.

**Opción 1: Reporte de Ingresos General**
1. Ve a Menú -> "Reportes"
2. Selecciona "Reporte Financiero" o "Ingresos"
3. Filtra por:
   - Periodo académico específico
   - Rango de fechas personalizado
   - Todos los periodos
4. Tipo de ingreso (opcional):
   - Inscripciones
   - Mensualidades
   - Extraordinarios
   - Todos
5. Botón "Generar Reporte"
6. Selecciona formato:
   - PDF: Para imprimir o presentar
   - Excel: Para análisis o contabilidad
7. Descargar

**Opción 2: Desde Dashboard Financiero**
1. Ve a Dashboard principal
2. Sección "Finanzas" o "Estadísticas Financieras"
3. Verás resumen:
   - Total recaudado
   - Por cobrar (adeudos)
   - Ingresos por concepto
4. Botón "Exportar" o "Descargar Reporte"
5. Descarga automática en PDF/Excel

**Opción 3: Pregunta al Asistente IA**
- "Cuánto hemos recaudado"
- "Genera reporte de ingresos"
- El asistente genera reporte automático con:
  - Total recaudado en el periodo
  - Desglose por concepto
  - Comparativa con periodo anterior
  - Link de descarga

**¿Qué Incluye el Reporte?**
- **Resumen Ejecutivo:**
  - Total recaudado
  - Total por cobrar
  - Porcentaje de recuperación
  - Comparativa con periodo anterior

- **Desglose por Concepto:**
  - Inscripciones: monto y cantidad
  - Mensualidades: monto y cantidad
  - Extraordinarios: monto y cantidad
  - Otros ingresos

- **Desglose por Método de Pago:**
  - Formato Universal

- **Gráficas:**
  - Evolución de ingresos por mes
  - Distribución por concepto (pie chart)
  - Ingresos vs adeudos

- **Listado Detallado:**
  - Fecha de cada pago
  - Alumno
  - Concepto
  - Monto
  - Método de pago
  - Referencia

**Reportes Relacionados:**
- **Adeudos**: "Quién debe" - Ver pagos pendientes
- **Estado de Cuenta**: Por alumno específico
- **Flujo de Caja**: Entradas y salidas
- **Proyección**: Ingresos esperados vs reales

**Exportar Contabilidad:**
- Excel con formato contable
- Compatible con software de contabilidad
- Incluye polizas y referencias

**Filtros Avanzados:**
- Por alumno específico
- Por grupo
- Por nivel
- Por turno
- Por rango de fechas exacto

**Tip:** Genera el reporte mensualmente para llevar control financiero y al finalizar el periodo para cierres contables.""",
        "acciones": [
            {"texto": "Ir a Reportes", "ruta": "/reportes"},
            {"texto": "Ir al Dashboard", "ruta": "/dashboard"}
        ]
    },
    
    "ver prediccion desercion": {
        "respuesta": """**Cómo Ver Predicción de Deserción**

Para identificar alumnos en riesgo de abandonar sus estudios.

**Opción 1: Dashboard de Análisis de Riesgo**
1. Ve al Dashboard principal
2. Busca sección "Alertas" o "Análisis de Riesgo"
3. Verás tarjetas/cards con:
   - 🔴 Alumnos en riesgo ALTO
   - 🟡 Alumnos en riesgo MEDIO
   - 🟢 Alumnos estables
4. Haz clic en la tarjeta para ver detalles

**Opción 2: Reporte de Predicción**
1. Ve a Menú -> "Reportes" o "Análisis"
2. Selecciona "Predicción de Deserción" o "Análisis de Riesgo"
3. Genera el reporte
4. Verás tabla con:
   - Nombre del alumno
   - Nivel de riesgo (🔴 Alto, 🟡 Medio, 🟢 Bajo)
   - % de probabilidad de deserción
   - Factores de riesgo identificados
   - Acciones recomendadas

**Opción 3: Vista Individual de Alumno**
1. Ve a la ficha del alumno
2. Busca sección "Análisis de Riesgo"
3. Verás:
   - Indicador de riesgo con color
   - Factores específicos que afectan
   - Recomendaciones personalizadas

**Criterios de Predicción (lo que el sistema analiza):**

**🔴 Riesgo ALTO (>70% probabilidad):**
- **Asistencias**: <70% de asistencia
- **Pagos**: 2+ mensualidades vencidas
- **Calificaciones**: Promedio <60 o reprobando
- **Engagement**: No participa en clase, sin tareas
- **Histórico**: Ya repitió nivel anteriormente

**🟡 Riesgo MEDIO (40-70% probabilidad):**
- **Asistencias**: 70-85% de asistencia
- **Pagos**: 1 mensualidad vencida
- **Calificaciones**: Promedio 60-75, irregular
- **Engagement**: Participación baja
- **Avisos**: No lee mensajes/avisos

**🟢 Riesgo BAJO (<40% probabilidad):**
- **Asistencias**: >85%
- **Pagos**: Al corriente
- **Calificaciones**: Promedio >75
- **Engagement**: Activo, entrega tareas
- **Continuidad**: Renovación constante

**Factores de Riesgo Evaluados:**

1. **Asistencia**: Faltas acumuladas, tendencia decreciente
2. **Desempeño Académico**: Calificaciones bajas, tendencia negativa
3. **Situación Financiera**: Adeudos, retrasos frecuentes
4. **Participación**: Actividad en clase, tareas, exámenes
5. **Histórico**: Repeticiones, cambios de grupo/horario
6. **Compromiso**: Respuesta a mensajes, asistencia a eventos

**Algoritmo de Predicción:**
```
Riesgo = (
  (Factor_Asistencia × 30%) +
  (Factor_Calificaciones × 25%) +
  (Factor_Pagos × 25%) +
  (Factor_Engagement × 15%) +
  (Factor_Historico × 5%)
)
```

**Acciones Recomendadas por el Sistema:**

**Para Riesgo ALTO:**
- ⚠️ Contactar URGENTE al alumno
- 📞 Llamada telefónica (no solo mensaje)
- 👨‍🏫 Reunión con maestro del grupo
- 💰 Ofrecer plan de pagos/prórroga
- 📚 Asesoría académica extra
- 🎯 Seguimiento semanal personalizado

**Para Riesgo MEDIO:**
- 📧 Enviar mensaje motivacional
- 📊 Revisar progreso con maestro
- 💬 Pregunta si necesita apoyo
- 📅 Seguimiento quincenal

**Para Riesgo BAJO:**
- ✅ Mantener seguimiento normal
- 🌟 Reconocer su buen desempeño

**Vista de Predicción Típica:**
```
| Alumno              | Riesgo | % Prob | Factores Críticos           |
|---------------------|--------|--------|------------------------------|
| Juan Pérez          | 🔴 Alto| 85%    | 3 faltas seguidas, adeudo   |
| María García        | 🟡 Medio| 55%   | Calificaciones bajando      |
| Carlos López        | 🟢 Bajo| 20%    | Todo al corriente           |
```

**Reporte de Intervención:**
- Exporta lista de alumnos en riesgo
- Asigna responsable de seguimiento
- Registra acciones tomadas
- Monitorea efectividad de intervenciones

**Tendencias Históricas:**
- Compara predicción vs deserción real
- Identifica patrones comunes
- Mejora precisión del algoritmo
- % de alumnos recuperados tras intervención

**Alertas Automáticas:**
- 🚨 Notificación cuando alumno sube a riesgo alto
- 📩 Email/SMS automático al coordinador
- 📋 Genera tarea de seguimiento
- ⏰ Recordatorios de seguimiento pendiente

**Pregunta al Asistente:**
- "Quién está en riesgo de desertar"
- "Muéstrame alumnos en riesgo alto"
- "Análisis de riesgo del grupo Básico 1"
- "Qué factores ponen en riesgo a Juan Pérez"

**Beneficios:**
- Intervención proactiva (antes de que deserten)
- Retención de alumnos
- Mejor experiencia del estudiante
- Incremento en tasas de continuidad
- Reducción de deserción hasta 40%

**Tip:** Revisa el análisis de riesgo semanalmente para actuar a tiempo. El sistema actualiza las predicciones automáticamente cada día basado en nuevos datos de asistencia, calificaciones y pagos.""",
        "acciones": [
            {"texto": "Ir al Dashboard", "ruta": "/dashboard"},
            {"texto": "Ir a Reportes", "ruta": "/reportes"}
        ]
    },
    
    "proyectar ingresos": {
        "respuesta": """**Cómo Proyectar Ingresos Futuros**

Para estimar ingresos esperados en el periodo actual o próximos periodos.

**Opción 1: Proyección Automática del Sistema**
1. Ve a Menú -> "Reportes" o "Finanzas"
2. Selecciona "Proyección de Ingresos" o "Flujo de Caja Proyectado"
3. El sistema calcula automáticamente:
   - Inscripciones esperadas (basado en histórico)
   - Mensualidades pendientes por cobrar
   - Renovaciones estimadas
   - Total proyectado
4. Verás gráfica con:
   - Ingresos reales (lo que ya se cobró)
   - Ingresos proyectados (lo que falta por cobrar)
   - Comparativa mes a mes

**Opción 2: Desde Dashboard Financiero**
1. Ve al Dashboard principal
2. Sección "Finanzas" o "Proyecciones"
3. Verás automáticamente:
   - Total recaudado (real)
   - Por cobrar este periodo (proyectado)
   - Tasa de recuperación esperada
   - Proyección de cierre del periodo

**Cálculo de Proyección:**

**Ingresos Esperados = Inscripciones Pendientes + Mensualidades Pendientes**

**Fórmula del Sistema:**
```
Proyección Total = 
  (Alumnos Inscritos × Costo Mensualidad × Meses Restantes) +
  Pagos Vencidos Por Cobrar +
  Inscripciones Estimadas (basado en histórico)
```

**Factores que Considera:**
- Número de alumnos activos
- Mensualidades configuradas en el periodo
- Fechas de vencimiento próximas
- Histórico de cobranza (% de recuperación)
- Tasa de deserción promedio
- Nuevas inscripciones estimadas

**Escenarios de Proyección:**

**Escenario Optimista:**
- 100% de recuperación de adeudos
- Cero deserción
- Inscripciones nuevas altas

**Escenario Realista:**
- 85-90% de recuperación (histórico)
- 5-10% de deserción normal
- Inscripciones nuevas moderadas

**Escenario Pesimista:**
- 70% de recuperación
- 15-20% de deserción
- Pocas inscripciones nuevas

**Comparar con Periodo Anterior:**
1. El sistema muestra automáticamente:
   - Ingresos del periodo anterior (mismo mes)
   - Variación porcentual
   - Tendencia: 📈 Creciendo, 📉 Decreciendo, ➡️ Estable

**Alertas de Proyección:**
- ⚠️ Si proyección es menor que periodo anterior
- ⚠️ Si tasa de recuperación es baja (<80%)
- ⚠️ Si hay muchos adeudos acumulados

**Reporte de Proyección:**
- Genera PDF/Excel con:
  - Proyección mes a mes
  - Ingresos esperados por concepto
  - Alumnos que deben pagar
  - Fechas de vencimiento próximas
  - Recomendaciones de cobranza

**Acciones para Mejorar Proyección:**
- Enviar recordatorios de pago
- Ofrecer prórrogas/descuentos
- Incrementar inscripciones nuevas
- Reducir deserción (seguimiento)

**Tip:** Pregunta al asistente "Cuánto vamos a recaudar este mes" para ver proyección rápida basada en pagos pendientes.""",
        "acciones": [
            {"texto": "Ir a Reportes", "ruta": "/reportes"},
            {"texto": "Ir al Dashboard", "ruta": "/dashboard"}
        ]
    },
    
    "analizar demanda niveles": {
        "respuesta": """**Cómo Analizar Demanda de Niveles**

Para identificar qué niveles de inglés tienen mayor/menor demanda.

**Opción 1: Reporte de Demanda por Nivel**
1. Ve a Menú -> "Reportes"
2. Selecciona "Análisis de Niveles" o "Estadísticas por Nivel"
3. Genera reporte
4. Verás tabla con:
   - Nivel (Básico, Intermedio, Avanzado, etc.)
   - Alumnos inscritos
   - Grupos abiertos
   - Promedio de alumnos por grupo
   - % del total

**Opción 2: Desde Dashboard**
1. Ve al Dashboard principal
2. Busca sección "Distribución por Niveles"
3. Verás gráfica circular (pie chart) con:
   - Porcentaje de alumnos por nivel
   - Colores diferentes por nivel
   - Identificación visual de nivel más demandado

**Opción 3: Vista de Grupos**
1. Ve a Menú -> "Grupos"
2. Agrupa o filtra por nivel
3. Cuenta cuántos grupos hay por nivel
4. Identifica niveles con más grupos = mayor demanda

**Estadísticas de Demanda:**

**Tabla Típica:**
```
| Nivel           | Alumnos | Grupos | Promedio | % Total |
|-----------------|---------|--------|----------|---------|
| Básico          | 45      | 3      | 15       | 35%     |
| Intermedio      | 38      | 3      | 12.7     | 30%     |
| Avanzado        | 25      | 2      | 12.5     | 20%     |
| Perfeccion. 1   | 12      | 1      | 12       | 9%      |
| Perfeccion. 2   | 8       | 1      | 8        | 6%      |
| C1              | 0       | 0      | 0        | 0%      |
```

**Interpretación:**

**Alta Demanda:**
- Nivel con más alumnos inscritos
- Múltiples grupos abiertos
- Grupos cerca del cupo máximo (ej: 14/15)
- 🔴 Indicador: Puede necesitar más grupos

**Baja Demanda:**
- Pocos alumnos
- Un solo grupo o ninguno
- Grupos con bajo cupo (ej: 5/15)
- 🟡 Indicador: Considerar promoción o cerrar grupo

**Comparar con Periodo Anterior:**
1. Genera reporte por nivel
2. Selecciona periodo actual vs anterior
3. Identifica:
   - Niveles que crecieron (📈)
   - Niveles que disminuyeron (📉)
   - Niveles estables (➡️)

**Tendencias de Demanda:**
- **Embudo Natural**: Más demanda en Básico, menos en avanzados
- **Deserción por Nivel**: Qué niveles pierden más alumnos
- **Tasa de Avance**: % de alumnos que pasan al siguiente nivel

**Decisiones Basadas en Demanda:**

**Si nivel tiene ALTA demanda:**
- Abrir más grupos
- Contratar más maestros para ese nivel
- Considerar horarios adicionales
- Incrementar cupo de grupos

**Si nivel tiene BAJA demanda:**
- Fusionar grupos pequeños
- Reducir horarios
- Promoción/descuentos para ese nivel
- Evaluar si cerrar el nivel temporalmente

**Análisis de Rentabilidad:**
- Nivel más rentable = más alumnos + menor costo operativo
- Costos: maestro, aula, materiales
- Ingreso: inscripciones + mensualidades
- Margen por nivel

**Proyección de Demanda:**
- Basado en histórico de inscripciones
- Estimar cuántos alumnos en cada nivel el próximo periodo
- Planificar apertura de grupos con anticipación

**Pregunta al Asistente:**
- "Qué nivel tiene más alumnos"
- "Cuántos grupos hay de nivel Básico"
- "Genera análisis de niveles"

**Tip:** Analiza la demanda al planificar el siguiente periodo para abrir los grupos necesarios y asignar maestros adecuadamente.""",
        "acciones": [
            {"texto": "Ir a Reportes", "ruta": "/reportes"},
            {"texto": "Ir al Dashboard", "ruta": "/dashboard"}
        ]
    },
    
    "filtrar por usuario": {
        "respuesta": """**Cómo Filtrar por Usuario (Auditoría)**

Para ver acciones específicas de un usuario en el sistema.

**Opción 1: Desde Auditoría del Sistema**
1. Ve a Menú -> "Auditoría" (solo coordinadores)
2. En la parte superior verás filtros
3. Busca campo "Usuario" o "Filtrar por usuario"
4. Selecciona el usuario del dropdown
   - O escribe el nombre del usuario
5. Haz clic en "Aplicar Filtro" o "Buscar"
6. Verás SOLO las acciones de ese usuario

**Opción 2: Vista de Usuario Específico**
1. Ve a Menú -> "Usuarios" o "Maestros"
2. Selecciona el usuario
3. Busca pestaña "Actividad" o "Historial"
4. Verás automáticamente todas sus acciones

**Información que Muestra:**
```
| Fecha/Hora          | Usuario       | Acción             | Detalle                    |
|---------------------|---------------|--------------------|----------------------------|
| 21/01/2026 10:30 AM | Juan Pérez    | Registró Pago      | Alumno: María, $500       |
| 21/01/2026 10:15 AM | Juan Pérez    | Modificó Alumno    | Cambió teléfono           |
| 21/01/2026 09:45 AM | Juan Pérez    | Pasó Lista         | Grupo Básico 1            |
```

**Filtros Combinados:**
Puedes combinar múltiples filtros:
- **Usuario**: Quién realizó la acción
- **Fecha**: Rango específico (hoy, esta semana, mes, personalizado)
- **Tipo de Acción**: Pagos, calificaciones, modificaciones, etc.
- **Módulo**: Alumnos, Grupos, Reportes, etc.

**Ejemplo de Filtros Avanzados:**
```
Usuario: Ana García
Fecha: 15/01/2026 - 21/01/2026
Acción: Modificaciones
Módulo: Alumnos
```
Resultado: TODAS las modificaciones a alumnos que hizo Ana García en la última semana.

**Casos de Uso Comunes:**

**Supervisión de Maestro:**
- Filtrar por maestro específico
- Ver qué calificaciones ha capturado
- Verificar si pasó lista correctamente
- Revisar asistencias registradas

**Auditoría de Pagos:**
- Filtrar por recepcionista
- Ver todos los pagos que ha registrado
- Verificar métodos de pago usados
- Detectar inconsistencias

**Seguimiento de Cambios:**
- Filtrar por coordinador
- Ver modificaciones a grupos
- Revisar cambios de periodo
- Auditar configuraciones

**Investigación de Errores:**
- Filtrar por usuario que reportó problema
- Ver qué estaba haciendo cuando ocurrió
- Identificar acciones previas al error
- Reproducir secuencia de eventos

**Estadísticas por Usuario:**
- Cuántas acciones realizó en el día/semana/mes
- Tipo de acciones más frecuentes
- Horarios de mayor actividad
- Productividad y uso del sistema

**Tipos de Acciones Registradas:**
- ✏️ **Creación**: Nuevos alumnos, grupos, pagos
- 📝 **Modificación**: Ediciones a registros existentes
- 🗑️ **Eliminación**: Borrado de registros (con respaldo)
- 👁️ **Consulta**: Reportes generados, búsquedas
- 🔐 **Acceso**: Login, logout, cambios de sesión
- ⚙️ **Configuración**: Cambios a periodos, ajustes del sistema

**Exportar Actividad del Usuario:**
1. Aplica filtro de usuario
2. Haz clic en "Exportar" o "Descargar"
3. Selecciona formato (PDF/Excel)
4. Descarga reporte completo de su actividad

**Reporte Incluye:**
- Total de acciones realizadas
- Desglose por tipo de acción
- Timeline de actividad
- Acciones críticas resaltadas
- Errores o problemas detectados

**Limpiar Filtros:**
- Botón "Limpiar" o "Ver Todo"
- Vuelve a mostrar todas las acciones de todos los usuarios

**Permisos:**
- **Coordinadores**: Ven actividad de TODOS los usuarios
- **Maestros**: Solo ven su propia actividad
- **Recepcionistas**: Solo su actividad en pagos/alumnos

**Alertas Automáticas:**
- 🚨 Acciones sospechosas (múltiples eliminaciones)
- ⚠️ Accesos fuera de horario laboral
- 🔴 Modificaciones a registros críticos
- 📊 Cambios masivos (afectan muchos registros)

**Tip:** Usa el filtro por usuario para supervisar el trabajo del personal, auditar pagos, o investigar problemas reportados por usuarios específicos.""",
        "acciones": [
            {"texto": "Ir a Auditoría", "ruta": "/auditoria"},
            {"texto": "Ir a Usuarios", "ruta": "/usuarios"}
        ]
    },
    
    "ver cambios detallados": {
        "respuesta": """**Cómo Ver Cambios Detallados (Auditoría)**

Para ver exactamente QUÉ cambió en un registro específico.

**Opción 1: Desde Auditoría**
1. Ve a Menú -> "Auditoría"
2. Busca el cambio que te interesa
3. Haz clic en el registro o icono 👁️ "Ver Detalle"
4. Se abre modal/ventana con:
   - **Antes**: Valor anterior
   - **Después**: Valor nuevo
   - **Campo**: Qué se modificó
   - **Usuario**: Quién lo cambió
   - **Fecha/Hora**: Cuándo se cambió
   - **Razón**: Si se agregó justificación

**Opción 2: Historial del Registro**
1. Ve al registro específico (alumno, grupo, pago)
2. Busca botón "Historial" o "Ver Cambios"
3. Verás timeline completo de modificaciones
4. Haz clic en cada cambio para ver detalles

**Vista de Cambios Detallados:**

**Ejemplo - Modificación de Alumno:**
- Usuario: Ana García (Coordinadora)
- Fecha: 21/01/2026 10:30 AM
- Acción: Modificó Alumno
- Registro: María López (ID: 123)

**Campos Modificados:**
- Teléfono: 555-1234 → 555-5678
- Email: maria@old.com → maria@new.com
- Nivel: Básico 1 → Básico 2
- Razón: Alumno cambió de número y nivel

**Tipos de Cambios Rastreados:**

**1. Alumnos:**
- Datos personales (nombre, teléfono, email)
- Información académica (nivel, grupo, turno)
- Status (activo/inactivo)

**2. Pagos:**
- Monto, método de pago, fecha
- Status (pendiente/pagado/cancelado)

**3. Calificaciones:**
- Nota original vs corregida
- Parcial modificado, promedio recalculado

**4. Grupos:**
- Maestro asignado, horario, cupo
- Alumnos inscritos (altas/bajas)

**5. Configuraciones:**
- Periodos, permisos, precios

**Historial Completo (Timeline):**
- 21/01/2026 10:30 AM - Ana García modificó teléfono (555-1234 → 555-5678)
- 20/01/2026 03:15 PM - Juan Pérez cambió nivel (Básico 1 → Básico 2)
- 15/01/2026 09:00 AM - Ana García registró inscripción

**Cambios Críticos (Resaltados):**
- 🔴 Eliminación de registros
- ⚠️ Cambios a pagos (montos)
- 🟡 Modificaciones a calificaciones
- 🔵 Cambios administrativos

**Filtros Disponibles:**
- Por tipo de cambio (datos personales, académicos, pagos)
- Por campo específico (solo teléfonos, solo emails)
- Por usuario que hizo el cambio
- Por rango de fechas

**Opciones Adicionales:**
- **Revertir Cambios**: Algunos cambios se pueden deshacer
- **Exportar Historial**: Descarga PDF/Excel con todos los cambios
- **Justificaciones**: Ver razón del cambio si se agregó
- **Alertas**: Notificaciones automáticas de cambios sensibles

**Tip:** Usa "Ver Cambios Detallados" para auditorías internas, resolver disputas sobre quién cambió qué, o investigar errores en el sistema. Todo cambio queda registrado permanentemente.""",
        "acciones": [
            {"texto": "Ir a Auditoría", "ruta": "/auditoria"},
            {"texto": "Ir a Reportes", "ruta": "/reportes"}
        ]
    },
    
    "exportar logs": {
        "respuesta": """**Cómo Exportar Logs (Auditoría)**

Para descargar el historial completo de actividades del sistema.

**Opción 1: Desde Auditoría**
1. Ve a Menú -> "Auditoría"
2. Aplica los filtros que necesites:
   - Fecha (rango específico)
   - Usuario (todos o específico)
   - Tipo de acción
   - Módulo del sistema
3. Haz clic en botón "Exportar" o "Descargar"
4. Selecciona formato:
   - **PDF**: Para impresión y presentación
   - **Excel**: Para análisis y filtrado adicional
   - **CSV**: Para importar a otros sistemas
5. Descarga el archivo

**Opción 2: Exportar Todo**
1. Auditoría
2. No apliques filtros (o "Limpiar Filtros")
3. Exportar
4. Sistema genera archivo completo

⚠️ **Advertencia**: Si hay muchos registros, puede tardar unos segundos.

**Contenido del Reporte de Logs:**

**Formato PDF incluye:**
- Encabezado con periodo, fecha de generación, usuario
- Tabla con: Fecha/Hora, Usuario, Acción, Detalle
- Total de registros auditados
- Estadísticas de actividad

**Formato Excel incluye:**
- ID (único)
- Fecha y Hora
- Usuario y Rol
- IP Address
- Módulo, Acción
- Registro Afectado
- Valor Anterior/Nuevo
- Detalles y Justificación

**Estadísticas Incluidas:**
- Total de acciones registradas
- Desglose por tipo de acción
- Usuarios más activos
- Módulos más utilizados
- Horarios pico de actividad

**Filtros Recomendados para Exportar:**

**Auditoría Diaria:**
```
Fecha: Hoy
Usuario: Todos
Acción: Todas
```
→ Reporte de actividades del día

**Auditoría Mensual:**
```
Fecha: Este mes
Usuario: Todos
Acción: Todas
```
→ Reporte para cierre mensual

**Auditoría de Pagos:**
```
Fecha: Periodo específico
Acción: Pagos (crear, modificar)
Usuario: Todos
```
→ Para auditoría financiera

**Auditoría de Usuario Específico:**
```
Usuario: Juan Pérez
Fecha: Última semana
Acción: Todas
```
→ Supervisión de empleado

**Cambios Administrativos:**
```
Acción: Modificaciones, Eliminaciones
Módulo: Configuración, Periodos
Fecha: Todo
```
→ Cambios sensibles del sistema

**Formatos de Exportación:**

**PDF:**
- ✅ Fácil de compartir
- ✅ No editable (seguridad)
- ✅ Bueno para presentaciones
- ❌ No se puede filtrar/analizar

**Excel:**
- ✅ Análisis con filtros
- ✅ Tablas dinámicas
- ✅ Fórmulas y estadísticas
- ⚠️ Editable (cuidado)

**CSV:**
- ✅ Compatible con cualquier sistema
- ✅ Ligero (poco tamaño)
- ✅ Importar a bases de datos
- ❌ Sin formato

**Configuración de Exportación:**
Algunas opciones adicionales:
- **Incluir cambios detallados**: Valores antes/después
- **Solo cambios críticos**: Pagos, calificaciones, eliminaciones
- **Incluir capturas de pantalla**: Si el sistema las tiene
- **Firma digital**: Para validez legal

**Programar Exportaciones Automáticas:**
Algunos sistemas permiten:
1. Configurar exportación automática
2. Frecuencia (diaria, semanal, mensual)
3. Email automático con el archivo
4. Envío a coordinadores/administradores

**Usos Comunes de Logs Exportados:**

**Auditorías Internas:**
- Revisión trimestral de actividades
- Verificación de procedimientos
- Cumplimiento de políticas

**Auditorías Externas:**
- Contadores revisan pagos
- Autoridades educativas
- Certificaciones de calidad

**Investigaciones:**
- Resolver disputas
- Encontrar errores
- Identificar patrones sospechosos

**Respaldos Legales:**
- Evidencia de cambios realizados
- Quién hizo qué y cuándo
- Protección contra demandas

**Análisis de Uso:**
- Qué módulos se usan más
- Horarios de mayor actividad
- Usuarios más/menos activos
- Optimizar flujos de trabajo

**Retención de Logs:**
- Sistema guarda logs permanentemente
- No se borran automáticamente
- Exporta regularmente para respaldos externos
- Recomendado: Exportar mensualmente

**Seguridad de Logs:**
- ⚠️ Contienen información sensible
- 🔒 Solo coordinadores pueden exportar
- 🔐 Archivos se pueden cifrar
- 📧 Enviar por canales seguros

**Tamaño de Archivos:**
- Depende del rango de fechas
- 1 mes ≈ 1-5 MB
- 1 año ≈ 10-50 MB
- Compresión automática disponible

**Tip:** Exporta los logs mensualmente como respaldo externo. Es útil para auditorías, resolver disputas, y cumplir con regulaciones de privacidad de datos (como GDPR). Mantén los archivos en lugar seguro por al menos 2 años.""",
        "acciones": [
            {"texto": "Ir a Auditoría", "ruta": "/auditoria"},
            {"texto": "Ir a Reportes", "ruta": "/reportes"}
        ]
    },
    
    "cambiar contrasena": {
        "respuesta": """**Cómo Cambiar Contraseña**

Para actualizar tu contraseña de acceso al sistema.

**Opción 1: Cambiar Tu Propia Contraseña**
1. Ve a tu perfil (icono de usuario arriba a la derecha)
2. Haz clic en "Perfil" o "Mi Cuenta"
3. Busca sección "Seguridad" o "Contraseña"
4. Haz clic en "Cambiar Contraseña"
5. Ingresa:
   - **Contraseña Actual**: Tu contraseña actual (para verificar que eres tú)
   - **Nueva Contraseña**: La nueva contraseña que quieres usar
   - **Confirmar Contraseña**: Escribe la nueva contraseña otra vez
6. Haz clic en "Guardar" o "Actualizar"
7. ✅ Contraseña cambiada exitosamente

**Opción 2: Coordinador Restablece Contraseña de Cualquier Usuario**

**Para Maestros, Administrativos o Cualquier Usuario:**
1. Ve a Menú -> "Usuarios" o "Personal"
2. Busca y selecciona el usuario (maestro o administrativo)
3. Haz clic en "Editar" o icono ⚙️
4. Busca sección "Seguridad" o "Acceso"
5. Haz clic en "Restablecer Contraseña" o "Cambiar Contraseña"
6. Opciones:
   - **Generar Automática**: Sistema crea contraseña segura
   - **Ingresar Manual**: Tú eliges la contraseña
7. Guarda cambios
8. Comunica nueva contraseña al usuario por canal seguro (WhatsApp, email, en persona)

⚠️ **Importante:** Como coordinador, puedes restablecer la contraseña de CUALQUIER usuario (maestros, administrativos, otros coordinadores) si olvidan su contraseña o tienen problemas de acceso.

**Contaseña Temporal para Nuevos Usuarios:**
- Cuando creas un nuevo usuario, asígnale una contraseña temporal
- El usuario debe cambiarla en su primer inicio de sesión
- Esto garantiza que solo el usuario conoce su contraseña final

**Opción 3: Olvidé Mi Contraseña (Desde Login)**
1. En pantalla de login, haz clic en "¿Olvidaste tu contraseña?"
2. Ingresa tu email registrado
3. Haz clic en "Enviar"
4. Revisa tu correo electrónico
5. Haz clic en el enlace de restablecimiento (válido por 1 hora)
6. Ingresa nueva contraseña (dos veces)
7. Haz clic en "Restablecer"
8. ✅ Ahora puedes iniciar sesión con la nueva contraseña

**Requisitos de Contraseña Segura:**
- **Mínimo 8 caracteres** (recomendado 12+)
- Al menos **1 mayúscula** (A-Z)
- Al menos **1 minúscula** (a-z)
- Al menos **1 número** (0-9)
- Al menos **1 carácter especial** (!@#$%)

**Ejemplos de Contraseñas Fuertes:**
- `Tescha2026!`
- `MiClase#456`
- `English@2026`
- `Coordinador$23`

❌ **Evita:**
- Contraseñas obvias: `123456`, `password`, `admin`
- Tu nombre o fecha de nacimiento
- Palabras del diccionario
- Contraseñas cortas (<8 caracteres)

**Buenas Prácticas:**
- Cambia tu contraseña cada 3-6 meses
- No uses la misma contraseña en múltiples sistemas
- No compartas tu contraseña con nadie
- No la escribas en papel visible
- Si sospechas que está comprometida, cámbiala INMEDIATAMENTE

**Políticas del Sistema:**
- **Bloqueo temporal**: 5 intentos fallidos = cuenta bloqueada por 15 minutos
- **Historial**: No puedes reutilizar las últimas 3 contraseñas
- **Expiración**: Coordinadores pueden configurar expiración automática
- **Sesión única**: Al cambiar contraseña, se cierran todas las sesiones activas

**Recuperación Sin Email:**
Si no tienes acceso al email:
1. Contacta al coordinador
2. Verifica tu identidad (nombre completo, ID, etc.)
3. Coordinador restablece tu contraseña manualmente
4. Te proporciona contraseña temporal
5. Debes cambiarla en tu primer inicio de sesión

**Contraseña Temporal (Primer Acceso):**
Cuando te crean una cuenta nueva:
1. Recibes contraseña temporal
2. Al iniciar sesión por primera vez
3. Sistema te fuerza a cambiar contraseña
4. No puedes usar el sistema hasta cambiarla

**Problemas Comunes:**

**"Contraseña Actual Incorrecta":**
- Verifica que Caps Lock NO esté activado
- Revisa espacios al inicio/final
- Si olvidaste tu contraseña, usa opción "Olvidé mi contraseña"

**"Nueva Contraseña No Cumple Requisitos":**
- Verifica longitud mínima
- Agrega mayúsculas, números y símbolos
- Sistema muestra qué falta cumplir

**"Las Contraseñas No Coinciden":**
- Escribe exactamente la misma contraseña en ambos campos
- Revisa Caps Lock

**"Enlace Expirado" (recuperación por email):**
- Enlaces válidos solo 1 hora
- Solicita nuevo enlace de restablecimiento

**Seguridad Adicional:**
- Cierra sesión al terminar (no dejes sesión abierta)
- No guardes contraseña en navegadores públicos
- Usa navegador privado en computadoras compartidas
- Reporta actividad sospechosa al coordinador

**Auditoría de Cambios:**
- Todos los cambios de contraseña quedan registrados
- Auditoría muestra: fecha, hora, usuario, IP
- Coordinadores pueden ver historial de cambios

**Tip:** Si eres coordinador, recomienda a todos cambiar contraseña periódicamente para mayor seguridad. Puedes configurar recordatorios automáticos.""",
        "acciones": [
            {"texto": "Ir a Mi Perfil", "ruta": "/perfil"},
            {"texto": "Ir a Usuarios", "ruta": "/usuarios"}
        ]
    },
    
    "revisar permisos": {
        "respuesta": """**Cómo Revisar Permisos de Usuarios**

Para ver qué accesos y permisos tiene cada usuario en el sistema.

**Opción 1: Ver Permisos de Un Usuario**
1. Ve a Menú -> "Usuarios" o "Personal"
2. Busca y selecciona el usuario
3. Busca sección "Permisos" o "Accesos"
4. Verás lista de permisos activos/inactivos
5. Cada permiso muestra:
   - ✅ Activado (tiene acceso)
   - ❌ Desactivado (sin acceso)

**Opción 2: Ver Permisos por Rol**
1. Ve a Menú -> "Configuración" -> "Roles y Permisos"
2. Verás lista de roles del sistema
3. Haz clic en un rol para ver sus permisos

**Roles del Sistema:**

**👑 COORDINADOR (Acceso Total)**
- ✅ Administración completa
- ✅ Crear/editar/eliminar TODO
- ✅ Configuración del sistema
- ✅ Gestión de usuarios y permisos
- ✅ Auditoría completa
- ✅ Reportes financieros
- ✅ Gestión de periodos
- ✅ Acceso a todos los módulos

**👨‍🏫 MAESTRO (Acceso Limitado)**
- ✅ Ver sus grupos asignados
- ✅ Pasar lista a sus grupos
- ✅ Registrar calificaciones de sus alumnos
- ✅ Ver información de alumnos
- ✅ Enviar mensajes a alumnos
- ❌ No puede ver pagos
- ❌ No puede gestionar otros maestros
- ❌ No puede cambiar configuraciones
- ❌ No puede eliminar registros

**� ADMINISTRATIVO (Acceso a Pagos)**
- ✅ Gestión completa de pagos
- ✅ Registrar pagos
- ✅ Enviar recordatorios de pago
- ✅ Otorgar prórrogas
- ✅ Ver estadísticas financieras
- ✅ Ver reportes de ingresos/adeudos
- ❌ No puede ver calificaciones
- ❌ No puede gestionar grupos
- ❌ No puede gestionar maestros
- ❌ No puede cambiar configuraciones
- ❌ Acceso limitado a otros módulos

**Permisos Detallados por Módulo:**

**ALUMNOS:**
- Crear alumno
- Editar alumno
- Eliminar alumno
- Ver información completa
- Ver historial académico
- Ver historial de pagos

**GRUPOS:**
- Crear grupo
- Editar grupo
- Eliminar grupo
- Asignar maestros
- Gestionar inscripciones
- Ver estadísticas del grupo

**CALIFICACIONES:**
- Registrar calificaciones
- Editar calificaciones
- Ver promedios
- Exportar boletas
- Cargar calificaciones masivas (CSV)

**ASISTENCIAS:**
- Pasar lista
- Editar asistencias
- Justificar faltas
- Ver estadísticas de asistencia
- Generar reportes de asistencia

**PAGOS:**
- Registrar pagos
- Editar pagos
- Eliminar/cancelar pagos
- Ver estadísticas financieras
- Enviar recordatorios
- Otorgar prórrogas
- Aplicar descuentos

**REPORTES:**
- Generar reportes básicos
- Generar reportes financieros
- Exportar datos
- Ver análisis avanzados
- Acceso a dashboard completo

**CONFIGURACIÓN:**
- Gestionar periodos
- Configurar niveles
- Gestionar usuarios
- Configurar permisos
- Ajustes del sistema
- Backup y restauración

**AUDITORÍA:**
- Ver logs del sistema
- Filtrar por usuario
- Ver cambios detallados
- Exportar logs
- Auditoría completa

**Cómo Modificar Permisos (Solo Coordinadores):**

**Opción A: Cambiar Permisos Individuales**
1. Ve a "Usuarios" -> Selecciona usuario
2. Sección "Permisos"
3. Activa/desactiva permisos específicos
4. Guarda cambios

**Opción B: Cambiar Rol del Usuario**
1. Ve a "Usuarios" -> Selecciona usuario
2. Campo "Rol" o "Tipo de Usuario"
3. Selecciona nuevo rol del dropdown
4. Guarda cambios
5. El usuario hereda automáticamente los permisos del nuevo rol

**Permisos Especiales:**
Algunos permisos requieren autorización adicional:
- **Eliminar registros**: Requiere confirmación doble
- **Modificar calificaciones**: Queda registrado en auditoría
- **Gestionar pagos**: Solo usuarios de confianza
- **Acceso a auditoría**: Solo coordinadores y roles específicos

**Verificar Permisos en Acción:**
Cuando un usuario intenta algo sin permiso:
- ❌ Sistema muestra: "No tienes permiso para esta acción"
- El intento queda registrado en auditoría
- Usuario no puede ver módulos/opciones sin acceso
- Menú se adapta automáticamente según permisos

**Crear Rol Personalizado:**
1. Ve a "Configuración" -> "Roles y Permisos"
2. Haz clic en "Nuevo Rol"
3. Nombre del rol (ej: "Asistente", "Supervisor")
4. Selecciona permisos específicos
5. Guarda el rol
6. Asigna usuarios a este rol

**Permisos Temporales:**
Para dar acceso temporal:
1. Modifica permisos del usuario
2. Anota fecha límite
3. Revierte permisos después del periodo
4. (Algunos sistemas permiten expiración automática)

**Auditar Cambios de Permisos:**
Todos los cambios de permisos quedan registrados:
- Quién cambió los permisos
- Qué permisos se modificaron
- Fecha y hora
- Usuario afectado

**Mejores Prácticas:**
- **Principio de Menor Privilegio**: Da solo los permisos necesarios
- **Revisión Regular**: Audita permisos cada 3-6 meses
- **Revoca al Salir**: Desactiva usuarios que ya no trabajan
- **Documentar Cambios**: Justifica por qué se dieron permisos especiales
- **Monitorear Uso**: Revisa auditoría para detectar uso indebido

**Problemas Comunes:**

**"No veo el módulo X":**
- No tienes permiso para ese módulo
- Contacta al coordinador

**"No puedo hacer X acción":**
- Tu rol no incluye ese permiso
- Solicita permiso al coordinador

**"Antes podía y ahora no":**
- Coordinador pudo haber modificado tus permisos
- Verifica con coordinador
- Revisa auditoría de cambios

**Reporte de Permisos:**
Genera reporte con:
- Todos los usuarios y sus roles
- Permisos activos por usuario
- Últimos cambios de permisos
- Usuarios con accesos especiales

**Tip:** Como coordinador, revisa periódicamente los permisos de usuarios. Asegúrate de que solo personas autorizadas tengan acceso a módulos sensibles como pagos y auditoría. Revoca accesos de personal que ya no trabaja en la escuela.""",
        "acciones": [
            {"texto": "Ir a Usuarios", "ruta": "/usuarios"},
            {"texto": "Ir a Configuración", "ruta": "/configuracion"}
        ]
    },
    
    "enviar mensaje maestro": {
        "respuesta": """**Cómo Enviar Mensaje a un Maestro**

**Opción 1: Sistema de Mensajería Interna (si está disponible)**
1. Ve a Menú -> "Mensajes" o "Chat"
2. Botón "+ Nuevo Mensaje"
3. Selecciona el maestro destinatario
4. Escribe tu mensaje
5. Enviar
6. El maestro recibirá notificación en el sistema

**Opción 2: Desde Perfil del Maestro**
1. Ve a Menú -> "Maestros" (Personal)
2. Haz clic en el maestro
3. En su perfil verás:
   - Correo electrónico (puedes copiar)
   - Teléfono (puedes copiar)
4. Contáctalo directamente por correo o WhatsApp

**Opción 3: Envío Masivo (Varios Maestros)**
1. Ve a Menú -> "Notificaciones" o "Mensajes Masivos"
2. Selecciona "Maestros" como destinatarios
3. Puedes filtrar por:
   - Nivel que imparten
   - Turno
   - Todos los maestros
4. Escribe el mensaje
5. Enviar (se enviará por correo o notificación del sistema)

**Opción 4: Email Directo**
- Cada maestro tiene su correo registrado en el sistema
- Puedes verlo en su perfil
- O generar reporte con correos de todos los maestros

**Tip:** Si necesitas contactar urgentemente, usa el teléfono del perfil para WhatsApp o llamada.""",
        "acciones": [
            {"texto": "Ir a Maestros", "ruta": "/maestros"},
            {"texto": "Ir a Mensajes", "ruta": "/mensajes"}
        ]
    },
    
    "publicar aviso general": {
        "respuesta": """**Cómo Publicar un Aviso General**

Los avisos generales se publican en el Dashboard y todos los usuarios los ven al entrar.

**Paso a Paso:**

1. Ve a Menú -> "Avisos" o "Anuncios"
   - También puede estar en: Configuración -> Avisos Generales
   - O: Dashboard -> Botón "Publicar Aviso"

2. Haz clic en "+ Nuevo Aviso"

3. Completa el formulario:

**Título del Aviso:**
   - Texto corto y llamativo (ej: "Suspensión de clases 25 de enero")

**Contenido:**
   - Mensaje detallado del aviso
   - Puedes usar formato enriquecido (negritas, listas, etc.)

**Destinatarios:**
   - Todos los usuarios
   - Solo maestros
   - Solo alumnos
   - Solo administrativos
   - Grupo específico

**Prioridad:**
   - Urgente (aparece en rojo destacado)
   - Normal (aparece como información)
   - Baja (aparece minimizado)

**Vigencia:**
   - Fecha de inicio
   - Fecha de fin (opcional)
   - El aviso se oculta automáticamente después

4. Vista Previa (opcional)

5. Publicar

**Dónde se muestra el aviso:**
- Dashboard principal (primera tarjeta)
- Notificación push (si está configurada)
- Correo electrónico a destinatarios (opcional)

**Para editar o eliminar un aviso:**
- Ve a "Avisos Publicados"
- Busca el aviso
- Opciones: Editar, Eliminar, Pausar

**Tip:** Los avisos urgentes envían notificación automática por correo a todos los destinatarios.""",
        "acciones": [
            {"texto": "Ir a Avisos", "ruta": "/avisos"},
            {"texto": "Ir al Dashboard", "ruta": "/dashboard"}
        ]
    },
    
    "historial completo": {
        "respuesta": """**Como Ver Historial Completo**

**Historial de ALUMNO:**
1. Menú -> "Alumnos"
2. Busca al alumno
3. Clic en "Ver Detalles" (ícono de ojo)
4. Verás:
   - Datos personales
   - Historial de inscripciones (todos los periodos)
   - Calificaciones por periodo
   - Pagos realizados
   - Asistencias
   - Estatus actual

**Historial de PAGOS:**
1. Menú -> "Pagos"
2. Filtra por alumno o periodo
3. Verás todos los pagos: pendientes, pagados, vencidos
4. Puedes exportar a Excel

**Historial de CALIFICACIONES:**
1. Menú -> "Calificaciones"
2. Selecciona grupo y periodo
3. Ver todas las evaluaciones (Parcial 1, 2, 3)

**Historial de ASISTENCIAS:**
1. Menú -> "Asistencias"
2. Selecciona grupo
3. Ver registro diario completo

**Auditoría del Sistema:**
1. Menú -> "Auditoría" (solo coordinador)
2. Ver TODOS los cambios realizados en el sistema
3. Filtrar por fecha, usuario, acción

**Reportes Históricos:**
- Menú -> "Reportes"
- Selecciona tipo de reporte
- Elige periodo
- Exporta a PDF o Excel""",
        "acciones": [
            {"texto": "Ir a Alumnos", "ruta": "/alumnos"},
            {"texto": "Ir a Reportes", "ruta": "/reportes"}
        ]
    },
    
    "pasar lista": {
        "respuesta": """**Cómo Pasar Lista (Tomar Asistencia)**

**Paso a Paso:**

1. Ve a Menú -> "Asistencias" o "Grupos"
2. Selecciona el grupo al que vas a pasar lista
3. Haz clic en "Tomar Asistencia" o "Pasar Lista"
4. Selecciona la fecha de hoy (o la fecha de la clase)
5. Verás lista de todos los alumnos inscritos
6. Para cada alumno, marca:
   - ✅ **Asistió** (presente)
   - ❌ **Falta** (ausente)
   - ⚠️ **Retardo** (llegó tarde)
7. Guardar asistencia

**Atajos Rápidos:**
- Botón "Marcar Todos Presentes" - Todos asistieron
- Luego solo desmarcas a los que faltaron

**Opciones Adicionales:**
- **Justificar Falta**: Haz clic en la falta y agrega justificación
- **Registrar Retardo**: Especifica minutos de retraso (opcional)
- **Editar Asistencia**: Si te equivocaste, puedes modificar después

**Desde el Perfil del Alumno:**
1. Ve a "Alumnos"
2. Selecciona al alumno
3. Sección "Asistencias"
4. Agregar asistencia manual para fecha específica

**Para Maestros:**
- Solo puedes pasar lista en TUS grupos asignados
- Las asistencias se guardan automáticamente
- El sistema calcula porcentaje de asistencia por alumno

**Validaciones:**
- No puedes pasar lista dos veces en la misma fecha
- Si ya existe asistencia, puedes editarla
- El sistema alerta si un alumno tiene muchas faltas

**Tip:** Pasa lista al inicio de cada clase para tener registro completo del periodo.""",
        "acciones": [
            {"texto": "Ir a Asistencias", "ruta": "/asistencias"},
            {"texto": "Ir a Grupos", "ruta": "/grupos"}
        ]
    },
    
    "generar lista asistencia": {
        "respuesta": """**Cómo Generar Lista de Asistencia (Formato Imprimible)**

Para generar una lista de asistencia en blanco o con registros para imprimir.

**Opción 1: Lista en Blanco (Para Pasar Lista Manual)**
1. Ve a Menú -> "Grupos"
2. Selecciona el grupo
3. Haz clic en "Asistencias" o "Reportes"
4. Botón "Generar Lista de Asistencia" o "Formato de Lista"
5. Selecciona opciones:
   - Periodo de fechas (semana, mes, rango personalizado)
   - Incluir columnas para cada día
   - Formato: PDF o Excel
6. Descargar/Imprimir
7. Obtienes formato con:
   - Nombre del grupo y maestro
   - Lista de alumnos
   - Columnas vacías para marcar asistencia por fecha
   - Espacio para firmas

**Opción 2: Lista con Asistencias Registradas**
1. Ve a Menú -> "Asistencias"
2. Selecciona el grupo
3. Elige rango de fechas
4. Botón "Generar Reporte" o "Exportar"
5. Formato PDF/Excel
6. Incluye:
   - Todos los alumnos del grupo
   - Fechas con asistencias registradas
   - Marcas: ✓ (Asistió), X (Falta), R (Retardo)
   - Totales por alumno
   - Porcentajes de asistencia

**Opción 3: Desde Reportes**
1. Ve a Menú -> "Reportes"
2. Selecciona "Reporte de Asistencias"
3. Filtra por:
   - Grupo específico
   - Periodo académico
   - Rango de fechas
4. Genera reporte
5. Opciones de formato:
   - PDF: Para imprimir y archivar
   - Excel: Para editar o analizar

**Formatos Disponibles:**

**Lista Semanal:**
- Una columna por cada día de la semana
- Ideal para grupos que tienen clases diarias

**Lista Mensual:**
- Calendario completo del mes
- Útil para grupos con clases 2-3 veces por semana

**Lista por Rango:**
- Personaliza fechas inicio y fin
- Flexible para cualquier periodo

**Personalizar Lista:**
- Incluir/excluir: Matrícula, Foto, Firma del alumno
- Agregar observaciones o notas
- Logo de la institución (si está configurado)

**Uso Común:**
- Imprimir para pasar lista manual (sin sistema)
- Respaldo físico de asistencias
- Entregar a coordinación
- Archivo administrativo

**Tip:** Si pasas lista en el sistema, usa la opción con asistencias registradas. Si prefieres papel, genera lista en blanco al inicio del periodo.""",
        "acciones": [
            {"texto": "Ir a Asistencias", "ruta": "/asistencias"},
            {"texto": "Ir a Reportes", "ruta": "/reportes"}
        ]
    },
    
    "ver estadisticas asistencia": {
        "respuesta": """**Cómo Ver Estadísticas de Asistencia**

**Opción 1: Estadísticas por Alumno**
1. Ve a Menú -> "Alumnos"
2. Haz clic en el alumno
3. Sección "Asistencias" o "Estadísticas"
4. Verás:
   - Total de clases en el periodo
   - Asistencias (días presentes)
   - Faltas totales
   - Retardos
   - **Porcentaje de asistencia** (ej: 85%)
   - Gráfica de tendencia

**Opción 2: Estadísticas por Grupo**
1. Ve a Menú -> "Grupos"
2. Selecciona el grupo
3. Haz clic en "Asistencias" o "Estadísticas"
4. Verás:
   - Porcentaje de asistencia promedio del grupo
   - Alumnos con asistencia perfecta (100%)
   - Alumnos con baja asistencia (<80%)
   - Gráfica de asistencias por fecha
   - Comparativa por alumno

**Opción 3: Reporte de Asistencias**
1. Ve a Menú -> "Reportes"
2. Selecciona "Reporte de Asistencias"
3. Filtra por:
   - Grupo específico
   - Periodo
   - Rango de fechas
4. Genera reporte (PDF/Excel)
5. Incluye:
   - Lista de alumnos con % de asistencia
   - Total de faltas por alumno
   - Retardos acumulados
   - Identificación de alumnos en riesgo

**Opción 4: Dashboard de Asistencias**
1. Ve a Dashboard principal
2. Sección "Asistencias"
3. Verás estadísticas generales:
   - % promedio de asistencia de todos los grupos
   - Grupos con mejor/peor asistencia
   - Alertas de alumnos con muchas faltas

**Indicadores del Sistema:**
- 🟢 Verde: Asistencia > 90% (excelente)
- 🟡 Amarillo: Asistencia 80-89% (buena)
- 🟠 Naranja: Asistencia 70-79% (regular)
- 🔴 Rojo: Asistencia < 70% (riesgo de reprobar)

**Alertas Automáticas:**
- El sistema alerta cuando un alumno supera 3 faltas consecutivas
- Notifica cuando la asistencia cae por debajo del 80%
- Sugiere intervención para alumnos en riesgo

**Exportar Datos:**
- Desde cualquier vista de estadísticas
- Botón "Exportar a Excel" o "Exportar a PDF"
- Útil para reportes administrativos

**Tip:** Pregunta al asistente "dame info del alumno [matricula]" para ver su asistencia rápidamente.""",
        "acciones": [
            {"texto": "Ir a Asistencias", "ruta": "/asistencias"},
            {"texto": "Ir a Reportes", "ruta": "/reportes"}
        ]
    },
    
    "reportar ausencias criticas": {
        "respuesta": """**Cómo Reportar Ausencias Críticas**

Las ausencias críticas son cuando un alumno tiene muchas faltas y está en riesgo de reprobar.

**Identificar Ausencias Críticas:**

**Criterios Automáticos:**
- 3 o más faltas consecutivas
- Más de 5 faltas en el periodo
- Asistencia menor al 80%
- El sistema genera alertas automáticas

**Ver Alertas de Ausencias:**
1. Ve a Dashboard principal
2. Sección "Alertas" o "Avisos Críticos"
3. Verás lista de alumnos con ausencias críticas
4. Incluye:
   - Nombre del alumno
   - Grupo
   - Total de faltas
   - % de asistencia
   - Días consecutivos sin asistir

**Reportar Manualmente:**

**Opción 1: Desde Asistencias del Grupo**
1. Ve a Menú -> "Asistencias"
2. Selecciona el grupo
3. Identifica alumnos con muchas faltas (marcados en rojo)
4. Botón "Reportar Ausencia Crítica" o "Generar Alerta"
5. Agrega comentarios:
   - Observaciones del maestro
   - Intentos de contacto con el alumno
   - Motivo de las faltas (si se conoce)
6. Guardar
7. Se notifica automáticamente a:
   - Coordinación
   - Padres/tutor (si está configurado)
   - Administrativos

**Opción 2: Desde Perfil del Alumno**
1. Ve a "Alumnos"
2. Busca al alumno con ausencias
3. Sección "Asistencias"
4. Botón "Reportar Ausencia Crítica"
5. Completa formulario con detalles
6. Enviar reporte

**¿Qué Sucede al Reportar?**
- Se genera ticket o caso de seguimiento
- Coordinación recibe notificación
- Se envía mensaje a padres/tutor
- El alumno aparece en lista de intervención
- Se programa seguimiento

**Seguimiento de Casos:**
1. Ve a "Reportes" o "Casos Críticos"
2. Verás lista de ausencias reportadas
3. Estado de cada caso:
   - Pendiente de contacto
   - En seguimiento
   - Resuelto
   - Baja del curso
4. Puedes agregar notas de seguimiento

**Reporte Masivo:**
1. Ve a "Reportes" -> "Alumnos en Riesgo"
2. El sistema identifica automáticamente:
   - Alumnos con <80% asistencia
   - Faltas consecutivas
   - Sin justificación
3. Genera reporte Excel/PDF
4. Envía a coordinación para acción

**Acciones Recomendadas:**
- Contactar al alumno por WhatsApp/correo
- Llamada telefónica
- Reunión con padres/tutor
- Ofrecer apoyo académico
- Verificar situación personal

**Tip:** Pregunta al asistente "quien tiene muchas faltas" para identificar rápidamente alumnos en riesgo.""",
        "acciones": [
            {"texto": "Ir a Asistencias", "ruta": "/asistencias"},
            {"texto": "Ir a Dashboard", "ruta": "/dashboard"}
        ]
    },
    
    "asignar maestro": {
        "respuesta": """**Como Asignar Maestro a Grupo**

Tienes 3 formas de asignar maestros:

**Opción 1: Durante la Creación del Grupo**
1. Al crear el grupo nuevo
2. En el formulario verás campo "Maestro"
3. Selecciona al maestro de la lista
4. Guarda el grupo

**Opción 2: Desde la Lista de Grupos (Individual)**
1. Menú -> "Grupos"
2. Localiza el grupo sin maestro
3. Clic en "Asignar Maestro" o "Editar"
4. Selecciona al maestro
5. Guardar

**Opción 3: Asignación Masiva (Recomendado para varios grupos)**
1. Menú -> "Asignaciones"
2. Verás lista de grupos sin maestro
3. Para cada grupo, el sistema sugiere maestros compatibles según:
   - Niveles que puede impartir
   - Disponibilidad de horario
   - Carga actual
4. Selecciona maestro para cada grupo
5. Aplicar asignaciones

**Sugerencias Inteligentes de la IA:**
- El sistema detecta automáticamente grupos sin maestro (ALERTA)
- Sugiere maestros certificados en el nivel del grupo
- Evita conflictos de horario
- Balancea carga entre maestros

**Pregunta al asistente:**
- "Que grupos no tienen maestro?" - Ver alertas
- "Genera resumen ejecutivo" - Ver estado general
- "Dame info del grupo B1-01" - Detalles de un grupo específico""",
        "acciones": [
            {"texto": "Ir a Grupos", "ruta": "/grupos"},
            {"texto": "Ir a Asignaciones", "ruta": "/asignaciones"}
        ]
    },
    
    "comparar periodo anterior": {
        "respuesta": """**Cómo Comparar con Periodo Anterior**

Para ver cómo ha evolucionado el sistema entre periodos académicos.

**Opción 1: Reporte Comparativo Automático**
1. Ve a Menú -> "Reportes"
2. Selecciona "Comparativa de Periodos" o "Análisis Histórico"
3. Elige los periodos a comparar:
   - Periodo actual vs anterior
   - O selecciona 2 periodos específicos
4. Genera reporte (PDF/Excel)
5. Verás comparación de:
   - Número de alumnos inscritos
   - Ingresos totales
   - Promedio de calificaciones
   - Porcentaje de aprobación
   - Índice de asistencia
   - Grupos activos
   - Maestros activos

**Opción 2: Dashboard Comparativo**
1. Ve a Dashboard principal
2. Busca sección "Análisis Comparativo" o gráficas con tendencias
3. Verás visualizaciones con:
   - Gráficas de evolución periodo a periodo
   - Incremento/decremento porcentual
   - Indicadores: 📈 Mejoró, 📉 Disminuyó, ➡️ Se mantuvo

**Opción 3: Comparar Indicador Específico**

**Comparar Ingresos:**
- Pregunta al asistente: "Cuánto recaudamos este periodo vs el anterior"
- O ve a Menú -> "Reportes" -> "Comparativa Financiera"

**Comparar Calificaciones:**
1. Ve a "Reportes" -> "Estadísticas Académicas"
2. Filtra por 2 periodos
3. Compara promedios generales

**Comparar Inscripciones:**
1. Ve a "Reportes" -> "Inscripciones por Periodo"
2. Selecciona múltiples periodos
3. Verás tabla comparativa

**Comparar Asistencias:**
1. Ve a "Reportes" -> "Asistencias"
2. Genera reporte por periodo
3. Compara % de asistencia promedio

**Datos que Puedes Comparar:**
- Total de alumnos (activos, nuevos, bajas)
- Ingresos (inscripciones, mensualidades, total)
- Adeudos (monto pendiente, % de morosidad)
- Promedio general de calificaciones
- Índice de aprobación (% aprobados)
- Asistencia promedio
- Grupos abiertos por nivel
- Carga de maestros
- Tasa de deserción

**Interpretación de Resultados:**
- 📈 Crecimiento: Más alumnos, mejores calificaciones, más ingresos
- 📉 Decrecimiento: Menos inscritos, más adeudos, baja asistencia
- ➡️ Estable: Indicadores similares al periodo anterior

**Tip:** Pregunta al asistente "Genera resumen ejecutivo" para ver automáticamente comparaciones con el periodo anterior.""",
        "acciones": [
            {"texto": "Ir a Reportes", "ruta": "/reportes"},
            {"texto": "Ir al Dashboard", "ruta": "/dashboard"}
        ]
    },
    
    "identificar mejores alumnos": {
        "respuesta": """**Cómo Identificar Mejores Alumnos**

Para ver el ranking de alumnos destacados por calificaciones y asistencia.

**Opción 1: Desde Reportes**
1. Ve a Menú -> "Reportes"
2. Selecciona "Alumnos Destacados" o "Ranking de Alumnos"
3. Filtra por:
   - Periodo académico
   - Nivel específico o todos
   - Grupo
4. Genera reporte
5. Verás lista ordenada por:
   - Promedio general (mayor a menor)
   - % de asistencia
   - Estado: Excelente, Bueno, Regular

**Opción 2: Desde Dashboard**
1. Ve al Dashboard principal
2. Busca sección "Alumnos Destacados" o "Top 10"
3. Verás:
   - Los 10 mejores promedios
   - Nombre del alumno
   - Grupo
   - Promedio
   - % Asistencia

**Opción 3: Por Grupo**
1. Ve a Menú -> "Grupos"
2. Selecciona el grupo
3. Haz clic en "Calificaciones"
4. La lista se puede ordenar por:
   - Mayor promedio
   - Mejor asistencia
5. Identifica visualmente los primeros lugares

**Criterios de Excelencia:**

**Alumno Destacado:**
- Promedio >= 90
- Asistencia >= 95%
- Cero faltas injustificadas

**Alumno Bueno:**
- Promedio 80-89
- Asistencia 85-94%

**Reconocimientos Sugeridos:**
- Cuadro de honor (promedio >= 95)
- Mención honorífica (promedio 90-94)
- Constancia de asistencia perfecta (100%)

**Opción 4: Pregunta al Asistente IA**
- "¿Quiénes son los mejores alumnos?"
- "¿Qué alumno tiene el mejor promedio?"
- "¿Quién tiene asistencia perfecta?"
- El asistente analiza y responde con nombres específicos

**Generar Constancias:**
1. Identifica a los mejores alumnos
2. Ve a "Reportes" -> "Constancias"
3. Selecciona tipo:
   - Constancia de Calificaciones
   - Reconocimiento de Excelencia
   - Diploma de Honor
4. Selecciona alumnos
5. Genera PDF para imprimir

**Filtros Adicionales:**
- Por nivel (Básico, Intermedio, etc.)
- Por turno
- Por rango de promedios (90-100, 80-89)
- Top 5, Top 10, Top 20

**Estadísticas de los Mejores:**
- Promedio más alto del periodo
- Alumno con más días de asistencia
- Mejor evolución (comparado con periodo anterior)
- Más participativo (si se registra)

**Exportar Lista:**
- Desde cualquier vista de ranking
- Exporta a Excel/PDF
- Útil para:
  - Ceremonia de reconocimientos
  - Publicar cuadro de honor
  - Notificar a padres/tutores

**Tip:** El sistema puede generar automáticamente el listado de honor al finalizar el periodo académico.""",
        "acciones": [
            {"texto": "Ir a Reportes", "ruta": "/reportes"},
            {"texto": "Ir al Dashboard", "ruta": "/dashboard"}
        ]
    },
    
    "ver grupos asignados": {
        "respuesta": """**Cómo Ver Grupos Asignados a un Maestro**

**Opción 1: Desde Perfil del Maestro**
1. Ve a Menú -> "Maestros" (Personal)
2. Haz clic en el maestro que quieres consultar
3. En su perfil verás la sección "Grupos Asignados"
4. Se mostrará:
   - Lista de todos sus grupos
   - Código del grupo (ej: B1-01)
   - Nivel que imparte
   - Horario de cada grupo
   - Días de clase
   - Número de alumnos inscritos

**Opción 2: Desde Lista de Grupos**
1. Ve a Menú -> "Grupos"
2. Usa el filtro "Maestro" en la parte superior
3. Selecciona el maestro del dropdown
4. La lista mostrará SOLO los grupos de ese maestro
5. Verás su carga completa

**Opción 3: Desde Horarios**
1. Ve a Menú -> "Horarios"
2. Filtra por maestro específico
3. El calendario mostrará visualmente:
   - Todos sus grupos distribuidos por día/hora
   - Posibles conflictos de horario
   - Huecos disponibles

**Opción 4: Reporte Impreso**
1. Ve a Menú -> "Reportes"
2. Selecciona "Carga de Maestros" o "Horarios por Maestro"
3. Filtra el maestro específico
4. Genera PDF/Excel con todos sus grupos

**Tip:** Si preguntas "Dame info del maestro [nombre]" al asistente, también te mostrará sus grupos asignados.""",
        "acciones": [
            {"texto": "Ir a Maestros", "ruta": "/maestros"},
            {"texto": "Ir a Grupos", "ruta": "/grupos"}
        ]
    },
    
    "crear usuario acceso": {
        "respuesta": """**Cómo Crear Usuario de Acceso al Sistema**

Los usuarios de acceso permiten que maestros, administrativos o coordinadores ingresen al sistema.

**Paso a Paso:**

1. Ve a Menú -> "Usuarios" o "Configuración" -> "Usuarios"
2. Haz clic en "+ Nuevo Usuario"
3. Completa el formulario:

**Información del Usuario:**
   - Nombre completo
   - Correo electrónico (será su usuario de login)
   - Contraseña temporal
   - Confirmar contraseña

**Asignar Rol:**
   - **Coordinador**: Acceso total al sistema
   - **Administrativo**: Alumnos, pagos, inscripciones, reportes
   - **Maestro**: Solo grupos asignados, calificaciones, asistencias

4. **Vincular con Personal (si es maestro):**
   - Selecciona el maestro existente en la lista
   - Esto conecta el usuario con su perfil de maestro
   - Podrá ver sus grupos y calificaciones

5. Haz clic en "Guardar"
6. Se envía correo automático con credenciales

**IMPORTANTE:**
- El correo DEBE ser único (no puede repetirse)
- La contraseña debe tener mínimo 8 caracteres
- El usuario puede cambiar su contraseña al primer login
- Si es maestro, PRIMERO créalo en "Maestros", LUEGO crea su usuario

**Diferencia clave:**
- **Maestro en "Personal"** = Registro del docente (para asignar grupos)
- **Usuario en "Usuarios"** = Acceso al sistema (login)
- Un maestro puede existir SIN usuario (no puede entrar al sistema)
- Un usuario de tipo "Maestro" DEBE estar vinculado a un maestro registrado

**Para dar acceso a un maestro existente:**
1. El maestro ya debe estar en Menú -> "Maestros"
2. Creas su usuario en "Usuarios"
3. Seleccionas "Rol: Maestro"
4. Lo vinculas con su perfil de maestro
5. Guardar""",
        "acciones": [
            {"texto": "Ir a Usuarios", "ruta": "/usuarios"},
            {"texto": "Ir a Maestros", "ruta": "/maestros"}
        ]
    },
    
    "asignar maestro arrastrando": {
        "respuesta": """**Asignar Maestro Arrastrando (Drag & Drop)**

Si el sistema tiene interfaz de arrastre, puedes asignar maestros de forma visual:

**Método de Arrastre:**
1. Ve a Menú -> "Asignaciones" o "Horarios"
2. Busca la vista de "Asignación por Arrastre" o tablero visual
3. Verás dos paneles:
   - Panel izquierdo: Maestros disponibles
   - Panel derecho: Grupos sin maestro
4. Arrastra el maestro desde la lista
5. Suéltalo sobre el grupo destino
6. El sistema valida automáticamente:
   - Disponibilidad de horario
   - Nivel compatible
   - Carga de trabajo
7. Confirma la asignación

**Validaciones Automáticas:**
- ⚠️ Si el maestro ya tiene clase en ese horario → Error de conflicto
- ⚠️ Si el maestro no certifica ese nivel → Advertencia
- ✅ Si todo es compatible → Asignación exitosa

**Alternativa si no hay Drag & Drop:**
Si el sistema no tiene arrastre visual, usa:
- Menú -> "Asignaciones" -> Selecciona maestro de dropdown para cada grupo
- O desde "Grupos" -> Editar grupo -> Asignar maestro

**Tip:** El sistema puede sugerir automáticamente el mejor maestro para cada grupo según disponibilidad y carga.""",
        "acciones": [
            {"texto": "Ir a Asignaciones", "ruta": "/asignaciones"},
            {"texto": "Ir a Grupos", "ruta": "/grupos"}
        ]
    },
    
    "ver carga trabajo": {
        "respuesta": """**Cómo Ver Carga de Trabajo de Maestros**

**Opción 1: Desde Perfil del Maestro**
1. Menú -> "Maestros" (Personal)
2. Haz clic en el maestro
3. En su perfil verás:
   - **Grupos Asignados**: Lista completa
   - **Horas Semanales**: Total de horas que imparte
   - **Horario Visual**: Calendario con sus clases
   - **Carga Porcentual**: Ej: "75% de capacidad"

**Opción 2: Reporte de Carga de Trabajo**
1. Menú -> "Reportes"
2. Busca "Reporte de Carga de Maestros" o "Estadísticas de Personal"
3. Verás tabla comparativa:
   - Nombre del maestro
   - Grupos asignados (cantidad)
   - Horas totales/semana
   - Disponibilidad restante
4. Exporta a Excel/PDF si necesitas

**Opción 3: Vista de Horarios**
1. Menú -> "Horarios"
2. Filtra por maestro específico
3. Visualiza su calendario completo
4. Identifica horas ocupadas vs. libres

**Indicadores del Sistema:**
- 🟢 Verde: Carga normal (< 20 hrs/semana)
- 🟡 Amarillo: Carga alta (20-30 hrs/semana)
- 🔴 Rojo: Sobrecarga (> 30 hrs/semana)

**Pregunta al Asistente:**
- "Dame info del maestro [nombre]" - Ver detalles completos
- "Que maestros tienen más carga" - Comparativa rápida
- "Genera resumen ejecutivo" - Incluye estadísticas de maestros

**Tip:** Al asignar grupos, el sistema considera automáticamente la carga actual de cada maestro para sugerir distribución balanceada.""",
        "acciones": [
            {"texto": "Ir a Maestros", "ruta": "/maestros"},
            {"texto": "Ir a Reportes", "ruta": "/reportes"}
        ]
    },
    
    "sugerencias ia": {
        "respuesta": """**Que Puedo Hacer por Ti**

Soy el asistente inteligente de TESCHA. Puedo ayudarte con todo esto:

**CONSULTAS EN TIEMPO REAL (preguntame directamente):**
- "Quien debe" - Ver todos los adeudos del periodo
- "Cuanto hemos recaudado" - Estadisticas financieras
- "Dame info del alumno [matricula]" - Datos completos de un estudiante
- "Que grupos no tienen maestro" - Alertas de grupos sin docente
- "Genera resumen ejecutivo" - Panorama general del sistema
- "Quien esta en riesgo de desertar" - Alumnos con alertas

**TUTORIALES (dime como hacer algo):**
- "Como registro un maestro"
- "Como inscribo alumnos"
- "Como creo un grupo"
- "Como registro pagos"
- "Como paso lista"
- "Como inicio un periodo"
- "Como asigno maestros a grupos"

**VERIFICACIONES PREVIAS:**
Antes de pedir datos, verifico automaticamente que el sistema este listo (periodo activo, grupos creados, etc.) y te explico que hacer si falta algo.

**SOPORTE PARA TODOS LOS ROLES:**
- Coordinador: administracion completa + reportes + configuracion
- Maestro: mis grupos, calificaciones, asistencias
- Administrativo: pagos, adeudos, recordatorios

**Tip:** Pregunta en lenguaje natural. Entiendo frases como "quiero ver quien me debe" o "como hago para calificar a mis alumnos".""",
        "acciones": [
            {"texto": "Ir al Dashboard", "ruta": "/dashboard"}
        ]
    },

    "primeros_pasos": {
        "respuesta": """**Por Donde Empezar con TESCHA**

Si es la primera vez que usas el sistema, sigue este orden:

**PASO 1 - Crear un Periodo Academico**
Sin un periodo activo, nada mas funciona.
1. Menu -> "Periodos" -> "+ Nuevo Periodo"
2. Llena nombre (ej: Enero-Junio 2026), fechas inicio/fin
3. Activa el toggle "Periodo activo"
4. Guarda

**PASO 2 - Registrar Maestros (Personal)**
1. Menu -> "Personal" -> "+ Nuevo Personal"
2. Llena datos: nombre, correo, telefono
3. Asigna niveles que imparte (Basico, Intermedio, etc.)
4. Guarda -> el maestro puede recibir acceso al sistema

**PASO 3 - Crear Grupos**
1. Menu -> "Grupos" -> "+ Nuevo Grupo"
2. Datos: codigo (ej: B1-01), nivel, periodo, horario
3. Asigna maestro si ya est registrado
4. Guarda

**PASO 4 - Registrar e Inscribir Alumnos**
1. Menu -> "Alumnos" -> "+ Nuevo Alumno" (para alumnos nuevos)
2. Llena datos: nombre, matricula, correo, tipo
3. Menu -> "Inscripciones Rapidas" -> busca alumno -> selecciona grupo
4. Al confirmar se generan los 4 pagos del periodo automaticamente

**PASO 5 - Dar Acceso al Personal**
1. Menu -> "Usuarios" -> "+ Nuevo Usuario"
2. Vincula con el maestro/administrativo ya registrado
3. Asigna rol y contraseña temporal

**Una vez configurado:**
- Usa el Dashboard para ver alertas y resumen
- Preguntame "quien debe", "que grupos no tienen maestro", etc.
- El sistema monitorea todo en tiempo real

Si quieres que yo te guie paso a paso, dime en que paso estas y te ayudo.""",
        "acciones": [
            {"texto": "Ir a Periodos", "ruta": "/periodos"},
            {"texto": "Ir al Dashboard", "ruta": "/dashboard"}
        ]
    },

    
    "calendario horarios": {
        "respuesta": """**Como Ver Calendario de Horarios**

**Opción 1: Vista de Horarios General**
1. Menú -> "Horarios"
2. Verás calendario semanal con todos los grupos
3. Vista organizada por:
   - Días (Lun, Mar, Mie, Jue, Vie, Sab)
   - Horas (Bloques de tiempo)
   - Turnos (Matutino, Vespertino, Sabatino)
4. Cada grupo muestra:
   - Código del grupo
   - Nivel
   - Maestro asignado
   - Aula (si aplica)

**Opción 2: Horario por Maestro**
1. Menú -> "Maestros" (Personal)
2. Selecciona un maestro
3. Ver "Horario" o "Grupos asignados"
4. Verás su calendario personal con todos sus grupos

**Opción 3: Horario por Grupo**
1. Menú -> "Grupos"
2. Selecciona el grupo
3. Ver "Detalles" o "Horario"
4. Muestra días y horas específicas

**Detección de Conflictos:**
El sistema automáticamente detecta:
- Maestro con 2 grupos al mismo tiempo
- Traslapes de horario
- Aulas ocupadas simultáneamente

**Filtros Disponibles:**
- Por periodo académico
- Por turno (Matutino/Vespertino/Sabatino)
- Por nivel (Básico, Intermedio, etc.)
- Por maestro
- Por día de la semana

**Exportar:**
Puedes exportar el calendario a PDF o Excel desde "Reportes" -> "Reporte de Horarios""",
        "acciones": [
            {"texto": "Ir a Horarios", "ruta": "/horarios"},
            {"texto": "Ir a Grupos", "ruta": "/grupos"}
        ]
    },
    
    "filtrar maestro horarios": {
        "respuesta": """**Cómo Filtrar Horarios por Maestro**

**Opción 1: Desde Vista de Horarios**
1. Ve a Menú -> "Horarios"
2. Busca el filtro o selector de "Maestro" en la parte superior
3. Selecciona el maestro del dropdown
4. El calendario mostrará SOLO los grupos de ese maestro

**Opción 2: Desde Perfil del Maestro**
1. Ve a Menú -> "Maestros" (Personal)
2. Haz clic en el maestro que quieres ver
3. En su perfil verás "Grupos Asignados" o "Horario"
4. Visualiza su carga horaria completa

**Información que Verás:**
- Todos los grupos que imparte
- Horario semanal completo
- Carga horaria total (horas/semana)
- Posibles conflictos de horario

**Tip:** Si necesitas ver varios maestros a la vez, usa la vista general y marca/selecciona múltiples maestros si el sistema lo permite.""",
        "acciones": [
            {"texto": "Ir a Horarios", "ruta": "/horarios"},
            {"texto": "Ir a Personal", "ruta": "/maestros"}
        ]
    },
    
    "detectar huecos horarios": {
        "respuesta": """**Detectar Huecos Disponibles en Horarios**

**Método Manual:**
1. Ve a Menú -> "Horarios"
2. Observa el calendario semanal
3. Los espacios en blanco son huecos disponibles
4. Verifica por:
   - Día de la semana
   - Hora específica
   - Turno (Matutino/Vespertino/Sabatino)

**Detección Automática de Conflictos:**
El sistema detecta automáticamente:
- ✅ Horas libres (espacios disponibles)
- ⚠️ Traslapes de horario (mismo maestro, 2 grupos)
- ⚠️ Conflictos de aula (misma aula ocupada)

**Para Asignar en Hueco Disponible:**
1. Identifica el hueco (día + hora)
2. Ve a "Grupos" -> Selecciona el grupo
3. Haz clic en "Editar" o "Asignar Horario"
4. Selecciona el día y hora del hueco
5. Guarda

**Recomendación:** Al crear/editar un grupo, el sistema sugerirá automáticamente huecos disponibles basándose en:
- Disponibilidad del maestro
- Horas libres en el periodo
- Turnos con menos carga""",
        "acciones": [
            {"texto": "Ir a Horarios", "ruta": "/horarios"},
            {"texto": "Ir a Grupos", "ruta": "/grupos"}
        ]
    },
    
    "exportar calendario": {
        "respuesta": """**Cómo Exportar el Calendario de Horarios**

**Opción 1: Exportar desde Reportes**
1. Ve a Menú -> "Reportes"
2. Busca "Reporte de Horarios" o "Calendario"
3. Selecciona el formato:
   - 📄 **PDF** - Para imprimir o compartir
   - 📊 **Excel** - Para editar o analizar
4. Haz clic en "Generar" o "Descargar"

**Opción 2: Desde Vista de Horarios (si aplica)**
1. Ve a Menú -> "Horarios"
2. Busca botón "Exportar" o ícono de descarga
3. Selecciona formato (PDF/Excel)
4. Descarga el archivo

**Qué Incluye el Reporte:**
- Calendario semanal completo
- Todos los grupos con sus horarios
- Maestros asignados
- Turnos y niveles
- Periodo académico

**Filtros Disponibles antes de Exportar:**
- Por periodo específico
- Por turno (Matutino/Vespertino/Sabatino)
- Por nivel
- Por maestro específico

**Tip:** Si necesitas un horario específico de un maestro, ve a su perfil y busca la opción de "Imprimir Horario" o "Exportar Horario Personal".""",
        "acciones": [
            {"texto": "Ir a Reportes", "ruta": "/reportes"},
            {"texto": "Ir a Horarios", "ruta": "/horarios"}
        ]
    },
    
    "inscripciones masivas": {
        "respuesta": """**Cómo Inscribir Alumnos Masivamente**

La función "Inscripciones Rápidas" permite inscribir múltiples alumnos YA REGISTRADOS a grupos de forma masiva.

**Proceso paso a paso:**

1. **Ir a Inscripciones Rápidas:**
   - Menú -> "Inscripciones" -> Pestaña "Inscripciones Rápidas"

2. **Seleccionar Alumnos:**
   - Marca los checkboxes de los alumnos que quieres inscribir
   - Puedes seleccionar todos con el checkbox general
   - O buscar alumnos específicos por nombre/matrícula

3. **Seleccionar Grupo:**
   - En el selector, elige el grupo destino
   - Verás el nivel, horario y cupo disponible

4. **Confirmar Inscripción:**
   - Botón "Inscribir Seleccionados"
   - El sistema verifica cupo automáticamente
   - Muestra confirmación de inscripciones exitosas

**IMPORTANTE:**
- Los alumnos DEBEN estar previamente registrados
- Si un alumno no existe, primero regístralo en Menú -> "Alumnos"
- El sistema verifica que el grupo tenga cupo disponible
- Puedes inscribir el mismo conjunto de alumnos a múltiples grupos repitiendo el proceso

**Diferencia clave:**
- **"Inscripciones Rápidas"** = Inscribir alumnos YA REGISTRADOS a grupos
- **"Nuevo Alumno"** = Crear un alumno que NO existe en el sistema""",
        "acciones": [
            {"texto": "Ir a Inscripciones", "ruta": "/inscripciones"},
            {"texto": "Ir a Alumnos", "ruta": "/alumnos"}
        ]
    },
    
    "filtrar por nivel": {
        "respuesta": """**Cómo Filtrar por Nivel**

Puedes filtrar información por nivel de inglés en varias secciones del sistema:

**Filtrar Grupos por Nivel:**
1. Ve a Menú -> "Grupos"
2. Busca el filtro o selector de "Nivel" en la parte superior
3. Selecciona el nivel deseado:
   - Básico
   - Intermedio
   - Avanzado
   - Perfeccionamiento 1
   - Perfeccionamiento 2
   - C1
4. La lista se filtrará automáticamente

**Filtrar Alumnos por Nivel:**
1. Ve a Menú -> "Alumnos"
2. Usa el filtro "Nivel Actual"
3. Selecciona el nivel
4. Verás solo alumnos en ese nivel

**Filtrar Horarios por Nivel:**
1. Ve a Menú -> "Horarios"
2. Usa el filtro de "Nivel"
3. El calendario mostrará solo grupos de ese nivel

**Reportes por Nivel:**
- Ve a "Reportes"
- En cualquier reporte, puedes filtrar antes de generar
- Selecciona nivel específico o "Todos"

**Tip:** Los filtros se pueden combinar (Nivel + Periodo + Turno) para búsquedas más específicas.""",
        "acciones": [
            {"texto": "Ir a Grupos", "ruta": "/grupos"},
            {"texto": "Ir a Alumnos", "ruta": "/alumnos"}
        ]
    },
    
    "revisar cupo": {
        "respuesta": """**Cómo Revisar el Cupo de un Grupo**

**Método 1: Desde Lista de Grupos**
1. Ve a Menú -> "Grupos"
2. En la lista, cada grupo muestra:
   - **Inscritos/Cupo máximo** (ej: 8/15)
   - Barra de progreso visual
   - Colores:
     - Verde: Cupo disponible
     - Amarillo: Casi lleno (80%+)
     - Rojo: Lleno (100%)

**Método 2: Desde Detalle del Grupo**
1. Haz clic en cualquier grupo
2. En la vista de detalles verás:
   - Alumnos inscritos (lista completa)
   - Cupo máximo configurado
   - Espacios disponibles
   - Lista de alumnos con sus matrículas

**Método 3: Al Inscribir (Validación Automática)**
- Al intentar inscribir a un alumno
- El sistema valida el cupo automáticamente
- Si está lleno, mostrará error: "Grupo lleno"
- Si tiene espacio, permite la inscripción

**Configurar Cupo Máximo:**
1. Ve al grupo
2. Botón "Editar"
3. Campo "Cupo Máximo"
4. Guarda cambios

**Nota:** El cupo por defecto suele ser 15 alumnos por grupo, pero se puede ajustar según necesidades.""",
        "acciones": [
            {"texto": "Ir a Grupos", "ruta": "/grupos"}
        ]
    }
}

def buscar_respuesta_simple(pregunta):
    """
    Busca una respuesta simple basada en palabras clave
    Retorna (encontrado: bool, respuesta: dict)
    """
    pregunta_lower = pregunta.lower()
    
    # Normalizar - eliminar acentos, signos de puntuación y palabras comunes
    pregunta_norm = pregunta_lower.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('ñ', 'n')
    pregunta_norm = pregunta_norm.replace('¿', '').replace('?', '').replace('¡', '').replace('!', '').replace(',', '').replace('.', '')
    # Eliminar palabras comunes que no aportan
    for palabra in [' de ', ' del ', ' la ', ' el ', ' los ', ' las ', ' un ', ' una ']:
        pregunta_norm = pregunta_norm.replace(palabra, ' ')
    pregunta_norm = ' '.join(pregunta_norm.split())  # Normalizar espacios
    
    # Mapeo de palabras clave a respuestas
    mapeo = {
        "registrar maestro": ["registrar maestro", "nuevo maestro", "crear maestro", "agregar maestro", "alta maestro", "como registrar maestro", "como registro maestro", "como agregar maestro"],
        "registrar alumno": ["registrar alumno", "nuevo alumno", "crear alumno", "alta alumno", "como registrar alumno", "agregar nuevo alumno"],
        "inscripciones masivas": ["inscribir masivamente", "inscripciones masivas", "inscribir alumnos", "inscribir varios alumnos", "inscripciones rapidas", "como inscribir masivamente", "inscribir grupo alumnos"],
        "crear grupo": [
            "crear grupo", "nuevo grupo", "registrar grupo", "alta grupo", "como crear grupo",
            # formas conjugadas
            "creo grupo", "creo un grupo", "como creo grupo", "como creo un grupo",
            "crea un grupo", "creamos un grupo", "quiero crear grupo", "quiero un grupo nuevo"
        ],
        "registrar pago": ["registrar pago", "nuevo pago", "cobrar", "pago alumno", "como registrar pago"],
        "enviar recordatorio": ["enviar recordatorio", "recordatorio pago", "como enviar recordatorio", "notificar pago", "avisar pago", "recordar pago"],
        "otorgar prorroga": ["otorgar prorroga", "dar prorroga", "extender fecha", "como dar prorroga", "prorroga pago", "extender plazo", "ampliar plazo"],
        "crear periodo": ["crear periodo", "nuevo periodo", "crear periodo academico", "como crear periodo", "registrar periodo", "alta periodo", "nuevo cuatrimestre"],
        "activar periodo": ["activar periodo", "como activar periodo", "periodo activo", "cambiar periodo", "iniciar periodo", "habilitar periodo"],
        "cerrar ciclo escolar": ["cerrar ciclo", "cerrar periodo", "finalizar ciclo", "como cerrar ciclo", "terminar periodo", "cerrar cuatrimestre", "finalizar ciclo escolar"],
        "registrar calificacion": ["registrar calificacion", "capturar calificacion", "agregar calificacion", "como registrar calificacion", "poner calificacion", "ingresar calificacion", "calificar alumno"],
        "cargar csv masivo": ["cargar csv", "importar calificaciones", "carga masiva", "como cargar csv", "subir csv", "importar csv", "calificaciones masivas"],
        "ver promedios grupo": ["ver promedios", "promedios grupo", "como ver promedios", "promedio general", "rendimiento grupo"],
        "pasar lista": ["pasar lista", "tomar asistencia", "como pasar lista", "registrar asistencia", "marcar asistencia", "capturar asistencia"],
        "generar lista asistencia": ["generar lista asistencia", "formato lista", "imprimir lista", "como generar lista", "lista para imprimir", "formato asistencia", "descargar lista asistencia"],
        "ver estadisticas asistencia": ["estadisticas asistencia", "ver estadisticas asistencia", "como ver asistencias", "reporte asistencias", "porcentaje asistencia"],
        "reportar ausencias criticas": ["ausencias criticas", "reportar ausencias", "alumnos con faltas", "muchas faltas", "como reportar ausencias", "faltas consecutivas"],
        "comparar periodo anterior": ["comparar periodo", "periodo anterior", "como comparar periodos", "comparativa periodos", "vs periodo anterior", "evolucion periodos"],
        "identificar mejores alumnos": ["mejores alumnos", "alumnos destacados", "top alumnos", "ranking alumnos", "como identificar mejores", "cuadro honor", "mejores promedios"],
        "resumen ejecutivo": [
            "resumen ejecutivo", "generar resumen", "como generar resumen", "resumen del sistema", "dashboard ia", "resumen ia",
            "que problemas tiene", "problemas del sistema", "que falla", "que esta mal",
            "falla el sistema", "errores del sistema", "que esta fallando", "que no funciona",
        ],
        "primeros_pasos": [
            # onboarding / primeros pasos
            "por donde empiezo", "como empiezo", "que hago primero", "quiero empezar",
            "por donde comienzo", "como comienzo", "primeros pasos", "inicio rapido",
            "que debo hacer primero", "como iniciar el sistema", "setup inicial",
            "configurar sistema", "configurar tescha", "como configuro tescha",
            "como configuro el sistema", "no se por donde empezar"
        ],
        "alertas ia": ["alertas ia", "alertas de la ia", "ver alertas", "como ver alertas", "alertas del sistema", "notificaciones ia"],
        "personalizar ia": ["personalizar ia", "personalizar sugerencias", "como personalizar", "configurar ia", "ajustar ia"],
        "editar informacion": ["editar informacion", "como editar", "modificar datos", "cambiar informacion", "actualizar datos", "editar alumno", "editar maestro"],
        "exportar boletas masivas": ["exportar boletas", "boletas masivas", "generar boletas", "como exportar boletas", "descargar boletas", "boletas calificaciones", "kardex masivo"],
        "descargar reporte ingresos": ["reporte ingresos", "descargar reporte ingresos", "como descargar ingresos", "exportar ingresos", "reporte financiero", "estadisticas ingresos"],
        "ver prediccion desercion": ["prediccion desercion", "ver prediccion desercion", "riesgo desercion", "alumnos riesgo", "analisis desercion", "quien puede desertar", "riesgo alto", "analisis riesgo"],
        "proyectar ingresos": ["proyectar ingresos", "proyeccion ingresos", "ingresos futuros", "forecast ingresos", "estimar ingresos", "pronostico ingresos", "flujo caja proyectado", "ingresos esperados"],
        "analizar demanda niveles": ["demanda niveles", "analizar demanda", "niveles mas solicitados", "tendencia niveles", "estadisticas niveles", "distribucion niveles", "que nivel tiene mas alumnos", "analisis por nivel"],
        "filtrar por usuario": ["filtrar usuario", "filtrar por usuario", "buscar por usuario", "acciones usuario", "actividad usuario", "auditoria usuario", "que hizo usuario"],
        "ver cambios detallados": ["cambios detallados", "ver cambios detallados", "que cambio", "historial cambios", "antes despues", "comparar cambios", "modificaciones detalladas"],
        "exportar logs": ["exportar logs", "descargar logs", "exportar auditoria", "descargar auditoria", "reporte logs", "historial completo sistema", "exportar actividad"],
        "cambiar contrasena": ["cambiar contrasena", "cambiar password", "nueva contrasena", "restablecer contrasena", "olvide contrasena", "resetear password", "modificar contrasena"],
        "revisar permisos": ["revisar permisos", "ver permisos", "que permisos tiene", "permisos usuario", "accesos usuario", "roles permisos", "configurar permisos"],
        "enviar mensaje maestro": ["enviar mensaje maestro", "mensaje maestro", "contactar maestro", "como enviar mensaje", "escribir maestro", "notificar maestro", "comunicar maestro"],
        "publicar aviso general": ["publicar aviso", "aviso general", "anuncio general", "como publicar aviso", "crear aviso", "nuevo aviso", "publicar anuncio"],
        "historial completo": ["historial completo", "ver historial", "como ver historial", "historial alumno", "historial de pagos", "historial academico"],
        "asignar maestro": [
            # formas infinitivo
            "asignar maestro", "como asignar maestro", "asignar docente", "asignar profesor", "maestro a grupo", "asignacion maestro",
            # formas conjugadas (presente, imperativo) — estas son las que el usuario realmente escribe
            "asigno maestro", "asigno maestros", "como asigno maestro", "como asigno maestros",
            "asigno al maestro", "asigna maestro", "como asigna maestro",
            "asignar maestros", "asignacion de maestro", "asignacion de maestros",
            "maestro al grupo", "maestros a grupos", "maestro para grupo"
        ],
        "ver grupos asignados": [
            "ver grupos asignados", "grupos asignados maestro", "grupos maestro",
            "que grupos tiene maestro", "como ver grupos asignados", "consultar grupos maestro",
            # frases que usa el maestro para ver SUS grupos
            "mis grupos", "ver mis grupos", "cuales son mis grupos", "que grupos tengo",
            "grupos asignados a mi", "mis clases", "mis materias", "ver mis clases",
            "que grupos imparto", "cuales son mis grupos asignados"
        ],
        "crear usuario acceso": ["crear usuario", "nuevo usuario", "crear usuario acceso", "como crear usuario", "dar acceso sistema", "usuario login", "crear credenciales"],
        "asignar maestro arrastrando": ["asignar arrastrando", "asignar maestro arrastrando", "arrastrar maestro", "drag drop maestro", "asignacion drag", "como asignar arrastrando"],
        "ver carga trabajo": ["ver carga trabajo", "carga trabajo maestro", "carga maestro", "horarios maestro", "cuantas horas maestro", "como ver carga", "carga horaria"],
        "sugerencias ia": [
            "sugerencias ia", "como funcionan sugerencias", "sugerencias del sistema",
            "recomendaciones ia", "como funciona ia", "sugerencias inteligentes",
            # frases para saber qué puede hacer la IA
            "que puedes hacer", "que puedes hacer tu", "para que sirves",
            "que sabes hacer", "que sabe hacer la ia", "que sabe la ia",
            "que puedo preguntarte", "que pregunto", "ayudame con que",
            "que funciones tienes", "cuales son tus funciones",
            "como me puedes ayudar", "que me puedes decir"
        ],
        "calendario horarios": ["calendario horarios", "ver horarios", "como ver horarios", "calendario de clases", "horario grupos", "horario maestro"],
        "filtrar maestro horarios": ["filtrar maestro", "filtrar por maestro", "horarios maestro", "ver horarios maestro", "horario docente", "como filtrar maestro"],
        "detectar huecos horarios": ["detectar huecos", "huecos disponibles", "espacios disponibles", "horarios libres", "horas libres", "huecos horarios", "como detectar huecos"],
        "exportar calendario": ["exportar calendario", "exportar horarios", "descargar horarios", "imprimir horarios", "horarios pdf", "horarios excel", "como exportar horarios"],
        "filtrar por nivel": ["filtrar nivel", "filtrar por nivel", "buscar por nivel", "como filtrar nivel", "filtrar grupos nivel", "nivel especifico"],
        "revisar cupo": ["revisar cupo", "ver cupo", "consultar cupo", "cupo grupo", "como revisar cupo", "cuantos alumnos caben", "espacios disponibles grupo"],
        "registrar pago": [
            # formas infinitivo
            "registrar pago", "nuevo pago", "cobrar", "pago alumno", "como registrar pago",
            # formas conjugadas
            "registro pago", "registro pagos", "como registro pago", "como registro pagos",
            "como registro un pago", "registro un pago", "registra pago", "registra un pago",
            "agregar pago", "agrego pago", "como agrego pago"
        ],
        "activar periodo": [
            # formas infinitivo
            "activar periodo", "como activar periodo", "cambiar periodo", "iniciar periodo", "habilitar periodo",
            # formas conjugadas — estas son las que el usuario realmente escribe
            "inicio periodo", "inicio un periodo", "como inicio periodo", "como inicio un periodo",
            "inicia periodo", "inicia un periodo", "como inicia periodo",
            "iniciar un periodo", "como iniciar periodo", "como iniciar un periodo",
            "empezar periodo", "empiezo periodo", "como empiezo periodo",
            "crear un periodo", "creo un periodo", "como creo periodo", "como creo un periodo"
        ],
        "crear periodo": [
            "crear periodo", "nuevo periodo", "crear periodo academico", "como crear periodo",
            "registrar periodo", "alta periodo", "nuevo cuatrimestre",
            "crear el periodo", "crea el periodo"
        ],
        "finanzas": ["cuanto se ha recaudado", "cuanto recaudado", "cuanto ingreso", "ingresos totales", "recaudacion", "estadisticas financieras", "finanzas", "cuanto dinero", "balance", "estado financiero"],
        "deudas": ["quien debe", "quienes deben", "adeudos", "pagos pendientes", "pagos vencidos", "listado de adeudos"],
        "sistema": ["resumen del sistema", "que hace el sistema", "explica el sistema", "funciones del sistema", "como funciona el sistema"]
    }
    
    for respuesta_key, palabras_clave in mapeo.items():
        for palabra in palabras_clave:
            if palabra in pregunta_norm:
                # Si la respuesta existe en el diccionario
                if respuesta_key in RESPUESTAS_SIMPLE:
                    return True, {
                        "success": True,
                        **RESPUESTAS_SIMPLE[respuesta_key]
                    }
                # Si es una consulta de datos (finanzas, deudas, sistema), NO responder con respuesta simple
                # sino dejar que la IA consulte datos reales
                elif respuesta_key in ["finanzas", "deudas"]:
                    # NO encontrado - dejar pasar a IA/herramientas para consultar BD
                    continue
    
    return False, {}
