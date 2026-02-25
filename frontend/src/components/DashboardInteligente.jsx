import { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, ChartBarIcon, ArrowTrendingUpIcon, UserGroupIcon } from '@heroicons/react/24/outline';

function DashboardInteligente({ periodoActivo }) {
  const [loading, setLoading] = useState(true);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [proyecciones, setProyecciones] = useState(null);
  const [alumnosRiesgo, setAlumnosRiesgo] = useState(null);
  const [vistaActual, setVistaActual] = useState('recomendaciones'); // recomendaciones | resumen | proyecciones | riesgos

  useEffect(() => {
    if (periodoActivo) {
      cargarDatosIA();
    } else {
      setLoading(false);
    }
  }, [periodoActivo]);

  const cargarDatosIA = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Cargar todas las APIs en paralelo
      const [recRes, resRes, proyRes, riesgoRes] = await Promise.all([
        fetch(`/api/ia/recomendaciones-diarias/${periodoActivo.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/ia/resumen-ejecutivo/${periodoActivo.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/ia/proyecciones/${periodoActivo.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/ia/alumnos-riesgo/${periodoActivo.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Verificar errores
      if (!recRes.ok || !resRes.ok || !proyRes.ok || !riesgoRes.ok) {
        throw new Error(`Error en las APIs: ${recRes.status}, ${resRes.status}, ${proyRes.status}, ${riesgoRes.status}`);
      }

      const recData = await recRes.json();
      const resData = await resRes.json();
      const proyData = await proyRes.json();
      const riesgoData = await riesgoRes.json();

      setRecomendaciones(recData);
      setResumen(resData);
      setProyecciones(proyData);
      setAlumnosRiesgo(riesgoData);

    } catch (error) {
      console.error('❌ Error al cargar datos IA:', error);
      alert(`Error al cargar análisis inteligente: ${error.message}`);
      // Establecer datos vacíos para evitar errores
      setRecomendaciones([]);
      setResumen(null);
      setProyecciones(null);
      setAlumnosRiesgo({ total: 0, critico: [], alto: [], medio: [] });
    } finally {
      setLoading(false);
    }
  };

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-300';
      case 'media': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'baja': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'info': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPrioridadIcon = (prioridad) => {
    switch (prioridad) {
      case 'alta': return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'media': return <ClockIcon className="w-5 h-5" />;
      case 'info': return <CheckCircleIcon className="w-5 h-5" />;
      default: return <ChartBarIcon className="w-5 h-5" />;
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'excelente': return 'bg-green-500';
      case 'bueno': return 'bg-blue-500';
      case 'necesita_atencion': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!periodoActivo) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Selecciona un periodo para ver el análisis inteligente</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🤖 Dashboard Inteligente
        </h2>
        
        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setVistaActual('recomendaciones')}
            className={`px-4 py-2 font-medium transition-colors ${
              vistaActual === 'recomendaciones'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            📋 Recomendaciones Diarias
          </button>
          <button
            onClick={() => setVistaActual('resumen')}
            className={`px-4 py-2 font-medium transition-colors ${
              vistaActual === 'resumen'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            📊 Resumen Ejecutivo
          </button>
          <button
            onClick={() => setVistaActual('proyecciones')}
            className={`px-4 py-2 font-medium transition-colors ${
              vistaActual === 'proyecciones'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            📈 Proyecciones
          </button>
          <button
            onClick={() => setVistaActual('riesgos')}
            className={`px-4 py-2 font-medium transition-colors ${
              vistaActual === 'riesgos'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            🚨 Alumnos en Riesgo ({alumnosRiesgo?.total || 0})
          </button>
        </div>
      </div>

      {/* Vista: Recomendaciones Diarias */}
      {vistaActual === 'recomendaciones' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              💡 ¿Qué debo hacer hoy?
            </h3>
            <p className="text-sm text-gray-600">
              La IA ha analizado tu sistema y te sugiere estas acciones prioritarias:
            </p>
          </div>

          {recomendaciones.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="text-lg font-medium text-green-800">¡Todo en orden!</p>
              <p className="text-sm text-green-600 mt-1">No hay acciones urgentes por el momento</p>
            </div>
          ) : (
            recomendaciones.map((rec, idx) => (
              <div key={idx} className={`border rounded-lg p-5 ${getPrioridadColor(rec.prioridad)}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getPrioridadIcon(rec.prioridad)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">{rec.titulo}</h4>
                      {rec.tiempo_estimado && (
                        <span className="text-xs bg-white/50 px-2 py-0.5 rounded">
                          ⏱️ {rec.tiempo_estimado}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-3">{rec.accion}</p>
                    
                    {rec.pasos && (
                      <div className="bg-white/50 rounded p-3 mt-2">
                        <p className="text-xs font-semibold mb-2">Pasos a seguir:</p>
                        <ol className="text-sm space-y-1">
                          {rec.pasos.map((paso, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="font-bold">{i + 1}.</span>
                              <span>{paso}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {rec.detalle && (
                      <div className="bg-white/50 rounded p-3 mt-2">
                        <p className="text-xs font-semibold mb-2">Detalles:</p>
                        {rec.detalle.map((det, i) => (
                          <div key={i} className="text-xs mb-1">
                            <span className="font-medium">{det.nombre}:</span>{' '}
                            {det.razones.join(', ')}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Vista: Resumen Ejecutivo */}
      {vistaActual === 'resumen' && resumen && (
        <div className="space-y-6">
          {/* Estado General */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-4 h-4 rounded-full ${getEstadoColor(resumen.estado_general)}`}></div>
              <h3 className="text-xl font-bold">
                Estado General:{' '}
                <span className="capitalize">
                  {resumen.estado_general === 'excelente' ? '🌟 Excelente' :
                   resumen.estado_general === 'bueno' ? '✅ Bueno' : '⚠️ Necesita Atención'}
                </span>
              </h3>
            </div>

            {/* Métricas Clave */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <UserGroupIcon className="w-8 h-8 text-blue-600 mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {resumen.metricas.total_alumnos}
                </div>
                <div className="text-sm text-blue-700">Alumnos Activos</div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <ChartBarIcon className="w-8 h-8 text-green-600 mb-2" />
                <div className="text-2xl font-bold text-green-900">
                  {resumen.metricas.tasa_pagos}%
                </div>
                <div className="text-sm text-green-700">Tasa de Cobro</div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <ArrowTrendingUpIcon className="w-8 h-8 text-purple-600 mb-2" />
                <div className="text-2xl font-bold text-purple-900">
                  {resumen.metricas.promedio_general}
                </div>
                <div className="text-sm text-purple-700">Promedio General</div>
              </div>

              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-indigo-900">
                  {resumen.metricas.total_grupos}
                </div>
                <div className="text-sm text-indigo-700">Grupos Activos</div>
              </div>

              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-amber-900">
                  {resumen.metricas.total_maestros}
                </div>
                <div className="text-sm text-amber-700">Maestros</div>
              </div>

              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-900">
                  ${parseFloat(resumen.metricas.ingresos_totales).toLocaleString()}
                </div>
                <div className="text-sm text-emerald-700">Ingresos Totales</div>
              </div>
            </div>

            {/* Insights */}
            {resumen.insights.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">💡 Insights Inteligentes:</h4>
                <div className="space-y-2">
                  {resumen.insights.map((insight, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vista: Proyecciones */}
      {vistaActual === 'proyecciones' && proyecciones && (
        <div className="space-y-6">
          {/* Proyección de Ingresos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💰 Proyección de Ingresos</h3>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-800">Ingresos Actuales</span>
                  <span className="text-2xl font-bold text-green-900">
                    ${parseFloat(proyecciones.proyeccion.ingresos_actuales).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-800">Proyección Total</span>
                  <span className="text-2xl font-bold text-blue-900">
                    ${parseFloat(proyecciones.proyeccion.ingresos_proyectados).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg">
                  <span className="text-sm font-medium text-amber-800">Pendiente de Cobro</span>
                  <span className="text-2xl font-bold text-amber-900">
                    ${parseFloat(proyecciones.proyeccion.ingresos_pendientes).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium text-purple-800">Tasa de Cobro</span>
                  <span className="text-2xl font-bold text-purple-900">
                    {proyecciones.proyeccion.tasa_cobro}%
                  </span>
                </div>
                
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <div className="text-sm font-medium text-indigo-800 mb-1">Pagos Realizados</div>
                  <div className="text-3xl font-bold text-indigo-900">
                    {proyecciones.proyeccion.pagados} / {proyecciones.proyeccion.total_inscripciones}
                  </div>
                </div>
                
                <div className="p-4 bg-rose-50 rounded-lg">
                  <div className="text-sm font-medium text-rose-800 mb-1">Pagos Pendientes</div>
                  <div className="text-3xl font-bold text-rose-900">
                    {proyecciones.proyeccion.pendientes}
                  </div>
                </div>
              </div>
            </div>

            {/* Predicción */}
            {proyecciones.prediccion.dias_para_completar && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">🔮 Predicción IA:</h4>
                <p className="text-sm text-blue-800">
                  Al ritmo actual, se completará el cobro en aproximadamente{' '}
                  <span className="font-bold">{proyecciones.prediccion.dias_para_completar} días</span>
                  {proyecciones.prediccion.fecha_estimada && (
                    <span> (alrededor del {proyecciones.prediccion.fecha_estimada})</span>
                  )}
                </p>
              </div>
            )}

            {/* Tendencia */}
            {proyecciones.tendencia.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">📊 Tendencia (Últimos 7 días):</h4>
                <div className="space-y-2">
                  {proyecciones.tendencia.map((dia, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">{new Date(dia.fecha).toLocaleDateString()}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{dia.num_pagos} pagos</span>
                        <span className="text-sm font-bold text-green-700">
                          ${parseFloat(dia.total_dia).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vista: Alumnos en Riesgo */}
      {vistaActual === 'riesgos' && alumnosRiesgo && (
        <div className="space-y-4">
          {/* Resumen de Riesgo */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-red-900">{alumnosRiesgo.critico.length}</div>
              <div className="text-sm font-medium text-red-700">Riesgo CRÍTICO</div>
            </div>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-amber-900">{alumnosRiesgo.alto.length}</div>
              <div className="text-sm font-medium text-amber-700">Riesgo ALTO</div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-900">{alumnosRiesgo.medio.length}</div>
              <div className="text-sm font-medium text-blue-700">Riesgo MEDIO</div>
            </div>
          </div>

          {/* Lista de Alumnos en Riesgo CRÍTICO */}
          {alumnosRiesgo.critico.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="bg-red-600 text-white px-6 py-3 rounded-t-lg">
                <h3 className="text-lg font-bold">🚨 Riesgo CRÍTICO - Acción Inmediata</h3>
              </div>
              <div className="divide-y">
                {alumnosRiesgo.critico.map((alumno, idx) => (
                  <div key={idx} className="p-4 hover:bg-red-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">{alumno.nombre_completo}</h4>
                        <p className="text-sm text-gray-600">Grupo: {alumno.grupo_codigo}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">{alumno.score_riesgo}</div>
                        <div className="text-xs text-gray-500">Score de riesgo</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {alumno.razones_riesgo.map((razon, i) => (
                        <span key={i} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          {razon}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2 text-sm">
                      {alumno.telefono && (
                        <a href={`tel:${alumno.telefono}`} className="text-blue-600 hover:underline">
                          📞 {alumno.telefono}
                        </a>
                      )}
                      {alumno.email && (
                        <a href={`mailto:${alumno.email}`} className="text-blue-600 hover:underline">
                          ✉️ {alumno.email}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alumnos en Riesgo ALTO */}
          {alumnosRiesgo.alto.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="bg-amber-600 text-white px-6 py-3">
                <h3 className="text-lg font-bold">⚠️ Riesgo ALTO</h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {alumnosRiesgo.alto.map((alumno, idx) => (
                  <div key={idx} className="p-4 hover:bg-amber-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{alumno.nombre_completo}</h4>
                        <p className="text-xs text-gray-600">Grupo: {alumno.grupo_codigo}</p>
                      </div>
                      <div className="text-xl font-bold text-amber-600">{alumno.score_riesgo}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {alumno.razones_riesgo.map((razon, i) => (
                        <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          {razon}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alumnos en Riesgo MEDIO */}
          {alumnosRiesgo.medio.length > 0 && (
            <details className="bg-white rounded-lg shadow">
              <summary className="bg-blue-600 text-white px-6 py-3 cursor-pointer hover:bg-blue-700 transition-colors">
                <span className="text-lg font-bold">ℹ️ Riesgo MEDIO ({alumnosRiesgo.medio.length})</span>
              </summary>
              <div className="divide-y max-h-64 overflow-y-auto">
                {alumnosRiesgo.medio.map((alumno, idx) => (
                  <div key={idx} className="p-3 text-sm">
                    <span className="font-medium">{alumno.nombre_completo}</span>
                    <span className="text-gray-600 ml-2">({alumno.grupo_codigo})</span>
                    <span className="ml-2 text-blue-600 font-semibold">{alumno.score_riesgo}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {alumnosRiesgo.total === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-3" />
              <p className="text-xl font-bold text-green-800">¡Excelente!</p>
              <p className="text-green-600 mt-1">No hay alumnos en riesgo detectados</p>
            </div>
          )}
        </div>
      )}

      {/* Botón de recarga */}
      <div className="text-center">
        <button
          onClick={cargarDatosIA}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Analizando...' : '🔄 Actualizar Análisis'}
        </button>
      </div>
    </div>
  );
}

export default DashboardInteligente;
