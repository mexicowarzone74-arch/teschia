import sys
import os
import json
import re
import requests
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from groq import Groq

from pathlib import Path
from config_debug import debug_print
from respuestas_simple import buscar_respuesta_simple

# Importar el nuevo sistema multi-modelo
from modelos_ia import ejecutar_chat_inteligente, generar_respuesta_ia, obtener_estadisticas

# Configurar salida para UTF-8 (Fija errores de charmap en Windows)
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

# Cargar .env de la carpeta raíz del backend
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configuración
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "tescha_secret_brain_2026")
NODE_API_URL = "http://127.0.0.1:5000/api/asistente/herramienta"

# Configuración de APIs (para sistema legacy de fallback)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_KEYS = [k.strip() for k in GROQ_API_KEY.split(',') if k.strip()] if GROQ_API_KEY else []
current_groq_key_index = 0

def get_groq_client():
    """Obtiene cliente Groq con rotación de claves"""
    global current_groq_key_index
    if not GROQ_API_KEYS:
        raise Exception("No hay claves de Groq configuradas")
    return Groq(api_key=GROQ_API_KEYS[current_groq_key_index])

def rotar_groq_key():
    """Rota a la siguiente clave de Groq"""
    global current_groq_key_index
    current_groq_key_index = (current_groq_key_index + 1) % len(GROQ_API_KEYS)
    return current_groq_key_index

# ========================================
# SISTEMA DE RESPUESTAS RÁPIDAS SIN IA
# Para que TESCHA funcione 100% sin internet
# ========================================
# TEMPORALMENTE COMENTADO - Usar respuestas_simple.py en su lugar
# (Problemas de encoding con emojis)
'''
RESPUESTAS_RAPIDAS = {
    # Registro de Maestros - TODAS LAS VARIANTES POSIBLES
    "como registro maestro|como registro un maestro|registrar maestro manual|agregar maestro manual|como doy de alta maestro|como agrego maestro|pasos para registrar maestro|guia maestro|registro maestro manualmente": {
        "respuesta": """**Guía para Registrar un Maestro (Paso a Paso)**

**Opción 1: Desde el Menú**
1. Ve a la sección **"Maestros"** en el menú lateral izquierdo
2. Haz clic en el botón **"+ Nuevo Maestro"** (esquina superior derecha)
3. Completa el formulario:
   - Nombre(s), Apellidos
   - Correo electrónico (único)
   - Teléfono de contacto
   - **Importante:** Selecciona los niveles que puede impartir
4. Clic en **"Guardar"**

**Tip:** El correo se usará como usuario de acceso.

**Niveles disponibles:** Básico, Intermedio, Avanzado, Perfeccionamiento 1, Perfeccionamiento 2, C1

**Si no aparece disponible para asignar a grupos:** Verifica que tenga niveles seleccionados.""",

            """,
        "acciones": [
            {"texto": "Ir a Maestros", "ruta": "/maestros"}
        ],
        "tutorial": [
            "1. Menú lateral â   Maestros",
            "2. BotÃn '+ Nuevo Maestro'",
            "3. Completa datos personales",
            "4. Selecciona niveles que imparte",
            "5. Guardar"
        ]
    },
    
    # Registro de Alumnos - TODAS LAS VARIANTES
    "como registro alumno|como registro un alumno|agregar alumno|inscribir alumno|como doy de alta alumno|pasos para registrar alumno|guia alumno|registro alumno manualmente": {
        "respuesta": """ðŸ  **GuÃa para Registrar un Alumno**

**OpciÃn 1: InscripciÃn Rápida** âš (Recomendado)
1. Ve a **"Inscripciones Rápidas"**
2. Si el alumno NO existe:
   - Clic en "Nuevo Alumno"
   - Completa: Nombre, Correo, TelÃfono
   - La matrÃcula se genera automática
3. Selecciona el grupo y periodo
4. ÂListo! Alumno creado e inscrito

**OpciÃn 2: Desde Alumnos** ðŸ  
1. Menú â   **"Alumnos"**
2. BotÃn **"+ Nuevo Alumno"**
3. Completa el formulario completo
4. DespuÃs debes inscribirlo en un grupo

            """,
        "acciones": [
            {"texto": "Ir a Inscripciones Rápidas", "ruta": "/inscripciones"},
            {"texto": "Ir a Alumnos", "ruta": "/alumnos"}
        ]
    },
    
    # Grupos y AsignaciÃn
    "como creo grupo|crear nuevo grupo|asignar maestro": {
        "respuesta": """ðŸ **GuÃa para Crear Grupos**

**Crear un Grupo:**
1. Menú â   **"Grupos"**
2. BotÃn **"+ Nuevo Grupo"**
3. Datos obligatorios:
   - CÃdigo del grupo (ej: B1-01, I2-03)
   - Nivel (Básico, Intermedio, etc.)
   - Periodo acadÃmico
   - DÃas de clase (Lun-Mie o Mar-Jue)
   - Horario (ej: 14:00-16:00)
4. **Maestro:** Puedes asignarlo ahora o despuÃs

**Asignar Maestro a Grupo:**
â€ **OpciÃn A:** Durante la creaciÃn del grupo
â€ **OpciÃn B:** Desde la lista de grupos â   BotÃn "Asignar Maestro"
â€ **OpciÃn C:** AsignaciÃn masiva (varios grupos a la vez)

            """,
        "acciones": [
            {"texto": "Ir a Grupos", "ruta": "/grupos"},
            {"texto": "Ver Calendario Horarios", "ruta": "/horarios"}
        ]
    },
    
    # Pagos
    "como registro pago|registrar pago|cobrar alumno": {
        "respuesta": """ðŸ  **GuÃa para Registrar Pagos**

**Paso a Paso:**
1. Menú â   **"Pagos"**
2. BotÃn **"+ Nuevo Pago"**
3. Busca al alumno por nombre o matrÃcula
4. Selecciona:
   - Periodo
   - Concepto (InscripciÃn, Mensualidad, Extraordinario)
   - Método de pago: Formato Universal (ventanilla de gobierno)
5. Ingresa el monto
6. **Opcional:** Adjunta comprobante
7. Guardar â   Se genera recibo automÃtico


            """,
        "acciones": [
            {"texto": "Ir a Pagos", "ruta": "/pagos"}
        ]
    },
    
    # Calificaciones
    "como subo calificacion|subir calificacion|registrar calificacion": {
        "respuesta": """ðŸ  **GuÃa para Subir Calificaciones**

**Maestros** (Manual):
1. Dashboard Maestro â   SecciÃn "Mis Grupos"
2. Selecciona el grupo
3. BotÃn "Calificaciones"
4. Ingresa 3 parciales (0-100) para cada alumno
5. El promedio se calcula automÃtico

**Coordinador** (Carga Masiva):
1. Menú â   **"Calificaciones"**
2. Descarga plantilla CSV del grupo
3. Completa en Excel:
   - Columna P1, P2, P3
   - Acepta decimales (89.5)
4. Sube el archivo CSV
5. Revisa vista previa â   Confirmar

âœ  **Aprobado:** Promedio â  70"""
    },
    
    # PerÃodos
        """,
    "como creo periodo|crear periodo|nuevo ciclo": {
        "respuesta": """ðŸ   **GuÃa para Crear PerÃodos AcadÃmicos**

1. Menú â   **"Periodos"**
2. BotÃn **"+ Nuevo Periodo"**
3. Datos requeridos:
   - Nombre (ej: "Enero-Junio 2026")
   - Fecha de inicio
   - Fecha de fin
   - ÂActivo? (Solo puede haber 1 activo)

- El periodo activo es el que aparece por defecto en inscripciones/pagos
- NO puedes eliminar un periodo con inscripciones

            """,
        "acciones": [
            {"texto": "Ir a Periodos", "ruta": "/periodos"}
        ]
    }
}
'''

def buscar_respuesta_rapida(pregunta: str) -> tuple:
    """
    Busca en el diccionario de respuestas rápidas sin necesidad de IA.
    TEMPORALMENTE DESHABILITADO - Usar respuestas_simple.py
    """
    # Deshabilitado temporalmente por problemas de encoding
    return False, {}

# Configuración Ollama (Modo Offline - OPTIMIZADO)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# DefiniciÃn de herramientas (Espejo de aiTools.js)
TOOLS_DEFINITION = [
    {
        "type": "function",
        "function": {
            "name": "buscar_alumno",
            "description": "Busca alumnos por nombre, matricula o correo. Úsalo para encontrar el alumno si el usuario te da un nombre parcial.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Nombre, matrícula o correo"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_detalles_alumno_por_matricula",
            "description": "Obtiene TODO sobre un alumno usando su matrícula (calificaciones, pagos, grupo, nivel).",
            "parameters": {
                "type": "object",
                "properties": {
                    "matricula": {"type": "string", "description": "La matrícula del alumno (ej: 201724408)"}
                },
                "required": ["matricula"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_detalles_alumno",
            "description": "Obtiene info completa de un alumno usando su ID interno.",
            "parameters": {
                "type": "object",
                "properties": {
                    "alumno_id": {"type": "number"}
                },
                "required": ["alumno_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "crear_personal",
            "description": "Registra un nuevo maestro o administrativo en el sistema.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nombre": {"type": "string", "description": "Nombres del docente/personal"},
                    "apellido_paterno": {"type": "string", "description": "Primer apellido"},
                    "apellido_materno": {"type": "string", "description": "Segundo apellido"},
                    "correo": {"type": "string", "description": "Correo electrÃnico"},
                    "telefono": {"type": "string", "description": "NÃmero telefÃnico"},
                    "rol": {"type": "string", "enum": ["maestro", "administrativo", "coordinador"], "description": "Rol del usuario"}
                },
                "required": ["nombre", "apellido_paterno", "apellido_materno", "correo", "telefono", "rol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "asignar_niveles_maestro",
            "description": "Asocia niveles de inglÃs a un docente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "maestro_id": {"type": "number", "description": "ID interno del maestro"},
                    "niveles": {"type": "array", "items": {"type": "number"}, "description": "Lista de IDs de niveles"}
                },
                "required": ["maestro_id", "niveles"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_estadisticas_financieras",
            "description": "Obtiene resumen de ingresos, adeudos y proyecciones.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo_id": {"type": "number", "description": "ID del periodo (opcional)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_detalles_financieros",
            "description": "Muestra desglose completo de pagos: quiÃn pagÃ, quiÃn debe, montos, fechas y alumnos.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo_id": {"type": "number", "description": "ID del periodo (opcional)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "listar_personal",
            "description": "Busca o lista maestros y administrativos. Retorna ID, nombre y rol.",
            "parameters": {
                "type": "object",
                "properties": {
                    "rol": {"type": "string", "enum": ["maestro", "administrativo", "coordinador"]},
                    "query": {"type": "string", "description": "Nombre o correo (opcional)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_alumnos_por_grupo",
            "description": "Lista los alumnos inscritos en un grupo especÃfico.",
            "parameters": {
                "type": "object",
                "properties": {
                    "grupo_id": {"type": "number"}
                },
                "required": ["grupo_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "crear_grupo",
            "description": "Crea un nuevo grupo acadÃmico.",
            "parameters": {
                "type": "object",
                "properties": {
                    "codigo": {"type": "string", "description": "Ej: A1-01"},
                    "periodo_id": {"type": "number"},
                    "nivel_id": {"type": "number"},
                    "turno": {"type": "string", "enum": ["matutino", "vespertino", "sabado"]},
                    "cupo_maximo": {"type": "number"}
                },
                "required": ["codigo", "periodo_id", "nivel_id", "cupo_maximo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "listar_niveles",
            "description": "Lista los niveles de inglÃs disponibles (IDs y nombres).",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_estudiantes_adeudos",
            "description": "Lista los estudiantes que tienen pagos con estatus pendiente, prorroga o vencido.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo_id": {"type": "number", "description": "ID del periodo (opcional)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_periodo_activo",
            "description": "Obtiene el ID y nombre del periodo escolar actualmente activo.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_grupos_sin_maestro",
            "description": "Lista los grupos que NO tienen maestro asignado en el periodo actual. ALERTA CRITICA.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo_id": {"type": "number", "description": "ID del periodo (opcional, usa activo si no se da)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_alumnos_sin_calificaciones",
            "description": "Encuentra alumnos que NO tienen calificaciones registradas en algun parcial.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo_id": {"type": "number", "description": "ID del periodo (opcional)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analizar_riesgo_desercion",
            "description": "Detecta alumnos en RIESGO de desercion por: bajo promedio (<70), baja asistencia (<80%), pagos vencidos. IA PREDICTIVA.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo_id": {"type": "number", "description": "ID del periodo (opcional)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_estadisticas_asistencias",
            "description": "Analiza patrones de asistencia: promedio por grupo, alumnos con ausentismo critico, dias con mas faltas.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo_id": {"type": "number", "description": "ID del periodo (opcional)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_tendencias_pagos",
            "description": "Analiza tendencias: dias promedio de atraso, alumnos que siempre pagan a tiempo vs atrasados, prediccion de ingresos.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo_id": {"type": "number", "description": "ID del periodo (opcional)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generar_resumen_ejecutivo",
            "description": "Genera resumen ejecutivo completo: metricas clave, alertas criticas, recomendaciones de accion. DASHBOARD IA.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo_id": {"type": "number", "description": "ID del periodo (opcional)"}
                }
            }
        }
    }
]

SYSTEM_PROMPT = open(Path(__file__).parent / 'SYSTEM_PROMPT_COMPLETO.txt', 'r', encoding='utf-8').read()

OFFLINE_SYSTEM_PROMPT = """Eres el ASISTENTE GUIA de TESCHA. Cuando no tienes acceso a datos en tiempo real, explicas como usar el sistema.

TONO: amigable, util, directo. Nunca frio ni burocrático.

REGLA DE ORO - PREGUNTAS "COMO HAGO X":
Cuando alguien pregunta como hacer algo, SIEMPRE:
1. Explica los pasos para hacerlo en el sistema (con la ruta del menu)
2. Da consejos utiles sobre ese proceso  
3. Al final ofrece: "Si quieres que yo lo haga dime [dato minimo necesario]"
NUNCA pidas datos antes de explicar los pasos.

GUIAS POR TEMA:

PERIODOS:
"Para iniciar un periodo:
1. Ve al menu Periodos
2. Haz clic en Nuevo Periodo
3. Llena: nombre (ej: Enero-Abril 2026), fecha inicio y fin
4. Activa el periodo (solo uno activo a la vez)
Si quieres que yo lo cree, dime el nombre y las fechas."

ASIGNACION DE MAESTROS A GRUPOS:
"Para asignar un maestro a un grupo tienes dos opciones:
- Via Asignaciones (masiva): Menu Asignaciones -> selecciona maestro para cada grupo
- Via Grupos: Abre el grupo -> campo Maestro -> elige de la lista
Solo aparecen maestros certificados en ese nivel.
Si quieres que yo lo haga, dime el nombre del grupo y el maestro."

PAGOS:
"Para registrar un pago:
1. Ve al menu Pagos
2. Busca al alumno por nombre o matricula
3. Selecciona la parcialidad correspondiente
4. Llena: monto, metodo de pago, numero de recibo
5. Guarda -> el recibo se genera automaticamente
Si quieres que yo lo registre, dime el alumno (nombre o matricula) y la parcialidad."

INSCRIPCIONES:
"Para inscribir un alumno:
1. Si es nuevo: Menu Alumnos -> Nuevo Alumno, registra sus datos
2. Ve a Inscripciones Rapidas
3. Busca al alumno, selecciona el grupo
4. Confirma -> se crean sus 4 pagos automaticamente
Si quieres que yo lo inscriba, dime su nombre o matricula y el grupo o nivel."

CALIFICACIONES (para maestros):
"Para capturar calificaciones:
1. Menu Calificaciones -> selecciona tu grupo
2. Elige el parcial (1, 2 o 3)
3. Llena las notas de cada alumno (escala 0-100, minimo aprobatorio: 70)
4. Guarda"

ASISTENCIAS (para maestros):
"Para registrar asistencias:
1. Menu Asistencias -> selecciona tu grupo
2. Selecciona la fecha de clase
3. Marca: Presente, Falta, Retardo o Justificada para cada alumno
4. Guarda (3 retardos = 1 falta, minimo 80% para aprobar)"

PAGOS VENCIDOS / QUIEN DEBE:
"Para ver quien debe:
- Menu Pagos -> filtra por estatus Vencido o Pendiente
- o Menu Reportes -> Financiero -> Cuentas por cobrar
Cuando tenga conexion puedo darte la lista exacta con montos."

GRUPOS:
"Para crear un grupo:
1. Menu Grupos -> Nuevo Grupo
2. Llena: codigo (ej: B1-01), nivel, periodo activo, maestro, cupo, horario
3. El turno (matutino/sabatino) se determina automaticamente por los dias elegidos"

FLUJO INICIAL DEL SISTEMA:
1. Periodos (crear periodo activo)
2. Personal (registrar maestros)
3. Grupos (crear y asignar maestros)
4. Alumnos (registrar alumnos nuevos)
5. Inscripciones Rapidas (inscribir alumnos a grupos)
6. Pagos (gestionar pagos generados)

Se amigable y siempre termina ofreciendo ayuda especifica."""

def ejecutar_herramienta_en_node(nombre: str, args: Dict[str, Any], contexto: Dict[str, Any]) -> Dict[str, Any]:
    try:
        payload = {
            "nombre": nombre,
            "args": args,
            "contexto": contexto,
            "secret": INTERNAL_SECRET
        }
        response = requests.post(NODE_API_URL, json=payload, timeout=20)
        return response.json()
    except Exception as e:
        debug_print(f"ERROR en herramienta {nombre}: {e}")
        return {"error": f"Falla tÃcnica: {str(e)}"}

def limpiar_mensajes_para_ollama(messages):
    cleaned = []
    for m in messages:
        # Extraer rol y contenido de forma segura para diccionarios u objetos
        if isinstance(m, dict):
            role = m.get("role", "user")
            content = m.get("content", "")
        else:
            role = getattr(m, "role", "user")
            content = getattr(m, "content", "")
            
        if role not in ["system", "user", "assistant"]:
            role = "user"
            
        if role == "system":
            content = OFFLINE_SYSTEM_PROMPT
            
        cleaned.append({"role": role, "content": str(content or "")})
    return cleaned

class SimpleMessage:
    def __init__(self, content, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls
        self.role = "assistant"

class ToolCall:
    def __init__(self, tc_id, fn_name, fn_args):
        self.id = tc_id
        self.function = type('obj', (object,), {'name': fn_name, 'arguments': fn_args if isinstance(fn_args, str) else json.dumps(fn_args)})

def solicitar_ia(messages, attempt_num):
    """
    Sistema de cascada multi-proveedor para mÃxima disponibilidad.
    Intenta en orden: Groq -> Hugging Face -> Ollama (local)
    """
    
    # ========================================
    # PROVEEDOR 1: GROQ (RÃpido y potente con rotaciÃn de keys)
    # ========================================
    if GROQ_API_KEYS:
        keys_probadas = 0
        while keys_probadas < len(GROQ_API_KEYS):
            try:
                client = get_groq_client()
                debug_print(f" [GROQ] Intentando con Key #{current_groq_key_index + 1}/{len(GROQ_API_KEYS)}...")
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",  # Llama 3.3 70B - Modelo recomendado
                    messages=messages,
                    tools=TOOLS_DEFINITION,
                    tool_choice="auto",
                    temperature=0.0,
                    timeout=30
                )
                debug_print(f"  [GROQ] Respuesta exitosa con Key #{current_groq_key_index + 1}")
                return completion.choices[0].message, False
            except Exception as e:
                error_str = str(e).lower()
                keys_probadas += 1
                if "429" in error_str or "rate limit" in error_str:
                    debug_print(f" âš ï  [GROQ] Key #{current_groq_key_index + 1} agotada")
                    if keys_probadas < len(GROQ_API_KEYS):
                        rotar_groq_key()
                        continue  # Probar con la siguiente key
                    else:
                        debug_print(f" âš ï  [GROQ] Todas las {len(GROQ_API_KEYS)} keys agotadas")
                        break
                else:
                    debug_print(f" âŒ [GROQ] Error en Key #{current_groq_key_index + 1}: {str(e)[:150]}")
                    # Si es otro tipo de error, rotar y seguir intentando
                    if keys_probadas < len(GROQ_API_KEYS):
                        rotar_groq_key()
                        continue
                    break
    
    # ========================================
    # PROVEEDOR 2: HUGGING FACE (Gratuito Ilimitado - CORREGIDO)
    # ========================================
    if HUGGINGFACE_API_KEY:
        try:
            debug_print(f" [HUGGINGFACE] Intentando Hugging Face Chat API...")
            
            # Convertir mensajes al formato de chat
            hf_messages = []
            for msg in messages:
                if hasattr(msg, 'role'):
                    role = msg.role
                    content = getattr(msg, 'content', '')
                else:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                
                hf_messages.append({"role": role, "content": content})
            
            # Usar endpoint de chat de Hugging Face
            response = requests.post(
                "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct/v1/chat/completions",
                headers={"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"},
                json={
                    "model": "meta-llama/Meta-Llama-3-8B-Instruct",
                    "messages": hf_messages,
                    "max_tokens": 500,
                    "temperature": 0.3
                },
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                debug_print(f" âœ  [HUGGINGFACE] Respuesta exitosa ({len(content)} caracteres)")
                return SimpleMessage(content, tool_calls=None), False
            else:
                debug_print(f" âŒ [HUGGINGFACE] Error {response.status_code}: {response.text[:200]}")
        except Exception as e:
            debug_print(f" âŒ [HUGGINGFACE] Fallo: {str(e)[:150]}")
    
    # ========================================
    # PROVEEDOR 3: OLLAMA (DESACTIVADO - MUY LENTO)
    # ========================================
    # Ollama estÃ desactivado porque es demasiado lento en la mayorÃa de equipos.
    # Si necesitas modo offline, el sistema usa respuestas rÃpidas pre-programadas.
    
    debug_print(" âŒ [SISTEMA] Todos los proveedores de IA fallaron")
    return SimpleMessage(
        "El asistente inteligente requiere conexiÃn a internet para preguntas avanzadas.\n\n"
        "ðŸ  **Mientras tanto:**\n"
        "- Usa las secciones del menÃ para navegar\n"
        "- Consulta la ayuda contextual en cada pÃgina\n"
        "- Prueba comandos como 'buscar alumno [nombre]' o 'quiÃn debe'\n\n"
        "ðŸŒ Conecta internet para acceder a respuestas mÃs inteligentes."
    ), True

def detectar_y_ejecutar_herramienta(pregunta: str, contexto: Dict[str, Any]) -> tuple:
    """
    Detecta la intenciÃn del usuario y ejecuta consultas DIRECTAS a PostgreSQL.
    NO depende de Node.js - todo en Python.
    """
    import psycopg2
    import os
    
    pregunta_lower = pregunta.lower()
    print(f"\n========== DEBUG DETECCION ==========")
    print(f"Pregunta original: {pregunta}")
    print(f"Pregunta lower: {pregunta_lower}")
    print(f"Tiene 'maestro': {'maestro' in pregunta_lower}")
    print(f"Tiene 'quiero': {'quiero' in pregunta_lower}")
    print(f"Tiene 'registrar': {'registrar' in pregunta_lower}")
    print(f"Tiene 'nuevo': {'nuevo' in pregunta_lower}")
    print(f"Tiene 'cómo': {'cómo' in pregunta_lower or 'como' in pregunta_lower}")
    print(f"=====================================\n")

    # ========================================
    # BLOQUE 0: GUIAS "COMO HAGO X" - SIN NECESIDAD DE BD NI LLM
    # Si la pregunta es "como hago X", respondemos con pasos directamente.
    # NUNCA bloqueamos por "no hay periodo activo" ni pedimos datos primero.
    # ========================================
    es_como = 'como' in pregunta_lower or 'c\u00f3mo' in pregunta_lower
    es_pregunta_de_guia = es_como or pregunta_lower.startswith(('qu\u00e9', 'que ', 'explica', 'dime c\u00f3mo', 'dime como', 'ayuda', 'necesito saber', 'ense\u00f1a'))

    GUIAS_COMO = [
        {
            "claves": ['asign', 'maestro', 'grupo'],
            "respuesta": (
                "Para asignar maestros a grupos tienes dos opciones:\n\n"
                "**Opcion A - Via menu Asignaciones (masiva):**\n"
                "1. Ve al menu **Asignaciones** en el panel izquierdo\n"
                "2. Selecciona el periodo\n"
                "3. Aparece la lista de grupos; elige el maestro para cada uno\n"
                "4. Guarda los cambios\n\n"
                "**Opcion B - Desde el grupo:**\n"
                "1. Ve al menu **Grupos**\n"
                "2. Abre el grupo que quieras asignar\n"
                "3. Campo **Maestro** -> elige de la lista\n"
                "4. Solo aparecen maestros certificados en ese nivel\n\n"
                "_Tip: Si el maestro no aparece, ve primero a Personal y verifica que tenga asignado ese nivel._\n\n"
                "Si quieres que yo lo haga, dime el nombre del grupo y el maestro."
            ),
            "acciones": [{"texto": "Ir a Asignaciones", "ruta": "/asignaciones"}, {"texto": "Ir a Grupos", "ruta": "/grupos"}]
        },
        {
            "claves": ['pago', 'registr'],
            "respuesta": (
                "Para registrar un pago sigue estos pasos:\n\n"
                "1. Ve al menu **Pagos** en el panel izquierdo\n"
                "2. Haz clic en **+ Nuevo Pago**\n"
                "3. Busca al alumno por nombre o matricula\n"
                "4. Selecciona la parcialidad que corresponde\n"
                "5. Llena: monto, metodo de pago y numero de recibo\n"
                "6. Guarda -> el recibo se genera automaticamente\n\n"
                "_Tip: Puedes adjuntar comprobante en formato imagen o PDF._\n\n"
                "Si quieres que yo lo registre, dime el nombre o matricula del alumno y la parcialidad."
            ),
            "acciones": [{"texto": "Ir a Pagos", "ruta": "/pagos"}]
        },
        {
            "claves": ['period', 'inici', 'creo', 'creo un period', 'nuevo period', 'crear period', 'activ'],
            "respuesta": (
                "Para crear o iniciar un nuevo periodo academico:\n\n"
                "1. Ve al menu **Periodos** en el panel izquierdo\n"
                "2. Haz clic en **+ Nuevo Periodo**\n"
                "3. Llena los datos:\n"
                "   - **Nombre** (ej: Enero-Junio 2026)\n"
                "   - **Fecha de inicio** y **fecha de fin**\n"
                "4. Activa el toggle **Periodo activo** (solo puede haber uno activo a la vez)\n"
                "5. Guarda\n\n"
                "_Tip: Al activar un nuevo periodo, el anterior se desactiva automaticamente._\n\n"
                "Si quieres que yo lo cree, dime el nombre y las fechas de inicio y fin."
            ),
            "acciones": [{"texto": "Ir a Periodos", "ruta": "/periodos"}]
        },
        {
            "claves": ['inscrib', 'inscripcion', 'inscripcion rapida'],
            "respuesta": (
                "Para inscribir un alumno:\n\n"
                "**Si el alumno es nuevo:**\n"
                "1. Ve a **Alumnos** -> **+ Nuevo Alumno**\n"
                "2. Registra sus datos (la matricula se genera automaticamente)\n\n"
                "**Para inscribirlo en un grupo:**\n"
                "1. Ve a **Inscripciones Rapidas** en el menu\n"
                "2. Busca al alumno por nombre o matricula\n"
                "3. Selecciona el grupo o nivel\n"
                "4. Confirma -> se crean sus 4 pagos automaticamente\n\n"
                "_Tip: Si el alumno ya existe, ve directo al paso de Inscripciones Rapidas._\n\n"
                "Si quieres que yo lo inscriba, dime su nombre o matricula y el grupo o nivel."
            ),
            "acciones": [{"texto": "Ir a Inscripciones", "ruta": "/inscripciones"}, {"texto": "Ir a Alumnos", "ruta": "/alumnos"}]
        },
        {
            "claves": ['calificaci', 'notas', 'parcial'],
            "respuesta": (
                "Para registrar calificaciones:\n\n"
                "**Maestros:**\n"
                "1. Ve a **Calificaciones** en tu menu\n"
                "2. Selecciona tu grupo\n"
                "3. Elige el parcial (1, 2 o 3)\n"
                "4. Ingresa la nota de cada alumno (escala 0-100, minimo aprobatorio: 70)\n"
                "5. Guarda\n\n"
                "**Coordinador - Carga masiva:**\n"
                "1. Menu **Calificaciones** -> descarga plantilla CSV del grupo\n"
                "2. Completa en Excel (columnas P1, P2, P3)\n"
                "3. Sube el archivo -> revisa vista previa -> Confirmar\n\n"
                "_Tip: El promedio se calcula automaticamente._"
            ),
            "acciones": [{"texto": "Ir a Calificaciones", "ruta": "/calificaciones"}]
        },
        {
            "claves": ['asistencia'],
            "respuesta": (
                "Para registrar asistencias:\n\n"
                "1. Ve al menu **Asistencias**\n"
                "2. Selecciona tu grupo y la fecha de clase\n"
                "3. Marca para cada alumno: Presente, Falta, Retardo o Justificada\n"
                "4. Guarda\n\n"
                "_Reglas del sistema:_\n"
                "- 3 retardos = 1 falta automaticamente\n"
                "- Minimo 80% de asistencia para aprobar nivel\n"
                "- Puedes editar asistencias posteriores con justificacion"
            ),
            "acciones": [{"texto": "Ir a Asistencias", "ruta": "/asistencias"}]
        },
        {
            "claves": ['maestro', 'personal', 'registr', 'nuevo maestro', 'agregar maestro'],
            "respuesta": (
                "Para registrar un maestro:\n\n"
                "1. Ve al menu **Personal** en el panel izquierdo\n"
                "2. Haz clic en **+ Nuevo Personal**\n"
                "3. Llena los datos (nombre, correo, telefono)\n"
                "4. Selecciona el rol: **Maestro**\n"
                "5. Asigna los niveles que imparte (Basico, Intermedio, Avanzado...)\n"
                "6. Guarda -> se envia invitacion por correo para que active su cuenta\n\n"
                "_Tip: El maestro solo aparecera en grupos del nivel que tiene asignado._\n\n"
                "Si quieres que yo lo registre, dime nombre completo, correo y niveles que imparte."
            ),
            "acciones": [{"texto": "Ir a Personal", "ruta": "/maestros"}]
        },
        {
            "claves": ['grupo', 'crea grupo', 'nuevo grupo'],
            "respuesta": (
                "Para crear un grupo:\n\n"
                "1. Ve al menu **Grupos**\n"
                "2. Haz clic en **+ Nuevo Grupo**\n"
                "3. Llena los datos:\n"
                "   - **Codigo** (ej: B1-01, I2-03)\n"
                "   - **Nivel** (Basico, Intermedio, Avanzado...)\n"
                "   - **Periodo** activo\n"
                "   - **Maestro** (opcional, puedes asignarlo despues)\n"
                "   - **Cupo maximo**\n"
                "   - **Horario** (dias y hora)\n"
                "4. Guarda\n\n"
                "_Tip: El turno (matutino/vespertino/sabatino) se determina automaticamente por los dias elegidos._\n\n"
                "Si quieres que yo lo cree, dime el codigo, nivel y horario."
            ),
            "acciones": [{"texto": "Ir a Grupos", "ruta": "/grupos"}]
        },
        {
            "claves": ['recibo', 'genera recibo', 'comprobante'],
            "respuesta": (
                "Para generar un recibo de pago:\n\n"
                "1. Ve al menu **Pagos**\n"
                "2. Busca el pago del alumno\n"
                "3. Haz clic en el icono de **Recibo** o **Descargar**\n"
                "4. Se genera el PDF automaticamente en Formato Universal (ventanilla de gobierno)\n\n"
                "_Tip: Los recibos se generan automaticamente al registrar cada pago._\n\n"
                "Si quieres el recibo de un alumno especifico, dime su nombre o matricula."
            ),
            "acciones": [{"texto": "Ir a Pagos", "ruta": "/pagos"}]
        },
    ]

    if es_pregunta_de_guia:
        for guia in GUIAS_COMO:
            # Verificar si al menos 2 claves coinciden, o 1 si es muy especifica
            claves = guia["claves"]
            coincidencias = sum(1 for c in claves if c in pregunta_lower)
            # Para claves compuestas (frases), verificar directamente
            frase_completa = any(len(c) > 6 and c in pregunta_lower for c in claves)
            if coincidencias >= 2 or frase_completa:
                debug_print(f" [GUIA] Pregunta 'como' detectada, devolviendo guia sin LLM ni BD")
                return True, {
                    "success": True,
                    "respuesta": guia["respuesta"],
                    "acciones": guia.get("acciones", []),
                    "sugerencias": []
                }

    # ========================================
    # Conectar a PostgreSQL con timeout corto
    try:
        db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'tescha_db'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', ''),
            'connect_timeout': 3  # Timeout de 3 segundos
        }
        debug_print(f" [BD] Conectando a PostgreSQL: {db_config['host']}:{db_config['port']}/{db_config['database']}")
        
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        debug_print(" ✓ [BD] Conexión exitosa a PostgreSQL")
    except Exception as e:
        debug_print(f" ❌ [BD] Error de conexión: {e}")
        # Si falla la BD, informar al usuario
        return True, {
            "success": False,
            "respuesta": "No se pudo conectar a la base de datos. Verifica que el sistema esté funcionando correctamente.",
            "sugerencias": ["Reiniciar sistema", "Contactar soporte"]
        }
    
    try:
        # ========================================
        # PASO 2: BÃšSQUEDA DE ALUMNO POR MATRÃCULA O NOMBRE (SÃšPER COMPLETA)
        # ========================================
        matricula_match = re.search(r'\b\d{9,10}\b', pregunta)  # Detectar matrícula (9-10 dígitos)
        
        print(f" [DETECCION] Matrícula encontrada: {matricula_match.group() if matricula_match else 'No'}")
        print(f" [DETECCION] Tiene 'informacion': {'informacion' in pregunta_lower or 'informacion' in pregunta_lower}")
        
        if matricula_match or any(palabra in pregunta_lower for palabra in ['buscar alumno', 'informacion alumno', 'dame info', 'datos del alumno', 'alumno con matricula']):
            print(" [DETECCION] Busqueda de alumno detectada")
            
            matricula = matricula_match.group() if matricula_match else None
            print(f" [DETECCION] Matrícula a buscar: {matricula}")
            
            if matricula:
                # Buscar por matrÃcula
                print(f" [DETECCION] Ejecutando query para matricula: {matricula}")
                cursor.execute("""
                    SELECT 
                        a.id, a.nombre, a.apellido_paterno, a.apellido_materno,
                        a.matricula, a.correo, a.telefono, a.carrera,
                        a.created_at
                    FROM alumnos a
                    WHERE a.matricula = %s
                    LIMIT 1
                """, (matricula,))
                print(" [DETECCION] Query ejecutada, obteniendo resultado...")
            else:
                # Buscar por nombre en la pregunta
                palabras = [p for p in pregunta.split() if len(p) > 3 and p.lower() not in ['alumno', 'buscar', 'informaciÃn', 'datos', 'dame']]
                if not palabras:
                    return True, {"success": True, "respuesta": "Por favor, proporciona el nombre o matrÃcula del alumno que buscas.", "sugerencias": []}
                
                nombre_buscar = palabras[0]
                cursor.execute("""
                    SELECT 
                        a.id, a.nombre, a.apellido_paterno, a.apellido_materno,
                        a.matricula, a.correo, a.telefono, a.carrera,
                        a.created_at
                    FROM alumnos a
                    WHERE a.nombre ILIKE %s OR a.apellido_paterno ILIKE %s
                    LIMIT 1
                """, (f'%{nombre_buscar}%', f'%{nombre_buscar}%'))
            
            alumno = cursor.fetchone()
            print(f" [DETECCION] Resultado alumno: {alumno}")
            
            if not alumno:
                print(" [DETECCION] No se encontró alumno")
                return True, {
                    "success": True, 
                    "respuesta": f"No encontre ningun alumno con {'matricula ' + matricula if matricula else 'ese nombre'}.\n\nVerifica que este bien escrito o buscalo en la seccion Alumnos.",
                    "acciones": [{"texto": "Ir a Alumnos", "ruta": "/alumnos"}]
                }
            
            print(" [DETECCION] Alumno encontrado, procesando datos...")
            
            alumno_id, nombre, ap_paterno, ap_materno, mat, correo, telefono, grado, fecha_reg = alumno
            nombre_completo = f"{nombre} {ap_paterno} {ap_materno or ''}".strip()
            print(f" [DETECCION] Datos basicos: {nombre_completo}, ID: {alumno_id}")
            
            # INFORMACION ACADEMICA ACTUAL
            print(" [DETECCION] Consultando inscripciones...")
            cursor.execute("""
                SELECT 
                    i.id, g.codigo as grupo, n.nombre as nivel,
                    p.nombre as periodo, p.activo,
                    m.nombre as maestro_nombre, m.apellido_paterno as maestro_apellido
                FROM inscripciones i
                JOIN grupos g ON i.grupo_id = g.id
                JOIN periodos p ON i.periodo_id = p.id
                LEFT JOIN niveles n ON g.nivel_id = n.id
                LEFT JOIN maestros m ON g.maestro_id = m.id
                WHERE i.alumno_id = %s
                ORDER BY p.activo DESC, g.fecha_inicio DESC
                LIMIT 5
            """, (alumno_id,))
            
            inscripciones = cursor.fetchall()
            print(f" [DETECCION] Inscripciones encontradas: {len(inscripciones)}")
            
            # ESTADO DE PAGOS
            print(" [DETECCION] Consultando pagos...")
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_pagos,
                    COUNT(*) FILTER (WHERE p.estatus = 'pagado') as pagados,
                    COUNT(*) FILTER (WHERE p.estatus = 'pendiente') as pendientes,
                    COUNT(*) FILTER (WHERE p.estatus = 'vencido') as vencidos,
                    COALESCE(SUM(p.monto_final) FILTER (WHERE p.estatus IN ('pendiente', 'vencido', 'prorroga')), 0) as deuda_total
                FROM pagos p
                JOIN inscripciones i ON p.inscripcion_id = i.id
                WHERE i.alumno_id = %s
            """, (alumno_id,))
            
            pagos_stats = cursor.fetchone()
            
            # CALIFICACIONES RECIENTES
            cursor.execute("""
                SELECT 
                    g.codigo as grupo, p.nombre as periodo,
                    c.parcial, c.calificacion
                FROM calificaciones c
                JOIN inscripciones i ON c.inscripcion_id = i.id
                JOIN grupos g ON i.grupo_id = g.id
                JOIN periodos p ON i.periodo_id = p.id
                WHERE i.alumno_id = %s
                ORDER BY p.activo DESC, c.parcial ASC
                LIMIT 10
            """, (alumno_id,))
            
            calificaciones = cursor.fetchall()
            
            # CONSTRUIR RESPUESTA COMPLETA (SIN EMOJIS)
            respuesta = f"**{nombre_completo}**\n\n"
            respuesta += "=" * 30 + "\n\n"
            
            # Datos Básicos
            respuesta += "**INFORMACION GENERAL**\n"
            respuesta += f"- Matricula: {mat}\n"
            respuesta += f"- Correo: {correo or 'No registrado'}\n"
            respuesta += f"- Telefono: {telefono or 'No registrado'}\n"
            respuesta += f"- Carrera: {grado or 'No especificado'}\n"
            respuesta += f"- Registrado: {fecha_reg.strftime('%d/%m/%Y') if fecha_reg else 'N/A'}\n\n"
            
            # Inscripciones
            if inscripciones:
                inscripcion_actual = inscripciones[0]
                # i.id, g.codigo, n.nombre, p.nombre, p.activo, per.nombre, per.apellido_paterno
                grupo = inscripcion_actual[1]
                nivel = inscripcion_actual[2]
                periodo = inscripcion_actual[3]
                maestro = f"{inscripcion_actual[5]} {inscripcion_actual[6]}" if inscripcion_actual[5] else "Sin asignar"
                
                respuesta += "**INSCRIPCION ACTUAL**\n"
                respuesta += f"- Grupo: {grupo} (Nivel {nivel})\n"
                respuesta += f"- Maestro: {maestro}\n"
                respuesta += f"- Periodo: {periodo}\n\n"
            else:
                respuesta += "**SIN INSCRIPCION ACTIVA**\n\n"
            
            # Estado de Pagos
            total, pagados, pendientes, vencidos, deuda = pagos_stats
            respuesta += "**ESTADO FINANCIERO**\n"
            
            if deuda > 0:
                respuesta += f"- ADEUDO PENDIENTE: ${deuda:,.2f}\n"
                respuesta += f"- Pagos vencidos: {vencidos}\n"
                respuesta += f"- Pagos pendientes: {pendientes}\n"
            else:
                respuesta += f"- AL CORRIENTE (Sin adeudos)\n"
            
            respuesta += f"- Pagos completados: {pagados}/{total}\n\n"
            
            # Calificaciones
            if calificaciones:
                respuesta += "**CALIFICACIONES RECIENTES**\n"
                # Agrupar por grupo
                from collections import defaultdict
                cals_por_grupo = defaultdict(list)
                for cal in calificaciones:
                    grupo, periodo, parcial, calificacion = cal
                    cals_por_grupo[f"{grupo} ({periodo})"].append((parcial, calificacion))
                
                for grupo_info, parciales in cals_por_grupo.items():
                    respuesta += f"- {grupo_info}: "
                    parciales_str = [f"P{p}: {c or '-'}" for p, c in sorted(parciales)]
                    respuesta += ", ".join(parciales_str) + "\n"
            else:
                respuesta += "**SIN CALIFICACIONES REGISTRADAS**\n"
            
            # Sugerencias basadas en el estado
            sugerencias = []
            acciones = [
                {"texto": "Ver perfil completo", "ruta": f"/alumnos"},
                {"texto": "Ver pagos", "ruta": "/pagos"}
            ]
            
            if deuda > 0:
                sugerencias.append("Como registrar su pago?")
                acciones.append({"texto": "Registrar pago", "ruta": "/pagos"})
            
            if not calificaciones:
                sugerencias.append("Como subir calificaciones?")
            
            print(f" [DETECCION] Respuesta construida, longitud: {len(respuesta)} caracteres")
            print(f" [DETECCION] Retornando resultado con {len(acciones)} acciones y {len(sugerencias)} sugerencias")
            
            return True, {
                "success": True,
                "respuesta": respuesta,
                "acciones": acciones,
                "sugerencias": sugerencias
            }
        
        # Detectar solicitud de registrar maestro (ACCIÓN, no pregunta)
        if not any(p in pregunta_lower for p in ['cómo', 'como']) and ('maestro' in pregunta_lower and any(palabra in pregunta_lower for palabra in ['registrar', 'nuevo', 'crear', 'agregar', 'quiero'])):
            debug_print(" [DETECCION] Solicitud de registrar maestro - devolviendo formulario")
            return True, {
                "success": True,
                "respuesta": "Para registrar un nuevo maestro, necesito los siguientes datos:\n\n" +
                    "**Información Personal:**\n" +
                    "- Nombre(s)\n" +
                    "- Apellido Paterno\n" +
                    "- Apellido Materno\n\n" +
                    "**Información de Contacto:**\n" +
                    "- Correo electrónico\n" +
                    "- Teléfono\n\n" +
                    "**Información Académica:**\n" +
                    "- Niveles que imparte (Básico, Intermedio, Avanzado, etc.)\n\n" +
                    "Proporciona estos datos y procederé con el registro.",
                "acciones": [
                    {"texto": "Ir a sección Maestros", "ruta": "/maestros"},
                    {"texto": "Ver tutorial", "ruta": None}
                ],
                "tutorial": [
                    "1. Ve a 'Maestros' en el menú izquierdo",
                    "2. Haz clic en 'Nuevo Maestro'",
                    "3. Completa el formulario con los datos",
                    "4. Selecciona los niveles que imparte",
                    "5. Guarda el registro"
                ],
                "sugerencias": ["Cómo registro un maestro manualmente?", "Mostrar maestros actuales"]
            }
        if any(palabra in pregunta_lower for palabra in ['registrar alumno', 'nuevo alumno', 'crear alumno', 'agregar alumno']):
            debug_print(" ðŸ  [DETECCIÃ N] Solicitud de registrar alumno detectada")
            return True, {
                "success": True,
                "respuesta": "ðŸ  Para registrar un nuevo alumno, ve a la secciÃn **Alumnos** y haz clic en 'Nuevo Alumno'.\n\n" +
                    "NecesitarÃs:\n" +
                    "- Nombre completo\n" +
                    "- MatrÃcula (se genera automática)\n" +
                    "- Correo y telÃfono\n" +
                    "- Grado acadÃmico\n\n" +
                    "ðŸ  **Tip:** TambiÃn puedes usar 'Inscripciones Rápidas' para inscribir directamente.",
                "acciones": [
                    {"texto": "Ir a Alumnos", "ruta": "/alumnos"},
                    {"texto": "Ir a Inscripciones", "ruta": "/inscripciones"}
                ],
                "tutorial": ["1. Ve a 'Alumnos' en el menÃ", "2. Clic en 'Nuevo Alumno'", "3. Completa el formulario"]
            }
        
        # Detectar consultas de pagos/adeudos
        if any(palabra in pregunta_lower for palabra in ['debe', 'deben', 'adeudo', 'vencido', 'pendiente', 'pago']):
            debug_print(" ðŸ  [DETECCIÃ N] Consulta de adeudos, consultando BD directamente...")
            
            # Obtener periodo activo
            cursor.execute("SELECT id FROM periodos WHERE activo = true LIMIT 1")
            periodo = cursor.fetchone()
            if not periodo:
                return True, {"success": True, "respuesta": "No hay un periodo activo configurado.", "sugerencias": []}
            
            periodo_id = periodo[0]
            
            # Consultar adeudos
            cursor.execute("""
                SELECT 
                    a.nombre, a.apellido_paterno, a.matricula,
                    p.concepto, p.monto_final as monto, p.estatus,
                    COALESCE(p.fecha_limite_prorroga, p.fecha_vencimiento) as fecha_vence
                FROM pagos p
                JOIN inscripciones i ON p.inscripcion_id = i.id
                JOIN alumnos a ON i.alumno_id = a.id
                WHERE i.periodo_id = %s 
                AND p.estatus IN ('pendiente', 'prorroga', 'vencido')
                ORDER BY fecha_vence ASC
                LIMIT 50
            """, (periodo_id,))
            
            estudiantes = cursor.fetchall()
            
            if estudiantes:
                respuesta = "Los estudiantes con pagos pendientes/vencidos son:\n\n"
                respuesta += "| Nombre | Apellido | MatrÃcula | Concepto | Monto | Estatus | Fecha Vence |\n"
                respuesta += "| --- | --- | --- | --- | --- | --- | --- |\n"
                
                for est in estudiantes[:20]:
                    nombre, apellido, matricula, concepto, monto, estatus, fecha = est
                    respuesta += f"| {nombre} | {apellido} | {matricula} | {concepto} | {monto} | {estatus} | {fecha} |\n"
                
                if len(estudiantes) > 20:
                    respuesta += f"\n... y {len(estudiantes) - 20} mÃs."
                
                return True, {"success": True, "respuesta": respuesta, "sugerencias": ["Ver detalles", "Generar reporte"]}
            else:
                return True, {"success": True, "respuesta": "ÂExcelente! No hay pagos vencidos.", "sugerencias": []}
        
        # Detectar consulta de DETALLES financieros (desglose completo)
        if any(palabra in pregunta_lower for palabra in ['detalles', 'detalle', 'desglose', 'quiÃn pagÃ', 'quien pago', 'listado de pagos']):
            debug_print(" ðŸ Š [DETECCIÃ N] Solicitando desglose detallado de finanzas...")
            
            cursor.execute("SELECT id, nombre FROM periodos WHERE activo = true LIMIT 1")
            periodo = cursor.fetchone()
            if not periodo:
                return True, {"success": True, "respuesta": "No hay un periodo activo configurado.", "sugerencias": []}
            
            periodo_id, periodo_nombre = periodo
            
            # Desglose detallado
            cursor.execute("""
                SELECT 
                    a.nombre, a.apellido_paterno, a.matricula,
                    p.concepto, p.monto_final, p.estatus,
                    p.fecha_pago, p.fecha_vencimiento
                FROM pagos p
                JOIN inscripciones i ON p.inscripcion_id = i.id
                JOIN alumnos a ON i.alumno_id = a.id
                WHERE i.periodo_id = %s
                ORDER BY p.estatus DESC, p.fecha_vencimiento ASC
                LIMIT 100
            """, (periodo_id,))
            
            pagos = cursor.fetchall()
            
            if not pagos:
                return True, {"success": True, "respuesta": "No hay pagos registrados en este periodo.", "sugerencias": []}
            
            # Agrupar por estatus
            pagados = [p for p in pagos if p[5] in ('pagado', 'completado')]
            pendientes = [p for p in pagos if p[5] == 'pendiente']
            vencidos = [p for p in pagos if p[5] == 'vencido']
            
            respuesta = f"ðŸ   **Desglose Detallado - {periodo_nombre}**\n\n"
            
            # SecciÃn: Pagos completados
            if pagados:
                respuesta += f"âœ  **Pagos Completados ({len(pagados)})**\n\n"
                respuesta += "| Alumno | MatrÃcula | Concepto | Monto | Fecha |\n"
                respuesta += "| --- | --- | --- | --- | --- |\n"
                for p in pagados[:10]:
                    respuesta += f"| {p[0]} {p[1]} | {p[2]} | {p[3]} | ${p[4]:,.2f} | {p[6]} |\n"
                if len(pagados) > 10:
                    respuesta += f"\n_...y {len(pagados) - 10} mÃs._\n"
                respuesta += "\n"
            
            # SecciÃn: Pendientes
            if pendientes:
                respuesta += f"â **Pendientes ({len(pendientes)})**\n\n"
                respuesta += "| Alumno | MatrÃcula | Concepto | Monto | Vence |\n"
                respuesta += "| --- | --- | --- | --- | --- |\n"
                for p in pendientes[:10]:
                    respuesta += f"| {p[0]} {p[1]} | {p[2]} | {p[3]} | ${p[4]:,.2f} | {p[7]} |\n"
                if len(pendientes) > 10:
                    respuesta += f"\n_...y {len(pendientes) - 10} mÃs._\n"
                respuesta += "\n"
            
            # SecciÃn: Vencidos
            if vencidos:
                respuesta += f"ðŸš **Vencidos ({len(vencidos)})**\n\n"
                respuesta += "| Alumno | MatrÃcula | Concepto | Monto | Vencido |\n"
                respuesta += "| --- | --- | --- | --- | --- |\n"
                for p in vencidos[:10]:
                    respuesta += f"| {p[0]} {p[1]} | {p[2]} | {p[3]} | ${p[4]:,.2f} | {p[7]} |\n"
                if len(vencidos) > 10:
                    respuesta += f"\n_...y {len(vencidos) - 10} mÃs._\n"
            
            return True, {"success": True, "respuesta": respuesta, "sugerencias": ["Generar reporte", "Ver adeudos"]}
        
        # Detectar solicitud de GENERAR REPORTE (descarga Excel/PDF)
        if any(palabra in pregunta_lower for palabra in ['generar reporte', 'genera reporte', 'descargar reporte', 'exportar', 'descarga excel']):
            debug_print(" ðŸ  [DETECCIÃ N] Generando enlace de descarga de reporte...")
            
            cursor.execute("SELECT id, nombre FROM periodos WHERE activo = true LIMIT 1")
            periodo = cursor.fetchone()
            if not periodo:
                return True, {"success": True, "respuesta": "No hay un periodo activo configurado.", "sugerencias": []}
            
            periodo_id, periodo_nombre = periodo
            
            # Determinar quÃ tipo de reporte generar basado en contexto
            tipo_reporte = 'vencidos'  # Por defecto
            
            if 'finanzas' in pregunta_lower or 'ingresos' in pregunta_lower:
                tipo_reporte = 'ingresos'
            elif 'adeudo' in pregunta_lower or 'vencido' in pregunta_lower or 'pendiente' in pregunta_lower:
                tipo_reporte = 'vencidos'
            elif 'prorroga' in pregunta_lower:
                tipo_reporte = 'prorrogas-activas'
            
            respuesta = f"**Reporte Listo para Descargar**\n\n"
            respuesta += f"Tipo: **{tipo_reporte.replace('-', ' ').title()}**\n"
            respuesta += f"Periodo: **{periodo_nombre}**\n\n"
            respuesta += "Puedes descargar el reporte en formato PDF haciendo clic abajo.\n"
            respuesta += "El archivo incluye todos los datos completos para análisis."
            
            # URL de descarga (sin /api porque el frontend ya lo agrega)
            url_descarga = f"/reportes/exportar/{tipo_reporte}?periodo_id={periodo_id}&formato=pdf"
            
            return True, {
                "success": True, 
                "respuesta": respuesta, 
                "acciones": [
                    {"texto": "Descargar PDF", "ruta": url_descarga, "tipo": "descarga"},
                    {"texto": "Ir a Reportes", "ruta": "/reportes"}
                ],
                "sugerencias": ["Ver estadísticas", "Quién debe más?"]
            }
        
        # Detectar consultas de finanzas (resumen) - OPTIMIZADO
        if any(palabra in pregunta_lower for palabra in ['finanzas', 'estadística', 'recaudado', 'ingresos']):
            debug_print(" [DETECCION] Consulta de finanzas, consultando BD...")
            
            # Detectar si menciona un año específico
            año_match = re.search(r'\b(20\d{2})\b', pregunta)
            
            try:
                if año_match:
                    año = año_match.group(1)
                    debug_print(f" [AÑO DETECTADO] Buscando periodo para año {año}")
                    
                    cursor.execute("""
                        SELECT id, nombre FROM periodos 
                        WHERE nombre ILIKE %s 
                        LIMIT 1
                    """, (f'%{año}%',))
                    periodo = cursor.fetchone()
                    
                    if not periodo:
                        cursor.close()
                        conn.close()
                        return True, {
                            "success": True, 
                            "respuesta": f"No existe ningun periodo registrado para el año {año}. Los periodos disponibles puedes verlos en la seccion de Periodos.", 
                            "acciones": [{"texto": "Ver Periodos", "ruta": "/periodos"}],
                            "sugerencias": ["¿Cuanto hemos recaudado este año?", "Ver periodos disponibles"]
                        }
                    
                    periodo_id = periodo[0]
                    periodo_nombre = periodo[1]
                else:
                    # Si no menciona año, usar periodo activo
                    cursor.execute("SELECT id, nombre FROM periodos WHERE activo = true LIMIT 1")
                    periodo = cursor.fetchone()
                    if not periodo:
                        cursor.close()
                        conn.close()
                        return True, {"success": True, "respuesta": "No hay un periodo activo configurado.", "sugerencias": []}
                    
                    periodo_id = periodo[0]
                    periodo_nombre = periodo[1]
                
                # Consulta optimizada con índices
                cursor.execute("""
                    SELECT 
                        COALESCE(SUM(CASE WHEN p.estatus IN ('pagado', 'completado') THEN p.monto_final ELSE 0 END), 0) as total_recaudado,
                        COALESCE(SUM(CASE WHEN p.estatus IN ('pendiente', 'vencido', 'prorroga') THEN p.monto_final ELSE 0 END), 0) as total_pendiente,
                        COUNT(DISTINCT i.id) as total_inscripciones,
                        COUNT(DISTINCT i.alumno_id) as alumnos_activos
                    FROM inscripciones i
                    LEFT JOIN pagos p ON p.inscripcion_id = i.id
                    WHERE i.periodo_id = %s
                """, (periodo_id,))
                
                stats = cursor.fetchone()
                cursor.close()
                conn.close()
                
                # Verificar si hay datos reales
                if stats[2] == 0 and stats[0] == 0:
                    respuesta = f"**PERIODO: {periodo_nombre}**\n\n"
                    respuesta += f"No hay datos registrados para este periodo.\n"
                    respuesta += f"No se han registrado inscripciones ni pagos."
                else:
                    respuesta = f"**ESTADISTICAS FINANCIERAS**\n"
                    respuesta += f"**Periodo:** {periodo_nombre}\n\n"
                    respuesta += f"Total recaudado: ${stats[0]:,.2f}\n"
                    respuesta += f"Por cobrar: ${stats[1]:,.2f}\n"
                    respuesta += f"Inscripciones: {stats[2]}\n"
                    respuesta += f"Alumnos activos: {stats[3]}"
                
                return True, {"success": True, "respuesta": respuesta, "sugerencias": ["Ver detalles", "Ver periodos disponibles"]}
                
            except Exception as e:
                debug_print(f" [ERROR] Error en consulta de finanzas: {e}")
                cursor.close()
                conn.close()
                return True, {
                    "success": False,
                    "respuesta": "Hubo un error al consultar las finanzas. Intenta de nuevo.",
                    "sugerencias": []
                }
        
        # Detectar bÃsqueda por matrÃcula
        matricula_match = re.search(r'\b\d{9}\b', pregunta)
        if matricula_match:
            matricula = matricula_match.group()
            debug_print(f" ðŸ  [DETECCIÃ N] BÃsqueda de alumno {matricula}, consultando BD directamente...")
            
            cursor.execute("""
                SELECT 
                    a.nombre, a.apellido_paterno, a.apellido_materno,
                    a.matricula, a.correo, a.telefono,
                    g.codigo as grupo, n.nombre as nivel
                FROM alumnos a
                LEFT JOIN inscripciones i ON a.id = i.alumno_id AND i.periodo_id = (SELECT id FROM periodos WHERE activo = true LIMIT 1)
                LEFT JOIN grupos g ON i.grupo_id = g.id
                LEFT JOIN niveles n ON g.nivel_id = n.id
                WHERE a.matricula = %s
                LIMIT 1
            """, (matricula,))
            
            alumno = cursor.fetchone()
            
            if alumno:
                nombre, ap_pat, ap_mat, mat, correo, tel, grupo, nivel = alumno
                respuesta = f"ðŸ  **{nombre} {ap_pat}**\n\n"
                respuesta += f"MatrÃcula: {mat}\n"
                respuesta += f"Grupo: {grupo or 'Sin asignar'}\n"
                respuesta += f"Nivel: {nivel or 'Sin asignar'}"
                return True, {"success": True, "respuesta": respuesta, "sugerencias": ["Ver pagos", "Ver calificaciones"]}
        
        return False, {}
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        debug_print(f" ❌ [BD] Error en consulta: {e}")
        debug_print(f" ❌ [BD] Traceback completo:\n{error_detail}")
        # Retornar el error al usuario en modo debug
        if os.getenv("DEBUG_IA", "false").lower() == "true":
            return True, {
                "success": False,
                "respuesta": f"Error al consultar la base de datos:\n\n{str(e)}\n\nVerifica la conexión a PostgreSQL.",
                "error": str(e)
            }
        return False, {}
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def procesar_pregunta_ia(pregunta: str, contexto: Dict[str, Any], historial: List[Dict[str, Any]] = []) -> Dict[str, Any]:
    debug_print("[IA_ENGINE] --- Brazo Derecho Iniciado ---")
    
    pregunta_lower = pregunta.lower()
    
    # ========================================
    # FORZAR IA CONVERSACIONAL para registros/creaciones
    # ========================================
    flujos_conversacionales = [
        "registrar maestro", "nuevo maestro", "crear maestro", "agregar maestro",
        "registrar alumno", "nuevo alumno", "inscribir alumno",
        "crear grupo", "nuevo grupo", "registrar grupo",
        "registrar pago", "nuevo pago"
    ]
    
    # ========================================
    # PRIORIDAD MAXIMA: RESPUESTAS SIMPLES (Sin emojis, sin IA)
    # ========================================
    encontrado_simple, respuesta_simple = buscar_respuesta_simple(pregunta)
    if encontrado_simple:
        debug_print(" [RESPUESTA_SIMPLE] Devolviendo respuesta sin IA ni emojis")
        return respuesta_simple
    
    usar_ia_conversacional = any(flujo in pregunta_lower for flujo in flujos_conversacionales)
    
    if not usar_ia_conversacional:
        # ========================================
        # DETECCIÓN Y EJECUCIÓN DE HERRAMIENTAS DIRECTAS
        # ========================================
        ejecuto, resultado = detectar_y_ejecutar_herramienta(pregunta, contexto)
        if ejecuto:
            debug_print(" [DETECCIÓN] Herramienta ejecutada directamente, devolviendo resultado")
            return resultado
    
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in historial:
            role = "assistant" if msg.get("tipo") == "asistente" else "user"
            messages.append({"role": role, "content": msg.get("mensaje", "")})

        # REGLA DE ORO: si la pregunta es "como hago X", inyectar recordatorio IRROMPIBLE
        # para evitar que el LLM llame herramientas y bloquee por "no hay periodo activo"
        if 'como' in pregunta_lower or 'c\u00f3mo' in pregunta_lower:
            messages.append({
                "role": "system",
                "content": (
                    "INSTRUCCION PRIORITARIA PARA ESTA RESPUESTA: "
                    "El usuario pregunta COMO hacer algo. "
                    "NO llames ninguna herramienta. "
                    "NO pidas datos. "
                    "NO menciones si hay periodo activo o no. "
                    "RESPONDE DIRECTAMENTE con los pasos a seguir en el menu del sistema, "
                    "y al final ofrece ayuda si el usuario quiere que lo hagas tu."
                )
            })

        messages.append({"role": "user", "content": pregunta})
        
        last_content = "He analizado los datos disponibles."
        for i in range(6): # MÃs iteraciones para procesos complejos
            debug_print(f"[IA_PASO_{i+1}] Consultando...")
            response_msg, is_offline = solicitar_ia(messages, i+1)
            
            if response_msg.content:
                last_content = response_msg.content

            # Si no hay llamadas a herramientas, es la respuesta final
            if not getattr(response_msg, 'tool_calls', None):
                return parsear_respuesta_final(response_msg.content)
            
            # Registrar la respuesta del asistente
            messages.append(response_msg)
            
            # Ejecutar herramientas
            hubo_resultado_vacio = False
            nombres_vacios = []
            for tool_call in response_msg.tool_calls:
                fn_name = tool_call.function.name
                fn_args = json.loads(tool_call.function.arguments) if isinstance(tool_call.function.arguments, str) else tool_call.function.arguments
                
                debug_print(f" [EJECUTANDO_HERRAMIENTA] {fn_name}")
                resultado = ejecutar_herramienta_en_node(fn_name, fn_args, {**contexto, "preguntaActual": pregunta, "historial": historial})

                # -------------------------------------------------------
                # DETECCION DE RESULTADO VACIO: si la herramienta no tiene
                # datos, enriquecer el resultado para que el LLM no se
                # bloquee sino que ofrezca solucion al usuario.
                # -------------------------------------------------------
                resultado_str = json.dumps(resultado, ensure_ascii=False)
                sin_datos = (
                    resultado is None
                    or resultado == {}
                    or resultado_str in ('null', '{}', '[]', '""', '')
                    or (isinstance(resultado, dict) and not resultado.get('data') and not resultado.get('id') and not resultado.get('periodo_id') and not resultado.get('rows'))
                    or (isinstance(resultado, list) and len(resultado) == 0)
                    or (isinstance(resultado, dict) and resultado.get('error'))
                )
                if sin_datos:
                    hubo_resultado_vacio = True
                    nombres_vacios.append(fn_name)
                    # Adjuntar al resultado la instruccion de que el LLM no se bloquee
                    if isinstance(resultado, dict):
                        resultado['_sin_datos'] = True
                        resultado['_instruccion'] = (
                            f"La herramienta '{fn_name}' no devolvio datos. "
                            "ESTO NO ES UN BLOQUEO. "
                            "Debes responder al usuario explicando el estado actual "
                            "(que no hay datos todavia) Y a continuacion dar los pasos "
                            "exactos para solucionarlo desde el menu del sistema. "
                            "NUNCA pidas datos al usuario antes de explicar como hacerlo."
                        )
                    else:
                        resultado = {
                            '_sin_datos': True,
                            '_instruccion': (
                                f"La herramienta '{fn_name}' no devolvio datos. "
                                "ESTO NO ES UN BLOQUEO. "
                                "Debes responder al usuario explicando el estado actual "
                                "Y dar los pasos exactos para solucionarlo desde el menu. "
                                "NUNCA pidas datos antes de explicar como hacerlo."
                            )
                        }

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": fn_name,
                    "content": json.dumps(resultado, ensure_ascii=False)
                })

            # Si alguna herramienta volvio vacia, inyectar recordatorio al LLM
            if hubo_resultado_vacio:
                messages.append({
                    "role": "system",
                    "content": (
                        "RECORDATORIO CRITICO: Las herramientas " + ", ".join(nombres_vacios) + " no devolvieron datos. "
                        "Esto significa que aun no hay informacion configurada (periodo, grupos, etc). "
                        "TU RESPUESTA DEBE: "
                        "1) Decir brevemente que aun no hay [dato] configurado. "
                        "2) Explicar los pasos exactos para crearlo/configurarlo desde el menu. "
                        "3) Ofrecer hacerlo si el usuario da los datos necesarios. "
                        "PROHIBIDO: bloquear la respuesta, pedir datos antes de explicar, decir 'no puedo'."
                    )
                })
        
        return parsear_respuesta_final(last_content)

    except Exception as e:
        import traceback
        msg_fatal = str(e)
        traceback_str = traceback.format_exc()
        debug_print(f"FATAL ERROR IA: {msg_fatal}")
        debug_print(f"TRACEBACK:\n{traceback_str}")
        print(f"\n❌ ERROR COMPLETO:\n{traceback_str}\n")
        return {
            "success": False, 
            "respuesta": "Lo siento, tuve un problema al procesar tu solicitud. Por el momento intenta de nuevo.",
            "alertas": ["SYSTEM_ERROR"]
        }

def parsear_respuesta_final(content: str) -> Dict[str, Any]:
    """
    Parser SUPER ROBUSTO que maneja múltiples formatos de JSON de diferentes IAs
    """
    tutorial, acciones, sugerencias = [], [], []
    respuesta_texto = content or ""
    
    # ELIMINACIÓN TOTAL DE EMOJIS: Convertir TODOS los emojis a nada (no a texto)
    # Esto elimina el problema de raíz - sin emojis, sin corrupción
    
    # Primero: Eliminar rangos completos de Unicode emojis
    respuesta_texto = re.sub(r'[\U0001F000-\U0001FFFF]', '', respuesta_texto)  # Emojis y símbolos
    respuesta_texto = re.sub(r'[\U00002600-\U000027BF]', '', respuesta_texto)  # Símbolos varios
    respuesta_texto = re.sub(r'[\U0001F300-\U0001F9FF]', '', respuesta_texto)  # Emojis extendidos
    respuesta_texto = re.sub(r'[\U0001FA00-\U0001FAFF]', '', respuesta_texto)  # Símbolos extendidos
    respuesta_texto = re.sub(r'[\U00002700-\U000027BF]', '', respuesta_texto)  # Dingbats
    
    # Segundo: Lista específica de emojis comunes (por si acaso)
    emojis_a_eliminar = [
        '', '', '', '️', '', '', '', '', '', '', 
        '', '⏰', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '⭐', '', '',
        '', '️', '', '', '', '', '', '', '', '',
        '', '', '', '', '⬛', '⬜', '', '', '', ''
    ]
    
    for emoji in emojis_a_eliminar:
        respuesta_texto = respuesta_texto.replace(emoji, '')
    
    # Eliminar cualquier emoji restante (rangos Unicode)
    respuesta_texto = re.sub(r'[\U0001F000-\U0001FFFF]', '', respuesta_texto)
    respuesta_texto = re.sub(r'[\U00002600-\U000027BF]', '', respuesta_texto)
    
    # Limpiar espacios multiples y dobles asteriscos solos
    respuesta_texto = re.sub(r'\s+', ' ', respuesta_texto).strip()
    respuesta_texto = re.sub(r'\*\*\s+\*\*', '**', respuesta_texto)
    respuesta_texto = re.sub(r'\n\s*\n\s*\n', '\n\n', respuesta_texto)
    
    # Limpiar bloques de codigo markdown
    respuesta_texto = respuesta_texto.replace("```json", "").replace("```", "")
    
    # Intentar extraer JSON
    json_extraido = False
    
    # Formato 1: ---JSON_START--- ... ---JSON_END---
    if "---JSON_START---" in respuesta_texto:
        try:
            partes = respuesta_texto.split("---JSON_START---")
            respuesta_texto = partes[0].strip()
            
            json_str = partes[1].split("---JSON_END---")[0].strip()
            data = json.loads(json_str)
            tutorial = data.get("tutorial", [])
            acciones = data.get("acciones", [])
            sugerencias = data.get("sugerencias", [])
            json_extraido = True
        except:
            pass
    
    # Formato 2: --- ... --- (sin JSON_START/END) o bloques JSON sueltos
    if not json_extraido and "{" in respuesta_texto:
        try:
            # Buscar el primer { y el Ãltimo }
            inicio_json = respuesta_texto.find("{")
            fin_json = respuesta_texto.rfind("}") + 1
            
            if inicio_json != -1 and fin_json > inicio_json:
                json_str = respuesta_texto[inicio_json:fin_json]
                data = json.loads(json_str)
                
                # Extraer texto antes del JSON
                texto_antes = respuesta_texto[:inicio_json].strip()
                texto_antes = texto_antes.replace("---", "").strip()
                
                if texto_antes:
                    respuesta_texto = texto_antes
                
                sugerencias = data.get("sugerencias", [])
                tutorial = data.get("tutorial", [])
                acciones = data.get("acciones", [])
                json_extraido = True
        except:
            pass
    
    # Si la respuesta es SOLO JSON sin texto real
    if not respuesta_texto or respuesta_texto.strip() in ["", "{", "}", "---", "```"]:
        if sugerencias:
            respuesta_texto = "InformaciÃn disponible. " + " ".join(sugerencias[:2])
        else:
            respuesta_texto = "Entendido. ÂEn quÃ mÃs puedo ayudarte?"
            
    return {
        "success": True, 
        "respuesta": respuesta_texto, 
        "tutorial": tutorial, 
        "acciones": acciones, 
        "sugerencias": sugerencias
    }



