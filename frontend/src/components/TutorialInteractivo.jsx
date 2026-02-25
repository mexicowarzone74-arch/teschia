/**
 * Tutorial interactivo paso a paso
 * Para que hasta un pendejo entienda cómo usar el sistema
 */

import { useState, useEffect } from 'react';
import { FaCheckCircle, FaArrowRight, FaArrowLeft, FaTimes, FaLightbulb } from 'react-icons/fa';

const TutorialInteractivo = ({ pasos, onComplete, storageKey = 'tutorial-completado' }) => {
  const [pasoActual, setPasoActual] = useState(0);
  const [mostrar, setMostrar] = useState(false);
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    // Verificar si el tutorial ya fue completado
    const yaCompletado = localStorage.getItem(storageKey);
    if (!yaCompletado) {
      setMostrar(true);
    } else {
      setCompletado(true);
    }
  }, [storageKey]);

  const siguientePaso = () => {
    if (pasoActual < pasos.length - 1) {
      setPasoActual(pasoActual + 1);
    } else {
      completarTutorial();
    }
  };

  const pasoAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
    }
  };

  const completarTutorial = () => {
    localStorage.setItem(storageKey, 'true');
    setMostrar(false);
    setCompletado(true);
    if (onComplete) onComplete();
  };

  const saltarTutorial = () => {
    if (window.confirm('¿Seguro que quieres saltar el tutorial? Te ayudará a entender mejor el sistema.')) {
      completarTutorial();
    }
  };

  const reiniciarTutorial = () => {
    localStorage.removeItem(storageKey);
    setPasoActual(0);
    setMostrar(true);
    setCompletado(false);
  };

  if (!mostrar && completado) {
    return (
      <button
        onClick={reiniciarTutorial}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-40"
      >
        <FaLightbulb />
        Ver Tutorial
      </button>
    );
  }

  if (!mostrar) return null;

  const paso = pasos[pasoActual];
  const progreso = ((pasoActual + 1) / pasos.length) * 100;

  return (
    <>
      {/* Overlay oscuro */}
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50" />

      {/* Spotlight en el elemento */}
      {paso.selector && (
        <style>{`
          ${paso.selector} {
            position: relative;
            z-index: 51 !important;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6) !important;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.8); }
            50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 40px rgba(59, 130, 246, 1); }
          }
        `}</style>
      )}

      {/* Cuadro del tutorial */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 z-[60] overflow-hidden">
        {/* Barra de progreso */}
        <div className="h-2 bg-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progreso}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                {pasoActual + 1}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{paso.titulo}</h3>
                <p className="text-sm text-gray-500">
                  Paso {pasoActual + 1} de {pasos.length}
                </p>
              </div>
            </div>
            <button
              onClick={saltarTutorial}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Icono grande */}
          {paso.icono && (
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-full p-6">
                {paso.icono}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div className="mb-6">
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              {paso.descripcion}
            </p>
            
            {paso.sugerencias && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex items-start gap-3">
                  <FaLightbulb className="text-yellow-600 text-xl mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-900 mb-1">💡 Tip:</p>
                    <p className="text-yellow-800 text-sm">{paso.sugerencias}</p>
                  </div>
                </div>
              </div>
            )}

            {paso.advertencia && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mt-3">
                <p className="text-red-800 text-sm">
                  <strong>⚠️ Importante:</strong> {paso.advertencia}
                </p>
              </div>
            )}
          </div>

          {/* GIF o imagen de ejemplo */}
          {paso.imagen && (
            <div className="mb-6 rounded-lg overflow-hidden border-2 border-gray-200">
              <img src={paso.imagen} alt={paso.titulo} className="w-full" />
            </div>
          )}

          {/* Lista de acciones */}
          {paso.acciones && (
            <div className="mb-6 space-y-2">
              {paso.acciones.map((accion, index) => (
                <div key={index} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                  <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{accion}</span>
                </div>
              ))}
            </div>
          )}

          {/* Navegación */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={pasoAnterior}
              disabled={pasoActual === 0}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FaArrowLeft />
              Anterior
            </button>

            <div className="flex gap-2">
              {pasos.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === pasoActual
                      ? 'bg-blue-600 w-8'
                      : index < pasoActual
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={siguientePaso}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg"
            >
              {pasoActual === pasos.length - 1 ? (
                <>
                  <FaCheckCircle />
                  ¡Entendido!
                </>
              ) : (
                <>
                  Siguiente
                  <FaArrowRight />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TutorialInteractivo;
