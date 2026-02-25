import { useState, useEffect } from 'react';
import { alumnosService } from '../services/api';
import { toast } from 'react-toastify';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaFileExcel, FaThLarge, FaList, FaChevronDown, FaChevronUp, FaGraduationCap, FaUsers, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { TooltipIcon } from '../components/Tooltip';

const Alumnos = () => {
  const { user } = useAuth();
  const isMaestro = user?.rol === 'maestro';
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState(null);
  const [formData, setFormData] = useState({
    matricula: '',
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    email: '',
    telefono: '',
    municipio: '',
    tipo_alumno: 'interno',
    es_nuevo_ingreso: true,
    carrera: '',
    semestre: '',
    nivel_actual: '',
    fecha_ingreso: '',
    estatus: 'activo',
    edad: '',
    genero: ''
  });
  const [filters, setFilters] = useState({
    search: '',
    tipo: '',
    nivel: '',
    carrera: '',
    estatus: ''
  });
  const [viewMode, setViewMode] = useState('grouped'); // 'table', 'cards', 'grouped'
  const [expandedLevels, setExpandedLevels] = useState({
    'Basico': true,
    'Intermedio': true,
    'Avanzado': true,
    'Perfeccionamiento 1': true,
    'Perfeccionamiento 2': true,
    'C1': true
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldValid, setFieldValid] = useState({});
  const [currentPage, setCurrentPage] = useState({});
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadAlumnos();
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(() => {
      loadAlumnos();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [filters]);

  const loadAlumnos = async () => {
    try {
      const response = await alumnosService.getAll({ ...filters, limit: 10000 });
      setAlumnos(response.data.alumnos || response.data);
    } catch (error) {
      toast.error('❌ No se pudieron cargar los alumnos. Verifica tu conexión e intenta nuevamente', {
        autoClose: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const alumno = alumnos.find(a => a.id === id);
    if (!window.confirm(`¿Estás seguro de dar de baja a ${alumno?.nombre_completo}?\n\n✅ No te preocupes, su historial académico se mantendrá guardado.`)) return;

    try {
      // Cambiar estatus a 'baja' en lugar de eliminar (soft delete)
      await alumnosService.update(id, { estatus: 'baja' });
      toast.success(`✅ ${alumno?.nombre_completo} fue dado de baja. Su historial académico está guardado`, {
        autoClose: 4000
      });
      loadAlumnos();
    } catch (error) {
      toast.error('❌ No se pudo dar de baja al alumno. Intenta nuevamente', {
        autoClose: 3000
      });
    }
  };

  const validateField = (name, value) => {
    let error = '';
    let isValid = false;

    switch (name) {
      case 'matricula':
        // Matrícula solo obligatoria para internos
        if (formData.tipo_alumno === 'interno') {
          if (!value) error = 'La matrícula es obligatoria para alumnos internos';
          else if (!/^\d{9,10}$/.test(value)) error = 'Debe tener 9-10 dígitos';
          else isValid = true;
        } else {
          // Para externos, la matrícula es opcional
          if (value && !/^\d{9,10}$/.test(value)) error = 'Debe tener 9-10 dígitos';
          else isValid = true;
        }
        break;
      case 'nombre':
        if (!value) error = 'El nombre es obligatorio';
        else if (value.length < 2) error = 'Mínimo 2 caracteres';
        else isValid = true;
        break;
      case 'apellido_paterno':
        if (!value) error = 'El apellido paterno es obligatorio';
        else if (value.length < 2) error = 'Mínimo 2 caracteres';
        else isValid = true;
        break;
      case 'apellido_materno':
        if (!value) error = 'El apellido materno es obligatorio';
        else if (value.length < 2) error = 'Mínimo 2 caracteres';
        else isValid = true;
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Email inválido';
        else if (value) isValid = true;
        break;
      case 'telefono':
        if (value && !/^\d{10}$/.test(value)) error = 'Debe tener 10 dígitos';
        else if (value) isValid = true;
        break;
      case 'semestre':
        if (formData.tipo_alumno === 'interno' && !formData.es_nuevo_ingreso) {
          if (!value) error = 'El semestre es obligatorio';
          else if (parseInt(value) < 1 || parseInt(value) > 14) error = 'Debe estar entre 1 y 14';
          else isValid = true;
        }
        break;
      default:
        break;
    }

    setFieldErrors(prev => ({ ...prev, [name]: error }));
    setFieldValid(prev => ({ ...prev, [name]: isValid }));
  };

  const handleOpenModal = (alumno = null) => {
    setFieldErrors({});
    setFieldValid({});

    if (alumno) {
      setEditingAlumno(alumno);
      // Separar el nombre completo si existe
      const nombreParts = alumno.nombre_completo ? alumno.nombre_completo.split(' ') : ['', '', ''];
      setFormData({
        matricula: alumno.matricula,
        nombre: nombreParts.slice(0, -2).join(' ') || '',
        apellido_paterno: nombreParts[nombreParts.length - 2] || '',
        apellido_materno: nombreParts[nombreParts.length - 1] || '',
        email: alumno.correo || '',
        telefono: alumno.telefono || '',
        municipio: alumno.municipio || '',
        tipo_alumno: alumno.tipo_alumno,
        es_nuevo_ingreso: alumno.es_nuevo_ingreso !== undefined ? alumno.es_nuevo_ingreso : false,
        carrera: alumno.carrera || '',
        semestre: alumno.semestre || '',
        nivel_actual: alumno.nivel_actual || '',
        fecha_ingreso: alumno.fecha_ingreso ? alumno.fecha_ingreso.split('T')[0] : new Date().toISOString().split('T')[0],
        estatus: alumno.estatus,
        edad: alumno.edad || '',
        genero: alumno.genero || '',

      });
    } else {
      setEditingAlumno(null);
      setFormData({
        matricula: '',
        nombre: '',
        apellido_paterno: '',
        apellido_materno: '',
        email: '',
        telefono: '',
        municipio: '',
        tipo_alumno: 'interno',
        es_nuevo_ingreso: true,
        carrera: '',
        semestre: '',
        nivel_actual: '',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        estatus: 'activo'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAlumno(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combinar nombre completo para enviar al backend
      const esNuevoIngreso = formData.es_nuevo_ingreso === 'true' || formData.es_nuevo_ingreso === true;

      // Si es nuevo ingreso interno, forzar semestre 1
      let semestreValue = formData.semestre;
      if (esNuevoIngreso && formData.tipo_alumno === 'interno') {
        semestreValue = '1';
      }

      const dataToSend = {
        ...formData,
        nombre: formData.nombre.trim(),
        apellido_paterno: formData.apellido_paterno.trim(),
        apellido_materno: formData.apellido_materno.trim(),
        nombre_completo: `${formData.nombre} ${formData.apellido_paterno} ${formData.apellido_materno}`.trim(),
        correo: formData.email || null,
        // Convertir campos numéricos correctamente - IMPORTANTE: asegurar que NO sea vacío
        semestre: semestreValue && semestreValue !== '' && !isNaN(parseInt(semestreValue)) ? parseInt(semestreValue) : null,
        telefono: formData.telefono || null,
        municipio: formData.municipio || null,
        // Asegurar que nivel_actual tenga un valor válido
        nivel_actual: esNuevoIngreso ? 'Basico' : (formData.nivel_actual || null),
        // Convertir es_nuevo_ingreso a boolean
        es_nuevo_ingreso: esNuevoIngreso,
        // Asegurar que matricula solo tenga números
        matricula: formData.matricula.replace(/[^0-9]/g, '')
      };

      // Remover campo email (usamos correo)
      delete dataToSend.email;

      if (editingAlumno) {
        await alumnosService.update(editingAlumno.id, dataToSend);
        toast.success(`✅ ¡Perfecto! Los datos de ${dataToSend.nombre_completo} fueron actualizados correctamente`, {
          autoClose: 4000
        });
      } else {
        await alumnosService.create(dataToSend);
        toast.success(`🎉 ¡Excelente! ${dataToSend.nombre_completo} fue registrado exitosamente como alumno ${dataToSend.tipo_alumno}`, {
          autoClose: 4000
        });
      }
      handleCloseModal();
      loadAlumnos();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error al guardar alumno';
      toast.error(`❌ Oops: ${errorMsg}. Por favor verifica los datos e intenta nuevamente`, {
        autoClose: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      await alumnosService.importExcel(formData);
      toast.success('Alumnos importados exitosamente');
      loadAlumnos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al importar Excel');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const carreras = [
    'Ingeniería en Sistemas Computacionales',
    'Ingeniería Industrial',
    'Ingeniería en Informática',
    'Ingeniería Electromecánica',
    'Ingeniería Electrónica',
    'Ingeniería en Administración'
  ];
  
  const municipiosZonaVolcanes = [
    'Chalco', 'Valle de Chalco', 'Tlalmanalco', 'Amecameca', 'Ozumba', 
    'Atlautla', 'Ayapango', 'Cocotitlán', 'Ecatzingo', 'Juchitepec', 
    'Temamatla', 'Tenango del Aire', 'Tepetlixpa'
  ];

  const niveles = ['Básico', 'Intermedio', 'Avanzado', 'Perfeccionamiento 1', 'Perfeccionamiento 2', 'C1'];

  const toggleLevel = (nivel) => {
    setExpandedLevels(prev => ({
      ...prev,
      [nivel]: !prev[nivel]
    }));
  };

  const toggleAllLevels = () => {
    const allExpanded = Object.values(expandedLevels).every(v => v);
    const newState = {};
    niveles.forEach(nivel => {
      newState[nivel] = !allExpanded;
    });
    setExpandedLevels(newState);
  };

  // Agrupar alumnos por nivel
  const alumnosPorNivel = niveles.reduce((acc, nivel) => {
    acc[nivel] = alumnos.filter(a => a.nivel_actual === nivel);
    return acc;
  }, {});

  // Estadísticas por nivel
  const estadisticasPorNivel = niveles.map(nivel => ({
    nivel,
    total: alumnosPorNivel[nivel].length,
    internos: alumnosPorNivel[nivel].filter(a => a.tipo_alumno === 'interno').length,
    externos: alumnosPorNivel[nivel].filter(a => a.tipo_alumno === 'externo').length
  }));

  const getNivelColor = (nivel) => {
    const colors = {
      'Básico': 'bg-green-100 text-green-800 border-green-300',
      'Intermedio': 'bg-blue-100 text-blue-800 border-blue-300',
      'Avanzado': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Perfeccionamiento 1': 'bg-orange-100 text-orange-800 border-orange-300',
      'Perfeccionamiento 2': 'bg-pink-100 text-pink-800 border-pink-300',
      'C1': 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[nivel] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">
          {isMaestro ? 'Mis Alumnos' : 'Gestión de Alumnos'}
        </h1>
        {!isMaestro && (
          <div className="flex space-x-2">
            <label className="btn-secondary flex items-center space-x-2 cursor-pointer">
              <FaFileExcel />
              <span>Importar Excel</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary flex items-center space-x-2"
            >
              <FaPlus />
              <span>Nuevo Alumno</span>
            </button>
          </div>
        )}
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {estadisticasPorNivel.map(stat => (
          <div key={stat.nivel} className={`card p-4 border-2 ${getNivelColor(stat.nivel)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">Nivel {stat.nivel}</p>
                <p className="text-3xl font-bold mt-1">{stat.total}</p>
                <p className="text-xs mt-1">
                  <span className="font-medium">{stat.internos}</span> int · <span className="font-medium">{stat.externos}</span> ext
                </p>
              </div>
              <FaGraduationCap className="text-3xl opacity-50" />
            </div>
          </div>
        ))}
      </div>

      {/* Filtros y Controles de Vista */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, matrícula..."
                className="input pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            <select
              className="input"
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
            >
              <option value="">Todos los tipos</option>
              <option value="interno">Internos</option>
              <option value="externo">Externos</option>
            </select>

            <select
              className="input"
              value={filters.nivel}
              onChange={(e) => setFilters({ ...filters, nivel: e.target.value })}
            >
              <option value="">Todos los niveles</option>
              {niveles.map(nivel => (
                <option key={nivel} value={nivel}>{nivel}</option>
              ))}
            </select>

            <select
              className="input"
              value={filters.carrera}
              onChange={(e) => setFilters({ ...filters, carrera: e.target.value })}
            >
              <option value="">Todas las carreras</option>
              {carreras.map(carrera => (
                <option key={carrera} value={carrera}>{carrera}</option>
              ))}
            </select>

            <select
              className="input"
              value={filters.estatus}
              onChange={(e) => setFilters({ ...filters, estatus: e.target.value })}
            >
              <option value="">Todos los estatus</option>
              <option value="activo">Activos</option>
              <option value="baja">Baja</option>
              <option value="egresado">Egresados</option>
            </select>
          </div>

          {/* Controles de Vista */}
          <div className="flex items-center gap-2 border-l pl-4">
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-2 rounded transition-colors ${viewMode === 'grouped'
                ? 'bg-tescha-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              title="Vista por Niveles"
            >
              <FaUsers className="text-lg" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded transition-colors ${viewMode === 'table'
                ? 'bg-tescha-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              title="Vista de Tabla"
            >
              <FaList className="text-lg" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded transition-colors ${viewMode === 'cards'
                ? 'bg-tescha-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              title="Vista de Tarjetas"
            >
              <FaThLarge className="text-lg" />
            </button>
          </div>
        </div>
      </div>

      {/* Vista Agrupada por Niveles */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              <strong>{alumnos.length}</strong> alumnos encontrados
            </p>
            <button
              onClick={toggleAllLevels}
              className="text-sm text-tescha-blue hover:underline flex items-center gap-1"
            >
              {Object.values(expandedLevels).every(v => v) ? (
                <>Colapsar todos <FaChevronUp /></>
              ) : (
                <>Expandir todos <FaChevronDown /></>
              )}
            </button>
          </div>

          {loading ? (
            <div className="card p-8 text-center">Cargando...</div>
          ) : (
            niveles.map(nivel => {
              const alumnosNivel = alumnosPorNivel[nivel];
              if (alumnosNivel.length === 0) return null;

              return (
                <div key={nivel} className={`card p-0 overflow-hidden border-l-4 ${getNivelColor(nivel).split(' ')[0]}`}>
                  <div
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors flex justify-between items-center"
                    onClick={() => toggleLevel(nivel)}
                  >
                    <div className="flex items-center gap-3">
                      <FaGraduationCap className="text-2xl text-gray-600" />
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">Nivel {nivel}</h3>
                        <p className="text-sm text-gray-600">
                          {alumnosNivel.length} {alumnosNivel.length === 1 ? 'alumno' : 'alumnos'} ·
                          {' '}{alumnosNivel.filter(a => a.tipo_alumno === 'interno').length} internos ·
                          {' '}{alumnosNivel.filter(a => a.tipo_alumno === 'externo').length} externos
                        </p>
                      </div>
                    </div>
                    {expandedLevels[nivel] ? <FaChevronUp /> : <FaChevronDown />}
                  </div>

                  {expandedLevels[nivel] && (() => {
                    const pageNum = currentPage[nivel] || 1;
                    const startIndex = (pageNum - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedAlumnos = alumnosNivel.slice(startIndex, endIndex);
                    const totalPages = Math.ceil(alumnosNivel.length / itemsPerPage);

                    return (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-100 border-t border-b border-gray-200">
                              <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Matrícula</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nombre Completo</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Correo</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Municipio</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Tipo</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Carrera</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Sem.</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Edad</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Género</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Estatus</th>
                                {!isMaestro && <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Acciones</th>}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {paginatedAlumnos.map((alumno) => (
                            <tr key={alumno.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-3 text-xs font-medium text-gray-900">{alumno.matricula}</td>
                              <td className="px-3 py-3 text-sm text-gray-900 font-semibold">{alumno.nombre_completo}</td>
                              <td className="px-3 py-3 text-xs text-blue-600">{alumno.correo}</td>
                              <td className="px-3 py-3 text-xs text-gray-600">{alumno.municipio || '-'}</td>
                              <td className="px-3 py-3 text-center">
                                <span className={`badge badge-sm ${alumno.tipo_alumno === 'interno' ? 'badge-info' : 'badge-warning'}`}>
                                  {alumno.tipo_alumno}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-xs text-gray-600">{alumno.carrera || 'N/A'}</td>
                              <td className="px-3 py-3 text-center text-xs">{alumno.semestre || '-'}</td>
                              <td className="px-3 py-3 text-center text-xs font-medium">{alumno.edad || '-'}</td>
                              <td className="px-3 py-3 text-xs">
                                {alumno.genero ? (
                                  alumno.genero === 'masculino' ? '👨' :
                                  alumno.genero === 'femenino' ? '👩' :
                                  alumno.genero === 'otro' ? '⚧' : '🤐'
                                ) : '-'}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`badge badge-sm ${alumno.estatus === 'activo' ? 'badge-success' :
                                  alumno.estatus === 'baja' ? 'badge-danger' : 'badge-info'
                                  }`}>
                                  {alumno.estatus}
                                </span>
                              </td>
                              {!isMaestro && (
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="flex justify-center space-x-3">
                                    <button
                                      onClick={() => handleOpenModal(alumno)}
                                      className="text-blue-600 hover:text-blue-800 transition-colors"
                                      title="Editar"
                                    >
                                      <FaEdit className="text-lg" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(alumno.id)}
                                      className="text-red-600 hover:text-red-800 transition-colors"
                                      title="Dar de baja"
                                    >
                                      <FaTrash className="text-lg" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Mostrando {startIndex + 1}-{Math.min(endIndex, alumnosNivel.length)} de {alumnosNivel.length} alumnos
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage({...currentPage, [nivel]: Math.max(1, pageNum - 1)})}
                            disabled={pageNum === 1}
                            className="px-3 py-1 rounded bg-white border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Anterior
                          </button>
                          
                          <div className="flex gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                              const page = i + 1;
                              // Mostrar primera, última, actual y 2 a cada lado
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= pageNum - 2 && page <= pageNum + 2)
                              ) {
                                return (
                                  <button
                                    key={page}
                                    onClick={() => setCurrentPage({...currentPage, [nivel]: page})}
                                    className={`px-3 py-1 rounded text-sm ${
                                      pageNum === page
                                        ? 'bg-blue-600 text-white font-bold'
                                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                );
                              } else if (page === pageNum - 3 || page === pageNum + 3) {
                                return <span key={page} className="px-2">...</span>;
                              }
                              return null;
                            })}
                          </div>

                          <button
                            onClick={() => setCurrentPage({...currentPage, [nivel]: Math.min(totalPages, pageNum + 1)})}
                            disabled={pageNum === totalPages}
                            className="px-3 py-1 rounded bg-white border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Vista de Tabla Tradicional */}
      {viewMode === 'table' && (
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Matrícula</th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Municipio</th>
                    <th>Tipo</th>
                    <th>Carrera</th>
                    <th>Semestre</th>
                    <th>Nivel</th>
                    <th>Edad</th>
                    <th>Género</th>
                    <th>Estatus</th>
                    {!isMaestro && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alumnos.map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-gray-50">
                      <td className="font-medium">{alumno.matricula}</td>
                      <td>{alumno.nombre_completo}</td>
                      <td className="text-sm">{alumno.correo || 'Sin correo'}</td>
                      <td className="text-sm">{alumno.municipio || '-'}</td>
                      <td>
                        <span className={`badge ${alumno.tipo_alumno === 'interno' ? 'badge-info' : 'badge-warning'}`}>
                          {alumno.tipo_alumno}
                        </span>
                      </td>
                      <td className="text-xs">{alumno.carrera || 'N/A'}</td>
                      <td className="text-center">{alumno.semestre || '-'}</td>
                      <td>
                        <span className="badge badge-success">{alumno.nivel_actual || 'Sin asignar'}</span>
                      </td>
                      <td className="text-center">{alumno.edad || '-'}</td>
                      <td className="text-sm">
                        {alumno.genero ? (
                          alumno.genero === 'masculino' ? '👨 Masculino' :
                          alumno.genero === 'femenino' ? '👩 Femenino' :
                          alumno.genero === 'otro' ? '⚧ Otro' : '🤐 Prefiero no decir'
                        ) : '-'}
                      </td>
                      <td>
                        <span className={`badge ${alumno.estatus === 'activo' ? 'badge-success' :
                          alumno.estatus === 'baja' ? 'badge-danger' : 'badge-info'
                          }`}>
                          {alumno.estatus}
                        </span>
                      </td>
                      {!isMaestro && (
                        <td>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleOpenModal(alumno)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(alumno.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vista de Tarjetas */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full card p-8 text-center">Cargando...</div>
          ) : (
            alumnos.map((alumno) => (
              <div key={alumno.id} className="card hover:shadow-lg transition-shadow duration-200 border-l-4 border-tescha-blue">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">MATRÍCULA</p>
                    <p className="text-lg font-bold text-gray-800">{alumno.matricula}</p>
                  </div>
                  <span className={`badge text-lg px-3 py-1 ${getNivelColor(alumno.nivel_actual)}`}>
                    {alumno.nivel_actual || 'N/A'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">{alumno.nombre_completo}</h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Correo:</span>
                    <span className="text-gray-800 truncate">{alumno.correo || 'Sin correo'}</span>
                  </div>
                  {alumno.municipio && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Municipio:</span>
                      <span className="text-gray-800">{alumno.municipio}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Tipo:</span>
                    <span className={`badge ${alumno.tipo_alumno === 'interno' ? 'badge-info' : 'badge-warning'}`}>
                      {alumno.tipo_alumno}
                    </span>
                  </div>
                  {alumno.carrera && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Carrera:</span>
                      <span className="text-gray-800 text-xs">{alumno.carrera}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Semestre:</span>
                    <span className="text-gray-800 font-medium">{alumno.semestre || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Estatus:</span>
                    <span className={`badge ${alumno.estatus === 'activo' ? 'badge-success' :
                      alumno.estatus === 'baja' ? 'badge-danger' : 'badge-info'
                      }`}>
                      {alumno.estatus}
                    </span>
                  </div>
                </div>

                {!isMaestro && (
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleOpenModal(alumno)}
                      className="flex-1 btn-secondary py-2 flex items-center justify-center gap-2"
                    >
                      <FaEdit /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(alumno.id)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <FaTrash /> Baja
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {alumnos.length === 0 && !loading && (
        <div className="card text-center py-12">
          <FaUsers className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No se encontraron alumnos</p>
          <p className="text-gray-400 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingAlumno ? 'Editar Alumno' : 'Nuevo Alumno'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Mensaje de ayuda general */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex items-start">
                  <div className="text-blue-400 text-xl mr-3">💡</div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Ayuda para llenar el formulario:</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Los campos marcados con <strong>*</strong> son obligatorios.
                      Verás un <FaCheckCircle className="inline text-green-500" /> verde cuando un campo esté correcto.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Matrícula {formData.tipo_alumno === 'interno' ? '*' : '(Opcional)'}
                    <TooltipIcon text={formData.tipo_alumno === 'interno' ? 'Matrícula obligatoria para alumnos internos (9-10 dígitos)' : 'Matrícula opcional para alumnos externos'} />
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`input pr-10 ${fieldErrors.matricula ? 'border-red-500 focus:border-red-500' :
                        fieldValid.matricula ? 'border-green-500 focus:border-green-500' : ''
                        }`}
                      value={formData.matricula}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, matricula: value });
                        validateField('matricula', value);
                      }}
                      onBlur={(e) => validateField('matricula', e.target.value)}
                      pattern="[0-9]*"
                      maxLength="10"
                      placeholder="Ejemplo: 201724408"
                      required={formData.tipo_alumno === 'interno'}
                    />
                    {fieldValid.matricula && (
                      <FaCheckCircle className="absolute right-3 top-3 text-green-500" />
                    )}
                    {fieldErrors.matricula && (
                      <FaTimesCircle className="absolute right-3 top-3 text-red-500" />
                    )}
                  </div>
                  {fieldErrors.matricula && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.matricula}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Nombre(s) *
                    <TooltipIcon text="Solo el(los) nombre(s), sin apellidos" />
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`input pr-10 ${fieldErrors.nombre ? 'border-red-500' :
                        fieldValid.nombre ? 'border-green-500' : ''
                        }`}
                      placeholder="Ejemplo: Juan Carlos"
                      value={formData.nombre}
                      onChange={(e) => {
                        setFormData({ ...formData, nombre: e.target.value });
                        validateField('nombre', e.target.value);
                      }}
                      onBlur={(e) => validateField('nombre', e.target.value)}
                      required
                    />
                    {fieldValid.nombre && <FaCheckCircle className="absolute right-3 top-3 text-green-500" />}
                    {fieldErrors.nombre && <FaTimesCircle className="absolute right-3 top-3 text-red-500" />}
                  </div>
                  {fieldErrors.nombre && <p className="text-xs text-red-500 mt-1">{fieldErrors.nombre}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Apellido Paterno *
                    <TooltipIcon text="Primer apellido del alumno" />
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`input pr-10 ${fieldErrors.apellido_paterno ? 'border-red-500' :
                        fieldValid.apellido_paterno ? 'border-green-500' : ''
                        }`}
                      placeholder="Ejemplo: García"
                      value={formData.apellido_paterno}
                      onChange={(e) => {
                        setFormData({ ...formData, apellido_paterno: e.target.value });
                        validateField('apellido_paterno', e.target.value);
                      }}
                      onBlur={(e) => validateField('apellido_paterno', e.target.value)}
                      required
                    />
                    {fieldValid.apellido_paterno && <FaCheckCircle className="absolute right-3 top-3 text-green-500" />}
                    {fieldErrors.apellido_paterno && <FaTimesCircle className="absolute right-3 top-3 text-red-500" />}
                  </div>
                  {fieldErrors.apellido_paterno && <p className="text-xs text-red-500 mt-1">{fieldErrors.apellido_paterno}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Apellido Materno *
                    <TooltipIcon text="Segundo apellido del alumno" />
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`input pr-10 ${fieldErrors.apellido_materno ? 'border-red-500' :
                        fieldValid.apellido_materno ? 'border-green-500' : ''
                        }`}
                      placeholder="Ejemplo: López"
                      value={formData.apellido_materno}
                      onChange={(e) => {
                        setFormData({ ...formData, apellido_materno: e.target.value });
                        validateField('apellido_materno', e.target.value);
                      }}
                      onBlur={(e) => validateField('apellido_materno', e.target.value)}
                      required
                    />
                    {fieldValid.apellido_materno && <FaCheckCircle className="absolute right-3 top-3 text-green-500" />}
                    {fieldErrors.apellido_materno && <FaTimesCircle className="absolute right-3 top-3 text-red-500" />}
                  </div>
                  {fieldErrors.apellido_materno && <p className="text-xs text-red-500 mt-1">{fieldErrors.apellido_materno}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Email (Opcional)
                    <TooltipIcon text="Correo electrónico para enviar notificaciones" />
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      className={`input pr-10 ${fieldErrors.email ? 'border-red-500' :
                        fieldValid.email ? 'border-green-500' : ''
                        }`}
                      placeholder="ejemplo@tescha.edu.mx"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        validateField('email', e.target.value);
                      }}
                      onBlur={(e) => validateField('email', e.target.value)}
                    />
                    {fieldValid.email && <FaCheckCircle className="absolute right-3 top-3 text-green-500" />}
                    {fieldErrors.email && <FaTimesCircle className="absolute right-3 top-3 text-red-500" />}
                  </div>
                  {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Teléfono (Opcional)
                    <TooltipIcon text="10 dígitos sin espacios ni guiones" />
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      className={`input pr-10 ${fieldErrors.telefono ? 'border-red-500' :
                        fieldValid.telefono ? 'border-green-500' : ''
                        }`}
                      placeholder="5512345678"
                      value={formData.telefono}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, telefono: value });
                        validateField('telefono', value);
                      }}
                      onBlur={(e) => validateField('telefono', e.target.value)}
                      maxLength="10"
                    />
                    {fieldValid.telefono && <FaCheckCircle className="absolute right-3 top-3 text-green-500" />}
                    {fieldErrors.telefono && <FaTimesCircle className="absolute right-3 top-3 text-red-500" />}
                  </div>
                  {fieldErrors.telefono && <p className="text-xs text-red-500 mt-1">{fieldErrors.telefono}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Municipio *
                    <TooltipIcon text="Municipio de procedencia (Zona Volcanes)" />
                  </label>
                  <select
                    className="input"
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    required
                  >
                    <option value="">Selecciona un municipio...</option>
                    {municipiosZonaVolcanes.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="Otro">Otro (Especificar en observaciones)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Tipo de Alumno *
                    <TooltipIcon text="Interno: estudiante del Tec | Externo: persona de fuera" />
                  </label>
                  <select
                    className="input"
                    value={formData.tipo_alumno}
                    onChange={(e) => setFormData({ ...formData, tipo_alumno: e.target.value })}
                    required
                  >
                    <option value="interno">🎓 Interno (Estudiante del Tec)</option>
                    <option value="externo">🌍 Externo (Persona de fuera)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Tipo de Ingreso *
                    <TooltipIcon text="Nuevo Ingreso: primera vez | Reinscripción: ya tomó clases antes" />
                  </label>
                  <select
                    className="input"
                    value={formData.es_nuevo_ingreso}
                    onChange={(e) => {
                      const esNuevo = e.target.value === 'true';
                      setFormData({
                        ...formData,
                        es_nuevo_ingreso: esNuevo,
                        semestre: (esNuevo && formData.tipo_alumno === 'interno') ? '1' : (esNuevo ? '' : formData.semestre),
                        nivel_actual: esNuevo ? 'A1' : formData.nivel_actual
                      });
                    }}
                    required
                  >
                    <option value="true">✨ Nuevo Ingreso (Primera vez)</option>
                    <option value="false">🔄 Reinscripción (Ya estudió antes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Nivel Actual *
                    <TooltipIcon text="Nivel de inglés del alumno" />
                  </label>
                  {formData.es_nuevo_ingreso === 'true' || formData.es_nuevo_ingreso === true ? (
                    <div>
                      <input
                        type="text"
                        className="input bg-green-50 border-green-300"
                        value="Basico"
                        readOnly
                      />
                      <p className="text-xs text-green-600 mt-1">✓ Nuevo ingreso siempre inicia en Basico</p>
                    </div>
                  ) : (
                    <select
                      className="input"
                      value={formData.nivel_actual}
                      onChange={(e) => setFormData({ ...formData, nivel_actual: e.target.value })}
                      required
                    >
                      <option value="">Seleccione el nivel...</option>
                      {niveles.map(nivel => (
                        <option key={nivel} value={nivel}>{nivel}</option>
                      ))}
                    </select>
                  )}
                </div>

                {formData.tipo_alumno === 'interno' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Carrera
                      </label>
                      <select
                        className="input"
                        value={formData.carrera}
                        onChange={(e) => setFormData({ ...formData, carrera: e.target.value })}
                      >
                        <option value="">Seleccione...</option>
                        {carreras.map(carrera => (
                          <option key={carrera} value={carrera}>{carrera}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Semestre *
                      </label>
                      {formData.es_nuevo_ingreso ? (
                        <input
                          type="text"
                          className="input bg-gray-100"
                          value="1"
                          readOnly
                        />
                      ) : (
                        <input
                          type="text"
                          className="input"
                          value={formData.semestre}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 14)) {
                              setFormData({ ...formData, semestre: value });
                            }
                          }}
                          maxLength="2"
                          placeholder="1-14"
                          required
                        />
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Ingreso *
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={formData.fecha_ingreso}
                    onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estatus
                  </label>
                  <select
                    className="input"
                    value={formData.estatus}
                    onChange={(e) => setFormData({ ...formData, estatus: e.target.value })}
                  >
                    <option value="activo">Activo</option>
                    <option value="baja">Baja</option>
                    <option value="egresado">Egresado</option>
                  </select>
                </div>

                {/* Edad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Edad
                    <TooltipIcon text="Edad del alumno (15-100 años)" />
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={formData.edad}
                    onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                    min="15"
                    max="100"
                    placeholder="Ejemplo: 20"
                  />
                </div>

                {/* Género */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Género
                  </label>
                  <select
                    className="input"
                    value={formData.genero}
                    onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                  >
                    <option value="">Seleccione...</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                    <option value="prefiero_no_decir">Prefiero no decir</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary px-6 py-3"
                  disabled={loading}
                >
                  ❌ Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary px-6 py-3 flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>⏳ Guardando...</>
                  ) : editingAlumno ? (
                    <>✏️ Actualizar Alumno</>
                  ) : (
                    <>✅ Crear Alumno</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alumnos;
