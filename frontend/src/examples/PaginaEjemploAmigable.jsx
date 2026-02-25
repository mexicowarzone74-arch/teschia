/**
 * Ejemplo completo de página con TODAS las ayudas visuales
 * Sistema 100% Entendible para Pendejos
 */

import { useState, useEffect } from 'react';
import { FaUserPlus, FaBook, FaQuestionCircle } from 'react-icons/fa';
import TutorialInteractivo from '../components/TutorialInteractivo';
import AyudaContextual from '../components/AyudaContextual';
import GuiaVisual, { useGuiasSecuenciales } from '../components/GuiaVisual';
import ConfirmDialog from '../components/ConfirmDialog';
import { mensajes, validarConMensaje } from '../components/MensajesAmigables';
import { useFormValidation } from '../hooks/useFormValidation';

const PaginaEjemploAmigable = () => {
  const [mostrarTutorial, setMostrarTutorial] = useState(false);
  const [mostrarAyuda, setMostrarAyuda] = useState(true);

  // Tutorial paso a paso
  const pasosTutorial = [
    {
      titulo: '¡Bienvenido! 👋',
      descripcion: 'Esta es la página de alumnos. Aquí puedes ver, agregar, editar y eliminar alumnos del centro de inglés.',
      icono: <FaUserPlus size={48} className="text-blue-600" />,
      sugerencias: 'Tómate tu tiempo para explorar. No te preocupes, no puedes romper nada accidentalmente.',
    },
    {
      titulo: 'Agregar un Alumno',
      descripcion: 'Para agregar un alumno nuevo, haz clic en el botón verde "Nuevo Alumno" en la esquina superior derecha.',
      selector: '#btn-nuevo-alumno',
      acciones: [
        'Haz clic en el botón verde',
        'Llena el formulario con los datos',
        'Haz clic en "Guardar"'
      ],
      sugerencias: 'Los campos con * son obligatorios. Si ves un ✓ verde, significa que el dato es correcto.',
    },
    {
      titulo: 'Buscar Alumnos 🔍',
      descripcion: 'Usa la barra de búsqueda para encontrar alumnos por nombre o matrícula rápidamente.',
      selector: '#barra-busqueda',
      sugerencias: 'No necesitas escribir el nombre completo, con las primeras letras es suficiente.',
    },
    {
      titulo: 'Editar y Eliminar',
      descripcion: 'Cada alumno tiene botones de acción a la derecha. El lápiz ✏️ es para editar, la basura 🗑️ es para eliminar.',
      acciones: [
        'Haz clic en el lápiz para editar',
        'Haz clic en la basura para eliminar (te pedirá confirmación)',
        'Los cambios se guardan instantáneamente'
      ],
      advertencia: 'Eliminar un alumno NO se puede deshacer. Te pediremos que confirmes escribiendo "ELIMINAR".',
    },
    {
      titulo: '¡Todo Listo! 🎉',
      descripcion: 'Ya conoces lo básico. Si necesitas ayuda en cualquier momento, haz clic en el botón de ayuda (?) en la esquina inferior derecha.',
      icono: <FaBook size={48} className="text-green-600" />,
      sugerencias: 'Puedes volver a ver este tutorial cuando quieras desde el menú de ayuda.',
    }
  ];

  // Guías visuales secuenciales
  const guiasConfig = [
    {
      elemento: '#btn-nuevo-alumno',
      texto: 'Haz clic aquí para agregar un alumno nuevo',
      posicion: 'left',
      color: 'green'
    },
    {
      elemento: '#barra-busqueda',
      texto: 'Busca alumnos escribiendo aquí',
      posicion: 'bottom',
      color: 'blue'
    },
    {
      elemento: '#tabla-alumnos',
      texto: 'Aquí aparecerán todos los alumnos',
      posicion: 'top',
      color: 'purple'
    }
  ];

  const { guiaActual, mostrar: mostrarGuia, siguiente, progreso } = useGuiasSecuenciales(guiasConfig);

  // Formulario de ejemplo con validación
  const schema = {
    nombre: [
      { required: true, message: 'El nombre es necesario' },
      { min: 2, message: 'Mínimo 2 letras' }
    ],
    email: [
      { required: true, message: 'El email es necesario' },
      { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' }
    ]
  };

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = useFormValidation(
    schema,
    async (data) => {
      // Simulación de guardado
      const toastId = mensajes.progreso.inicio('Guardando alumno');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      mensajes.progreso.completar(toastId, '¡Alumno guardado!');
      mensajes.ayuda.siguientePaso('Ahora puedes agregar otro alumno o ver la lista');
    }
  );

  // Detectar si el usuario parece confundido
  useEffect(() => {
    mensajes.ayuda.primeraVez();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Tutorial Interactivo */}
      {mostrarTutorial && (
        <TutorialInteractivo
          pasos={pasosTutorial}
          onComplete={() => {
            setMostrarTutorial(false);
            mensajes.exito.completar();
            mensajes.ayuda.sugerencia('Si necesitas ayuda, haz clic en el ícono de interrogación');
          }}
          storageKey="tutorial-alumnos"
        />
      )}

      {/* Guía Visual */}
      {mostrarGuia && guiaActual && (
        <>
          <GuiaVisual
            elemento={guiaActual.elemento}
            texto={`${guiaActual.texto} (${progreso})`}
            posicion={guiaActual.posicion}
            color={guiaActual.color}
            mostrar={true}
            onCerrar={siguiente}
          />
          
          {/* Botón para avanzar */}
          <div className="fixed bottom-20 right-4 z-50">
            <button
              onClick={siguiente}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce"
            >
              Siguiente ({progreso})
            </button>
          </div>
        </>
      )}

      {/* Ayuda Contextual */}
      <AyudaContextual pagina="alumnos" mostrarSiempre={mostrarAyuda} />

      {/* Header con ayuda */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            👨‍🎓 Gestión de Alumnos
          </h1>
          <p className="text-gray-600">
            Administra los alumnos del centro de inglés
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setMostrarTutorial(true)}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-2"
            title="Ver tutorial"
          >
            <FaQuestionCircle />
            Tutorial
          </button>
          
          <button
            id="btn-nuevo-alumno"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg btn-llamativo"
          >
            <FaUserPlus />
            Nuevo Alumno
          </button>
        </div>
      </div>

      {/* Barra de búsqueda con ayuda */}
      <div className="mb-6">
        <div className="relative">
          <input
            id="barra-busqueda"
            type="text"
            placeholder="🔍 Busca por nombre o matrícula... (Ejemplo: Juan o 201724408)"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 tooltip-container">
            <FaQuestionCircle className="text-gray-400 cursor-help" />
            <div className="tooltip-texto">
              No hace falta escribir el nombre completo.
              Con las primeras letras es suficiente.
            </div>
          </div>
        </div>

        {/* Ayuda contextual de búsqueda */}
        <div className="ayuda-burbuja mt-3">
          <p className="text-sm text-yellow-900">
            💡 <strong>Tip:</strong> Puedes buscar por nombre, apellido o matrícula. 
            Los resultados aparecen mientras escribes.
          </p>
        </div>
      </div>

      {/* Formulario de ejemplo */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📝</span>
          Ejemplo de Formulario Súper Claro
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo con ayuda visual */}
          <div>
            <label className="block font-medium mb-2 campo-requerido">
              Nombre Completo
              <span className="tooltip-container ml-2">
                <FaQuestionCircle className="inline text-gray-400 text-sm cursor-help" />
                <div className="tooltip-texto">
                  Escribe el nombre y apellidos del alumno
                </div>
              </span>
            </label>
            <input
              type="text"
              className={`w-full px-4 py-3 border-2 rounded-lg ${
                touched.nombre && errors.nombre ? 'campo-invalido' :
                touched.nombre && !errors.nombre && values.nombre ? 'campo-valido' :
                'border-gray-300'
              }`}
              placeholder="Ejemplo: Juan García López"
              value={values.nombre || ''}
              onChange={(e) => handleChange('nombre', e.target.value)}
              onBlur={() => handleBlur('nombre')}
            />
            {touched.nombre && errors.nombre && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                ❌ {errors.nombre}
              </p>
            )}
            {touched.nombre && !errors.nombre && values.nombre && (
              <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                ✅ ¡Perfecto!
              </p>
            )}
          </div>

          {/* Campo de email con validación */}
          <div>
            <label className="block font-medium mb-2 campo-requerido">
              Correo Electrónico
              <span className="tooltip-container ml-2">
                <FaQuestionCircle className="inline text-gray-400 text-sm cursor-help" />
                <div className="tooltip-texto">
                  Debe ser un email válido (usuario@dominio.com)
                </div>
              </span>
            </label>
            <input
              type="email"
              className={`w-full px-4 py-3 border-2 rounded-lg ${
                touched.email && errors.email ? 'campo-invalido' :
                touched.email && !errors.email && values.email ? 'campo-valido' :
                'border-gray-300'
              }`}
              placeholder="ejemplo@tescha.edu.mx"
              value={values.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
            />
            {touched.email && errors.email && (
              <p className="text-red-600 text-sm mt-1">
                ❌ {errors.email}
              </p>
            )}
          </div>

          {/* Botón con estado claro */}
          <button
            type="submit"
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold text-lg shadow-lg hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💾 Guardar Alumno
          </button>

          {/* Ayuda después del botón */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <p className="text-sm text-blue-900">
              ℹ️ Al hacer clic en "Guardar", tus datos se revisarán automáticamente.
              Si algo está mal, te diremos exactamente qué corregir.
            </p>
          </div>
        </form>
      </div>

      {/* Tabla de ejemplo con ayuda */}
      <div id="tabla-alumnos" className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-bold text-gray-800">Lista de Alumnos</h3>
        </div>
        
        {/* Skeleton loader amigable */}
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>

        <div className="p-4 text-center text-gray-500">
          <p>📭 No hay alumnos registrados aún</p>
          <p className="text-sm mt-2">
            Haz clic en "Nuevo Alumno" para agregar el primero
          </p>
        </div>
      </div>

      {/* Indicador de progreso de carga */}
      <div className="mt-6">
        <div className="barra-progreso">
          <div className="barra-progreso-relleno" style={{ width: '75%' }} />
        </div>
        <p className="text-sm text-gray-600 mt-2 text-center">
          Cargando datos... 75%
        </p>
      </div>
    </div>
  );
};

export default PaginaEjemploAmigable;
