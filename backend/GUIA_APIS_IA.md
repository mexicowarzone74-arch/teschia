# 🚀 GUÍA: APIs de IA Gratuitas para TESCHA

## ✅ Sistema Multi-Proveedor Configurado

Tu sistema ahora tiene **4 proveedores de IA** en cascada:

1. **Groq** (Principal - Rápido pero con límite diario)
2. **Hugging Face** (Respaldo 1 - Gratuito ilimitado)
3. **Together AI** (Respaldo 2 - Gratuito con créditos)
4. **Ollama** (Respaldo 3 - Local, funciona SIN INTERNET)

---

## 📋 Cómo Obtener las API Keys GRATIS

### 1️⃣ Hugging Face (RECOMENDADO - Ilimitado)

**Pasos:**
1. Ve a: https://huggingface.co/join
2. Crea una cuenta gratuita (con email o GitHub)
3. Ve a: https://huggingface.co/settings/tokens
4. Click en "New token"
5. Nombre: `TESCHA_API`
6. Tipo: Selecciona "Read"
7. Click "Generate"
8. **Copia el token** (empieza con `hf_...`)

**Agregar al sistema:**
```bash
# Edita el archivo .env y agrega:
HUGGINGFACE_API_KEY=hf_TuTokenAqui
```

**Ventajas:**
- ✅ Completamente GRATIS
- ✅ Sin límite de solicitudes
- ✅ Modelos Llama 3.2 de Meta
- ⚠️ Un poco más lento que Groq (pero funciona siempre)

---

### 2️⃣ Together AI (Créditos Gratis Mensuales)

**Pasos:**
1. Ve a: https://api.together.xyz/signup
2. Crea cuenta con email
3. Verifica tu email
4. Ve a: https://api.together.xyz/settings/api-keys
5. Click "Create new API key"
6. **Copia la key** (empieza con `...`)

**Agregar al sistema:**
```bash
# Edita el archivo .env y agrega:
TOGETHER_API_KEY=TuTokenAqui
```

**Ventajas:**
- ✅ $25 USD en créditos gratis al mes
- ✅ Modelos Llama 3 de 8B
- ✅ Rápido y confiable
- ⚠️ Límite mensual (pero se resetea cada mes)

---

### 3️⃣ Ollama (Ya Instalado - Funciona SIN INTERNET)

**Ya está configurado y funcionando.** No necesitas hacer nada.

**Optimizaciones aplicadas:**
- ✅ Timeout reducido a 60 segundos
- ✅ Respuestas limitadas a 500 tokens (más rápido)
- ✅ Temperature optimizada (0.3 para balance velocidad/calidad)
- ✅ Parámetros de generación ajustados

**Para mejorar aún más la velocidad:**
```bash
# Descarga un modelo más pequeño y rápido
ollama pull tinyllama

# Luego edita .env:
OLLAMA_MODEL=tinyllama
```

---

## 🎯 Orden de Prioridad del Sistema

```
Usuario hace pregunta
    ↓
1. Intenta GROQ (30s timeout)
    ↓ (si falla por límite de cuota)
2. Intenta HUGGING FACE (45s timeout)
    ↓ (si falla)
3. Intenta TOGETHER AI (45s timeout)
    ↓ (si falla o no hay internet)
4. Usa OLLAMA LOCAL (60s timeout)
    ↓
Respuesta al usuario
```

---

## 🔧 Configuración Recomendada

**Para máxima disponibilidad (RECOMENDADO):**
```bash
# .env
GROQ_API_KEY=tu_api_key_de_groq
HUGGINGFACE_API_KEY=hf_TuTokenAqui  # ← OBTÉN ESTE
TOGETHER_API_KEY=TuTokenAqui        # ← OPCIONAL pero recomendado
OLLAMA_URL=http://127.0.0.1:11434/v1/chat/completions
OLLAMA_MODEL=phi3:mini
```

**Solo para uso offline (sin APIs externas):**
```bash
# .env
GROQ_API_KEY=
HUGGINGFACE_API_KEY=
TOGETHER_API_KEY=
OLLAMA_URL=http://127.0.0.1:11434/v1/chat/completions
OLLAMA_MODEL=phi3:mini
```

---

## 📊 Comparación de Proveedores

| Proveedor      | Velocidad | Calidad | Límites          | Internet |
|----------------|-----------|---------|------------------|----------|
| Groq           | ⚡⚡⚡⚡⚡    | ⭐⭐⭐⭐⭐  | 14,400 req/día   | ✅ Sí    |
| Hugging Face   | ⚡⚡⚡      | ⭐⭐⭐⭐   | Ilimitado        | ✅ Sí    |
| Together AI    | ⚡⚡⚡⚡     | ⭐⭐⭐⭐   | $25/mes gratis   | ✅ Sí    |
| Ollama (local) | ⚡⚡       | ⭐⭐⭐    | Ilimitado        | ❌ No    |

---

## 🧪 Probar el Sistema

```bash
# Desde el backend
cd C:\Users\dush3\Downloads\TESCHA\backend
python test_ia.py
```

Verás en los logs qué proveedor se está usando:
```
✅ [GROQ] Respuesta exitosa          # ← Groq funcionando
⚠️  [GROQ] Límite de cuota alcanzado  # ← Groq agotado, probando siguiente
✅ [HUGGINGFACE] Respuesta exitosa    # ← Hugging Face funcionando
✅ [OLLAMA] Respuesta local generada  # ← Modo offline activado
```

---

## 💡 Consejos

1. **Obtén al menos Hugging Face**: Es gratis e ilimitado, te salvará cuando Groq se agote.
2. **Mantén Ollama corriendo**: Es tu red de seguridad cuando no hay internet.
3. **Together AI es opcional**: Pero te da más redundancia.
4. **Reinicia el motor después de agregar keys**:
   ```bash
   pm2 restart tescha-ai-engine
   ```

---

## 🆘 Solución de Problemas

**"Todos los servicios no disponibles"**
- Verifica que Ollama esté corriendo: `ollama list`
- Si no está, inícialo: `ollama serve`

**"Ollama muy lento"**
- Descarga un modelo más pequeño: `ollama pull tinyllama`
- Cambia en .env: `OLLAMA_MODEL=tinyllama`

**"Hugging Face no responde"**
- Verifica tu API key en: https://huggingface.co/settings/tokens
- Asegúrate de que el token tenga permisos de "Read"

---

¡Listo! Ahora tienes un sistema de IA ultra robusto que SIEMPRE responderá. 🚀
