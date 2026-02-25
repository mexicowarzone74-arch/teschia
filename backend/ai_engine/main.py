from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import uvicorn
from dotenv import load_dotenv
from brain import procesar_pregunta_ia
import json

load_dotenv()

app = FastAPI(title="TESCHA AI Engine", description="Motor de Inteligencia Artificial para el sistema TESCHA")

# Configurar respuestas JSON con UTF-8 explícito
@app.middleware("http")
async def add_utf8_headers(request, call_next):
    response = await call_next(request)
    if "application/json" in response.headers.get("content-type", ""):
        response.headers["content-type"] = "application/json; charset=utf-8"
    return response

class PreguntaRequest(BaseModel):
    pregunta: str
    contexto: Dict[str, Any]
    historial: Optional[List[Dict[str, Any]]] = []

@app.get("/")
async def root():
    return {"status": "online", "engine": "Python 3.11", "service": "TESCHA AI Engine"}

@app.post("/pregunta")
async def responder_pregunta(request: PreguntaRequest):
    try:
        resultado = procesar_pregunta_ia(
            request.pregunta, 
            request.contexto, 
            request.historial
        )
        # Asegurar que la respuesta sea JSON UTF-8 válido
        return JSONResponse(
            content=resultado,
            media_type="application/json; charset=utf-8"
        )
    except Exception as e:
        print(f"Error en endpoint /pregunta: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("AI_PORT", 5050))
    uvicorn.run(app, host="0.0.0.0", port=port)
