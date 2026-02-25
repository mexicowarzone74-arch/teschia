# 🤖 Asistente IA con Groq - Documentación

## ✅ Implementación Completada

Se ha integrado exitosamente **Groq AI** en el sistema TESCHA. El asistente ahora usa inteligencia artificial real para responder preguntas que no están en la base de conocimientos predefinida.

---

## 🔑 Configuración

**API Key utilizada:** configurada via variable de entorno `GROQ_API_KEY`

**Modelo:** `llama-3.3-70b-versatile` (Muy rápido y potente)

**Ubicación de la configuración:** `backend/config/groq.js`

---

## 🎯 Cómo Funciona

### 1. **Respuestas Predefinidas (Prioridad Alta)**
El sistema **primero busca** respuestas en la base de conocimientos local para:
- Preguntas sobre grupos, pagos, calificaciones
- Tutoriales paso a paso
- Problemas comunes
- Acciones específicas del sistema

**Ventaja:** Respuestas instantáneas sin consumir API

### 2. **Groq IA (Fallback Inteligente)**
Si no hay respuesta predefinida, el asistente usa Groq para:
- Responder preguntas generales sobre el sistema
- Adaptar respuestas al rol del usuario (coordinador/maestro/administrativo)
- Proporcionar contexto en tiempo real del sistema
- Responder preguntas complejas o no anticipadas

**Ventaja:** Flexibilidad total, puede responder cualquier pregunta relacionada

---

## 📊 Límites Gratuitos de Groq

- ✅ **30 requests por minuto**
- ✅ **14,400 requests por día**
- ✅ **Completamente gratis**

Para un sistema escolar, esto es **MÁS QUE SUFICIENTE**. Incluso con 100 usuarios concurrentes haciendo preguntas, no alcanzarías el límite.

---

## 💡 Ejemplos de Uso

### Preguntas que responde la Base de Conocimientos:
```
❓ "¿Cómo asigno maestros a grupos?"
❓ "¿Cómo subo calificaciones?"
❓ "No puedo inscribir más alumnos"
❓ "¿Cómo registro pagos?"
```
👉 Respuestas **instantáneas** con tutoriales paso a paso

### Preguntas que responde Groq IA:
```
❓ "¿Cuál es la mejor estrategia para organizar los grupos?"
❓ "¿Cómo mejoro la tasa de pagos del sistema?"
❓ "¿Qué significa un promedio de 75?"
❓ "Dame consejos para gestionar mejor el periodo escolar"
```
👉 Respuestas **inteligentes** adaptadas al contexto actual

---

## 🛠️ Archivos Modificados

### 1. **`backend/config/groq.js`** (NUEVO)
- Configuración del cliente Groq
- Función `generarRespuestaIA()` para consultas generales
- Función `analizarContextoSistema()` para análisis inteligente

### 2. **`backend/services/asistenteIA.js`** (MODIFICADO)
- Importa funciones de Groq
- Implementa fallback a IA cuando no hay respuesta predefinida
- Envía contexto del sistema (métricas, alertas) a la IA
- Adapta respuestas según el rol del usuario

### 3. **`backend/package.json`** (ACTUALIZADO)
- Se instaló `groq-sdk` versión más reciente

---

## 🎨 Interfaz del Usuario

**Sin cambios necesarios** - El componente `AsistenteIA.jsx` del frontend funciona exactamente igual. Los usuarios no notan diferencia, solo obtienen mejores respuestas.

---

## 🔒 Seguridad

### ⚠️ IMPORTANTE - Proteger la API Key

**Actualmente** la API key está hardcodeada en el código. Para producción, deberías:

1. **Crear archivo `.env` en backend:**
```env
GROQ_API_KEY=tu_api_key_de_groq
```

2. **Modificar `backend/config/groq.js`:**
```javascript
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
```

3. **Instalar dotenv:**
```bash
npm install dotenv
```

4. **Agregar `.env` al `.gitignore`**

---

## 📈 Monitoreo

### Ver logs del asistente:
```bash
cd C:\Users\dush3\Downloads\TESCHA\backend
npm run logs
# o
pm2 logs tescha-backend
```

### Ver errores de Groq:
Los errores se registran automáticamente en los logs con el prefijo:
```
Error al consultar Groq: [detalles del error]
```

---

## 🚀 Mejoras Futuras Posibles

### 1. **Análisis Automático del Dashboard**
Agregar un botón "Analizar mi sistema" que use Groq para:
- Detectar tendencias
- Sugerir optimizaciones
- Predecir problemas

### 2. **Respuestas por Voz**
Integrar text-to-speech para que el asistente "hable"

### 3. **Chat con Historial**
Guardar conversaciones para análisis de preguntas frecuentes

### 4. **Sugerencias Proactivas**
El asistente puede sugerir acciones basándose en patrones:
- "Tienes 5 pagos por vencer mañana, ¿envío recordatorios?"

---

## 🐛 Solución de Problemas

### Error: "Error al generar respuesta con IA"

**Posibles causas:**
1. API Key inválida o vencida
2. Límite de requests excedido (poco probable)
3. Problema de conexión a internet

**Solución:**
- El sistema automáticamente usa respuesta por defecto
- Revisa los logs: `pm2 logs tescha-backend`
- Verifica la API key en [console.groq.com](https://console.groq.com)

### El asistente no responde con IA

**Verifica:**
1. Que el servidor backend esté corriendo: `pm2 status`
2. Que no haya errores en logs: `pm2 logs tescha-backend --lines 50`
3. Que el paquete esté instalado: `npm list groq-sdk`

### Respuestas lentas

**Groq es súper rápido** (1-2 segundos). Si es más lento:
- Verifica tu conexión a internet
- Revisa si hay muchas requests simultáneas
- Considera reducir `max_tokens` en `groq.js`

---

## 📞 Contacto y Soporte

Si tienes problemas con la integración de Groq:

1. **Documentación oficial:** https://console.groq.com/docs
2. **Revisa los logs** del sistema
3. **Consulta este documento**

---

## ✨ Conclusión

Tu sistema TESCHA ahora tiene un asistente IA **real y potente** que puede:

✅ Responder preguntas predefinidas instantáneamente  
✅ Usar IA para preguntas complejas o no previstas  
✅ Adaptarse al rol del usuario (coordinador/maestro/admin)  
✅ Proporcionar contexto en tiempo real del sistema  
✅ Funcionar 100% gratis con límites generosos  

**¡Pruébalo!** Abre el sistema y pregúntale cualquier cosa relacionada con TESCHA.

---

*Última actualización: 30 de diciembre de 2025*
