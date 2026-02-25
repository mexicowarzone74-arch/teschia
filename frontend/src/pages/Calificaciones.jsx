import { useState, useEffect } from 'react';
import { calificacionesService, gruposService } from '../services/api';
import { toast } from 'react-toastify';
import { FaSave, FaChartLine } from 'react-icons/fa';

const Calificaciones = () => {
  const [grupos, setGrupos] = useState([]);
  const [selectedGrupo, setSelectedGrupo] = useState('');
  const [selectedParcial, setSelectedParcial] = useState('1');
  const [alumnos, setAlumnos] = useState([]);
  const [calificaciones, setCalificaciones] = useState({});
  const [loading, setLoading] = useState(false);
  const [vistaFinal, setVistaFinal] = useState(false); // Nueva vista de calificaciones finales

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

  const loadCalificaciones = async () => {
    if (!selectedGrupo) return;
    setLoading(true);
    try {
      const response = await calificacionesService.getByGrupo(selectedGrupo, selectedParcial);
      const data = Array.isArray(response.data) ? response.data : [];
      setAlumnos(data);
      const cals = {};
      data.forEach(alumno => {
        const calificacionParcial = alumno.calificaciones?.find(c => c.parcial === parseInt(selectedParcial));
        cals[alumno.alumno_id] = { 
          inscripcion_id: alumno.inscripcion_id,
          calificacion: calificacionParcial?.calificacion || '', 
          observaciones: calificacionParcial?.observaciones || '' 
        };
      });
      setCalificaciones(cals);
    } catch (error) {
      console.error('Error al cargar calificaciones:', error);
      toast.error('Error al cargar calificaciones');
      setAlumnos([]);
    } finally {
      setLoading(false);
    }
  };

  // Calcular calificación final y estatus
  const calcularCalificacionFinal = (alumno) => {
    const parcial1 = alumno.calificaciones?.find(c => c.parcial === 1)?.calificacion || 0;
    const parcial2 = alumno.calificaciones?.find(c => c.parcial === 2)?.calificacion || 0;
    const parcial3 = alumno.calificaciones?.find(c => c.parcial === 3)?.calificacion || 0;
    const total = parcial1 + parcial2 + parcial3;
    const aprobado = total >= 210;
    return { parcial1, parcial2, parcial3, total, aprobado };
  };

  useEffect(() => { 
    loadCalificaciones();
    
    // Auto-refresh cada 2 minutos
    const interval = setInterval(() => {
      if (selectedGrupo && selectedParcial) {
        loadCalificaciones();
      }
    }, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [selectedGrupo, selectedParcial]);

  const handleCalificacionChange = (alumnoId, field, value) => {
    // Si es el campo de calificación, validar el valor
    if (field === 'calificacion' && value !== '') {
      const num = parseFloat(value);
      // Validar que sea un número válido entre 0 y 100
      if (!isNaN(num)) {
        if (num < 0) value = '0';
        if (num > 100) value = '100';
      }
    }
    
    setCalificaciones(prev => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!selectedGrupo) return;
    setLoading(true);
    try {
      const data = alumnos.map(a => {
        // Obtener calificación y asegurar que sea un número válido
        const calRaw = calificaciones[a.alumno_id]?.calificacion;
        let calificacionFinal = 0;
        
        if (calRaw !== null && calRaw !== undefined && calRaw !== '') {
          calificacionFinal = parseFloat(calRaw);
          // Validar rango 0-100
          if (isNaN(calificacionFinal) || calificacionFinal < 0 || calificacionFinal > 100) {
            throw new Error(`Calificación inválida para ${a.nombre_completo}: ${calRaw}. Debe estar entre 0 y 100.`);
          }
        }
        
        return {
          inscripcion_id: calificaciones[a.alumno_id]?.inscripcion_id,
          alumno_id: a.alumno_id,
          grupo_id: parseInt(selectedGrupo),
          parcial: parseInt(selectedParcial),
          calificacion: calificacionFinal,
          observaciones: calificaciones[a.alumno_id]?.observaciones || ''
        };
      });
      
      await calificacionesService.saveMultiple(data);
      toast.success('Calificaciones guardadas correctamente');
      loadCalificaciones();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar las calificaciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Calificaciones</h1>
      </div>

      <div className="card">
        <div className="flex gap-3">
          <button 
            onClick={() => setVistaFinal(!vistaFinal)} 
            className="btn-secondary flex items-center space-x-2"
          >
            <FaChartLine />
            <span>{vistaFinal ? 'Ver Por Parcial' : 'Ver Calificación Final'}</span>
          </button>
          {!vistaFinal && (
            <button onClick={handleSave} disabled={!selectedGrupo || loading} className="btn-primary flex items-center space-x-2">
              <FaSave />
              <span>Guardar Calificaciones</span>
            </button>
          )}
        </div>
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
          {!vistaFinal && (
            <div>
              <label className="block text-sm font-medium mb-2">Parcial *</label>
              <select className="input" value={selectedParcial} onChange={(e) => setSelectedParcial(e.target.value)}>
                <option value="1">Primer Parcial</option>
                <option value="2">Segundo Parcial</option>
                <option value="3">Tercer Parcial</option>
              </select>
            </div>
          )}
        </div>

        {selectedGrupo && (
          <div>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : vistaFinal ? (
              <div className="overflow-x-auto">
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Sistema de calificación:</strong> El alumno debe obtener <strong>mínimo 210 puntos</strong> de 300 posibles (suma de los 3 parciales) para aprobar el curso.
                  </p>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Matrícula</th>
                      <th>Nombre</th>
                      <th>Parcial 1</th>
                      <th>Parcial 2</th>
                      <th>Parcial 3</th>
                      <th>Total</th>
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnos.map(alumno => {
                      const { parcial1, parcial2, parcial3, total, aprobado } = calcularCalificacionFinal(alumno);
                      return (
                        <tr key={alumno.alumno_id} className={aprobado ? 'bg-green-50' : 'bg-red-50'}>
                          <td className="font-medium">{alumno.matricula}</td>
                          <td>{alumno.nombre_completo}</td>
                          <td className="text-center font-semibold">{parcial1 || '-'}</td>
                          <td className="text-center font-semibold">{parcial2 || '-'}</td>
                          <td className="text-center font-semibold">{parcial3 || '-'}</td>
                          <td className="text-center font-bold text-lg">{total}</td>
                          <td>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              aprobado 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {aprobado ? '✓ Aprobado' : '✗ Reprobado'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Matrícula</th>
                      <th>Nombre</th>
                      <th>Calificación (0-100)</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnos.map(alumno => (
                      <tr key={alumno.alumno_id}>
                        <td className="font-medium">{alumno.matricula}</td>
                        <td>{alumno.nombre_completo}</td>
                        <td>
                          <input
                            type="number"
                            className="input w-24"
                            min="0"
                            max="100"
                            step="0.1"
                            value={calificaciones[alumno.alumno_id]?.calificacion || ''}
                            onChange={(e) => handleCalificacionChange(alumno.alumno_id, 'calificacion', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input"
                            placeholder="Notas adicionales"
                            value={calificaciones[alumno.alumno_id]?.observaciones || ''}
                            onChange={(e) => handleCalificacionChange(alumno.alumno_id, 'observaciones', e.target.value)}
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

export default Calificaciones;
