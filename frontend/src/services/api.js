import axios from 'axios';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://teschia.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Solo limpiar el localStorage, el AuthContext manejará la redirección
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Recargar la página para que AuthContext detecte que no hay sesión
      if (!window.location.pathname.includes('/login')) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Servicios de API
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  login2FA: (data) => api.post('/auth/login/2fa', data),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  changePassword: (passwords) => api.put('/auth/change-password', passwords)
};

export const alumnosService = {
  getAll: (params) => api.get('/alumnos', { params }),
  getById: (id) => api.get(`/alumnos/${id}`),
  create: (data) => api.post('/alumnos', data),
  update: (id, data) => api.put(`/alumnos/${id}`, data),
  delete: (id) => api.delete(`/alumnos/${id}`),
  getHistorial: (id) => api.get(`/alumnos/${id}/historial`),
  importar: (data) => api.post('/alumnos/import', data)
};

export const maestrosService = {
  getAll: () => api.get('/maestros'),
  getById: (id) => api.get(`/maestros/${id}`),
  create: (data) => api.post('/maestros', data),
  update: (id, data) => api.put(`/maestros/${id}`, data),
  delete: (id) => api.delete(`/maestros/${id}`),
  getHorarios: (id) => api.get(`/maestros/${id}/horarios`),
  toggleStatus: (id) => api.patch(`/maestros/${id}/toggle-status`),
  resetPassword: (id) => api.post(`/maestros/${id}/reset-password`),
  getPersonnelCounts: () => api.get('/maestros/stats/counts')
};

export const gruposService = {
  getAll: (params) => api.get('/grupos', { params }),
  getById: (id) => api.get(`/grupos/${id}`),
  create: (data) => api.post('/grupos', data),
  update: (id, data) => api.put(`/grupos/${id}`, data),
  delete: (id) => api.delete(`/grupos/${id}`),
  inscribir: (id, data) => api.post(`/grupos/${id}/inscribir`, data),
  getAlumnos: (id) => api.get(`/grupos/${id}/alumnos`)
};

export const inscripcionesService = {
  create: (data) => api.post('/inscripciones', data),
  getAll: (params) => api.get('/inscripciones', { params }),
  getByAlumno: (alumnoId) => api.get(`/inscripciones/alumno/${alumnoId}`),
  getByGrupo: (grupoId) => api.get(`/inscripciones/grupo/${grupoId}`),
  delete: (id) => api.delete(`/inscripciones/${id}`)
};

// ❌ SALONES ELIMINADOS - Ya no se usan salones en el sistema

export const periodosService = {
  getAll: () => api.get('/periodos'),
  getActivo: () => api.get('/periodos/activo'),
  create: (data) => api.post('/periodos', data),
  update: (id, data) => api.put(`/periodos/${id}`, data),
  delete: (id) => api.delete(`/periodos/${id}`),
  toggle: (id, activo) => api.patch(`/periodos/${id}/toggle`, { activo }),
  configurarTarifas: (id, data) => api.post(`/periodos/${id}/tarifas`, data),
  getTarifas: (id) => api.get(`/periodos/${id}/tarifas`)
};

export const pagosService = {
  getAll: (params) => api.get('/pagos', { params }),
  getById: (id) => api.get(`/pagos/${id}`),
  getPendientes: () => api.get('/pagos/pendientes'),
  getVencidos: () => api.get('/pagos/vencidos'),
  create: (data) => api.post('/pagos', data),
  update: (id, data) => api.put(`/pagos/${id}`, data),
  registrarPago: (id, data) => api.post(`/pagos/${id}/registrar`, data),
  delete: (id) => api.delete(`/pagos/${id}`),
  solicitarProrroga: (id, data) => api.post(`/pagos/${id}/prorroga`, data),
  gestionarProrroga: (id, accion, data) => api.put(`/pagos/prorroga/${id}/${accion}`, data),
  getEstadisticas: (params) => api.get('/pagos/estadisticas/resumen', { params }),
  getEstadisticasFinancieras: (params) => api.get('/pagos/estadisticas/financieras', { params })
};

export const calificacionesService = {
  getByGrupo: (grupoId, parcial) => api.get(`/calificaciones/grupo/${grupoId}`, { params: { parcial } }),
  create: (data) => api.post('/calificaciones', data),
  saveMultiple: (data) => api.post('/calificaciones/masivo', data),
  createMasivo: (data) => api.post('/calificaciones/masivo', data),
  getByAlumno: (alumnoId) => api.get(`/calificaciones/alumno/${alumnoId}`),
  getReprobados: (grupoId) => api.get(`/calificaciones/grupo/${grupoId}/reprobados`)
};

export const asistenciasService = {
  create: (data) => api.post('/asistencias', data),
  saveMultiple: (data) => api.post('/asistencias/masivo', data),
  createMasivo: (data) => api.post('/asistencias/masivo', data),
  getByGrupo: (grupoId, params) => api.get(`/asistencias/grupo/${grupoId}`, { params }),
  getByGrupoFecha: (grupoId, fecha) => api.get(`/asistencias/grupo/${grupoId}`, { params: { fecha } }),
  getByAlumno: (alumnoId, params) => api.get(`/asistencias/alumno/${alumnoId}`, { params }),
  getEnRiesgo: (grupoId) => api.get(`/asistencias/grupo/${grupoId}/riesgo`)
};

export const nivelesService = {
  getAll: () => api.get('/niveles'),
  getById: (id) => api.get(`/niveles/${id}`),
  getByCodigo: (codigo) => api.get(`/niveles/codigo/${codigo}`)
};

export const dashboardService = {
  getMetricas: (params) => api.get('/dashboard/metricas', { params }),
  getTendencias: () => api.get('/dashboard/tendencias'),
  getAlumnosPorNivel: (params) => api.get('/dashboard/alumnos-por-nivel', { params }),
  getIngresosMensuales: (params) => api.get('/dashboard/ingresos-mensuales', { params }),
  getGruposActivos: () => api.get('/dashboard/grupos-activos'),
  getAlertas: () => api.get('/dashboard/alertas'),
  getAlertasAcademicas: (params) => api.get('/dashboard/alertas-academicas', { params }),
  actualizarEstadisticas: (data) => api.post('/dashboard/actualizar-estadisticas', data)
};

export const intelligenceService = {
  getKPIs: () => api.get('/intelligence/kpis')
};

export const reportesService = {
  getReprobacion: (params) => api.get('/reportes/reprobacion', { params }),
  getDesercion: (params) => api.get('/reportes/desercion', { params }),
  // ❌ getOcupacionSalones eliminado - Ya no se usan salones
  getAlumnosSinRequisito: () => api.get('/reportes/alumnos/sin-requisito'),
  getCargaMaestros: () => api.get('/reportes/maestros/carga'),
  getEficienciaTerminal: (params) => api.get('/reportes/eficiencia-terminal', { params }),
  getProrrogasActivas: () => api.get('/pagos/reportes/prorrogas-activas'),
  getAdeudosCriticos: () => api.get('/pagos/reportes/adeudos-criticos'),
  getDemograficas: (params) => api.get('/reportes/demograficas', { params }),
  getDemograficasPDF: (params) => api.get('/reportes/demograficas/pdf', { params, responseType: 'blob' }),
  exportar: (tipo, params) => api.get(`/reportes/exportar/${tipo}`, {
    params,
    responseType: params?.formato === 'json' ? 'json' : 'blob'
  })
};

export const maestroDashboardService = {
  getMetricas: () => api.get('/maestros-dashboard/metricas'),
  getMisGrupos: () => api.get('/maestros-dashboard/mis-grupos'),
  getAlumnosGrupo: (grupoId) => api.get(`/maestros-dashboard/alumnos-grupo/${grupoId}`),
  descargarPlantillaCalificaciones: (grupoId, parcial) =>
    api.get(`/maestros-dashboard/plantilla-calificaciones/${grupoId}/${parcial}`, { responseType: 'blob' }),
  descargarPlantillaAsistencias: (grupoId, fecha) =>
    api.get(`/maestros-dashboard/plantilla-asistencias/${grupoId}/${fecha}`, { responseType: 'blob' })
};

export const maestrosAlumnosService = {
  getGruposConAlumnos: (maestroId) => api.get(`/maestros-alumnos/${maestroId}/grupos-alumnos`),
  getAlumnosGrupo: (maestroId, grupoId) => api.get(`/maestros-alumnos/${maestroId}/grupos/${grupoId}/alumnos`),
  getAlumnosDisponibles: (maestroId, grupoId, search = '') => 
    api.get(`/maestros-alumnos/${maestroId}/grupos/${grupoId}/disponibles`, { params: { search } }),
  inscribirAlumno: (maestroId, grupoId, alumnoId) => api.post(`/maestros-alumnos/${maestroId}/grupos/${grupoId}/inscribir`, { alumnoId }),
  removerAlumno: (maestroId, grupoId, inscripcionId) => api.delete(`/maestros-alumnos/${maestroId}/grupos/${grupoId}/remover/${inscripcionId}`)
};

export const uploadService = {
  procesarCalificaciones: (formData) =>
    api.post('/upload/procesar-calificaciones', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  guardarCalificaciones: (data) => api.post('/upload/guardar-calificaciones', data),
  procesarAsistencias: (formData) =>
    api.post('/upload/procesar-asistencias', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  guardarAsistencias: (data) => api.post('/upload/guardar-asistencias', data)
};

export const metricasService = {
  getHistoricas: (params) => api.get('/metricas/historicas', { params }),
  getMensuales: (params) => api.get('/metricas/mensuales', { params }),
  calcular: (periodoId) => api.post(`/metricas/calcular/${periodoId}`),
  getTiempoReal: () => api.get('/metricas/tiempo-real')
};

export const analisisService = {
  getCrecimientoSemestral: () => api.get('/analisis/crecimiento-semestral'),
  getProyecciones: () => api.get('/analisis/proyecciones')
};

export const notificacionesService = {
  enviarRecordatorio: (alumno_id) => api.post('/notificaciones/enviar-recordatorio', { alumno_id }),
  getProrrogasPorVencer: (dias = 3) => api.get('/notificaciones/prorrogas-por-vencer', { params: { dias } }),
  getProrrogasVencidas: () => api.get('/notificaciones/prorrogas-vencidas')
};

export const auditoriaService = {
  getLogs: (params) => api.get('/auditoria', { params }),
  getStats: () => api.get('/auditoria/stats'),
  getUsuarios: () => api.get('/auditoria/usuarios')
};

export const tfaService = {
  generate: () => api.post('/auth/2fa/generate'),
  verify: (token) => api.post('/auth/2fa/verify', { token }),
  disable: (token) => api.post('/auth/2fa/disable', { token }),
  status: () => api.get('/auth/2fa/status')
};
