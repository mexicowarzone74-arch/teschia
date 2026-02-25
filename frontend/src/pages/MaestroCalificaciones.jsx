import { useState, useEffect } from 'react';
import { maestroDashboardService, uploadService } from '../services/api';
import { toast } from 'react-toastify';
import { FaDownload, FaUpload, FaCheckCircle, FaEdit, FaSave } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import Tesseract from 'tesseract.js';

const MaestroCalificaciones = () => {
  const [grupos, setGrupos] = useState([]);
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [selectedParcial, setSelectedParcial] = useState('1');
  const [loading, setLoading] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [editableData, setEditableData] = useState([]);
  const [processingOCR, setProcessingOCR] = useState(false);
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
  }, [selectedGrupo, modoManual]);

  const loadGrupos = async () => {
    try {
      const response = await maestroDashboardService.getMisGrupos();
      setGrupos(response.data);
    } catch (error) {
      console.error('❌ Error al cargar grupos:', error);
      if (error.response?.status === 401) {
        toast.error(error.response?.data?.error || 'Sesión expirada. Cierra sesión e inicia sesión nuevamente.', {
          autoClose: 10000
        });
      } else {
        toast.error('Error al cargar grupos');
      }
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
        calificacion: '',
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
      const response = await maestroDashboardService.descargarPlantillaCalificaciones(
        selectedGrupo.id, 
        selectedParcial
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `calificaciones_${selectedGrupo.codigo_grupo}_parcial_${selectedParcial}.csv`);
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
    reader.onload = async (e) => {
      const text = e.target.result;
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const calificaciones = results.data
            .filter(row => row.calificacion && row.calificacion.trim() !== '')
            .map(row => {
              const inscripId = parseInt(row.inscripcion_id);
              const alumnoId = parseInt(row.alumno_id);
              const calif = parseFloat(row.calificacion);
              
              // Validar que todos los valores sean números válidos
              if (isNaN(inscripId) || isNaN(alumnoId) || isNaN(calif)) {
                return null;
              }
              
              return {
                inscripcion_id: inscripId,
                alumno_id: alumnoId,
                matricula: row.matricula,
                nombre_completo: row.nombre_completo,
                calificacion: calif,
                observaciones: row.observaciones || ''
              };
            })
            .filter(row => row !== null);
          
          setUploadedData({ tipo: 'csv', calificaciones });
          setEditableData(calificaciones);
          toast.success(`${calificaciones.length} calificaciones cargadas`);
        },
        error: () => toast.error('Error al leer CSV')
      });
    };
    reader.readAsText(file);
  };

  const procesarPDF = async (file) => {
    setProcessingOCR(true);
    toast.info('Procesando PDF con OCR... esto puede tardar');
    
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'spa', {
        // logger: m => console.log(m) // Deshabilitado en producción
      });
      
      // Intentar extraer datos del texto OCR
      // Formato esperado: Matricula | Nombre | Calificacion
      const lines = text.split('\n');
      const calificaciones = [];
      
      for (const line of lines) {
        // Buscar patrón: números (matrícula) seguido de texto (nombre) y número (calificación)
        const match = line.match(/(\d{6,})\s+(.+?)\s+(\d{1,3}(?:\.\d+)?)/);
        if (match) {
          calificaciones.push({
            matricula: match[1],
            nombre_completo: match[2].trim(),
            calificacion: parseFloat(match[3]),
            observaciones: ''
          });
        }
      }
      
      if (calificaciones.length === 0) {
        toast.warning('No se detectaron calificaciones en el PDF. Verifica el formato.');
      } else {
        setUploadedData({ tipo: 'pdf', calificaciones });
        setEditableData(calificaciones);
        toast.success(`${calificaciones.length} calificaciones detectadas`);
      }
    } catch (error) {
      console.error('Error OCR:', error);
      toast.error('Error al procesar PDF');
    } finally {
      setProcessingOCR(false);
    }
  };

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'csv') {
      procesarCSV(file);
    } else if (ext === 'pdf') {
      procesarPDF(file);
    } else {
      toast.error('Solo se aceptan archivos CSV o PDF');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: !selectedGrupo || processingOCR
  });

  const handleEditCalificacion = (index, field, value) => {
    const newData = [...editableData];
    if (field === 'calificacion') {
      // Validación en tiempo real
      if (value !== '') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          if (num < 0) value = '0';
          if (num > 100) value = '100';
        }
      }
      newData[index][field] = value === '' ? '' : value;
    } else {
      newData[index][field] = value;
    }
    setEditableData(newData);
    if (modoManual) {
      setAlumnos(newData);
    }
  };

  const guardarCalificaciones = async () => {
    if (!selectedGrupo || editableData.length === 0) return;
    
    // Validar que todas las calificaciones sean válidas
    const calificacionesValidas = editableData.filter(cal => {
      if (cal.calificacion === '' || cal.calificacion === null || cal.calificacion === undefined) {
        return false;
      }
      const num = parseFloat(cal.calificacion);
      return !isNaN(num) && num >= 0 && num <= 100;
    }).map(cal => ({
      ...cal,
      calificacion: parseFloat(cal.calificacion)
    }));
    
    if (calificacionesValidas.length === 0) {
      toast.warning('Ingresa al menos una calificación válida (0-100)');
      return;
    }
    
    setLoading(true);
    try {
      await uploadService.guardarCalificaciones({
        grupo_id: selectedGrupo.id,
        parcial: parseInt(selectedParcial),
        calificaciones: calificacionesValidas
      });
      
      toast.success(`${calificacionesValidas.length} calificaciones guardadas exitosamente`);
      setUploadedData(null);
      setEditableData([]);
      setAlumnos([]);
      if (modoManual) {
        setModoManual(false);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar calificaciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subir Calificaciones</h1>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Grupo *</label>
            <select 
              className="input" 
              value={selectedGrupo?.id || ''} 
              onChange={(e) => setSelectedGrupo(grupos.find(g => g.id === parseInt(e.target.value)))}
            >
              <option value="">-- Seleccionar grupo --</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>
                  {g.codigo_grupo} - {g.nivel} ({g.total_alumnos || 0} alumnos)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Parcial *</label>
            <select className="input" value={selectedParcial} onChange={(e) => setSelectedParcial(e.target.value)}>
              <option value="1">Primer Parcial</option>
              <option value="2">Segundo Parcial</option>
              <option value="3">Tercer Parcial</option>
            </select>
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
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-lg p-3">
                <FaUpload className="text-2xl text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Subir Calificaciones</h3>
                <p className="text-sm text-gray-600">Arrastra tu archivo o captura manualmente</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setModoManual(false); setEditableData([]); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  !modoManual ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                📁 Archivo
              </button>
              <button
                onClick={() => { setModoManual(true); setEditableData([]); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  modoManual ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
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
                ${isDragActive ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105' : 'border-gray-300 hover:border-blue-400 hover:shadow-md'}
                ${processingOCR ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              
              {processingOCR ? (
                <div className="space-y-4">
                  <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                  <p className="text-lg font-semibold text-gray-700">Procesando PDF con OCR...</p>
                  <p className="text-sm text-gray-500">Esto puede tardar unos momentos</p>
                </div>
              ) : isDragActive ? (
                <div className="space-y-4">
                  <div className="bg-blue-100 rounded-full p-6 inline-block">
                    <FaUpload className="text-5xl text-blue-600 animate-bounce" />
                  </div>
                  <p className="text-xl font-semibold text-blue-600">¡Suelta el archivo aquí!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full p-6 inline-block">
                    <FaUpload className="text-5xl text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700 mb-2">Arrastra tu archivo aquí</p>
                    <p className="text-sm text-gray-500 mb-4">o haz clic para seleccionar desde tu computadora</p>
                  </div>
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-2xl">📄</span>
                      <span className="text-sm font-medium text-green-700">CSV</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                      <span className="text-2xl">📕</span>
                      <span className="text-sm font-medium text-red-700">PDF</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 border border-gray-300">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full p-6 inline-block mb-4">
                  <FaEdit className="text-5xl text-blue-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-800">Captura Manual de Calificaciones</h4>
                <p className="text-sm text-gray-600 mt-2">
                  {alumnos.length > 0 ? `${alumnos.length} alumnos cargados - Ingresa las calificaciones` : 'Cargando alumnos...'}
                </p>
              </div>
              
              {alumnos.length > 0 && (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">#</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Matrícula</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Calificación</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnos.map((alumno, index) => (
                        <tr key={index} className="border-b hover:bg-blue-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium">{alumno.matricula}</td>
                          <td className="px-4 py-3 text-sm">{alumno.nombre_completo}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              className="input w-24"
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="0-100"
                              value={alumno.calificacion}
                              onChange={(e) => handleEditCalificacion(index, 'calificacion', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="input"
                              placeholder="Notas opcionales"
                              value={alumno.observaciones}
                              onChange={(e) => handleEditCalificacion(index, 'observaciones', e.target.value)}
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
          
          <div className="mt-4 flex items-start gap-3 bg-blue-100 border border-blue-300 rounded-lg p-4">
            <span className="text-2xl">💡</span>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Consejo:</p>
              <p>Descarga primero la plantilla CSV, llénala con las calificaciones y súbela aquí. También puedes subir un PDF con OCR.</p>
            </div>
          </div>
        </div>
      )}

      {editableData.length > 0 && !modoManual && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Vista Previa - {editableData.length} calificaciones
            </h3>
            <button 
              onClick={guardarCalificaciones} 
              disabled={loading}
              className="btn-primary flex items-center space-x-2"
            >
              <FaSave />
              <span>{loading ? 'Guardando...' : 'Guardar Calificaciones'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Nombre</th>
                  <th>Calificación</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {editableData.map((cal, index) => (
                  <tr key={index}>
                    <td className="font-medium">{cal.matricula}</td>
                    <td>{cal.nombre_completo}</td>
                    <td>
                      <input
                        type="number"
                        className="input w-20"
                        min="0"
                        max="100"
                        step="0.1"
                        value={cal.calificacion}
                        onChange={(e) => handleEditCalificacion(index, 'calificacion', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input"
                        placeholder="Notas"
                        value={cal.observaciones}
                        onChange={(e) => handleEditCalificacion(index, 'observaciones', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modoManual && alumnos.length > 0 && (
        <div className="flex justify-end">
          <button 
            onClick={guardarCalificaciones} 
            disabled={loading}
            className="btn-primary flex items-center space-x-2 text-lg px-8 py-3"
          >
            <FaSave />
            <span>{loading ? 'Guardando...' : 'Guardar Calificaciones'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MaestroCalificaciones;
