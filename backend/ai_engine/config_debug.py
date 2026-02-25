# -*- coding: utf-8 -*-
"""
Configuración de debug para el motor de IA
"""
import os

DEBUG_MODE = os.getenv("DEBUG_IA", "false").lower() == "true"

def debug_print(mensaje: str):
    """Imprime mensajes de debug solo si DEBUG_MODE está activado"""
    if DEBUG_MODE:
        print(f"[DEBUG] {mensaje}")
