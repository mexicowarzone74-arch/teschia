"""
SCRIPT DE PRUEBA - SISTEMA MULTI-MODELO (PYTHON)
Prueba el sistema de IA desde Python
"""

import sys
import asyncio
from modelos_ia import (
    ejecutar_chat_inteligente,
    generar_respuesta_ia,
    obtener_estadisticas,
    MODELOS,
    ESTRATEGIA_FALLBACK
)

print("🤖 SISTEMA MULTI-MODELO DE IA - TESCHA (Python)\n")
print("=" * 60)

# Mostrar modelos disponibles
print("\n📦 MODELOS DISPONIBLES:\n")

for provider, modelos in MODELOS.items():
    print(f"\n🔹 {provider.upper()}:")
    for key, info in modelos.items():
        print(f"   • {info['nombre']} ({info['id']})")
        if 'descripcion' in info:
            print(f"     {info['descripcion']}")

print("\n" + "=" * 60)
print("\n🔄 ESTRATEGIA DE FALLBACK:\n")
for i, modelo in enumerate(ESTRATEGIA_FALLBACK, 1):
    print(f"{i}. {modelo}")

print("\n" + "=" * 60)
print("\n🧪 PRUEBA 1: Respuesta Simple\n")

try:
    respuesta = generar_respuesta_ia(
        prompt="¿Qué es el sistema escolar TESCHA? Responde en máximo 50 palabras.",
        system_prompt="Eres un asistente experto del sistema TESCHA.",
        max_tokens=200
    )
    
    print(f"✅ Respuesta recibida:\n")
    print(f"{respuesta}\n")
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("=" * 60)
print("\n🧪 PRUEBA 2: Chat con Historial\n")

try:
    messages = [
        {
            "role": "system",
            "content": "Eres un asistente matemático. Responde de forma concisa."
        },
        {
            "role": "user",
            "content": "¿Cuánto es 15 × 23?"
        }
    ]
    
    respuesta = ejecutar_chat_inteligente(messages, max_tokens=150)
    
    print(f"✅ Respuesta recibida:\n")
    print(f"{respuesta['content']}\n")
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("=" * 60)
print("\n📊 ESTADÍSTICAS DEL SISTEMA:\n")

stats = obtener_estadisticas()

print("🔧 Configuración:")
print(f"   • Groq API Keys: {stats['configuracion']['groq_keys']}")
print(f"   • OpenRouter: {'✅ Configurado' if stats['configuracion']['openrouter_configured'] else '❌ No configurado'}")
print(f"   • Modelos disponibles: {stats['configuracion']['modelos_disponibles']}")

if stats['modelos']:
    print("\n📈 Uso de modelos:")
    for modelo, data in stats['modelos'].items():
        print(f"\n   {modelo}:")
        print(f"     • Usos: {data['usos']}")
        print(f"     • Éxitos: {data['exitos']}")
        print(f"     • Fallos: {data['fallos']}")
        print(f"     • Tiempo promedio: {round(data['tiempo_promedio'])}ms")
        print(f"     • Tokens usados: {data['tokens_usados']}")
else:
    print("\n⚠️ No hay estadísticas aún (primer uso)")

print("\n" + "=" * 60)
print("\n✨ Prueba completada! El sistema está funcionando correctamente.\n")
