import { useState, useEffect } from 'react';
import { maestroDashboardService, uploadService } from '../services/api';
import { toast } from 'react-toastify';
import { FaDownload, FaUpload, FaSave, FaEdit } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

const MaestroAsistencias = () => {
  const [grupos, setGrupos] = useState([]);
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [selectedFecha, setSelectedFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [editableData, setEditableData] = useState([]);
  const [modoManual, setModoManual] = useState(false);
  const [alumnos, setAlumnos] = useState([]);

  useEffect(() => { 
    loadGrupos();
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(() => {
      loadGrupos();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedGrupo && modoManual) {
      cargarAlumnosDelGrupo();
    }
  }, [selectedGrupo, modoManual, selectedFecha]);

  const loadGrupos = async () => {
    try {
      const response = await maestroDashboardService.getMisGrupos();
      setGrupos(response.data);
    } catch (error) {
      toast.error('Error al cargar grupos');
    }
  };

  const cargarAlumnosDelGrupo = async () => {
    try {
      const response = await maestroDashboardService.getAlumnosGrupo(selectedGrupo.id);
      
      const alumnosData = response.data.map(alumno => ({
        inscripcion_id: alumno.inscripcion_id,
        alumno_id: alumno.alumno_id,
        matricula: alumno.matricula,
        nombre_completo: alumno.nombre_completo,
        estatus: '', // 👈 Cambiado de 'Asistencia' a vacío
        observaciones: ''
      }));
      
      setAlumnos(alumnosData);
      setEditableData(alumnosData);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      toast.error('Error al cargar alumnos');
    }
  };

  const descargarPlantilla = async () => {
    if (!selectedGrupo) {
      toast.warning('Selecciona un grupo primero');
      return;
    }
    
    try {
      const response = await maestroDashboardService.descargarPlantillaAsistencias(
        selectedGrupo.id, 
        selectedFecha
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `asistencias_${selectedGrupo.codigo_grupo}_${selectedFecha}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Plantilla descargada');
    } catch (error) {
      toast.error('Error al descargar plantilla');
    }
  };

  const procesarCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const asistencias = results.data
            .filter(row => row.estatus && row.estatus.trim() !== '')
            .map(row => {
              const inscripId = parseInt(row.inscripcion_id);
              const alumnoId = parseInt(row.alumno_id);
              
              if (isNaN(inscripId) || isNaN(alumnoId)) {
                return null;
              }
              
              return {
                inscripcion_id: inscripId,
                alumno_id: alumnoId,
                matricula: row.matricula,
                nombre_completo: row.nombre_completo,
                estatus: row.estatus,
                observaciones: row.observaciones || ''
              };
            })
            .filter(row => row !== null);
          
          setEditableData(asistencias);
          toast.success(`${asistencias.length} asistencias cargadas`);
        },
        error: () => toast.error('Error al leer CSV')
      });
    };
    reader.readAsText(file);
  };

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'csv') {
      procesarCSV(file);
    } else {
      toast.error('Solo se aceptan archivos CSV');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: !selectedGrupo
  });

  const handleEditAsistencia = (index, field, value) => {
    const newData = [...editableData];
    newData[index][field] = value;
    setEditableData(newData);
    if (modoManual) {
      setAlumnos(newData);
    }
  };

  const guardarAsistencias = async () => {
    if (!selectedGrupo || editableData.length === 0) return;

    // Validación de día de clase
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaSeleccionado = diasSemana[new Date(selectedFecha + 'T12:00:00').getDay()];
    
    if (selectedGrupo.dias_lista && !selectedGrupo.dias_lista.includes(diaSeleccionado)) {
      toast.error(`No puedes registrar asistencia en ${diaSeleccionado}. El grupo solo tiene clases: ${selectedGrupo.dias_lista.join(', ')}`);
      return;
    }
    
    const asistenciasParaGuardar = editableData.filter(a => a.estatus !== '');
    
    if (asistenciasParaGuardar.length === 0) {
      toast.warning('No hay asistencias seleccionadas para guardar');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await uploadService.guardarAsistencias({
        grupo_id: selectedGrupo.id,
        fecha: selectedFecha,
        asistencias: asistenciasParaGuardar
      });
      
      toast.success(`${asistenciasParaGuardar.length} registros guardados exitosamente`);
      // No limpiar los datos si el usuario quiere seguir editando 1 por 1
      // Solo refrescar si es necesario, pero por ahora lo dejamos así para que vea lo que guardó
      if (!modoManual) {
        setEditableData([]);
        setAlumnos([]);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar asistencias');
    } finally {
      setLoading(false);
    }
  };

  const contarEstatus = () => {
    const stats = { Asistencia: 0, Falta: 0, Retardo: 0, Justificada: 0 };
    editableData.forEach(a => {
      if (stats[a.estatus] !== undefined) stats[a.estatus]++;
    });
    return stats;
  };

  const stats = contarEstatus();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subir Asistencias</h1>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Grupo *</label>
            <select 
              className="input" 
              value={selectedGrupo?.id || ''} 
              onChange={(e) => {
                const grupoId = parseInt(e.target.value);
                const grupo = !isNaN(grupoId) ? grupos.find(g => g.id === grupoId) : null;
                setSelectedGrupo(grupo);
              }}
            >
              <option value="">-- Seleccionar grupo --</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>
                  {g.codigo_grupo} - {g.nivel} [{g.horarios || 'Sin horario'}] ({g.total_alumnos || 0} alumnos)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Fecha *</label>
            <input 
              type="date" 
              className={`input ${selectedGrupo && !selectedGrupo.dias_lista?.includes(['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][new Date(selectedFecha + 'T12:00:00').getDay()]) ? 'border-amber-500 bg-amber-50' : ''}`}
              value={selectedFecha} 
              onChange={(e) => setSelectedFecha(e.target.value)} 
            />
            {selectedGrupo && !selectedGrupo.dias_lista?.includes(['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][new Date(selectedFecha + 'T12:00:00').getDay()]) && (
              <p className="text-xs text-amber-600 mt-1 font-medium italic">
                ⚠️ Este grupo no tiene clases programadas para este día ({['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date(selectedFecha + 'T12:00:00').getDay()]}).
              </p>
            )}
          </div>
        </div>

        {selectedGrupo && (
          <button 
            onClick={descargarPlantilla} 
            className="btn-secondary flex items-center space-x-2 mb-4"
          >
            <FaDownload />
            <span>Descargar Plantilla CSV</span>
          </button>
        )}
      </div>

      {selectedGrupo && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md border border-green-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 rounded-lg p-3">
                <FaUpload className="text-2xl text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Subir Lista de Asistencias</h3>
                <p className="text-sm text-gray-600">Arrastra tu archivo o captura manualmente</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setModoManual(false); setEditableData([]); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  !modoManual ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                📁 Archivo
              </button>
              <button
                onClick={() => { setModoManual(true); setEditableData([]); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  modoManual ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                ✍️ Manual
              </button>
            </div>
          </div>
          
          {!modoManual ? (
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 bg-white
                ${isDragActive ? 'border-green-500 bg-green-50 shadow-lg transform scale-105' : 'border-gray-300 hover:border-green-400 hover:shadow-md'}`}
            >
              <input {...getInputProps()} />
              
              {isDragActive ? (
                <div className="space-y-4">
                  <div className="bg-green-100 rounded-full p-6 inline-block">
                    <FaUpload className="text-5xl text-green-600 animate-bounce" />
                  </div>
                  <p className="text-xl font-semibold text-green-600">¡Suelta el archivo aquí!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-full p-6 inline-block">
                    <FaUpload className="text-5xl text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700 mb-2">Arrastra tu archivo aquí</p>
                    <p className="text-sm text-gray-500 mb-4">o haz clic para seleccionar desde tu computadora</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-2xl">📄</span>
                      <span className="text-sm font-medium text-green-700">Solo archivos CSV</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 border border-gray-300">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-full p-6 inline-block mb-4">
                  <FaEdit className="text-5xl text-green-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-800">Captura Manual de Asistencias</h4>
                <p className="text-sm text-gray-600 mt-2">
                  {alumnos.length > 0 ? `${alumnos.length} alumnos cargados - Marca las asistencias` : 'Cargando alumnos...'}
                </p>
              </div>

              {alumnos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => {
                        const markedAll = alumnos.map(a => ({ ...a, estatus: 'Asistencia' }));
                        setAlumnos(markedAll);
                        setEditableData(markedAll);
                        toast.info('Se marcaron todos como "Asistencia"');
                      }}
                      className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition flex items-center gap-2"
                    >
                      <span>✅</span> Marcar todos como "Asistencia"
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">#</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Matrícula</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nombre</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Estatus</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alumnos.map((alumno, index) => (
                          <tr key={index} className="border-b hover:bg-green-50">
                            <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium">{alumno.matricula}</td>
                            <td className="px-4 py-3 text-sm">{alumno.nombre_completo}</td>
                            <td className="px-4 py-3">
                              <select
                                className="input w-40"
                                value={alumno.estatus}
                                onChange={(e) => handleEditAsistencia(index, 'estatus', e.target.value)}
                              >
                                <option value="" disabled>-- Seleccionar --</option>
                                <option value="Asistencia">✓ Asistencia</option>
                                <option value="Falta">✗ Falta</option>
                                <option value="Retardo">⏰ Retardo</option>
                                <option value="Justificada">📋 Justificada</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                className="input"
                                placeholder="Observaciones opcionales"
                                value={alumno.observaciones}
                                onChange={(e) => handleEditAsistencia(index, 'observaciones', e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4 flex items-start gap-3 bg-green-100 border border-green-300 rounded-lg p-4">
            <span className="text-2xl">💡</span>
            <div className="text-sm text-green-800">
              <p className="font-semibold mb-1">Consejo:</p>
              <p>Descarga primero la plantilla CSV, registra las asistencias y súbela aquí. Los estatus disponibles son: Asistencia, Falta, Retardo, Justificada.</p>
            </div>
          </div>
        </div>
      )}

      {editableData.length > 0 && !modoManual && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Asistencias</p>
              <p className="text-2xl font-bold text-green-600">{stats.Asistencia}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Faltas</p>
              <p className="text-2xl font-bold text-red-600">{stats.Falta}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Retardos</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.Retardo}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Justificadas</p>
              <p className="text-2xl font-bold text-blue-600">{stats.Justificada}</p>
            </div>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Vista Previa - {editableData.length} asistencias
              </h3>
              <button 
                onClick={guardarAsistencias} 
                disabled={loading}
                className="btn-primary flex items-center space-x-2"
              >
                <FaSave />
                <span>{loading ? 'Guardando...' : 'Guardar Asistencias'}</span>
              </button>
            </div>

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
                  {editableData.map((asist, index) => (
                    <tr key={index}>
                      <td className="font-medium">{asist.matricula}</td>
                      <td>{asist.nombre_completo}</td>
                      <td>
                        <select
                          className="input w-40"
                          value={asist.estatus}
                          onChange={(e) => handleEditAsistencia(index, 'estatus', e.target.value)}
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
                          value={asist.observaciones}
                          onChange={(e) => handleEditAsistencia(index, 'observaciones', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {modoManual && alumnos.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <p className="text-sm text-gray-600 font-medium">Asistencias</p>
              <p className="text-3xl font-bold text-green-600">{stats.Asistencia}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <p className="text-sm text-gray-600 font-medium">Faltas</p>
              <p className="text-3xl font-bold text-red-600">{stats.Falta}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
              <p className="text-sm text-gray-600 font-medium">Retardos</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.Retardo}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <p className="text-sm text-gray-600 font-medium">Justificadas</p>
              <p className="text-3xl font-bold text-blue-600">{stats.Justificada}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={guardarAsistencias} 
              disabled={loading}
              className="btn-primary flex items-center space-x-2 text-lg px-8 py-3"
            >
              <FaSave />
              <span>{loading ? 'Guardando...' : 'Guardar Asistencias'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MaestroAsistencias;
