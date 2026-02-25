/**
 * Sistema de ayuda contextual
 * Aparece cuando el usuario parece perdido o confundido
 */

import { useState, useEffect } from 'react';
import { FaQuestionCircle, FaTimes, FaLightbulb, FaKeyboard } from 'react-icons/fa';

const AyudaContextual = ({ pagina, mostrarSiempre = false }) => {
  const [mostrar, setMostrar] = useState(mostrarSiempre);
  const [minimizado, setMinimizado] = useState(false);

  // Detectar si el usuario parece confundido (mucho tiempo sin hacer nada)
  useEffect(() => {
    if (mostrarSiempre) return;

    let timeoutInactividad;
    let contadorClicks = 0;
    let timeoutClicks;

    const handleActivity = () => {
      // Resetear timeout de inactividad
      clearTimeout(timeoutInactividad);
      timeoutInactividad = setTimeout(() => {
        if (!mostrar) {
          setMostrar(true);
          setMinimizado(false);
        }
      }, 45000); // Mostrar ayuda después de 45 segundos sin actividad
    };

    const handleClick = () => {
      contadorClicks++;
      
      // Si hace muchos clics en poco tiempo (más de 5 en 3 segundos), parece confundido
      clearTimeout(timeoutClicks);
      if (contadorClicks > 5) {
        setMostrar(true);
        setMinimizado(false);
        contadorClicks = 0;
      }
      
      timeoutClicks = setTimeout(() => {
        contadorClicks = 0;
      }, 3000);
    };

    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('click', handleClick);

    handleActivity();

    return () => {
      clearTimeout(timeoutInactividad);
      clearTimeout(timeoutClicks);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('click', handleClick);
    };
  }, [mostrar, mostrarSiempre]);

  const ayudas = {
    alumnos: {
      titulo: '👨‍🎓 Gestión de Alumnos',
      descripcion: 'Aquí puedes administrar todos los alumnos del centro de inglés.',
      acciones: [
        { icono: '➕', titulo: 'Agregar Alumno', descripcion: 'Haz clic en el botón verde "Nuevo Alumno"' },
        { icono: '✏️', titulo: 'Editar', descripcion: 'Haz clic en el ícono del lápiz junto al alumno' },
        { icono: '🗑️', titulo: 'Eliminar', descripcion: 'Haz clic en el ícono de basura (requiere confirmación)' },
        { icono: '🔍', titulo: 'Buscar', descripcion: 'Usa la barra de búsqueda para filtrar por nombre o matrícula' },
        { icono: '📊', titulo: 'Ver Detalles', descripcion: 'Haz clic en el nombre del alumno para ver su información completa' }
      ],
      atajos: [
        { tecla: 'Ctrl + N', accion: 'Nuevo alumno' },
        { tecla: 'Ctrl + F', accion: 'Buscar' },
        { tecla: 'Esc', accion: 'Cerrar modal' }
      ]
    },
    pagos: {
      titulo: '💰 Registro de Pagos',
      descripcion: 'Registra y consulta los pagos de los alumnos.',
      acciones: [
        { icono: '💳', titulo: 'Registrar Pago', descripcion: 'Selecciona el alumno, concepto y monto' },
        { icono: '📅', titulo: 'Filtrar por Fecha', descripcion: 'Usa los selectores de fecha para ver pagos específicos' },
        { icono: '📄', titulo: 'Formato Universal', descripcion: 'El método de pago siempre es "Formato Universal"' },
        { icono: '📋', titulo: 'Número de Recibo', descripcion: 'Número único del recibo de pago (no se puede repetir entre pagos)' },
        { icono: '🔔', titulo: 'Prórroga', descripcion: 'Marca la casilla si el alumno tiene prórroga de pago' }
      ],
      atajos: [
        { tecla: 'Ctrl + P', accion: 'Nuevo pago' },
        { tecla: 'Tab', accion: 'Navegar entre campos' }
      ]
    },
    dashboard: {
      titulo: '📊 Panel de Control',
      descripcion: 'Vista general del estado del centro de inglés.',
      acciones: [
        { icono: '📈', titulo: 'Estadísticas', descripcion: 'Números en tiempo real de alumnos, grupos y pagos' },
        { icono: '🔔', titulo: 'Notificaciones', descripcion: 'Alertas de pagos pendientes y vencidos' },
        { icono: '📅', titulo: 'Calendario', descripcion: 'Eventos y fechas importantes' },
        { icono: '🎯', titulo: 'Acciones Rápidas', descripcion: 'Botones para tareas comunes' }
      ],
      atajos: [
        { tecla: 'F5', accion: 'Actualizar datos' },
        { tecla: 'Ctrl + D', accion: 'Ir a Dashboard' }
      ]
    },
    grupos: {
      titulo: '👥 Gestión de Grupos',
      descripcion: 'Administra los grupos de clases de inglés.',
      acciones: [
        { icono: '➕', titulo: 'Crear Grupo', descripcion: 'Asigna maestro, nivel, horario y cupo máximo' },
        { icono: '👨‍🏫', titulo: 'Asignar Maestro', descripcion: 'Selecciona el maestro responsable del grupo' },
        { icono: '📚', titulo: 'Nivel', descripcion: 'Elige el nivel de inglés (A1, A2, B1, etc.)' },
        { icono: '🕐', titulo: 'Horario', descripcion: 'Define días y horas de clase' },
        { icono: '👥', titulo: 'Cupo', descripcion: 'Número máximo de alumnos permitidos' }
      ],
      atajos: [
        { tecla: 'Ctrl + G', accion: 'Nuevo grupo' }
      ]
    },
    maestros: {
      titulo: '👨‍🏫 Gestión de Maestros',
      descripcion: 'Administra los maestros del centro de inglés.',
      acciones: [
        { icono: '➕', titulo: 'Agregar Maestro', descripcion: 'Registra un nuevo maestro con sus datos' },
        { icono: '📧', titulo: 'Email', descripcion: 'Obligatorio para enviar notificaciones' },
        { icono: '📞', titulo: 'Teléfono', descripcion: 'Contacto del maestro (10 dígitos)' },
        { icono: '🎓', titulo: 'Especialidad', descripcion: 'Área de especialización del maestro' },
        { icono: '✅', titulo: 'Activar/Desactivar', descripcion: 'Cambia el estado del maestro' }
      ],
      atajos: [
        { tecla: 'Ctrl + M', accion: 'Nuevo maestro' }
      ]
    }
  };

  const ayudaActual = ayudas[pagina] || ayudas.dashboard;

  if (!mostrar) return null;

  if (minimizado) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setMinimizado(false)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-4 shadow-2xl animate-bounce"
          title="¿Necesitas ayuda?"
        >
          <FaQuestionCircle size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-2xl shadow-2xl max-w-md w-full z-40 overflow-hidden border-2 border-blue-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaQuestionCircle size={24} />
            <h3 className="font-bold text-lg">¿Necesitas Ayuda?</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMinimizado(true)}
              className="hover:bg-white hover:bg-opacity-20 rounded p-1"
              title="Minimizar"
            >
              _
            </button>
            <button
              onClick={() => setMostrar(false)}
              className="hover:bg-white hover:bg-opacity-20 rounded p-1"
              title="Cerrar"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <h4 className="font-bold text-gray-800 text-xl mb-2">
          {ayudaActual.titulo}
        </h4>
        <p className="text-gray-600 mb-4">{ayudaActual.descripcion}</p>

        {/* Acciones disponibles */}
        <div className="space-y-3 mb-4">
          <h5 className="font-semibold text-gray-700 flex items-center gap-2">
            <FaLightbulb className="text-yellow-500" />
            ¿Qué puedes hacer?
          </h5>
          {ayudaActual.acciones.map((accion, index) => (
            <div key={index} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
              <span className="text-2xl">{accion.icono}</span>
              <div>
                <p className="font-medium text-gray-800">{accion.titulo}</p>
                <p className="text-sm text-gray-600">{accion.descripcion}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Atajos de teclado */}
        {ayudaActual.atajos && ayudaActual.atajos.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <h5 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
              <FaKeyboard className="text-blue-600" />
              Atajos de Teclado
            </h5>
            <div className="space-y-1">
              {ayudaActual.atajos.map((atajo, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono">
                    {atajo.tecla}
                  </kbd>
                  <span className="text-gray-700">{atajo.accion}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Consejo final */}
        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
          <p className="text-sm text-yellow-800">
            <strong>💡 Tip:</strong> Si necesitas más ayuda, haz clic en el ícono de interrogación 
            junto a cualquier campo o botón.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AyudaContextual;
