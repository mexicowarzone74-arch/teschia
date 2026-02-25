import { createContext, useContext, useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '../context/AuthContext';

const TutorialContext = createContext();

export const TutorialProvider = ({ children }) => {
  const { user } = useAuth();
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  const startTour = (tourName) => {
    let steps = [];

    if (tourName === 'dashboard-coordinador') {
      steps = [
        {
          element: '#sidebar-menu',
          popover: {
            title: 'Menú Principal',
            description: 'Aquí encontrarás todas las herramientas de gestión (Alumnos, Grupos, Pagos, etc.).',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#kpi-cards',
          popover: {
            title: 'Indicadores Clave (KPIs)',
            description: 'De un vistazo rápido verás cuántos alumnos hay, grupos activos e ingresos del periodo.',
            side: "bottom",
            align: 'center'
          }
        },
        {
          element: '#quick-actions',
          popover: {
            title: 'Acciones Rápidas',
            description: 'Estos botones te permiten realizar las tareas más comunes sin navegar por el menú.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '#ai-assistant-button',
          popover: {
            title: 'Asistente IA',
            description: 'Si tienes dudas o necesitas automatizar una tarea, ¡pregúntale a tu asistente robot!',
            side: "left",
            align: 'center'
          }
        }
      ];
    } else if (tourName === 'dashboard-maestro') {
      steps = [
        {
          element: '#quick-actions',
          popover: {
            title: 'Tus Herramientas',
            description: 'Desde aquí puedes ver a tus alumnos o pasar lista rápidamente.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '#sidebar-subir-asistencias',
          popover: {
            title: 'Control de Asistencias',
            description: 'Usa esta sección diariamente para registrar la puntualidad de tus alumnos.',
            side: "right",
            align: 'center'
          }
        },
        {
          element: '#sidebar-subir-calificaciones',
          popover: {
            title: 'Calificaciones',
            description: 'Aquí podrás subir los promedios de tus parciales de forma manual o masiva con Excel.',
            side: "right",
            align: 'center'
          }
        }
      ];
    } else if (tourName === 'dashboard-administrativo') {
      steps = [
        {
          element: '#quick-actions',
          popover: {
            title: 'Control Administrativo',
            description: 'Accede rápidamente al registro de pagos y generación de reportes.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '#sidebar-pagos',
          popover: {
            title: 'Caja y Finanzas',
            description: 'Aquí es donde registrarás los pagos de los alumnos y gestionarás las prórrogas.',
            side: "right",
            align: 'center'
          }
        },
        {
          element: '#sidebar-reportes',
          popover: {
            title: 'Reportes y Boletas',
            description: 'Genera documentos académicos y financieros con un solo clic.',
            side: "right",
            align: 'center'
          }
        }
      ];
    }

    const driverObj = driver({
      showProgress: true,
      steps: steps,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Entendido',
      overlayColor: 'rgba(74, 18, 122, 0.75)', // Un color púrpura premium
    });

    driverObj.drive();
  };

  return (
    <TutorialContext.Provider value={{ startTour }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => useContext(TutorialContext);
