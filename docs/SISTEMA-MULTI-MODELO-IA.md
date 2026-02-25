# 🤖 SISTEMA MULTI-MODELO DE IA INTELIGENTE

## ✨ Nuevo Sistema Implementado

Tu sistema TESCHA ahora cuenta con **inteligencia artificial mejorada** que soporta múltiples modelos de IA con **fallback automático**. El sistema elegirá el mejor modelo disponible según la situación.

---

## 🎯 Modelos Disponibles

### 📦 GROQ (Gratis, Rápido)
- **Llama 3.3 70B** - Modelo principal de Meta (recomendado)
- **Llama 3.1 8B** - Versión ultrarrápida
- **Mixtral 8x7B** - Mistral con gran contexto (32K tokens)
- **Gemma 2 9B** - Nueva generación de Google
- **Gemma 7B** - Versión rápida de Google

### 💎 OPENROUTER (De Pago, Premium)
- **Llama 3.1 70B** - Versión completa de Meta
- **Mistral Large** - Modelo grande de Mistral
- **Qwen 2.5 72B** - Excelente para multilenguaje y matemáticas
- **DeepSeek Chat** - Especializado en código y razonamiento
- **DeepSeek Coder** - Optimizado para programación

### 🏠 OLLAMA (Local, Sin Internet)
- **Llama 3** - Ejecutándose localmente
- **Mistral** - Versión local
- **Gemma 7B** - Google local
- **Qwen 2.5** - Multilenguaje local
- **DeepSeek Coder** - Para código local

---

## 🔄 Sistema de Fallback Inteligente

El sistema intenta automáticamente en este orden:

1. **Groq** (si hay API key) → Gratis y rápido ⚡
2. **OpenRouter** (si hay API key) → Modelos premium 💎
3. **Ollama** (si está instalado) → Sin internet 🏠

### Ventajas:
✅ **Siempre disponible**: Si uno falla, prueba el siguiente
✅ **Rotación de API keys**: Alterna entre múltiples keys de Groq
✅ **Sin configuración**: Funciona automáticamente
✅ **Estadísticas**: Registra uso, tiempos y tokens

---

## ⚙️ Configuración

### 1. Variables de Entorno (.env)

```bash
# === GROQ (Ya configurado) ===
GROQ_API_KEY=key1,key2,key3  # Múltiples keys separadas por comas

# === OPENROUTER (Opcional) ===
OPENROUTER_API_KEY=  # Déjalo vacío si no lo usas
# Obtén tu key en: https://openrouter.ai/keys

# === OLLAMA (Opcional) ===
OLLAMA_URL=http://127.0.0.1:11434/v1/chat/completions
OLLAMA_MODEL=llama3
```

### 2. Instalar Ollama (Opcional - Para uso sin internet)

#### Windows:
```powershell
# Descargar e instalar Ollama
# https://ollama.ai/download

# Instalar modelos
ollama pull llama3
ollama pull mistral
ollama pull qwen2.5:7b
ollama pull deepseek-coder:6.7b
ollama pull gemma:7b
```

#### Verificar que funcione:
```powershell
ollama list  # Ver modelos instalados
ollama run llama3  # Probar un modelo
```

### 3. Configurar OpenRouter (Opcional - Si quieres modelos premium)

1. Regístrate en https://openrouter.ai
2. Ve a https://openrouter.ai/keys
3. Crea una API key
4. Agrégala a tu `.env`:
```bash
OPENROUTER_API_KEY=sk-or-v1-tu-key-aqui
```

---

## 📊 Uso en JavaScript (Backend)

### Opción 1: Función Simple
```javascript
import { generarRespuestaIA } from './config/modelos-ia.js';

// Uso básico
const respuesta = await generarRespuestaIA(
  "¿Cómo registro un alumno?",
  "Eres un asistente del sistema TESCHA",
  1500  // max tokens
);

console.log(respuesta);
```

### Opción 2: Chat Completo
```javascript
import { ejecutarChatInteligente } from './config/modelos-ia.js';

// Con historial de conversación
const messages = [
  { role: 'system', content: 'Eres un asistente experto' },
  { role: 'user', content: '¿Qué es TESCHA?' },
  { role: 'assistant', content: 'TESCHA es un sistema escolar...' },
  { role: 'user', content: 'Dame más detalles' }
];

const respuesta = await ejecutarChatInteligente(messages);
console.log(respuesta.content);
```

### Opción 3: Preferir un Modelo Específico
```javascript
import { ejecutarChatInteligente } from './config/modelos-ia.js';

// Intentar primero con Qwen (si está disponible)
const respuesta = await ejecutarChatInteligente(
  messages,
  [],  // tools
  1500,  // maxTokens
  'openrouter.qwen-2.5-72b'  // modelo preferido
);
```

### Ver Estadísticas
```javascript
import { obtenerEstadisticas } from './config/modelos-ia.js';

const stats = obtenerEstadisticas();
console.log(stats);
// {
//   modelos: {
//     'groq.llama-3.3-70b': {
//       usos: 45,
//       exitos: 43,
//       fallos: 2,
//       tiempoPromedio: 1234,
//       tokensUsados: 15678
//     }
//   }
// }
```

---

## 🐍 Uso en Python (AI Engine)

### Opción 1: Función Simple
```python
from modelos_ia import generar_respuesta_ia

respuesta = generar_respuesta_ia(
    prompt="¿Cómo registro un maestro?",
    system_prompt="Eres un asistente del sistema TESCHA",
    max_tokens=1500
)

print(respuesta)
```

### Opción 2: Chat Completo
```python
from modelos_ia import ejecutar_chat_inteligente

messages = [
    {"role": "system", "content": "Eres un asistente experto"},
    {"role": "user", "content": "¿Qué modelos tienes disponibles?"}
]

respuesta = ejecutar_chat_inteligente(messages, max_tokens=1500)
print(respuesta["content"])
```

### Opción 3: Preferir un Modelo
```python
from modelos_ia import ejecutar_chat_inteligente

respuesta = ejecutar_chat_inteligente(
    messages,
    max_tokens=1500,
    preferir_modelo="groq.mixtral-8x7b"
)
```

### Ver Estadísticas
```python
from modelos_ia import obtener_estadisticas

stats = obtener_estadisticas()
print(stats)
```

---

## 🎨 Modelos Recomendados por Tarea

| Tarea | Modelo Recomendado | Alternativa |
|-------|-------------------|-------------|
| 🗣️ Conversación general | `groq.llama-3.3-70b` | `groq.gemma2-9b` |
| ⚡ Respuestas rápidas | `groq.llama-3.1-8b` | `groq.gemma-7b` |
| 💻 Programación | `openrouter.deepseek-coder` | `ollama.deepseek-coder` |
| 🧮 Matemáticas | `openrouter.qwen-2.5-72b` | `ollama.qwen` |
| 📝 Textos largos | `groq.mixtral-8x7b` | `openrouter.mistral-large` |
| 🌐 Multiidioma | `openrouter.qwen-2.5-72b` | `groq.llama-3.3-70b` |
| 🏠 Sin internet | `ollama.llama3` | `ollama.mistral` |

---

## 🔍 Monitoreo y Logs

El sistema registra automáticamente:

```
🤖 Intentando con Llama 3.3 70B (groq)...
✅ Groq (Llama 3.3 70B) - 1234ms - 567 tokens

⚠️ Groq (Llama 3.1 8B): Error 429 - Rate limit
🔄 Rotando a Groq API Key #2/7

🤖 Intentando con Qwen 2.5 72B (openrouter)...
✅ OpenRouter (Qwen 2.5 72B) - 2345ms - 678 tokens
```

---

## 📈 Comparativa de Modelos

### Velocidad 🚀
1. **Llama 3.1 8B** (Groq) - ~500ms
2. **Gemma 7B** (Groq) - ~600ms
3. **Gemma 2 9B** (Groq) - ~800ms
4. **Llama 3.3 70B** (Groq) - ~1200ms
5. **Mixtral 8x7B** (Groq) - ~1500ms

### Calidad 🌟
1. **Qwen 2.5 72B** (OpenRouter) - ⭐⭐⭐⭐⭐
2. **Llama 3.3 70B** (Groq) - ⭐⭐⭐⭐⭐
3. **DeepSeek Chat** (OpenRouter) - ⭐⭐⭐⭐⭐
4. **Mistral Large** (OpenRouter) - ⭐⭐⭐⭐⭐
5. **Mixtral 8x7B** (Groq) - ⭐⭐⭐⭐

### Contexto 📄
1. **Mixtral 8x7B** - 32,768 tokens
2. **Qwen 2.5 72B** - 32,768 tokens
3. **Mistral Large** - 32,000 tokens
4. **DeepSeek Chat** - 32,000 tokens
5. **Llama 3.3 70B** - 8,000 tokens

---

## 💡 Tips y Mejores Prácticas

### 1. Groq es tu mejor amigo
- Es gratis y muy rápido
- Ya tienes 7 API keys configuradas
- Perfecto para uso diario

### 2. OpenRouter para casos especiales
- Úsalo cuando necesites máxima calidad
- Ideal para tareas complejas
- **Es de pago** (agrega créditos en openrouter.ai)

### 3. Ollama para emergencias
- Funciona sin internet
- Instala los modelos que necesites
- Más lento pero 100% privado

### 4. Deja que el sistema elija
- No especifiques un modelo si no es necesario
- El fallback automático es inteligente
- Siempre tendrás una respuesta

---

## 🛠️ Solución de Problemas

### "Todos los modelos fallaron"
```bash
# Verifica las API keys
echo $GROQ_API_KEY

# Prueba manualmente
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# Verifica Ollama
ollama list
curl http://localhost:11434/api/tags
```

### "OpenRouter no funciona"
- Verifica que tengas créditos en https://openrouter.ai
- Asegúrate de que la API key esté en `.env`
- Checa la consola para ver el error específico

### "Ollama no responde"
```powershell
# Inicia Ollama
ollama serve

# Verifica que esté corriendo
curl http://localhost:11434/api/tags
```

---

## 📦 Archivos Creados/Modificados

### Nuevos Archivos:
- `backend/config/modelos-ia.js` - Sistema multi-modelo JavaScript
- `backend/ai_engine/modelos_ia.py` - Sistema multi-modelo Python
- `backend/config/ia-legacy.js` - Respaldo del sistema anterior

### Archivos Modificados:
- `backend/config/ia.js` - Wrapper simplificado
- `backend/config/groq.js` - Actualizado para usar multi-modelo
- `backend/ai_engine/brain.py` - Usa el nuevo sistema
- `backend/.env` - Variables actualizadas

---

## 🎉 Resultado Final

Tu sistema TESCHA ahora es **mucho más inteligente** y **siempre disponible**:

✅ **5 modelos de Llama** (Meta)
✅ **2 modelos de Mistral**
✅ **3 modelos de Gemma** (Google)
✅ **2 modelos de Qwen**
✅ **2 modelos de DeepSeek**

Total: **14 modelos de IA** disponibles con fallback automático 🚀

---

## 📞 Soporte

Si necesitas ayuda:
1. Revisa los logs de la consola
2. Verifica las estadísticas con `obtenerEstadisticas()`
3. Asegúrate de que tus API keys estén configuradas
4. Prueba primero con Groq (es gratis y funciona bien)

---

**¡Tu sistema escolar ahora tiene superpoderes de IA! 🎓✨**
