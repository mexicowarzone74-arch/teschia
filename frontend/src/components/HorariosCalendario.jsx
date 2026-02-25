import { useState, useEffect } from 'react';
import { maestrosService, gruposService } from '../services/api';
import { FaClock, FaUser, FaMapMarkerAlt } from 'react-icons/fa';

const HorariosCalendario = ({ periodoId }) => {
  const [grupos, setGrupos] = useState([]);
  const [maestros, setMaestros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaestro, setSelectedMaestro] = useState('todos');
  
  // Calcular la semana actual (Lunes a Sábado)
  const getSemanActual = () => {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana; // Si es domingo, ir al lunes anterior
    
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diffLunes);
    
    const sabado = new Date(lunes);
    sabado.setDate(lunes.getDate() + 5); // Lunes + 5 = Sábado
    
    return { lunes, sabado };
  };
  
  const { lunes, sabado } = getSemanActual();

  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const horas = Array.from({ length: 8 }, (_, i) => 7 + i); // 7 AM a 3 PM (15:00)

  // Estilos CSS para impresión
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          size: landscape;
          margin: 0.5cm;
        }
        
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        
        /* Ocultar elementos innecesarios en impresión */
        nav, .sidebar, button, .no-print {
          display: none !important;
        }
        
        /* Ajustar tabla para que quepa */
        table {
          width: 100%;
          font-size: 8px !important;
          page-break-inside: avoid;
        }
        
        table th, table td {
          padding: 2px !important;
          font-size: 7px !important;
        }
        
        /* Encabezados más pequeños */
        table thead th {
          font-size: 9px !important;
          padding: 4px 2px !important;
        }
        
        /* Títulos de clase más pequeños */
        .font-bold {
          font-size: 8px !important;
        }
        
        /* Iconos más pequeños */
        svg {
          width: 8px !important;
          height: 8px !important;
        }
        
        /* Ocultar leyenda en impresión */
        .bg-white.p-4.rounded-lg.shadow:last-child {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [periodoId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [gruposRes, maestrosRes] = await Promise.all([
        gruposService.getAll(),
        maestrosService.getAll()
      ]);

      // Filtrar por periodo si se proporciona
      const gruposFiltrados = periodoId 
        ? gruposRes.data.filter(g => g.periodo_id === periodoId)
        : gruposRes.data;

      // IMPORTANTE: Solo mostrar maestros (NO administrativos)
      const soloMaestros = maestrosRes.data.filter(m => (m.rol_usuario || m.rol) === 'maestro');

      setGrupos(gruposFiltrados);
      setMaestros(soloMaestros);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Parsear horarios del grupo
  const parsearHorarios = (grupo) => {
    if (!grupo.horarios) return [];
    
    // Formato del backend: "Lun 08:00-10:00, Mar 10:00-12:00"
    const horariosSplit = grupo.horarios.split(',').map(h => h.trim());
    
    return horariosSplit.map(horario => {
      // Formato: "Lun 08:00-10:00" o "Mié 14:00-16:00"
      const match = horario.match(/(Lun|Mar|Mié|Jue|Vie|Sáb|Dom)\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
      if (!match) return null;
      
      const [_, diaAbr, inicio, fin] = match;
      const diaMap = { 
        'Lun': 'Lunes', 
        'Mar': 'Martes', 
        'Mié': 'Miércoles', 
        'Jue': 'Jueves', 
        'Vie': 'Viernes', 
        'Sáb': 'Sábado',
        'Dom': 'Domingo'
      };
      
      return {
        dia: diaMap[diaAbr],
        inicio,
        fin,
        grupo
      };
    }).filter(Boolean);
  };

  // Obtener todos los horarios procesados
  const obtenerHorarios = () => {
    let gruposFiltrados = grupos;
    
    if (selectedMaestro !== 'todos') {
      gruposFiltrados = grupos.filter(g => g.maestro_id === parseInt(selectedMaestro));
    }

    const horarios = [];
    gruposFiltrados.forEach(grupo => {
      const horariosGrupo = parsearHorarios(grupo);
      horarios.push(...horariosGrupo);
    });

    return horarios;
  };
  
  // Verificar si hay clases el sábado
  const hayClasesSabado = () => {
    const horarios = obtenerHorarios();
    return horarios.some(h => h.dia === 'Sábado');
  };
  
  // Días a mostrar (excluir sábado si no hay clases)
  const diasAMostrar = hayClasesSabado() ? dias : dias.slice(0, 5);

  // Verificar si hay una clase en este día y hora
  const obtenerClase = (dia, hora) => {
    const horarios = obtenerHorarios();
    
    return horarios.find(h => {
      if (h.dia !== dia) return false;
      
      const [horaInicioH, horaInicioM] = h.inicio.split(':').map(Number);
      const [horaFinH, horaFinM] = h.fin.split(':').map(Number);
      
      const horaInicioTotal = horaInicioH + (horaInicioM / 60);
      const horaFinTotal = horaFinH + (horaFinM / 60);
      
      return hora >= horaInicioTotal && hora < horaFinTotal;
    });
  };

  // Calcular rowSpan para una clase
  const calcularDuracion = (clase) => {
    const [horaInicioH, horaInicioM] = clase.inicio.split(':').map(Number);
    const [horaFinH, horaFinM] = clase.fin.split(':').map(Number);
    
    const duracionHoras = (horaFinH + horaFinM / 60) - (horaInicioH + horaInicioM / 60);
    return Math.ceil(duracionHoras);
  };

  // Colores por maestro
  const getColorClase = (maestroId) => {
    const colores = [
      'bg-blue-100 border-blue-400 text-blue-900',
      'bg-green-100 border-green-400 text-green-900',
      'bg-purple-100 border-purple-400 text-purple-900',
      'bg-pink-100 border-pink-400 text-pink-900',
      'bg-yellow-100 border-yellow-400 text-yellow-900',
      'bg-indigo-100 border-indigo-400 text-indigo-900',
      'bg-red-100 border-red-400 text-red-900',
      'bg-teal-100 border-teal-400 text-teal-900'
    ];
    
    return colores[maestroId % colores.length];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Información de la semana actual */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📅</span>
            <div>
              <p className="font-bold text-blue-900 text-lg">
                Semana del {lunes.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} al {sabado.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Horarios de clases organizados por día y hora
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filtro de maestros */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow no-print">
        <label className="font-medium">Filtrar por maestro:</label>
        <select 
          value={selectedMaestro}
          onChange={(e) => setSelectedMaestro(e.target.value)}
          className="input flex-1 max-w-xs"
        >
          <option value="todos">Todos los maestros</option>
          {maestros.map(m => (
            <option key={m.id} value={m.id}>{m.nombre_completo}</option>
          ))}
        </select>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="border border-gray-300 p-2 w-24 sticky left-0 bg-gray-100 z-10">
                <FaClock className="mx-auto text-gray-600" />
              </th>
              {diasAMostrar.map(dia => (
                <th key={dia} className="border border-gray-300 p-3 text-center min-w-[140px]">
                  <div className="font-bold text-gray-700">{dia}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              // Mantener track de celdas procesadas a nivel global
              const celdasProcesadas = new Set();
              
              return horas.map((hora) => (
                <tr key={hora} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2 text-center font-medium text-gray-700 sticky left-0 bg-white">
                    {hora}:00
                  </td>
                  {diasAMostrar.map((dia) => {
                    const key = `${dia}-${hora}`;
                    
                    // Si ya procesamos esta celda, no renderizarla (ya tiene rowSpan de una celda anterior)
                    if (celdasProcesadas.has(key)) {
                      return null;
                    }
                    
                    const clase = obtenerClase(dia, hora);
                    
                    if (clase) {
                      const duracion = calcularDuracion(clase);
                      
                      // Marcar esta celda y las siguientes horas como procesadas
                      for (let i = 0; i < duracion; i++) {
                        celdasProcesadas.add(`${dia}-${hora + i}`);
                      }
                      
                      return (
                        <td
                          key={dia}
                          rowSpan={duracion}
                          className={`border border-gray-300 p-3 ${getColorClase(clase.grupo.maestro_id)} align-top`}
                        >
                          <div className="text-xs space-y-1">
                            <div className="font-bold text-sm mb-1">{clase.grupo.codigo}</div>
                            <div className="flex items-center gap-1">
                              <FaClock className="text-xs" />
                              <span className="whitespace-nowrap font-medium">{clase.inicio} - {clase.fin}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaUser className="text-xs" />
                              <span className="truncate text-xs">{clase.grupo.maestro_nombre || 'Sin maestro'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs opacity-75">📚 {clase.grupo.nivel_nombre}</span>
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              👥 {clase.grupo.inscritos_actual || 0}/{clase.grupo.cupo_maximo}
                            </div>
                          </div>
                        </td>
                      );
                    }
                    
                    return (
                      <td key={dia} className="border border-gray-300 p-2 bg-gray-50 h-12">
                        {/* Celda vacía */}
                      </td>
                    );
                  })}
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-bold mb-3 text-gray-700">Leyenda de Maestros</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 text-sm">
          {maestros.map((maestro) => (
            <div key={maestro.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50">
              <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${getColorClase(maestro.id)}`}></div>
              <span className="truncate text-xs">{maestro.nombre_completo}</span>
            </div>
          ))}
        </div>
        {maestros.length === 0 && (
          <p className="text-gray-500 text-sm italic">No hay maestros asignados</p>
        )}
      </div>
    </div>
  );
};

export default HorariosCalendario;
