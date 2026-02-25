import pool from '../config/database.js';
import logger from '../utils/logger.js';
import { generarRespuestaIA, ejecutarChatAgente } from '../config/ia.js';
import { aiToolsDefinition, aiToolsImplementations } from './aiTools.js';
import { consultarMotorPython } from './pythonAIService.js';

/**
 * 🤖 Asistente IA Contextual con Groq
 * 
 * Proporciona ayuda inteligente basada en:
 * - Página actual del usuario
 * - Rol del usuario
 * - Estado del sistema
 * - Preguntas específicas
 * - IA generativa (Groq)
 */

// Base de conocimientos del sistema
const baseConocimiento = {
  // Guías generales
  general: {
    inicio: `¡Bienvenido al Sistema TESCHA! 

Soy tu asistente virtual. Puedo ayudarte con:
- 🎯 Guías paso a paso
- 💡 Consejos y mejores prácticas
- ⚠️ Solución de problemas comunes
- 📊 Interpretación de estadísticas

Solo pregúntame cualquier cosa sobre el sistema.`,
    
    flujoBasico: `El flujo básico de trabajo es:

1. **Crear Periodo** → Define el ciclo escolar (fecha inicio/fin)
2. **Crear Grupos** → Asigna código, nivel, horarios y maestros
3. **Inscribir Alumnos** → Usa "Inscripciones Rápidas" para velocidad
4. **Gestionar Pagos** → Registra pagos y envía recordatorios
5. **Subir Calificaciones** → Los maestros suben desde su dashboard
6. **Ver Reportes** → Analiza estadísticas y tendencias

**Niveles Oficiales de Inglés en TESCHA:**
- **Básico**
- **Intermedio**
- **Avanzado**
- **Perfeccionamiento 1**
- **Perfeccionamiento 2**
- **C1**

¿En qué paso necesitas ayuda?`
  },

  // Ayuda por página
  paginas: {
    dashboard: {
      titulo: "Dashboard - Vista General",
      descripcion: `El Dashboard muestra métricas del periodo actual:

📊 **Indicadores clave:**
- Alumnos activos e ingresos totales
- Pagos pendientes y próximos vencimientos
- Alertas de prórrogas vencidas

💡 **Consejo:** Revisa diariamente las alertas rojas para prevenir problemas.

⚠️ **Problema común:** Si no ves datos, verifica que tengas un periodo activo.`,
      acciones: [
        "Ver detalles de alertas",
        "Filtrar por periodo",
        "Exportar reportes"
      ],
      accionesMaestro: [
        "Ver mis grupos",
        "Ver mis alumnos"
      ],
      accionesAdministrativo: [
        "Ver reportes",
        "Exportar estadísticas"
      ]
    },

    grupos: {
      titulo: "Gestión de Grupos",
      descripcion: `Aquí administras los grupos de clase:

🎯 **Flujo recomendado:**
1. Crea el grupo con código único (Ej: A1-01)
2. Asigna nivel de inglés
3. Define horarios y días de clase
4. Usa "Sugerencias IA" 🤖 para asignar maestros sin conflictos

💡 **Asignación Masiva:** Selecciona múltiples grupos sin maestro y asigna uno de golpe.

📅 **Calendario de Horarios:** Ve "Horarios" en el menú para vista semanal completa.`,
      descripcionMaestro: `Tus grupos asignados:

👥 **Puedes ver:**
- Lista de tus grupos activos
- Alumnos inscritos en cada grupo
- Horarios de tus clases
- Información del nivel

📅 **Horarios:** Consulta el calendario para ver tu semana completa.

💡 **Tip:** Usa esta sección para organizar tus clases y revisar asistencias.`,
      acciones: [
        "Crear nuevo grupo",
        "Asignar maestro con IA",
        "Ver calendario de horarios",
        "Asignación masiva"
      ],
      accionesMaestro: [
        "Ver calendario",
        "Ver mis grupos"
      ],
      accionesAdministrativo: [
        "Ver lista de grupos",
        "Ver calendario de horarios"
      ]
    },

    inscripciones: {
      titulo: "Inscripciones Rápidas",
      descripcion: `Inscribe alumnos masivamente en segundos:

⚡ **Modo Express:**
1. Selecciona el periodo
2. Elige múltiples alumnos (checkbox)
3. Asigna al grupo destino
4. ¡Listo! Confirmación inmediata

💡 **Truco:** Usa filtros para encontrar alumnos rápido.

⚠️ **Cuidado:** Verifica el cupo disponible antes de inscribir.`,
      acciones: [
        "Inscribir múltiples alumnos",
        "Verificar cupo de grupos",
        "Ver historial de inscripciones"
      ]
    },

    pagos: {
      titulo: "Gestión de Pagos",
      descripcion: `Control completo de pagos y finanzas:

💰 **Funciones principales:**
- Registrar pagos (efectivo, transferencia, tarjeta)
- Generar recibos automáticos
- Enviar recordatorios por WhatsApp
- Gestionar prórrogas con fechas límite

💡 **Recordatorios automáticos:** Se envían 3 días antes del vencimiento.

⚠️ **Problema común:** Si no aparece un pago, verifica que la inscripción exista.`,
      acciones: [
        "Registrar nuevo pago",
        "Enviar recordatorio",
        "Otorgar prórroga",
        "Ver historial de pagos"
      ],
      accionesAdministrativo: [
        "Ver historial de pagos",
        "Exportar reportes"
      ]
    },

    calificaciones: {
      titulo: "Calificaciones",
      descripcion: `Sistema de 3 parciales (escala 0-100):

📝 **Características:**
- 3 parciales por alumno
- Promedio automático calculado
- Acepta decimales (89.5) o enteros (89)
- CSV para carga masiva

👨‍🏫 **Para maestros:** Suben desde su dashboard con plantilla CSV.

💡 **Consejo:** Revisa que todos los parciales estén completos antes de cerrar periodo.`,
      descripcionMaestro: `Subir calificaciones de tus grupos:

📝 **Cómo funciona:**
- 3 parciales por alumno (escala 0-100)
- Sube manual o con archivo CSV
- Acepta decimales (89.5)
- Promedio se calcula automático

⚡ **CSV Masivo:** Descarga plantilla → Llena datos → Sube archivo

💡 **Tip:** Usa CSV para subir calificaciones de todo el grupo en segundos.`,
      acciones: [
        "Registrar calificación",
        "Cargar CSV masivo",
        "Ver promedios del grupo",
        "Exportar boletas"
      ],
      accionesMaestro: [
        "Descargar plantilla",
        "Subir calificaciones",
        "Ver mis grupos"
      ],
      accionesAdministrativo: [
        "Ver promedios",
        "Exportar boletas"
      ]
    },

    horarios: {
      titulo: "Calendario de Horarios",
      descripcion: `Vista semanal de todos los horarios:

📅 **Funcionalidades:**
- Ver horarios de todos los maestros
- Detectar conflictos visuales
- Filtrar por maestro específico
- Identificar espacios disponibles

💡 **Usa colores:** Cada maestro tiene un color único para facilitar la lectura.

🎯 **Ideal para:** Planificar nuevos grupos sin conflictos.`,
      acciones: [
        "Filtrar por maestro",
        "Detectar huecos disponibles",
        "Exportar calendario",
        "Ver carga de trabajo"
      ]
    },

    alumnos: {
      titulo: "Gestión de Alumnos",
      descripcion: `Base de datos de estudiantes:

👥 **Información clave:**
- Datos personales y contacto
- Historial de inscripciones
- Estado de pagos
- Calificaciones por periodo

💡 **Búsqueda rápida:** Usa el filtro para encontrar por nombre, matrícula o teléfono.

⚠️ **Importante:** Mantén actualizados teléfonos y emails para notificaciones.`,
      descripcionMaestro: `Lista de tus alumnos:

👥 **Puedes consultar:**
- Datos de contacto de tus alumnos
- Lista por grupo
- Buscar alumno específico

💡 **Búsqueda rápida:** Filtra por nombre, matrícula o grupo.

📝 **Nota:** Solo puedes ver los alumnos de tus grupos asignados.`,
      acciones: [
        "Agregar nuevo alumno",
        "Editar información",
        "Ver historial completo",
        "Exportar lista"
      ],
      accionesMaestro: [
        "Ver mis alumnos",
        "Buscar alumno"
      ],
      accionesAdministrativo: [
        "Ver lista completa",
        "Ver historial",
        "Exportar lista"
      ]
    },

    maestros: {
      titulo: "Gestión de Personal",
      descripcion: `Control de maestros y usuarios:
👨‍🏫 **Gestión de maestros:**
- Datos de contacto
- Grupos asignados
- Carga horaria
- Acceso al sistema
🔐 **Permisos:** Cada maestro puede ver solo sus grupos.
💡 **Sugerencia:** Revisa la carga horaria para distribuir equitativamente.`,
      acciones: [
        "Agregar maestro",
        "Ver grupos asignados",
        "Crear usuario de acceso",
        "Revisar carga horaria"
      ]
    },
    asignaciones: {
      titulo: "Dashboard de Asignaciones",
      descripcion: `Asigna maestros a grupos de forma rápida y visual:
🎯 **Funciones:**
- Arrastrar grupos a maestros
- Ver carga de trabajo en tiempo real
- Sugerencias IA para mejores emparejamientos
- Validación automática de conflictos de horario
💡 **Tip:** Los grupos sin asignar aparecen en el panel derecho.`,
      acciones: [
        "Asignar maestro arrastrando",
        "Ver carga de trabajo",
        "Sugerencias IA"
      ]
    },
    inscripciones: {
      titulo: "Inscripciones Rápidas",
      descripcion: `Proceso masivo de inscripción:
⚡ **Pasos:**
1. Selecciona periodo y nivel
2. Marca alumnos en la lista
3. Elige grupo y haz clic en inscribir
💡 **Importante:** Verifica que los grupos tengan cupo antes de proceder.`,
      acciones: [
        "Inscribir alumnos masivamente",
        "Filtrar por nivel",
        "Revisar cupo"
      ]
    },
    auditoria: {
      titulo: "Registros de Auditoría",
      descripcion: `Historial completo de acciones en el sistema:
🕵️ **Puedes ver:**
- Quién hizo qué y cuándo
- Valores anteriores y nuevos de los datos
- IP de conexión y tipo de acción (INSERT, UPDATE, DELETE)
💡 **Seguridad:** Útil para seguimiento de cambios críticos.`,
      acciones: [
        "Filtrar por usuario",
        "Ver cambios detallados",
        "Exportar logs"
      ]
    },
    seguridad: {
      titulo: "Seguridad y Accesos",
      descripcion: `Gestión de perfiles y contraseñas:
🔐 **Funciones:**
- Cambiar tu contraseña actual
- Ver sesiones activas
- Configurar preferencias de seguridad`,
      acciones: [
        "Cambiar contraseña",
        "Revisar permisos"
      ]
    },
    asistencias: {
      titulo: "Control de Asistencias",
      descripcion: `Gestión de puntualidad y permanencia:
📋 **Procedimiento:**
1. Selecciona el grupo y la fecha
2. Marca "P" (Presente), "F" (Falta) o "R" (Retardo)
3. Guarda los cambios para actualizar el historial
4. La IA analizará patrones de deserción automáticamente
👨‍🏫 **Para maestros:** Pueden tomar asistencia desde el botón "Asistencia" en cada grupo asignado.
💡 **Tip:** Toma asistencia en los primeros 10 minutos de clase para no olvidar a nadie.`,
      acciones: [
        "Pasar lista",
        "Ver estadísticas de asistencia",
        "Reportar ausencias críticas",
        "Exportar reporte mensual"
      ],
      accionesMaestro: [
        "Ir a Subir Asistencias",
        "Ver mi historial de asistencia"
      ]
    },
    periodos: {
      titulo: "Gestión de Períodos",
      descripcion: `Configuración de ciclos escolares:
⏳ **Importante:**
- Solo puede haber **un periodo activo** a la vez.
- Al activar uno nuevo, el anterior se marca como inactivo.
- Las fechas definen la validez de inscripciones y pagos.`,
      acciones: [
        "Crear nuevo periodo",
        "Activar periodo",
        "Cerrar ciclo escolar"
      ]
    },
    reportes: {
      titulo: "Centro de Reportes",
      descripcion: `Generación de documentos oficiales:
📄 **Formatos:** PDF y Excel
📈 **Disponibles:**
- Listas de asistencia por grupo
- Boletas de calificaciones
- Reportes financieros de ingresos
- Listado de deudores`,
      acciones: [
        "Generar lista de asistencia",
        "Exportar boletas masivas",
        "Descargar reporte de ingresos"
      ]
    },
    estadisticas: {
      titulo: "Estadísticas Académicas",
      descripcion: `Análisis de rendimiento del centro:
📊 **Métricas:**
- Promedios por nivel y maestro
- Comparativa entre periodos
- Desempeño por grupo
💡 **IA:** Detectamos automáticamente grupos con bajo rendimiento.`,
      acciones: [
        "Ver promedios por nivel",
        "Comparar con periodo anterior",
        "Identificar mejores alumnos"
      ]
    },
    tendencias: {
      titulo: "Análisis de Tendencias",
      descripcion: `Predicciones y proyecciones con IA:
🔮 **Insights:**
- Predicción de deserción escolar
- Proyección de ingresos para el próximo mes
- Análisis de popularidad de horarios
💡 **Uso:** Sirve para tomar decisiones estratégicas basadas en datos.`,
      acciones: [
        "Ver predicción de deserción",
        "Proyectar ingresos",
        "Analizar demanda de niveles"
      ]
    },
    "ia-dashboard": {
      titulo: "Dashboard de Inteligencia Artificial",
      descripcion: `Centro de control del Agente IA:
🤖 **Funciones:**
- Resumen ejecutivo generado por IA
- Alertas críticas del sistema
- Recomendaciones de optimización
- Chat directo con el conocimiento del sistema`,
      acciones: [
        "Generar resumen ejecutivo",
        "Ver alertas de la IA",
        "Personalizar sugerencias"
      ]
    },
    chat: {
      titulo: "Chat Interno",
      descripcion: `Comunicación entre personal:
💬 **Canales:**
- Mensajes directos con maestros
- Avisos generales de coordinación
- Notificaciones del sistema`,
      acciones: [
        "Enviar mensaje a maestro",
        "Publicar aviso general"
      ]
    },
    "maestro-calificaciones": {
      titulo: "Mis Calificaciones",
      descripcion: `Panel para subir notas (Vista Maestro):
📝 **Pasos:**
1. Selecciona tu grupo
2. Ingresa calificaciones de los 3 parciales
3. Usa el botón "Guardar" o carga un CSV masivo.`,
      acciones: [
        "Subir calificaciones",
        "Descargar plantilla CSV"
      ]
    },
    "maestro-asistencias": {
      titulo: "Mis Asistencias",
      descripcion: `Panel de pase de lista (Vista Maestro):
📋 **Procedimiento:** Selecciona tu clase del día y marca a los alumnos presentes. Rápido y sencillo.`,
      acciones: [
        "Pasar lista",
        "Ver mis grupos"
      ]
    }
  },

  // Problemas comunes y soluciones
  problemas: {
    sinDatos: {
      problema: "No veo datos en el dashboard",
      solucion: `Soluciones posibles:

1. ✅ Verifica que hay un **periodo activo**
   → Ve a "Períodos" y activa uno

2. ✅ Confirma que hay **grupos e inscripciones** en ese periodo
   → Ve a "Grupos" y "Alumnos"

3. ✅ Revisa que los **filtros** no estén limitando la vista

4. ✅ Refresca la página (F5)

Si persiste el problema, revisa la consola del navegador (F12).`
    },

    conflictoHorario: {
      problema: "No puedo asignar maestro a grupo",
      solucion: `Causa probable: **Conflicto de horario**

🔍 **Diagnóstico:**
1. Ve a "Horarios" en el menú
2. Filtra por ese maestro
3. Verifica si tiene clase a la misma hora

💡 **Solución rápida:**
- Usa "Sugerencias IA" 🤖 al editar el grupo
- El sistema te mostrará maestros disponibles
- Score 100 = sin conflictos

🎯 **Prevención:** Siempre consulta el calendario antes de asignar.`
    },

    pagoNoAparece: {
      problema: "Registré un pago pero no aparece",
      solucion: `Verificaciones paso a paso:

1. ✅ **Confirma que el alumno está inscrito** en el periodo
   → Sin inscripción, no hay pago

2. ✅ **Revisa el periodo seleccionado** en el filtro
   → Puede estar viendo otro periodo

3. ✅ **Busca en el historial** del alumno específico
   → Puede estar en otro grupo

4. ✅ **Verifica la fecha** del pago
   → Filtros de fecha pueden ocultarlo

💡 **Consejo:** Usa la búsqueda por nombre del alumno.`
    },

    cupoLleno: {
      problema: "No puedo inscribir más alumnos",
      solucion: `El grupo alcanzó su cupo máximo.

📊 **Opciones:**

1. **Aumentar cupo del grupo:**
   → Edita el grupo → Aumenta "Cupo Máximo"

2. **Crear nuevo grupo paralelo:**
   → Mismo nivel, diferente horario

3. **Reasignar alumnos:**
   → Mueve algunos al nuevo grupo

💡 **Recomendación:** Mantén cupos de 15-25 alumnos para mejor aprendizaje.`
    },

    calificacionesIncompletas: {
      problema: "Faltan calificaciones de parciales",
      solucion: `Para completar calificaciones:

📝 **Coordinador:**
1. Ve a "Calificaciones"
2. Filtra por grupo
3. Revisa qué parciales faltan (aparecen en blanco)
4. Contacta al maestro responsable

👨‍🏫 **Maestro:**
1. Entra al sistema con su usuario
2. Ve a "Subir Calificaciones"
3. Descarga plantilla CSV
4. Completa y sube el archivo

⚠️ **Importante:** Los 3 parciales son requeridos para el promedio final.`
    }
  },

  // Consejos por rol
  roles: {
    coordinador: [
      "Revisa el dashboard cada mañana para alertas importantes",
      "Usa asignación masiva para ahorrar tiempo en grupos",
      "Consulta el calendario de horarios antes de crear grupos",
      "Configura recordatorios automáticos de pago al inicio del periodo",
      "Exporta reportes mensuales para respaldo"
    ],
    maestro: [
      "Sube calificaciones después de cada examen para mantener actualizado",
      "Usa la plantilla CSV para agilizar la carga de calificaciones",
      "Revisa tu horario en el calendario para evitar confusiones",
      "Marca asistencias regularmente para estadísticas precisas"
    ]
  }
};

/**
 * Obtener ayuda contextual según la página actual
 */
export const obtenerAyudaContextual = async (pagina, rol, userId) => {
  try {
    const paginaKey = pagina.toLowerCase().replace('/', '');
    let ayuda = baseConocimiento.paginas[paginaKey] || baseConocimiento.general.inicio;

    // FILTRAR CONTENIDO Y ACCIONES SEGÚN ROL
    if (ayuda.acciones) {
      // Usar descripción específica para maestros
      if (rol === 'maestro') {
        if (ayuda.descripcionMaestro) {
          ayuda = { ...ayuda, descripcion: ayuda.descripcionMaestro };
        }
        if (ayuda.accionesMaestro) {
          ayuda = { ...ayuda, acciones: ayuda.accionesMaestro };
        }
      } 
      // Usar descripción específica para administrativo
      else if (rol === 'administrativo') {
        if (ayuda.descripcionAdministrativo) {
          ayuda = { ...ayuda, descripcion: ayuda.descripcionAdministrativo };
        }
        if (ayuda.accionesAdministrativo) {
          ayuda = { ...ayuda, acciones: ayuda.accionesAdministrativo };
        }
      }
      // Coordinador usa las acciones y descripción completas por defecto
    }

    // Obtener consejos según el rol
    const consejos = baseConocimiento.roles[rol] || [];

    // Detectar problemas comunes en el sistema (pasar el rol)
    const alertas = await detectarProblemasComunes(userId, rol);

    // Obtener métricas del sistema (solo para coordinador y administrativo)
    let metricas = {};
    if (rol === 'coordinador' || rol === 'administrativo') {
      metricas = await obtenerMetricasSistema();
    }

    // Generar recomendaciones inteligentes (solo para coordinador)
    let recomendaciones = [];
    if (rol === 'coordinador') {
      recomendaciones = generarRecomendaciones(alertas, metricas, pagina);
    }

    return {
      success: true,
      ayuda,
      consejos: consejos.slice(0, 3), // Top 3 consejos
      alertas,
      metricas,
      recomendaciones,
      sugerencias: generarSugerenciasContextuales(pagina, alertas, rol)
    };

  } catch (error) {
    logger.error('Error al obtener ayuda contextual:', error);
    throw error;
  }
};

/**
 * Detectar problemas comunes en el sistema
 */
const detectarProblemasComunes = async (userId, rol) => {
  const alertas = [];
  try {
    const promises = [];

    // 1. Periodo
    promises.push(pool.query('SELECT COUNT(*) as count FROM periodos WHERE activo = true'));

    // 2. Grupos sin maestro (Solo coordinador)
    if (rol === 'coordinador') {
      promises.push(pool.query(`
        SELECT COUNT(*) as count FROM grupos g JOIN periodos p ON g.periodo_id = p.id 
        WHERE g.maestro_id IS NULL AND p.activo = true
      `));
    } else promises.push(Promise.resolve({ rows: [{ count: 0 }] }));

    // 3. Pagos que vencen HOY (Urgencia máxima)
    if (rol === 'coordinador' || rol === 'administrativo') {
      promises.push(pool.query(`
        SELECT COUNT(*) as count FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id JOIN periodos per ON i.periodo_id = per.id 
        WHERE p.estatus IN ('pendiente', 'prorroga', 'vencido') 
        AND (DATE(COALESCE(p.fecha_limite_prorroga, p.fecha_vencimiento)) = CURRENT_DATE)
        AND per.activo = true
      `));
    } else promises.push(Promise.resolve({ rows: [{ count: 0 }] }));

    // 3b. Pagos próximos (2-3 días)
    if (rol === 'coordinador' || rol === 'administrativo') {
      promises.push(pool.query(`
        SELECT COUNT(*) as count FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id JOIN periodos per ON i.periodo_id = per.id 
        WHERE p.estatus IN ('pendiente', 'prorroga') 
        AND COALESCE(p.fecha_limite_prorroga, p.fecha_vencimiento) > CURRENT_DATE
        AND COALESCE(p.fecha_limite_prorroga, p.fecha_vencimiento) <= CURRENT_DATE + INTERVAL '3 days' 
        AND per.activo = true
      `));
    } else promises.push(Promise.resolve({ rows: [{ count: 0 }] }));

    // 4. Pagos vencidos
    if (rol === 'coordinador' || rol === 'administrativo') {
      promises.push(pool.query(`
        SELECT COUNT(*) as count FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id JOIN periodos per ON i.periodo_id = per.id 
        WHERE p.estatus = 'pendiente' AND p.fecha_vencimiento < NOW() AND per.activo = true
      `));
    } else promises.push(Promise.resolve({ rows: [{ count: 0 }] }));

    // 5. Calificaciones (Corregido a tabla calificaciones)
    promises.push(pool.query(`
      SELECT COUNT(DISTINCT i.id) as count FROM inscripciones i JOIN periodos p ON i.periodo_id = p.id 
      LEFT JOIN (SELECT inscripcion_id, COUNT(*) as num_parciales FROM calificaciones GROUP BY inscripcion_id) c ON i.id = c.inscripcion_id 
      WHERE p.activo = true AND i.estatus = 'activo' AND (c.num_parciales IS NULL OR c.num_parciales < 3)
    `));

    const results = await Promise.all(promises);
    
    // Procesar resultados
    if (parseInt(results[0].rows[0].count) === 0) {
      alertas.push({ tipo: 'warning', titulo: 'No hay periodo activo', mensaje: 'Activa un periodo para comenzar.', prioridad: 'alta' });
    }
    if (rol === 'coordinador' && parseInt(results[1].rows[0].count) > 0) {
      alertas.push({ tipo: 'info', titulo: `${results[1].rows[0].count} grupos sin maestro`, mensaje: 'Usa "Sugerencias IA" 🤖 o "Asignación Masiva" para asignar rápido.', accion: { texto: 'Ir a Grupos', ruta: '/grupos' }, prioridad: 'media' });
    }
    if ((rol === 'coordinador' || rol === 'administrativo') && parseInt(results[2].rows[0].count) > 0) {
      alertas.push({ tipo: 'error', titulo: `🚨 ${results[2].rows[0].count} pagos vencen HOY`, mensaje: 'Atención inmediata requerida. Los alumnos deben pagar hoy mismo.', accion: { texto: 'Ver Urgentes', ruta: '/pagos' }, prioridad: 'critica' });
    }
    if ((rol === 'coordinador' || rol === 'administrativo') && parseInt(results[3].rows[0].count) > 0) {
      alertas.push({ tipo: 'warning', titulo: `${results[3].rows[0].count} pagos vencen pronto`, mensaje: 'Envía recordatorios preventivos para los próximos 3 días.', accion: { texto: 'Enviar Recordatorios', ruta: '/pagos' }, prioridad: 'alta' });
    }
    if ((rol === 'coordinador' || rol === 'administrativo') && parseInt(results[4].rows[0].count) > 0) {
      alertas.push({ tipo: 'error', titulo: `${results[4].rows[0].count} pagos ya están VENCIDOS`, mensaje: '⚠️ Estos pagos ya excedieron su fecha. Contacta a los alumnos urgentemente.', accion: { texto: 'Cobrar Vencidos', ruta: '/pagos' }, prioridad: 'critica' });
    }
    if (parseInt(results[5].rows[0].count) > 0) {
      alertas.push({ tipo: 'info', titulo: `${results[5].rows[0].count} alumnos sin calificaciones completas`, mensaje: 'Algunos alumnos no tienen los 3 parciales registrados.', solucion: baseConocimiento.problemas.calificacionesIncompletas.solucion, accion: { texto: 'Ver Calificaciones', ruta: '/calificaciones' }, prioridad: 'baja' });
    }

    // 6. Verificar grupos con cupo casi lleno (SOLO coordinador)
    if (rol === 'coordinador') {
      const gruposCasiLlenos = await pool.query(`
        SELECT 
          g.codigo,
          g.cupo_maximo,
          COUNT(i.id) as inscritos
        FROM grupos g
        JOIN periodos p ON g.periodo_id = p.id
        LEFT JOIN inscripciones i ON g.id = i.grupo_id
        WHERE p.activo = true
        GROUP BY g.id, g.codigo, g.cupo_maximo
        HAVING COUNT(i.id) >= g.cupo_maximo * 0.9
      `);

      if (gruposCasiLlenos.rows.length > 0) {
        const ejemplos = gruposCasiLlenos.rows.slice(0, 2).map(g => g.codigo).join(', ');
        alertas.push({
          tipo: 'info',
          titulo: `${gruposCasiLlenos.rows.length} grupos al 90% de cupo`,
          mensaje: `Grupos ${ejemplos} están casi llenos. Considera abrir paralelos.`,
          accion: { texto: 'Ver Grupos', ruta: '/grupos' },
          prioridad: 'baja'
        });
      }
    }

    // 7. Verificar alumnos sin grupo asignado (SOLO coordinador)
    if (rol === 'coordinador') {
      const alumnosSinGrupo = await pool.query(`
        SELECT COUNT(DISTINCT a.id) as count
        FROM alumnos a
        JOIN inscripciones i ON a.id = i.alumno_id
        JOIN periodos p ON i.periodo_id = p.id
        WHERE p.activo = true
        AND i.grupo_id IS NULL
      `);

      if (parseInt(alumnosSinGrupo.rows[0].count) > 0) {
        alertas.push({
          tipo: 'warning',
          titulo: `${alumnosSinGrupo.rows[0].count} alumnos sin grupo`,
          mensaje: 'Inscripciones pendientes de asignar a grupos.',
          accion: { texto: 'Asignar Grupos', ruta: '/inscripciones' },
          prioridad: 'media'
        });
      }
    }

    // 8. Detectar conflictos de horario (deshabilitado - requiere tabla grupos_horarios)
    // TODO: Implementar detección de conflictos usando grupos_horarios
    /*
    const conflictosHorario = await pool.query(`
      SELECT COUNT(*) as count
      FROM grupos g1
      JOIN grupos_horarios gh1 ON g1.id = gh1.grupo_id
      JOIN grupos g2 ON g1.maestro_id = g2.maestro_id AND g1.id < g2.id
      JOIN grupos_horarios gh2 ON g2.id = gh2.grupo_id
      WHERE g1.periodo_id = g2.periodo_id
      AND gh1.dia = gh2.dia
      AND gh1.hora_inicio < gh2.hora_fin
      AND gh1.hora_fin > gh2.hora_inicio
    `);

    if (parseInt(conflictosHorario.rows[0].count) > 0) {
      alertas.push({
        tipo: 'error',
        titulo: `${conflictosHorario.rows[0].count} conflictos de horario detectados`,
        mensaje: '⚠️ Maestros con grupos en el mismo horario.',
        accion: { texto: 'Ver Horarios', ruta: '/horarios' },
        prioridad: 'critica'
      });
    }
    */

    // Ordenar por prioridad
    const ordenPrioridad = { critica: 0, alta: 1, media: 2, baja: 3 };
    alertas.sort((a, b) => ordenPrioridad[a.prioridad] - ordenPrioridad[b.prioridad]);

  } catch (error) {
    logger.error('Error al detectar problemas comunes:', error);
  }

  return alertas;
};

/**
 * Obtener métricas del sistema en tiempo real
 */
const obtenerMetricasSistema = async () => {
  try {
    const periodoRes = await pool.query('SELECT id, nombre FROM periodos WHERE activo = true LIMIT 1');
    if (periodoRes.rows.length === 0) return {};
    const pid = periodoRes.rows[0].id;

    const promises = [
      pool.query('SELECT COUNT(DISTINCT alumno_id) as count FROM inscripciones WHERE periodo_id = $1', [pid]),
      pool.query('SELECT COUNT(*) as count FROM grupos WHERE periodo_id = $1', [pid]),
      pool.query(`SELECT COUNT(DISTINCT p.id) FILTER (WHERE p.estatus IN ('pagado', 'completado')) * 100.0 / NULLIF(COUNT(DISTINCT p.id), 0) as tasa 
                  FROM inscripciones i LEFT JOIN pagos p ON i.id = p.inscripcion_id WHERE i.periodo_id = $1`, [pid]),
      pool.query(`SELECT ROUND(AVG(calificacion), 2) as promedio FROM calificaciones c JOIN inscripciones i ON c.inscripcion_id = i.id WHERE i.periodo_id = $1`, [pid])
    ];

    const [alumnos, grupos, tasa, promedio] = await Promise.all(promises);

    return {
      periodo: periodoRes.rows[0].nombre,
      totalAlumnos: parseInt(alumnos.rows[0].count),
      totalGrupos: parseInt(grupos.rows[0].count),
      tasaPagos: parseFloat(tasa.rows[0].tasa || 0).toFixed(1),
      promedioGeneral: parseFloat(promedio.rows[0].promedio || 0).toFixed(2)
    };
  } catch (error) {
    logger.error('Error al obtener métricas del sistema:', error);
    return {};
  }
};

/**
 * Generar recomendaciones inteligentes basadas en métricas y alertas
 */
const generarRecomendaciones = (alertas, metricas, pagina) => {
  const recomendaciones = [];

  // Recomendaciones basadas en tasa de pagos
  if (metricas.tasaPagos && parseFloat(metricas.tasaPagos) < 70) {
    recomendaciones.push({
      titulo: '💰 Tasa de pagos baja',
      descripcion: `Solo el ${metricas.tasaPagos}% de alumnos han pagado. Recomendación: Envía recordatorios masivos o considera extender fechas límite.`,
      acciones: ['Enviar recordatorios', 'Revisar pagos por saldar', 'Gestionar prórrogas']
    });
  }

  // Recomendaciones basadas en promedio de calificaciones
  if (metricas.promedioGeneral && parseFloat(metricas.promedioGeneral) < 70) {
    recomendaciones.push({
      titulo: '📚 Promedio general bajo',
      descripcion: `El promedio es ${metricas.promedioGeneral}/100. Considera reunión con maestros para identificar problemas o implementar asesorías.`,
      acciones: ['Reunión con maestros', 'Analizar grupos con bajo desempeño', 'Implementar tutorías']
    });
  }

  // Recomendaciones basadas en alertas críticas
  const alertasCriticas = alertas.filter(a => a.prioridad === 'critica');
  if (alertasCriticas.length > 0) {
    recomendaciones.push({
      titulo: '⚠️ Requiere atención inmediata',
      descripcion: `Tienes ${alertasCriticas.length} problema(s) crítico(s): ${alertasCriticas.map(a => a.titulo).join(', ')}`,
      acciones: alertasCriticas.map(a => a.accion.texto)
    });
  }

  // Recomendaciones por contexto de página
  if (pagina.includes('grupos') && metricas.totalGrupos < 5) {
    recomendaciones.push({
      titulo: '👥 Pocos grupos activos',
      descripcion: `Solo tienes ${metricas.totalGrupos} grupos. Considera crear más para distribuir mejor a los alumnos.`,
      acciones: ['Crear nuevos grupos', 'Revisar demanda por nivel']
    });
  }

  return recomendaciones;
};

/**
 * Generar sugerencias contextuales según la página y alertas
 */
const generarSugerenciasContextuales = (pagina, alertas, rol) => {
  const sugerencias = [];

  // Solo coordinador ve sugerencias de gestión
  if (rol === 'coordinador') {
    if (pagina.includes('grupos') && alertas.some(a => a.titulo && a.titulo.includes('sin maestro'))) {
      sugerencias.push({
        texto: '💡 Usa "Asignación Masiva" para asignar maestros a múltiples grupos de una vez',
        icono: '⚡'
      });
    }

    if (pagina.includes('dashboard') && alertas.some(a => a.titulo && a.titulo.includes('pagos pendientes'))) {
      sugerencias.push({
        texto: '📱 Puedes enviar recordatorios de pago automáticos desde "Pagos"',
        icono: '💰'
      });
    }

    if (pagina.includes('calificaciones') && alertas.some(a => a.titulo && a.titulo.includes('incompletas'))) {
      sugerencias.push({
        texto: '📊 Los maestros pueden subir calificaciones masivas con CSV desde su dashboard',
        icono: '📝'
      });
    }
  }
  
  // Sugerencias para maestros
  if (rol === 'maestro') {
    if (pagina.includes('calificaciones')) {
      sugerencias.push({
        texto: '📄 Descarga la plantilla CSV para subir calificaciones rápidamente',
        icono: '⚡'
      });
    }
    if (pagina.includes('asistencias')) {
      sugerencias.push({
        texto: '✅ Marca las asistencias regularmente para mantener estadísticas actualizadas',
        icono: '📋'
      });
    }
  }

  return sugerencias;
};

/**
 * Responder pregunta del usuario usando la base de conocimientos
 */
export const responderPregunta = async (pregunta, contexto) => {
  try {
    const { rol, userId } = contexto;

    // --- DESVÍO AL MOTOR PYTHON (Si está habilitado) ---
    if (process.env.USE_PYTHON_AI === 'true') {
      try {
        const resPython = await consultarMotorPython(pregunta, contexto);
        // Si el motor Python respondió (incluso con error pero con respuesta humana), la usamos.
        if (resPython && (resPython.success || resPython.respuesta)) {
            logger.info(`IA_DIVERT -> Usando respuesta de Motor Python.`);
            return {
                ...resPython,
                alertas: resPython.alertas || []
            };
        }
      } catch (e) {
        logger.warn(`El motor Python falló o excedió tiempo: ${e.message}. Usando reserva de Node.js.`);
      }
    }
    
    // Obtener información del sistema para darle contexto a la IA
    const metricas = await obtenerMetricasSistema();
    const alertas = await detectarProblemasComunes(userId, rol);
    
    // --- OPTIMIZACIÓN DE PROMPT POR ROL ---
    const instRol = {
      coordinador: "Eres la mano derecha de la dirección. Tu enfoque es la gestión estratégica, finanzas y resolución de conflictos. Hablas con autoridad pero con espíritu de servicio.",
      maestro: "Eres un colega académico. Tu enfoque es el bienestar del alumno, las calificaciones y la asistencia. Hablas de forma empática y pedagógica.",
      administrativo: "Eres un experto en procesos. Tu enfoque es la eficiencia, los registros y el orden del sistema. Hablas de forma clara, directa y organizada."
    };

    // --- OPTIMIZACIÓN DE CARGA DE CONTEXTO ---
    const resumenAlertas = alertas.length > 5 
      ? `Hay ${alertas.length} alertas activas. Principales: ${alertas.slice(0, 3).map(a => a.titulo).join(', ')}...`
      : JSON.stringify(alertas);

    // --- OPTIMIZACIÓN DE PROMPT PARA EQUIPOS LENTOS ---
    const promptBase = `Eres el Mentor Experto de TESCHA. ${instRol[rol] || instRol.coordinador}
Reglas:
1. RESPONDE SIEMPRE con datos reales usando tus herramientas.
2. Si te preguntan por deudas, pagos o finanzas, USA 'obtener_estudiantes_adeudos' o 'obtener_estadisticas_financieras'.
3. Presenta los datos en TABLAS Markdown para que sean legibles.
4. Si el usuario quiere registrar un MAESTRO o PERSONAL general, USA ESTA PLANTILLA:
   "Entendido. Si desea que yo realice el registro, por favor proporcione los siguientes datos:
   - Nombre(s)
   - Apellido Paterno
   - Apellido Materno
   - Correo
   - Teléfono
   - Niveles a impartir (Básico, Intermedio, Avanzado, Perfeccionamiento 1, Perfeccionamiento 2 o C1)
   Una vez que tenga esta información, procederé con el registro."
5. Si el usuario especifica que es un ADMINISTRATIVO, usa esta versión:
   "Para registrar al nuevo personal administrativo, necesito:
   - Nombre
   - Apellido paterno
   - Apellido materno
   - Correo electrónico
   - Teléfono
   Una vez que tenga esta información, procederé con el registro."
6. Si el usuario quiere registrar un ALUMNO y faltan datos, USA ESTA PLANTILLA:
   "Antes de registrar a un nuevo alumno, necesito saber algunos datos importantes. Por favor, proporciona la siguiente información:
   - Nombre completo (y apellidos)
   - Correo electrónico
   - Matrícula (si es interno)
   - Carrera (si es interno)
   - Tipo de alumno (interno o externo)
   Una vez que tenga esta información, procederé con el registro."
6. Si el usuario quiere crear un GRUPO y faltan datos, USA ESTA PLANTILLA:
   "Para crear un nuevo grupo, necesito los siguientes detalles:
   - Código del grupo (ej: ING-M1)
   - Nivel de inglés (ID o nombre)
   - Turno (matutino/sabatino)
   - Cupo máximo
   Por favor compárteme estos datos para continuar."
8. NUNCA respondas con el JSON vacío de texto. Siempre debes dar una explicación humana de lo que encontraste o de lo que vas a hacer.
9. Si usas una herramienta, el siguiente mensaje DEBE resumir los resultados para el usuario en lenguaje natural.
10. Contexto: Periodo ${metricas.periodo || 'N/A'}, Alertas: ${resumenAlertas}.`;

    const formatPrompt = `
Formato: Guía paso a paso y este JSON al final:
---JSON_START---
{ "tutorial": ["Paso 1"], "acciones": [{"texto": "Ir", "ruta": "/"}], "sugerencias": ["¿Paso 2?"] }
---JSON_END---`;

    // Si es Ollama (Local), usamos el prompt corto. Si es Groq (Nube), usamos el detallado.
    const systemPrompt = useOllama ? (promptBase + formatPrompt) : (promptBase + `\n\nDINÁMICA: Ejecuta acciones si tienes datos. Pide lo que falte de forma humana.\n\n` + formatPrompt);

    const messages = [ { role: 'system', content: systemPrompt } ];

    if (contexto.historial && contexto.historial.length > 0) {
      contexto.historial.forEach(msg => {
        if (msg.tipo === 'asistente' || msg.tipo === 'usuario') {
          messages.push({ role: msg.tipo === 'asistente' ? 'assistant' : 'user', content: msg.mensaje || '' });
        }
      });
    }

    messages.push({ role: 'user', content: pregunta });

    // AGENT LOOP (Optimizado para Velocidad)
    let aiResponse = await ejecutarChatAgente(messages, aiToolsDefinition, 800);
    let iterations = 0;
    const allToolMessages = [];

    while (aiResponse && aiResponse.tool_calls && iterations < 3) {
      iterations++;
      const currentToolMessages = [];
      for (const tc of aiResponse.tool_calls) {
        try {
          const fn = tc.function.name;
          const args = JSON.parse(tc.function.arguments);
          
          // 🛡️ GUARDIÁN DE SEGURIDAD: Evitar nombres de herramientas e IDs técnicos
          const creativeTools = ['crear_personal', 'crear_alumno', 'registrar_pago', 'crear_grupo', 'asignar_maestro_a_grupo'];
          if (creativeTools.includes(fn)) {
              const userTexts = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
              const dataToCheck = [args.nombre, args.correo, args.apellido_paterno, args.monto, args.codigo, args.matricula].filter(Boolean);
              
              // Bloquear si la IA pide/usa IDs numéricos directamente del usuario
              if (args.maestro_id || args.grupo_id || args.alumno_id || args.periodo_id) {
                  const allMessagesTexts = messages.map(m => (m.content || m.mensaje || '') + JSON.stringify(m.tool_calls || '')).join(' ').toLowerCase();
                  const dataStrings = [args.maestro_id, args.grupo_id, args.alumno_id, args.periodo_id].filter(Boolean).map(String);
                  
                  // Verificar si el ID existe en el historial (ya sea en texto del usuario o en resultados de herramientas)
                  const idExistInHistory = dataStrings.every(id => allMessagesTexts.includes(id));

                  if (!idExistInHistory) {
                      logger.warn(`SEGURIDAD: Bloqueando uso de ID técnico no verificado.`);
                      currentToolMessages.push({ 
                          tool_call_id: tc.id, role: 'tool', name: fn, 
                          content: JSON.stringify({ error: "ALTO: No puedes usar IDs que no hayas buscado primero. Usa tus herramientas de búsqueda para encontrar los datos reales." }) 
                      });
                      continue;
                  }
              }

              const dataVerified = dataToCheck.every(val => userTexts.includes(val.toString().toLowerCase()));
              if (!dataVerified && dataToCheck.length > 0) {
                  currentToolMessages.push({ 
                      tool_call_id: tc.id, role: 'tool', name: fn, 
                      content: JSON.stringify({ error: "No puedo realizar acciones sin datos reales proporcionados por el usuario." }) 
                  });
                  continue;
              }
          }

          logger.info(`IA_TOOL -> ${fn}`);
          const res = await aiToolsImplementations[fn](args, contexto);
          currentToolMessages.push({ tool_call_id: tc.id, role: 'tool', name: fn, content: JSON.stringify(res) });
        } catch (e) {
          currentToolMessages.push({ tool_call_id: tc.id, role: 'tool', name: tc.function.name, content: '{"error":"Error interno"}' });
        }
      }
      allToolMessages.push(...currentToolMessages);
      messages.push(aiResponse, ...currentToolMessages);
      aiResponse = await ejecutarChatAgente(messages, aiToolsDefinition, 800);
    }

    let finalContent = aiResponse?.content || "";

    // FAILSAFE: Si hay datos de herramientas pero la IA dio una respuesta genérica
    const detailTool = messages.find(m => m.role === 'tool' && (m.name === 'obtener_detalles_alumno' || m.name === 'obtener_detalles_alumno_por_matricula') && !m.content.includes('"error"'));
    if (detailTool && (finalContent.length < 15 || finalContent.toLowerCase().includes('solicitud') || finalContent.toLowerCase().includes('ayudarte'))) {
        try {
            const d = JSON.parse(detailTool.content);
            if (d.nombre_completo) {
                finalContent = `### Información de Alumno\n\n**Nombre:** ${d.nombre_completo}\n**Matrícula:** ${d.matricula}\n**Nivel:** ${d.estatus_academico?.nivel || 'N/A'}\n**Grupo:** ${d.estatus_academico?.grupo || 'Sin asignar'}\n\n${d.pagos?.length > 0 ? 'Tiene pagos registrados en el sistema.' : 'No cuenta con pagos registrados en este periodo.'}`;
            }
        } catch(e) {}
    }

    const adeudosTool = messages.find(m => m.role === 'tool' && m.name === 'obtener_estudiantes_adeudos' && !m.content.includes('"error"'));
    if (adeudosTool && (finalContent.length < 15 || finalContent.toLowerCase().includes('solicitud'))) {
        try {
            const data = JSON.parse(adeudosTool.content);
            if (Array.isArray(data) && data.length > 0) {
                let table = `### Alumnos con Adeudos\n\n| Alumno | Matrícula | Concepto | Monto | Estatus |\n| --- | --- | --- | --- | --- |\n`;
                data.forEach(r => {
                    table += `| ${r.nombre} ${r.apellido_paterno} | ${r.matricula} | ${r.concepto} | $${r.monto} | **${r.estatus.toUpperCase()}** |\n`;
                });
                finalContent = table;
            } else {
                finalContent = "No se encontraron alumnos con adeudos pendientes para este periodo.";
            }
        } catch(e) {}
    }

    const statsTool = messages.find(m => m.role === 'tool' && m.name === 'obtener_estadisticas_financieras' && !m.content.includes('"error"'));
    if (statsTool && (finalContent.length < 15 || finalContent.toLowerCase().includes('solicitud'))) {
        try {
            const s = JSON.parse(statsTool.content);
            finalContent = `### Resumen Financiero del Periodo\n\n- **Total Recaudado:** $${s.total_recaudado || 0}\n- **Total de Pagos:** ${s.total_pagos || 0}\n- **Alumnos Inscritos:** ${s.total_inscritos || 0}\n- **Pagos Pendientes:** ${s.pagos_pendientes || 0}\n\nLos datos reflejan los ingresos y adeudos registrados hasta el momento en el periodo activo.`;
        } catch(e) {}
    }


    // Extraer datos estructurados si la IA los incluyó (opcional)
    let tutorial = [];
    let extraAcciones = [];
    let extraSugerencias = [];

    const jsonMatch = finalContent.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1].trim());
        tutorial = jsonData.tutorial || [];
        extraAcciones = jsonData.acciones || [];
        extraSugerencias = jsonData.sugerencias || [];
        finalContent = finalContent.replace(/---JSON_START---[\s\S]*?---JSON_END---/, '').trim();
      } catch (e) {
        logger.error('Error parseando JSON opcional');
      }
    }

    // --- CAPA FINAL DE VERIFICACIÓN (ANTI-MENTIRAS) ---
    const creationError = allToolMessages.find(m => m.role === 'tool' && m.content.includes('"error"'));
    if (creationError && (finalContent.toLowerCase().includes('exito') || finalContent.toLowerCase().includes('creado') || finalContent.toLowerCase().includes('registrado'))) {
        try {
            const errObj = JSON.parse(creationError.content);
            finalContent = `Hubo un inconveniente al intentar realizar el registro: **${errObj.error}**. Por favor, corrobora los datos y asegúrate de proporcionarme información real para poder proceder. No puedo completar acciones con datos genéricos o incompletos.`;
        } catch(e) {}
    }

    if (!finalContent || finalContent.length < 10) {
        if (tutorial.length > 0 || extraAcciones.length > 0) {
            finalContent = "He preparado una guía y acciones rápidas para ayudarte con lo que solicitas:";
        } else if (allToolMessages.length > 0) {
            finalContent = "He consultado la información en el sistema. ¿Deseas que profundice en algún dato específico?";
        } else {
            finalContent = "He procesado tu solicitud. ¿En qué más puedo ayudarte?";
        }
    }

    return {
      success: true,
      respuesta: finalContent,
      tutorial,
      acciones: extraAcciones,
      sugerencias: extraSugerencias.length > 0 ? extraSugerencias : generarSugerenciasSegunRol(rol),
      alertas: alertas.slice(0, 3)
    };

  } catch (error) {
    logger.error(`Error final en Agente IA:`, error);
    
    // FAILSAFE: Si todo falla (sin internet y local muy lento), dar respuesta manual informativa
    return {
      success: true,
      respuesta: "Lo siento, el sistema esta operando sin internet en este momento y no puedo realizar registros.\n\nPara cuando regrese la conexion, por favor prepara estos datos del maestro:\n- Nombre(s)\n- Apellido Paterno y Materno\n- Correo y Telefono\n- Niveles (Basico, Intermedio, Avanzado, etc.)\n\nIntenta de nuevo cuando se restablezca la señal.",
      tutorial: ["Esperar conexion"],
      acciones: [],
      sugerencias: ["¿Como registro un alumno?"]
    };
  }
};

const generarSugerenciasSegunRol = (rol) => {
  const sugerencias = {
    coordinador: [
      '¿Cómo asigno maestros a grupos?',
      '¿Cómo registro pagos?',
      '¿Cómo inicio un periodo?',
      '¿Qué problemas tiene el sistema?'
    ],
    maestro: [
      '¿Cuáles son mis grupos?',
      '¿Cómo subo calificaciones?',
      '¿Cómo tomo asistencia?',
      '¿Cuántos alumnos tengo?'
    ],
    administrativo: [
      '¿Cuántos alumnos hay activos?',
      '¿Cuál es la tasa de pagos?',
      '¿Cómo exporto reportes?'
    ]
  };

  return sugerencias[rol] || sugerencias.coordinador;
};

export default {
  obtenerAyudaContextual,
  responderPregunta
};
