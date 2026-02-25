export const responderPregunta = async (pregunta, contexto) => {
  try {
    const { rol, userId } = contexto;
    
    // Obtener información del sistema para darle contexto a la IA
    const metricas = await obtenerMetricasSistema();
    const alertas = await detectarProblemasComunes(userId, rol);
    
    const systemPrompt = `Eres el Mentor Experto y Guía del Sistema TESCHA/CELEX. Tu misión no es solo ejecutar, sino ENSEÑAR y ORIENTAR al usuario.

TU FILOSOFÍA:
1. **Mentoría**: Si el usuario no sabe qué hacer, guíalo paso a paso. Explica el "porqué" de las cosas si es necesario.
2. **Datos Reales Primero**: Tu prioridad es mostrar información real de la base de datos.
3. **Cero Alucinaciones**: Tienes PROHIBIDO inventar datos (nombres, correos, IDs, fechas).
4. **Autorización Humana**: Tú no creas nada por "intuición". Solo procesas registros cuando el usuario te ha dado explícitamente los datos.

REGLAS DE ORO:
- NO use IDs técnicos (ej. "Periodo 9"). Use nombres ("Periodo 2024-2").
- Si hay problemas, consulta estas alertas: ${JSON.stringify(alertas)}.
- Sé profesional, paciente y universitario.

FORMATO DE RESPUESTA:
- Texto humano, universitario y experto.
- Si es guía, incluye:
---JSON_START---
{
  "tutorial": ["Paso 1...", "Paso 2..."],
  "acciones": [{"texto": "Ir a [Módulo]", "ruta": "/ruta"}],
  "sugerencias": ["¿Cómo hago [otra cosa]?"]
}
---JSON_END---`;

    const messages = [ { role: 'system', content: systemPrompt } ];

    if (contexto.historial && contexto.historial.length > 0) {
      contexto.historial.forEach(msg => {
        if (msg.tipo === 'asistente' || msg.tipo === 'usuario') {
          messages.push({ role: msg.tipo === 'asistente' ? 'assistant' : 'user', content: msg.mensaje || '' });
        }
      });
    }

    messages.push({ role: 'user', content: pregunta });

    // AGENT LOOP
    let aiResponse = await ejecutarChatAgente(messages, aiToolsDefinition);
    let iterations = 0;
    while (aiResponse && aiResponse.tool_calls && iterations < 3) {
      iterations++;
      const toolMessages = [];
      for (const tc of aiResponse.tool_calls) {
        try {
          const fn = tc.function.name;
          const args = JSON.parse(tc.function.arguments);
          
          // 🛡️ GUARDIÁN DE SEGURIDAD: Evitar creaciones con datos inventados
          if (['crear_personal', 'crear_alumno', 'registrar_pago', 'crear_grupo'].includes(fn)) {
              const userTexts = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
              const dataToCheck = [args.nombre, args.correo, args.apellido_paterno, args.monto, args.codigo].filter(Boolean);
              
              const dataVerified = dataToCheck.every(val => userTexts.includes(val.toString().toLowerCase()));

              if (!dataVerified && dataToCheck.length > 0) {
                  logger.warn(`SEGURIDAD: Bloqueando intento de IA de crear ${fn} sin datos corroborados.`);
                  toolMessages.push({ 
                      tool_call_id: tc.id, 
                      role: 'tool', 
                      name: fn, 
                      content: JSON.stringify({ 
                          error: "ALTO: No puedes crear nada si el usuario no te ha dado los datos reales directamente. Pide la información primero." 
                      }) 
                  });
                  continue;
              }
          }

          logger.info(`IA_TOOL -> ${fn}`);
          const res = await aiToolsImplementations[fn](args, contexto);
          toolMessages.push({ tool_call_id: tc.id, role: 'tool', name: fn, content: JSON.stringify(res) });
        } catch (e) {
          toolMessages.push({ tool_call_id: tc.id, role: 'tool', name: tc.function.name, content: '{"error":"Error interno"}' });
        }
      }
      messages.push(aiResponse, ...toolMessages);
      aiResponse = await ejecutarChatAgente(messages, aiToolsDefinition);
    }

    let finalContent = aiResponse?.content || "";

    // FAILSAFE
    const detailTool = messages.find(m => m.role === 'tool' && (m.name === 'obtener_detalles_alumno' || m.name === 'obtener_detalles_alumno_por_matricula') && !m.content.includes('"error"'));
    if (detailTool && (finalContent.length < 15 || finalContent.toLowerCase().includes('tutorial'))) {
        try {
            const d = JSON.parse(detailTool.content);
            if (d.nombre_completo) {
                finalContent = `He localizado la información de **${d.nombre_completo}**. Es un alumno de nivel **${d.estatus_academico?.nivel || 'N/A'}** en el periodo **${d.estatus_academico?.periodo || 'N/A'}**.`;
            }
        } catch(e) {}
    }

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

    if (!finalContent || finalContent.length < 10) {
        finalContent = "He procesado tu solicitud. ¿En qué más puedo ayudarte?";
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
    logger.error('Error en el Agente IA (responderPregunta):', error);
    return {
      success: false,
      error: 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.',
      details: error.message
    };
  }
};
