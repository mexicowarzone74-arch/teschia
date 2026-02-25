/**
 * Guía visual que aparece sobre elementos específicos
 * Para explicar exactamente qué hace cada cosa
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes, FaArrowUp, FaArrowDown, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

const GuiaVisual = ({ elemento, texto, posicion = 'top', mostrar = true, onCerrar, color = 'blue' }) => {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const guiaRef = useRef(null);

  useEffect(() => {
    if (!mostrar || !elemento) return;

    const calcularPosicion = () => {
      const elementoDOM = typeof elemento === 'string' 
        ? document.querySelector(elemento)
        : elemento;

      if (!elementoDOM || !guiaRef.current) return;

      const rect = elementoDOM.getBoundingClientRect();
      const guiaRect = guiaRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;

      switch (posicion) {
        case 'top':
          top = rect.top - guiaRect.height - 10;
          left = rect.left + (rect.width / 2) - (guiaRect.width / 2);
          break;
        case 'bottom':
          top = rect.bottom + 10;
          left = rect.left + (rect.width / 2) - (guiaRect.width / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (guiaRect.height / 2);
          left = rect.left - guiaRect.width - 10;
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (guiaRect.height / 2);
          left = rect.right + 10;
          break;
      }

      // Ajustar si se sale de la pantalla
      if (left < 10) left = 10;
      if (left + guiaRect.width > window.innerWidth - 10) {
        left = window.innerWidth - guiaRect.width - 10;
      }
      if (top < 10) top = 10;
      if (top + guiaRect.height > window.innerHeight - 10) {
        top = window.innerHeight - guiaRect.height - 10;
      }

      setCoords({ top, left });
    };

    calcularPosicion();
    window.addEventListener('resize', calcularPosicion);
    window.addEventListener('scroll', calcularPosicion);

    return () => {
      window.removeEventListener('resize', calcularPosicion);
      window.removeEventListener('scroll', calcularPosicion);
    };
  }, [elemento, posicion, mostrar]);

  if (!mostrar) return null;

  const colores = {
    blue: 'from-blue-600 to-blue-800',
    green: 'from-green-600 to-green-800',
    yellow: 'from-yellow-500 to-yellow-700',
    red: 'from-red-600 to-red-800',
    purple: 'from-purple-600 to-purple-800',
  };

  const iconos = {
    top: FaArrowDown,
    bottom: FaArrowUp,
    left: FaArrowRight,
    right: FaArrowLeft,
  };

  const Icono = iconos[posicion];

  return createPortal(
    <div
      ref={guiaRef}
      className="fixed z-[9999] animate-bounce-slow"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
    >
      <div className={`bg-gradient-to-r ${colores[color]} text-white rounded-lg shadow-2xl p-4 max-w-xs`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icono className="animate-pulse" />
              <span className="font-bold text-sm">Mira aquí</span>
            </div>
            <p className="text-sm leading-relaxed">{texto}</p>
          </div>
          {onCerrar && (
            <button
              onClick={onCerrar}
              className="hover:bg-white hover:bg-opacity-20 rounded p-1 flex-shrink-0"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Flecha apuntando al elemento */}
      <div className={`absolute ${
        posicion === 'top' ? 'bottom-[-8px] left-1/2 -translate-x-1/2' :
        posicion === 'bottom' ? 'top-[-8px] left-1/2 -translate-x-1/2' :
        posicion === 'left' ? 'right-[-8px] top-1/2 -translate-y-1/2' :
        'left-[-8px] top-1/2 -translate-y-1/2'
      }`}>
        <div className={`w-0 h-0 ${
          posicion === 'top' ? 'border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-blue-800' :
          posicion === 'bottom' ? 'border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-blue-600' :
          posicion === 'left' ? 'border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-blue-800' :
          'border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-blue-600'
        }`} />
      </div>
    </div>,
    document.body
  );
};

// Hook para mostrar múltiples guías en secuencia
export const useGuiasSecuenciales = (guias) => {
  const [indiceActual, setIndiceActual] = useState(0);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    // Verificar si ya se mostraron las guías
    const yaVisto = localStorage.getItem('guias-vistas');
    if (!yaVisto && guias.length > 0) {
      setTimeout(() => setMostrar(true), 1000);
    }
  }, [guias]);

  const siguiente = () => {
    if (indiceActual < guias.length - 1) {
      setIndiceActual(indiceActual + 1);
    } else {
      terminar();
    }
  };

  const terminar = () => {
    setMostrar(false);
    localStorage.setItem('guias-vistas', 'true');
  };

  const guiaActual = mostrar && guias[indiceActual] ? guias[indiceActual] : null;

  return {
    guiaActual,
    mostrar: mostrar && !!guiaActual,
    siguiente,
    terminar,
    progreso: `${indiceActual + 1} de ${guias.length}`
  };
};

export default GuiaVisual;
