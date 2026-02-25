"""
CONFIGURACIÓN MULTI-MODELO PARA PYTHON
Sistema de IA inteligente con fallback automático
Soporta: Llama, Mistral, Gemma, Qwen, DeepSeek
"""

import os
import requests
import time
from typing import Dict, List, Optional, Any
from groq import Groq
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# ============= CONFIGURACIÓN DE API KEYS =============
GROQ_API_KEYS = [k.strip() for k in os.getenv("GROQ_API_KEY", "").split(",") if k.strip()]
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/v1/chat/completions")

# ============= DEFINICIÓN DE MODELOS =============
MODELOS = {
    # GROQ - Rápido y gratuito (con límites)
    "groq": {
        "llama-3.3-70b": {
            "id": "llama-3.3-70b-versatile",
            "nombre": "Llama 3.3 70B",
            "descripcion": "Modelo general de Meta",
            "contexto": 8000
        },
        "llama-3.1-8b": {
            "id": "llama-3.1-8b-instant",
            "nombre": "Llama 3.1 8B",
            "descripcion": "Rápido y eficiente",
            "contexto": 8000
        },
        "mixtral-8x7b": {
            "id": "mixtral-8x7b-32768",
            "nombre": "Mixtral 8x7B",
            "descripcion": "Mistral MoE",
            "contexto": 32768
        },
        "gemma-7b": {
            "id": "gemma-7b-it",
            "nombre": "Gemma 7B",
            "descripcion": "Modelo de Google",
            "contexto": 8192
        },
        "gemma2-9b": {
            "id": "gemma2-9b-it",
            "nombre": "Gemma 2 9B",
            "descripcion": "Nueva generación",
            "contexto": 8192
        }
    },
    
    # OPENROUTER - Acceso a todos los modelos
    "openrouter": {
        "llama-3.1-70b": {
            "id": "meta-llama/llama-3.1-70b-instruct",
            "nombre": "Llama 3.1 70B",
            "descripcion": "Versión completa"
        },
        "mistral-large": {
            "id": "mistralai/mistral-large",
            "nombre": "Mistral Large",
            "descripcion": "Modelo grande"
        },
        "qwen-2.5-72b": {
            "id": "qwen/qwen-2.5-72b-instruct",
            "nombre": "Qwen 2.5 72B",
            "descripcion": "Multilenguaje"
        },
        "deepseek-chat": {
            "id": "deepseek/deepseek-chat",
            "nombre": "DeepSeek Chat",
            "descripcion": "Código y razonamiento"
        },
        "deepseek-coder": {
            "id": "deepseek/deepseek-coder",
            "nombre": "DeepSeek Coder",
            "descripcion": "Optimizado para código"
        }
    },
    
    # OLLAMA - Local
    "ollama": {
        "llama3": {
            "id": "llama3",
            "nombre": "Llama 3 Local"
        },
        "mistral": {
            "id": "mistral",
            "nombre": "Mistral Local"
        },
        "gemma": {
            "id": "gemma:7b",
            "nombre": "Gemma Local"
        },
        "qwen": {
            "id": "qwen2.5:7b",
            "nombre": "Qwen Local"
        },
        "deepseek-coder": {
            "id": "deepseek-coder:6.7b",
            "nombre": "DeepSeek Coder Local"
        }
    }
}

# ============= ESTRATEGIA DE FALLBACK =============
ESTRATEGIA_FALLBACK = [
    "groq.llama-3.3-70b",
    "groq.gemma2-9b",
    "groq.mixtral-8x7b",
    "groq.llama-3.1-8b",
    "openrouter.qwen-2.5-72b",
    "openrouter.deepseek-chat",
    "openrouter.mistral-large",
    "ollama.llama3",
    "ollama.mistral",
    "ollama.qwen"
]

# Estado del sistema
current_groq_key_index = 0
estadisticas = {}


def obtener_modelo(modelo_id: str) -> Optional[Dict]:
    """Obtiene información de un modelo por su ID (provider.modelo)"""
    try:
        provider, modelo = modelo_id.split(".")
        return MODELOS.get(provider, {}).get(modelo)
    except:
        return None


def rotar_groq_key() -> bool:
    """Rota a la siguiente API key de Groq"""
    global current_groq_key_index
    if len(GROQ_API_KEYS) > 1:
        current_groq_key_index = (current_groq_key_index + 1) % len(GROQ_API_KEYS)
        print(f"🔄 Rotando a Groq Key #{current_groq_key_index + 1}/{len(GROQ_API_KEYS)}")
        return True
    return False


def registrar_uso(modelo_id: str, exito: bool, tiempo_ms: int, tokens: int = 0):
    """Registra estadísticas de uso de un modelo"""
    if modelo_id not in estadisticas:
        estadisticas[modelo_id] = {
            "usos": 0,
            "exitos": 0,
            "fallos": 0,
            "tiempo_promedio": 0,
            "tokens_usados": 0
        }
    
    stats = estadisticas[modelo_id]
    stats["usos"] += 1
    if exito:
        stats["exitos"] += 1
        stats["tiempo_promedio"] = ((stats["tiempo_promedio"] * (stats["exitos"] - 1)) + tiempo_ms) / stats["exitos"]
        stats["tokens_usados"] += tokens
    else:
        stats["fallos"] += 1


def ejecutar_groq(modelo: Dict, messages: List[Dict], max_tokens: int = 1500) -> Dict:
    """Ejecuta una solicitud con Groq"""
    if not GROQ_API_KEYS:
        raise Exception("Groq no configurado (falta API key)")
    
    inicio = time.time()
    
    try:
        client = Groq(api_key=GROQ_API_KEYS[current_groq_key_index])
        response = client.chat.completions.create(
            messages=messages,
            model=modelo["id"],
            temperature=0.7,
            max_tokens=max_tokens,
            timeout=15
        )
        
        tiempo_ms = int((time.time() - inicio) * 1000)
        tokens = response.usage.total_tokens if hasattr(response, 'usage') else 0
        registrar_uso(f"groq.{modelo['id']}", True, tiempo_ms, tokens)
        
        print(f"✅ Groq ({modelo['nombre']}) - {tiempo_ms}ms - {tokens} tokens")
        return {"content": response.choices[0].message.content}
        
    except Exception as e:
        tiempo_ms = int((time.time() - inicio) * 1000)
        registrar_uso(f"groq.{modelo['id']}", False, tiempo_ms)
        raise e


def ejecutar_openrouter(modelo: Dict, messages: List[Dict], max_tokens: int = 1500) -> Dict:
    """Ejecuta una solicitud con OpenRouter"""
    if not OPENROUTER_API_KEY:
        raise Exception("OpenRouter no configurado (falta API key)")
    
    inicio = time.time()
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://tescha.edu",
                "X-Title": "TESCHA Sistema Escolar"
            },
            json={
                "model": modelo["id"],
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.7
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        tiempo_ms = int((time.time() - inicio) * 1000)
        tokens = data.get("usage", {}).get("total_tokens", 0)
        registrar_uso(f"openrouter.{modelo['id']}", True, tiempo_ms, tokens)
        
        print(f"✅ OpenRouter ({modelo['nombre']}) - {tiempo_ms}ms - {tokens} tokens")
        return {"content": data["choices"][0]["message"]["content"]}
        
    except Exception as e:
        tiempo_ms = int((time.time() - inicio) * 1000)
        registrar_uso(f"openrouter.{modelo['id']}", False, tiempo_ms)
        raise e


def ejecutar_ollama(modelo: Dict, messages: List[Dict], max_tokens: int = 1500) -> Dict:
    """Ejecuta una solicitud con Ollama (local)"""
    inicio = time.time()
    
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": modelo["id"],
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.7
            },
            timeout=300
        )
        response.raise_for_status()
        data = response.json()
        
        tiempo_ms = int((time.time() - inicio) * 1000)
        registrar_uso(f"ollama.{modelo['id']}", True, tiempo_ms)
        
        print(f"✅ Ollama ({modelo['nombre']}) - {tiempo_ms}ms - Local")
        return {"content": data["choices"][0]["message"]["content"]}
        
    except Exception as e:
        tiempo_ms = int((time.time() - inicio) * 1000)
        registrar_uso(f"ollama.{modelo['id']}", False, tiempo_ms)
        raise e


def ejecutar_chat_inteligente(
    messages: List[Dict],
    max_tokens: int = 1500,
    preferir_modelo: Optional[str] = None
) -> Dict:
    """
    FUNCIÓN PRINCIPAL: Ejecuta chat con fallback inteligente
    
    Args:
        messages: Lista de mensajes [{"role": "user", "content": "..."}]
        max_tokens: Máximo de tokens en la respuesta
        preferir_modelo: Modelo preferido (ej: "groq.llama-3.3-70b")
    
    Returns:
        Dict con la respuesta {"content": "..."}
    """
    estrategia = ESTRATEGIA_FALLBACK.copy()
    
    # Si se especifica un modelo preferido, intentar primero
    if preferir_modelo and obtener_modelo(preferir_modelo):
        estrategia = [preferir_modelo] + [m for m in estrategia if m != preferir_modelo]
    
    errores = []
    
    for modelo_id in estrategia:
        modelo = obtener_modelo(modelo_id)
        if not modelo:
            continue
        
        try:
            provider = modelo_id.split(".")[0]
            print(f"🤖 Intentando con {modelo['nombre']} ({provider})...")
            
            if provider == "groq":
                resultado = ejecutar_groq(modelo, messages, max_tokens)
            elif provider == "openrouter":
                resultado = ejecutar_openrouter(modelo, messages, max_tokens)
            elif provider == "ollama":
                resultado = ejecutar_ollama(modelo, messages, max_tokens)
            else:
                raise Exception(f"Provider desconocido: {provider}")
            
            return resultado
            
        except Exception as error:
            error_msg = f"{modelo['nombre']}: {str(error)}"
            errores.append(error_msg)
            print(f"⚠️ {error_msg}")
            
            # Si es Groq y tenemos más keys, rotar
            if provider == "groq" and ("401" in str(error) or "429" in str(error)):
                if rotar_groq_key():
                    try:
                        return ejecutar_groq(modelo, messages, max_tokens)
                    except:
                        pass
            
            continue
    
    # Si llegamos aquí, todos fallaron
    raise Exception(f"❌ Todos los modelos fallaron:\n" + "\n".join(errores))


def generar_respuesta_ia(
    prompt: str,
    system_prompt: str = "",
    max_tokens: int = 1500,
    preferir_modelo: Optional[str] = None
) -> str:
    """
    Genera una respuesta de IA con prompt simple
    
    Args:
        prompt: Pregunta o solicitud del usuario
        system_prompt: Instrucciones del sistema
        max_tokens: Máximo de tokens
        preferir_modelo: Modelo preferido
    
    Returns:
        str: Respuesta del modelo
    """
    messages = []
    
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    messages.append({"role": "user", "content": prompt})
    
    resultado = ejecutar_chat_inteligente(messages, max_tokens, preferir_modelo)
    return resultado["content"]


def obtener_estadisticas() -> Dict:
    """Obtiene estadísticas de uso de modelos"""
    return {
        "modelos": estadisticas,
        "configuracion": {
            "groq_keys": len(GROQ_API_KEYS),
            "openrouter_configured": bool(OPENROUTER_API_KEY),
            "modelos_disponibles": sum(len(MODELOS[p]) for p in MODELOS)
        }
    }
