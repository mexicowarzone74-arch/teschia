import { useState, useEffect } from 'react';
import { asistenciasService, gruposService } from '../services/api';
import { toast } from 'react-toastify';
import { FaSave, FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';

const Asistencias = () => {
  const [grupos, setGrupos] = useState([]);
  const [selectedGrupo, setSelectedGrupo] = useState('');
  const [selectedFecha, setSelectedFecha] = useState(new Date().toISOString().split('T')[0]);
  const [alumnos, setAlumnos] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    loadGrupos();
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(() => {
      loadGrupos();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadGrupos = async () => {
    try {
      const response = await gruposService.getAll();
      setGrupos(response.data);
    } catch (error) {
      toast.error('Error al cargar grupos');
    }
  };

  const loadAsistencias = async () => {
    if (!selectedGrupo) return;
    setLoading(true);
    try {
      const response = await asistenciasService.getByGrupoFecha(selectedGrupo, selectedFecha);
      const data = Array.isArray(response.data) ? response.data : [];
      setAlumnos(data);
      const asis = {};
      data.forEach(alumno => {
        asis[alumno.id] = { 
          inscripcion_id: alumno.inscripcion_id,
          estatus: alumno.presente === true ? 'Asistencia' : alumno.presente === false ? 'Falta' : 'Asistencia',
          justificada: alumno.justificada || false,
          observaciones: alumno.observaciones || '' 
        };
      });
      setAsistencias(asis);
    } catch (error) {
      console.error('Error al cargar asistencias:', error);
      toast.error('Error al cargar asistencias');
      setAlumnos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadAsistencias();
    
    // Auto-refresh cada 2 minutos
    const interval = setInterval(() => {
      if (selectedGrupo && selectedFecha) {
        loadAsistencias();
      }
    }, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [selectedGrupo, selectedFecha]);

  const handleAsistenciaChange = (alumnoId, field, value) => {
    setAsistencias(prev => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!selectedGrupo) return;
    setLoading(true);
    try {
      const data = alumnos.map(a => ({
        inscripcion_id: asistencias[a.id]?.inscripcion_id,
        alumno_id: a.id,
        estatus: asistencias[a.id]?.estatus || 'Asistencia',
        observaciones: asistencias[a.id]?.observaciones || ''
      }));
      await asistenciasService.saveMultiple({ 
        grupo_id: parseInt(selectedGrupo) || 0, 
        fecha: selectedFecha, 
        asistencias: data 
      });
      toast.success('Asistencias guardadas correctamente');
      loadAsistencias();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar asistencias');
    } finally {
      setLoading(false);
    }
  };

  const contarAsistencias = () => {
    let asistieron = 0, faltaron = 0, retardos = 0, justificadas = 0;
    alumnos.forEach(a => {
      const estatus = asistencias[a.id]?.estatus;
      if (estatus === 'Asistencia') asistieron++;
      else if (estatus === 'Falta') faltaron++;
      else if (estatus === 'Retardo') retardos++;
      else if (estatus === 'Justificada') justificadas++;
    });
    return { asistieron, faltaron, retardos, justificadas };
  };

  const stats = contarAsistencias();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Control de Asistencias</h1>
        <button onClick={handleSave} disabled={!selectedGrupo || loading} className="btn-primary flex items-center space-x-2"><FaSave /><span>Guardar Asistencias</span></button>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Seleccionar Grupo *</label>
            <select className="input" value={selectedGrupo} onChange={(e) => setSelectedGrupo(e.target.value)}>
              <option value="">-- Seleccionar grupo --</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>
                  {g.codigo} - {g.nivel_nombre || g.nivel} ({g.maestro_nombre || 'Sin maestro'}) [{g.alumnos_inscritos || 0} alumnos]
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Fecha *</label>
            <input type="date" className="input" value={selectedFecha} onChange={(e) => setSelectedFecha(e.target.value)} />
          </div>
        </div>

        {selectedGrupo && alumnos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg"><div className="flex items-center space-x-2"><FaCheckCircle className="text-green-600 text-xl" /><div><p className="text-sm text-gray-600">Asistencias</p><p className="text-2xl font-bold text-green-600">{stats.asistieron}</p></div></div></div>
            <div className="bg-red-50 p-4 rounded-lg"><div className="flex items-center space-x-2"><FaTimesCircle className="text-red-600 text-xl" /><div><p className="text-sm text-gray-600">Faltas</p><p className="text-2xl font-bold text-red-600">{stats.faltaron}</p></div></div></div>
            <div className="bg-yellow-50 p-4 rounded-lg"><div className="flex items-center space-x-2"><FaClock className="text-yellow-600 text-xl" /><div><p className="text-sm text-gray-600">Retardos</p><p className="text-2xl font-bold text-yellow-600">{stats.retardos}</p></div></div></div>
            <div className="bg-blue-50 p-4 rounded-lg"><div className="flex items-center space-x-2"><FaExclamationTriangle className="text-blue-600 text-xl" /><div><p className="text-sm text-gray-600">Justificadas</p><p className="text-2xl font-bold text-blue-600">{stats.justificadas}</p></div></div></div>
          </div>
        )}

        {selectedGrupo && (
          <div>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Matrícula</th>
                      <th>Nombre</th>
                      <th>Estatus</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnos.map(alumno => (
                      <tr key={alumno.id}>
                        <td className="font-medium">{alumno.matricula}</td>
                        <td>{alumno.nombre_completo}</td>
                        <td>
                          <select
                            className="input w-40"
                            value={asistencias[alumno.id]?.estatus || 'Asistencia'}
                            onChange={(e) => handleAsistenciaChange(alumno.id, 'estatus', e.target.value)}
                          >
                            <option value="Asistencia">Asistencia</option>
                            <option value="Falta">Falta</option>
                            <option value="Retardo">Retardo</option>
                            <option value="Justificada">Justificada</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input"
                            placeholder="Observaciones"
                            value={asistencias[alumno.id]?.observaciones || ''}
                            onChange={(e) => handleAsistenciaChange(alumno.id, 'observaciones', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Asistencias;
