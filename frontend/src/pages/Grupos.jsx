import { useState, useEffect } from 'react';
import { gruposService, periodosService, maestrosService } from '../services/api';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaUsers, FaRobot, FaExclamationTriangle, FaCheckCircle, FaClock, FaBook, FaCalendar } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { TooltipIcon } from '../components/Tooltip';

const Grupos = () => {
  const { user } = useAuth();
  const isMaestro = user?.rol === 'maestro';
  const [grupos, setGrupos] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [maestros, setMaestros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ codigo: '', nivel: 'Basico', periodo_id: '', maestro_id: '', turno: 'matutino', dias: [], hora_inicio: '07:00', hora_fin: '16:00', cupo_maximo: 25 });
  const [sugerencias, setSugerencias] = useState(null);
  const [loadingSugerencias, setLoadingSugerencias] = useState(false);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [selectedForMasivo, setSelectedForMasivo] = useState([]);
  const [showMasivoModal, setShowMasivoModal] = useState(false);

  useEffect(() => { 
    loadData();
    
    // Auto-refresh cada 3 minutos
    const interval = setInterval(() => {
      loadData();
    }, 3 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Cargar grupos y periodos siempre
      const promises = [
        gruposService.getAll(),
        periodosService.getAll()
      ];
      
      // Solo cargar maestros si es coordinador o administrativo
      if (user?.rol === 'coordinador' || user?.rol === 'administrativo') {
        promises.push(maestrosService.getAll());
      }
      
      const results = await Promise.all(promises);
      setGrupos(results[0].data);
      setPeriodos(results[1].data.filter(p => p.activo));
      
      if (user?.rol === 'coordinador' || user?.rol === 'administrativo') {
        // Filtrar solo maestros (excluir administrativos del dropdown de asignación)
        setMaestros(results[2].data.filter(m => (m.rol_usuario || m.rol) === 'maestro'));
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async (grupo = null) => {
    if (grupo) {
      setEditing(grupo);
      
      // Si estamos editando, cargar los horarios del grupo
      let diasSeleccionados = [];
      let horaInicio = '07:00';
      let horaFin = '16:00';
      
      if (grupo.id) {
        try {
          // Cargar horarios del grupo desde el backend
          const response = await fetch(`http://localhost:5000/api/grupos/${grupo.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const grupoDetalle = await response.json();
          
          if (grupoDetalle.horarios && grupoDetalle.horarios.length > 0) {
            // Mapear días de minúsculas a formato capitalizado
            const diaMap = { 
              'lunes': 'Lunes', 
              'martes': 'Martes', 
              'miercoles': 'Miércoles', 
              'jueves': 'Jueves', 
              'viernes': 'Viernes', 
              'sabado': 'Sábado' 
            };
            
            diasSeleccionados = grupoDetalle.horarios.map(h => diaMap[h.dia]).filter(Boolean);
            
            // Usar el horario del primer día (asumiendo que todos tienen el mismo horario)
            if (grupoDetalle.horarios[0]) {
              horaInicio = grupoDetalle.horarios[0].hora_inicio.substring(0, 5);
              horaFin = grupoDetalle.horarios[0].hora_fin.substring(0, 5);
            }
          }
          
          // Cargar sugerencias
          cargarSugerencias(grupo.id);
        } catch (error) {
          console.error('Error al cargar horarios del grupo:', error);
        }
      }
      
      setFormData({ 
        codigo: grupo.codigo, 
        nivel: grupo.nivel_nombre || grupo.nivel, 
        periodo_id: grupo.periodo_id, 
        maestro_id: grupo.maestro_id, 
        turno: grupo.turno || 'matutino', 
        dias: diasSeleccionados, 
        hora_inicio: horaInicio, 
        hora_fin: horaFin, 
        cupo_maximo: grupo.cupo_maximo 
      });
    } else {
      setEditing(null);
      setFormData({ codigo: '', nivel: 'Basico', periodo_id: periodos[0]?.id || '', maestro_id: '', turno: 'matutino', dias: [], hora_inicio: '07:00', hora_fin: '16:00', cupo_maximo: 25 });
      setSugerencias(null);
    }
    setShowModal(true);
  };

  const cargarSugerencias = async (grupoId) => {
    setLoadingSugerencias(true);
    try {
      const response = await fetch(`http://localhost:5000/api/grupos/sugerencias-maestros/${grupoId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          toast.error('No tienes permisos para ver sugerencias de maestros');
        } else {
          toast.error('Error al cargar sugerencias');
        }
        setSugerencias({ sugerencias: [] });
        return;
      }
      
      const data = await response.json();
      setSugerencias(data);
      setShowSugerencias(true);
    } catch (error) {
      console.error('Error al cargar sugerencias:', error);
      toast.error('No se pudieron cargar las sugerencias');
      setSugerencias({ sugerencias: [] });
    } finally {
      setLoadingSugerencias(false);
    }
  };

  const handleAsignarMasivo = async (maestroId) => {
    if (selectedForMasivo.length === 0) {
      toast.warning('Selecciona al menos un grupo');
      return;
    }

    const maestro = maestros.find(m => m.id === maestroId);
    if (!window.confirm(`¿Asignar ${maestro?.nombre_completo} a ${selectedForMasivo.length} grupos seleccionados?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/grupos/asignar-masivo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          maestro_id: maestroId,
          grupos_ids: selectedForMasivo,
          periodo_id: periodos.find(p => p.activo)?.id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`✅ ${data.exitosos} grupos asignados correctamente`);
        if (data.fallidos > 0) {
          toast.warning(`⚠️ ${data.fallidos} grupos con conflictos`);
        }
        setSelectedForMasivo([]);
        setShowMasivoModal(false);
        await loadData();
      }
    } catch (error) {
      toast.error('Error en asignación masiva');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Solo coordinador puede crear/editar grupos
    if (user?.rol !== 'coordinador') {
      toast.error('No tienes permisos para realizar esta acción');
      return;
    }
    
    setLoading(true);
    try {
      // Mapear nivel a nivel_id
      const nivelMap = { 'Basico': 1, 'Intermedio': 2, 'Avanzado': 3, 'Perfeccionamiento 1': 4, 'Perfeccionamiento 2': 5, 'C1': 6 };
      
      // Mapear días a minúsculas para la base de datos
      const diaMap = { 'Lunes': 'lunes', 'Martes': 'martes', 'Miércoles': 'miercoles', 'Jueves': 'jueves', 'Viernes': 'viernes', 'Sábado': 'sabado' };
      
      // Construir array de horarios desde dias seleccionados
      const horarios = formData.dias.map(dia => ({
        dia: diaMap[dia],
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin
      }));

      const dataToSend = {
        codigo: formData.codigo,
        nivel_id: nivelMap[formData.nivel],
        periodo_id: formData.periodo_id,
        maestro_id: formData.maestro_id || null,
        turno: formData.turno,
        cupo_maximo: formData.cupo_maximo,
        horarios
      };

      if (editing) {
        await gruposService.update(editing.id, dataToSend);
        toast.success('Grupo actualizado');
      } else {
        await gruposService.create(dataToSend);
        toast.success('Grupo creado');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // Solo coordinador puede eliminar grupos
    if (user?.rol !== 'coordinador') {
      toast.error('No tienes permisos para realizar esta acción');
      return;
    }
    
    if (!window.confirm('¿Eliminar grupo?')) return;
    try {
      setLoading(true);
      await gruposService.delete(id);
      toast.success('Grupo eliminado');
      await loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{isMaestro ? 'Mis Grupos' : 'Gestión de Grupos'}</h1>
        <div className="flex gap-3">
          {!isMaestro && selectedForMasivo.length > 0 && (
            <button 
              onClick={() => setShowMasivoModal(true)} 
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
            >
              <FaUsers />
              <span>Asignar a {selectedForMasivo.length} grupos</span>
            </button>
          )}
          {!isMaestro && (
            <button onClick={() => handleOpenModal()} className="btn-primary flex items-center space-x-2">
              <FaPlus /><span>Nuevo Grupo</span>
            </button>
          )}
        </div>
      </div>

      {!isMaestro && selectedForMasivo.length > 0 && (
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaUsers className="text-purple-600" />
              <span className="font-medium text-purple-900">
                {selectedForMasivo.length} grupos seleccionados para asignación masiva
              </span>
            </div>
            <button 
              onClick={() => setSelectedForMasivo([])}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Limpiar selección
            </button>
          </div>
        </div>
      )}

      <div className="card p-0">{loading ? (
        <div className="p-8 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : <table className="table">
        <thead>
          <tr>
            {!isMaestro && <th className="w-12">
              <input 
                type="checkbox" 
                checked={selectedForMasivo.length === grupos.filter(g => !g.maestro_id).length && grupos.filter(g => !g.maestro_id).length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedForMasivo(grupos.filter(g => !g.maestro_id).map(g => g.id));
                  } else {
                    setSelectedForMasivo([]);
                  }
                }}
                className="w-4 h-4"
              />
            </th>}
            <th>Código</th>
            <th>Nivel</th>
            <th>Período</th>
            <th>Turno</th>
            <th>Maestro</th>
            <th>Horarios</th>
            <th>Cupo</th>
            {!isMaestro && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {grupos.map(g => (
            <tr key={g.id} className={selectedForMasivo.includes(g.id) ? 'bg-purple-50' : ''}>
              {!isMaestro && <td>
                <input 
                  type="checkbox" 
                  checked={selectedForMasivo.includes(g.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedForMasivo([...selectedForMasivo, g.id]);
                    } else {
                      setSelectedForMasivo(selectedForMasivo.filter(id => id !== g.id));
                    }
                  }}
                  disabled={!!g.maestro_id}
                  className="w-4 h-4"
                />
              </td>}
              <td className="font-medium">{g.codigo}</td>
              <td><span className="badge badge-primary">{g.nivel_nombre}</span></td>
              <td>{g.periodo_nombre}</td>
              <td>
                <span className={`capitalize px-2 py-1 rounded-full text-xs font-semibold ${
                  g.turno === 'matutino' ? 'bg-orange-100 text-orange-700' :
                  g.turno === 'sabatino' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {g.turno || 'Sin asignar'}
                </span>
              </td>
              <td>
                {g.maestro_nombre ? (
                  <span className="flex items-center gap-1">
                    <FaCheckCircle className="text-green-600" />
                    {g.maestro_nombre}
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <FaExclamationTriangle />
                    Sin asignar
                  </span>
                )}
              </td>
              <td className="text-sm">{g.horarios || 'Sin horario'}</td>
              <td>{g.alumnos_inscritos || 0}/{g.cupo_maximo}</td>
              {!isMaestro && <td>
                <div className="flex space-x-2">
                  <button onClick={() => handleOpenModal(g)} className="text-blue-600 hover:text-blue-800">
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDelete(g.id)} className="text-red-600 hover:text-red-800">
                    <FaTrash />
                  </button>
                </div>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>}</div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">{editing ? 'Editar' : 'Nuevo'} Grupo</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">💡</span>
                  <p className="text-sm text-blue-900">
                    Los campos marcados con * son obligatorios. Asigna un maestro y salón para cada grupo.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    Código *
                    <TooltipIcon text="Código único del grupo (Ej: A1-01)" />
                  </label>
                  <input type="text" className="input" value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} required placeholder="Ej: A1-01" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    Nivel *
                    <TooltipIcon text="Nivel de inglés del grupo según el Marco Común Europeo" />
                  </label>
                  <select className="input" value={formData.nivel} onChange={(e) => setFormData({...formData, nivel: e.target.value})} required>
                    <option value="Basico">Basico</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                    <option value="Perfeccionamiento 1">Perfeccionamiento 1</option>
                    <option value="Perfeccionamiento 2">Perfeccionamiento 2</option>
                    <option value="C1">C1</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  Período *
                  <TooltipIcon text="Período escolar en el que se impartirá el grupo" />
                </label>
                <select className="input" value={formData.periodo_id} onChange={(e) => setFormData({...formData, periodo_id: e.target.value})} required>
                  <option value="">Seleccionar período</option>
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  Maestro *
                  <TooltipIcon text="Maestro que impartirá clases a este grupo" />
                  {editing && (
                    <button
                      type="button"
                      onClick={() => cargarSugerencias(editing.id)}
                      className="ml-2 text-purple-600 hover:text-purple-800 flex items-center gap-1 text-xs"
                    >
                      <FaRobot /> Sugerencias IA
                    </button>
                  )}
                </label>
                <select className="input" value={formData.maestro_id} onChange={(e) => setFormData({...formData, maestro_id: e.target.value})} required>
                  <option value="">Seleccionar maestro</option>
                  {maestros.map(m => <option key={m.id} value={m.id}>{m.nombre_completo}</option>)}
                </select>
              </div>

              {/* Panel de Sugerencias IA */}
              {showSugerencias && sugerencias && (
                <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-purple-900 flex items-center gap-2">
                      <FaRobot className="text-xl" />
                      Sugerencias Inteligentes
                    </h3>
                    <button 
                      onClick={() => setShowSugerencias(false)}
                      className="text-purple-600 hover:text-purple-800 text-sm"
                    >
                      Cerrar
                    </button>
                  </div>
                  
                  {loadingSugerencias ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {sugerencias?.sugerencias?.slice(0, 5).map((sug) => (
                        <div 
                          key={sug.maestro_id}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            sug.disponible 
                              ? sug.recomendado
                                ? 'border-green-300 bg-green-50 hover:bg-green-100'
                                : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                              : 'border-red-300 bg-red-50 opacity-60'
                          }`}
                          onClick={() => {
                            if (sug.disponible) {
                              setFormData({...formData, maestro_id: sug.maestro_id});
                              setShowSugerencias(false);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-900">{sug.nombre_completo}</span>
                                {sug.recomendado && (
                                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                                    ⭐ Recomendado
                                  </span>
                                )}
                                {!sug.disponible && (
                                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                                    ❌ No disponible
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-xs text-gray-600 space-y-1 mt-2">
                                <div className="flex items-center gap-2">
                                  <FaBook className="text-gray-400" />
                                  <span>{sug.num_grupos_actuales} grupos</span>
                                  <span>•</span>
                                  <FaClock className="text-gray-400" />
                                  <span>{sug.horas_semanales} hrs/sem</span>
                                </div>
                                {sug.dias_trabajo && sug.dias_trabajo !== 'Ninguno' && (
                                  <div className="flex items-center gap-2">
                                    <FaCalendar className="text-gray-400" />
                                    <span>Trabaja: {sug.dias_trabajo}</span>
                                  </div>
                                )}
                              </div>

                              {/* Bonuses */}
                              {sug.bonuses && sug.bonuses.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {sug.bonuses.map((bonus, idx) => (
                                    <div key={idx} className="text-xs bg-blue-100 text-blue-800 p-2 rounded flex items-center gap-1">
                                      <span>{bonus.mensaje}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Conflictos */}
                              {sug.conflictos.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {sug.conflictos.map((conf, idx) => (
                                    <div key={idx} className="text-xs bg-red-100 text-red-800 p-2 rounded flex items-start gap-1">
                                      <FaExclamationTriangle className="mt-0.5" />
                                      <span>{conf.mensaje}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Advertencias */}
                              {sug.warnings.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {sug.warnings.map((warn, idx) => (
                                    <div key={idx} className="text-xs bg-amber-100 text-amber-800 p-2 rounded">
                                      ⚠️ {warn.mensaje}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Score visual */}
                            <div className="ml-3 text-center">
                              <div className={`text-2xl font-bold ${
                                sug.score >= 90 ? 'text-green-600' :
                                sug.score >= 70 ? 'text-blue-600' :
                                sug.score >= 50 ? 'text-amber-600' :
                                'text-red-600'
                              }`}>
                                {sug.score}
                              </div>
                              <div className="text-xs text-gray-500">score</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block font-medium mb-2">Días de Clase *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(dia => (
                    <label key={dia} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.dias.includes(dia)}
                        onChange={(e) => {
                          let nuevosDias;
                          if (e.target.checked) {
                            nuevosDias = [...formData.dias, dia];
                          } else {
                            nuevosDias = formData.dias.filter(d => d !== dia);
                          }
                          
                          // Calcular turno automáticamente según los días
                          let turno, hora_inicio, hora_fin;
                          if (nuevosDias.includes('Sábado')) {
                            // Si incluye sábado = Sabatino
                            turno = 'sabatino';
                            hora_inicio = '08:00';
                            hora_fin = '16:00';
                          } else {
                            // Si son días entre semana = Matutino
                            turno = 'matutino';
                            hora_inicio = '07:00';
                            hora_fin = '13:00';
                          }
                          
                          setFormData({...formData, dias: nuevosDias, turno, hora_inicio, hora_fin});
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{dia}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Hora Inicio *</label>
                  <select className="input" value={formData.hora_inicio} onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}>
                    {Array.from({length: 10}, (_, i) => {
                      const hour = 7 + i;
                      const time = `${hour.toString().padStart(2, '0')}:00`;
                      return <option key={time} value={time}>{hour <= 12 ? `${hour}:00 AM` : `${hour-12}:00 PM`}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Hora Fin *</label>
                  <select className="input" value={formData.hora_fin} onChange={(e) => setFormData({...formData, hora_fin: e.target.value})}>
                    {Array.from({length: 10}, (_, i) => {
                      const hour = 7 + i;
                      const time = `${hour.toString().padStart(2, '0')}:00`;
                      return <option key={time} value={time}>{hour <= 12 ? `${hour}:00 AM` : `${hour-12}:00 PM`}</option>;
                    })}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  Turno *
                  <TooltipIcon text="Se determina automáticamente según los días de clase seleccionados" />
                </label>
                <input 
                  type="text"
                  className="input bg-gray-50 cursor-not-allowed" 
                  value={formData.turno === 'matutino' ? '🌅 Matutino (Entre semana)' : '📅 Sabatino (Sábados)'} 
                  disabled
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.turno === 'sabatino' ? 'Horario sábados: 8:00 AM - 4:00 PM' : 'Horario entre semana: 7:00 AM - 1:00 PM'}
                </p>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  Cupo Máximo *
                  <TooltipIcon text="Número máximo de alumnos que puede tener el grupo" />
                </label>
                <input 
                  type="number" 
                  className="input" 
                  value={formData.cupo_maximo} 
                  onChange={(e) => {
                    const valor = parseInt(e.target.value);
                    if (e.target.value === '' || (!isNaN(valor) && valor >= 1 && valor <= 100)) {
                      setFormData({...formData, cupo_maximo: e.target.value === '' ? '' : valor});
                    }
                  }} 
                  required 
                  min="1" 
                  max="100"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Asignación Masiva */}
      {showMasivoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FaUsers className="text-purple-600" />
              Asignación Masiva de Maestro
            </h2>
            
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6">
              <p className="text-sm text-purple-900">
                Asignarás un maestro a <strong>{selectedForMasivo.length} grupos</strong> seleccionados.
                El sistema validará conflictos de horario automáticamente.
              </p>
            </div>

            <div className="mb-6">
              <label className="block font-medium mb-2">Selecciona un maestro:</label>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {maestros.map(maestro => (
                  <button
                    key={maestro.id}
                    onClick={() => handleAsignarMasivo(maestro.id)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 text-left transition-all"
                  >
                    <div className="font-bold text-gray-900">{maestro.nombre_completo}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {maestro.email}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setShowMasivoModal(false)} 
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Grupos;
