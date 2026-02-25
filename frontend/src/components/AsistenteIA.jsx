import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaRobot, FaTimes, FaPaperPlane, FaLightbulb, FaExclamationCircle, FaInfoCircle, FaMicrophone, FaMicrophoneSlash, FaUserTie, FaChalkboardTeacher, FaCalendarAlt, FaMoneyBillWave, FaChartLine, FaPlayCircle, FaTrash } from 'react-icons/fa';
import api from '../services/api';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useTutorial } from '../contexts/TutorialContext';
import { useAuth } from '../context/AuthContext';

const AsistenteIA = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [conversacion, setConversacion] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ayudaContextual, setAyudaContextual] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const { startTour } = useTutorial();
  const { user } = useAuth();
  const location = useLocation();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Actualizar el input cuando se termina de hablar
  useEffect(() => {
    if (transcript) {
      setPregunta(transcript);
    }
  }, [transcript]);

  // Cargar ayuda contextual al cambiar de página (SIEMPRE, aunque esté cerrado)
  useEffect(() => {
    cargarAyudaContextual();
    // Limpiar conversación al cambiar de página
    setConversacion([]);
  }, [location.pathname]);

  // Escuchar evento para cerrar si se abre el chat flotante
  useEffect(() => {
    const handleClose = () => setIsOpen(false);
    window.addEventListener('close-asistente-ia', handleClose);
    return () => window.removeEventListener('close-asistente-ia', handleClose);
  }, []);

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      window.dispatchEvent(new CustomEvent('close-chat-flotante'));
    }
  };

  const cargarAyudaContextual = async () => {
    try {
      const response = await api.get(`/asistente/ayuda-contextual?pagina=${location.pathname}`);

      const data = response.data;
      
      if (data.success) {
        setAyudaContextual(data.ayuda);
        setAlertas(data.alertas || []);
        
        // SIEMPRE actualizar el mensaje de bienvenida con el contexto de la página actual
        if (data.ayuda.descripcion) {
          setConversacion([{
            tipo: 'asistente',
            mensaje: data.ayuda.descripcion,
            titulo: data.ayuda.titulo
          }]);
        }
      }
    } catch (error) {
      console.error('Error al cargar ayuda contextual:', error);
    }
  };

  const enviarPregunta = async (e, textoOpcional = null) => {
    if (e) e.preventDefault();
    
    const textoAFirmar = textoOpcional || pregunta;
    if (!textoAFirmar.trim()) return;

    // Detener grabación si está activa
    if (listening) {
      SpeechRecognition.stopListening();
    }

    // Agregar pregunta del usuario a la conversación
    const nuevaConversacion = [
      ...conversacion,
      { tipo: 'usuario', mensaje: textoAFirmar }
    ];
    setConversacion(nuevaConversacion);
    setPregunta('');
    resetTranscript();
    setLoading(true);

    try {
      const response = await api.post('/asistente/pregunta', {
        pregunta: textoAFirmar,
        historial: conversacion.slice(-6), // Enviar los últimos 6 mensajes para contexto
        contexto: {
          pagina: location.pathname
        }
      });

      const data = response.data;

      if (data.success) {
        // Agregar respuesta del asistente
        setConversacion([
          ...nuevaConversacion,
          {
            tipo: 'asistente',
            mensaje: data.respuesta,
            tutorial: data.tutorial,
            acciones: data.acciones,
            sugerencias: data.sugerencias,
            problema: data.problema
          }
        ]);
      } else {
        // Manejar error devuelto por la API (success: false)
        setConversacion([
          ...nuevaConversacion,
          {
            tipo: 'error',
            mensaje: data.error || 'Lo siento, tuve un problema al procesar tu solicitud.',
            detalles: data.details
          }
        ]);
      }
    } catch (error) {
      console.error('Error al enviar pregunta:', error);
      setConversacion([
        ...nuevaConversacion,
        {
          tipo: 'error',
          mensaje: 'Lo siento, hubo un error al procesar tu pregunta. Intenta de nuevo.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: 'es-MX' });
    }
  };

  const hacerPreguntaSugerida = (preguntaSugerida) => {
    enviarPregunta(null, preguntaSugerida);
  };

  const limpiarChat = () => {
    setConversacion([]);
    cargarAyudaContextual();
  };

  const getIconoAlerta = (tipo) => {
    switch (tipo) {
      case 'warning':
        return <FaExclamationCircle className="text-amber-500" />;
      case 'info':
        return <FaInfoCircle className="text-blue-500" />;
      case 'error':
        return <FaExclamationCircle className="text-red-500" />;
      default:
        return <FaLightbulb className="text-yellow-500" />;
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={toggleOpen}
        id="ai-assistant-button"
        className={`fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-gray-600' : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 animate-pulse'
        }`}
        title="Asistente IA"
      >
        {isOpen ? (
          <FaTimes className="text-white text-xl" />
        ) : (
          <FaRobot className="text-white text-2xl" />
        )}
        
        {/* Badge de alertas */}
        {!isOpen && alertas.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {alertas.length}
          </span>
        )}
      </button>

      {/* Panel del chat */}
      {isOpen && (
        <div className="fixed bottom-[140px] right-6 z-50 w-[350px] h-[520px] max-h-[70vh] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 ring-1 ring-black/5">
          {/* Header Premium - Night Sky Theme */}
          <div className="bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#db2777] text-white p-4 relative overflow-hidden group">
            {/* Efecto de brillo sutil */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-xl border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <FaRobot className="text-xl text-white drop-shadow-md" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-widest uppercase">Asistente IA</h3>
                  <p className="text-[10px] text-white/80 font-medium flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    SISTEMA ACTIVO
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={limpiarChat}
                  className="hover:bg-white/20 rounded-xl p-2.5 transition-all active:scale-90 border border-transparent hover:border-white/10"
                  title="Limpiar Conversación"
                >
                  <FaTrash className="text-sm text-white/90" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 rounded-xl p-2.5 transition-all active:scale-90 border border-transparent hover:border-white/10"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>
            </div>
          </div>

          {/* Alertas importantes */}
          {alertas.length > 0 && (
            <div className="p-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-b space-y-1.5 max-h-24 overflow-y-auto">
              {alertas.map((alerta, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-xs bg-white p-1.5 rounded shadow-sm">
                  <div className="text-sm">{getIconoAlerta(alerta.tipo)}</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-xs">{alerta.titulo}</p>
                    <p className="text-gray-600 text-xs">{alerta.mensaje}</p>
                    {alerta.accion && (
                      <button 
                        onClick={() => window.location.href = alerta.accion.ruta}
                        className="text-purple-600 hover:underline mt-0.5 font-medium text-xs"
                      >
                        {alerta.accion.texto} →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Conversación */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {/* Estado Inicial o de Bienvenida: Mostramos chips si hay 0 o solo 1 mensaje (el de bienvenida) */}
            {(conversacion.length === 0 || (conversacion.length === 1 && conversacion[0].tipo === 'asistente')) && (
              <div className="flex flex-col items-center justify-center py-4 px-2 space-y-4">
                {(conversacion.length === 0 || (conversacion.length === 1 && conversacion[0].tipo === 'asistente')) && (
                  <>
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center animate-bounce">
                      <FaRobot className="text-xl text-purple-600" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-xs text-center">¡Hola! 👋 ¿En qué puedo ayudarte?</h4>
                  </>
                )}
                
                <div className="grid grid-cols-1 gap-2 w-full max-w-[240px]">
                  {/* Sugerencias Dinámicas por Rol */}
                  {user?.rol === 'coordinador' && (
                    <>
                      <button onClick={() => hacerPreguntaSugerida("Quiero registrar a un nuevo maestro")}
                        className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm hover:border-purple-300 hover:bg-purple-50 transition-all text-[10px] text-left">
                        <FaUserTie className="text-purple-500" /> Agregar un nuevo maestro
                      </button>
                      <button onClick={() => startTour('dashboard-coordinador')}
                        className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm hover:border-amber-300 hover:bg-amber-50 transition-all text-[10px] text-left font-bold text-amber-900 bg-amber-50/30">
                        <FaPlayCircle className="text-amber-600 text-xs" /> Ver Tutorial Interactivo ✨
                      </button>
                      <button onClick={() => hacerPreguntaSugerida("¿Cómo van las finanzas del periodo?")}
                        className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm hover:border-green-300 hover:bg-green-50 transition-all text-[10px] text-left">
                        <FaMoneyBillWave className="text-green-500" /> Consultar ingresos y deudas
                      </button>
                    </>
                  )}

                   {user?.rol === 'maestro' && (
                    <>
                      <button onClick={() => hacerPreguntaSugerida("¿Cómo tomo asistencia a mi grupo?")}
                        className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 transition-all text-[10px] text-left">
                        <FaCalendarAlt className="text-indigo-500" /> ¿Cómo paso lista hoy?
                      </button>
                      <button onClick={() => startTour('dashboard-maestro')}
                        className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm hover:border-amber-300 hover:bg-amber-50 transition-all text-[10px] text-left font-bold text-amber-900 bg-amber-50/30">
                        <FaPlayCircle className="text-amber-600 text-xs" /> Ver Tutorial Animado ✨
                      </button>
                      <button onClick={() => hacerPreguntaSugerida("¿Cómo subo las calificaciones de mis alumnos?")}
                        className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm hover:border-purple-300 hover:bg-purple-50 transition-all text-[10px] text-left">
                        <FaChalkboardTeacher className="text-purple-500" /> Subir boletas y promedios
                      </button>
                    </>
                  )}

                  {(user?.rol === 'administrativo' || user?.rol === 'coordinador') && (
                    <button onClick={() => hacerPreguntaSugerida("¿Quién tiene pagos vencidos?")}
                      className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm hover:border-red-300 hover:bg-red-50 transition-all text-[10px] text-left">
                      <FaChartLine className="text-red-500" /> Ver alumnos con adeudo
                    </button>
                  )}

                  {!user?.rol && (
                    <button onClick={() => hacerPreguntaSugerida("¿Cómo uso el sistema?")}
                      className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 hover:bg-blue-50 transition-all text-[10px] text-left">
                      <FaInfoCircle className="text-blue-500" /> ¿Cómo empiezo a usar el sistema?
                    </button>
                  )}
                </div>
              </div>
            )}
            {conversacion.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl p-2 text-xs ${
                  msg.tipo === 'usuario' 
                    ? 'bg-purple-600 text-white' 
                    : msg.tipo === 'error'
                    ? 'bg-red-100 text-red-900'
                    : 'bg-white shadow-md text-gray-800'
                }`}>
                  {msg.titulo && (
                    <p className="font-bold text-xs mb-1 border-b border-gray-200 pb-1">
                      {msg.titulo}
                    </p>
                  )}
                  <p className="text-xs whitespace-pre-line leading-relaxed">{msg.mensaje}</p>
                  
                  {/* Tutorial paso a paso */}
                  {msg.tutorial && msg.tutorial.length > 0 && (
                    <div className="mt-2 p-1.5 bg-blue-50 rounded">
                      <p className="text-xs font-bold text-blue-900 mb-1">📖 Tutorial paso a paso:</p>
                      <div className="space-y-0.5">
                        {msg.tutorial.map((paso, i) => (
                          <div key={i} className="text-xs text-blue-800 leading-relaxed">
                            {paso}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Consejo adicional */}
                  {msg.consejo && (
                    <div className="mt-2 p-1.5 bg-green-50 rounded text-xs">
                      <p className="text-green-800">{msg.consejo}</p>
                    </div>
                  )}
                  
                  {/* Acciones sugeridas */}
                  {(msg.tutorial || (msg.acciones && msg.acciones.length > 0)) && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acciones Rápidas:</p>
                      <div className="flex flex-wrap gap-1">
                        {/* Botón de Tutorial Especial si aplica */}
                        {msg.tutorial && (
                          <button
                            onClick={() => startTour(user.rol === 'maestro' ? 'dashboard-maestro' : 'dashboard-coordinador')}
                            className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded-lg border border-amber-100 hover:bg-amber-600 hover:text-white transition-all font-bold flex items-center gap-1 shadow-sm"
                          >
                            ✨ Ver Tutorial Animado
                          </button>
                        )}
                        
                        {msg.acciones && msg.acciones.slice(0, 3).map((accion, i) => {
                          const isObject = typeof accion === 'object' && accion !== null;
                          const texto = isObject ? accion.texto : accion;
                          const ruta = isObject ? accion.ruta : null;
                          const tipo = isObject ? accion.tipo : null;

                          return (
                            <button
                              key={i}
                              id={ruta ? `btn-nav-${ruta.replace('/', '')}` : undefined}
                              onClick={async () => {
                                if (tipo === 'descarga') {
                                  // Manejar descarga con autenticación
                                  try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${ruta}`, {
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                    
                                    if (!response.ok) throw new Error('Error al descargar');
                                    
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    const extension = ruta.includes('pdf') ? 'pdf' : 'xlsx';
                                    link.download = `reporte_${new Date().toISOString().split('T')[0]}.${extension}`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error('Error descarga:', error);
                                    alert('Error al descargar el reporte');
                                  }
                                } else if (ruta) {
                                  window.location.href = ruta;
                                } else {
                                  hacerPreguntaSugerida(`¿Cómo ${texto.toLowerCase()}?`);
                                }
                              }}
                              className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-lg border border-purple-100 hover:bg-purple-600 hover:text-white transition-all font-medium flex items-center gap-1 shadow-sm"
                            >
                              {tipo === 'descarga' ? '📥' : ruta ? '🚀' : '✓'} {texto}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sugerencias de preguntas: Ahora se muestran como chips elegantes */}
                  {msg.sugerencias && msg.sugerencias.length > 0 && idx === conversacion.length - 1 && (
                    <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {msg.sugerencias.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => hacerPreguntaSugerida(sug)}
                          className="text-[10px] bg-white text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-all font-medium whitespace-nowrap"
                        >
                          💬 {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Solución de problema */}
                  {msg.problema && (
                    <div className="mt-2 p-1.5 bg-amber-50 rounded text-xs">
                      <p className="font-bold text-amber-900">🔧 Solución:</p>
                      <p className="text-amber-800 whitespace-pre-line mt-0.5 leading-relaxed">{msg.problema.solucion}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white shadow-md rounded-xl p-3 max-w-[85%] space-y-2 animate-pulse">
                  <div className="flex items-center gap-2 mb-1">
                    <FaRobot className="text-purple-500 animate-spin" />
                    <div className="h-2 w-20 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded"></div>
                  <div className="h-2 w-3/4 bg-gray-100 rounded"></div>
                </div>
              </div>
            )}
          </div>

          {/* Acciones rápidas de ayuda contextual */}
          {ayudaContextual && ayudaContextual.acciones && ayudaContextual.acciones.length > 0 && (
            <div className="p-1.5 bg-purple-50 border-t flex gap-1 overflow-x-auto">
              {ayudaContextual.acciones.slice(0, 3).map((accion, idx) => (
                <button
                  key={idx}
                  onClick={() => hacerPreguntaSugerida(`¿Cómo ${accion.toLowerCase()}?`)}
                  className="text-xs bg-white text-purple-700 px-2 py-1 rounded-full hover:bg-purple-100 transition-colors whitespace-nowrap"
                >
                  {accion}
                </button>
              ))}
            </div>
          )}

          {/* Input de pregunta */}
          <form onSubmit={enviarPregunta} className="p-2.5 bg-white border-t">
            <div className="flex gap-1.5 items-center">
              {browserSupportsSpeechRecognition && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-full transition-colors ${
                    listening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={listening ? 'Escuchando...' : 'Hablar'}
                >
                  {listening ? <FaMicrophoneSlash className="text-sm" /> : <FaMicrophone className="text-sm" />}
                </button>
              )}
              <input
                type="text"
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                placeholder={listening ? "Escuchando..." : "Pregunta lo que necesites..."}
                className={`flex-1 px-3 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs ${listening ? 'border-red-300' : ''}`}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !pregunta.trim()}
                className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPaperPlane className="text-xs" />
              </button>
            </div>
            {listening && <p className="text-[10px] text-center text-red-500 mt-1">Hable ahora... haga clic en enviar cuando termine</p>}
          </form>
        </div>
      )}
    </>
  );
};

export default AsistenteIA;
