import { useState, useEffect } from 'react';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import { FaChartLine, FaSync, FaInfoCircle, FaArrowUp, FaArrowDown, FaEquals, FaUsers, FaDollarSign, FaChartBar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { dashboardService } from '../services/api';

const TendenciasAvanzadas = () => {
    const [metricasHistoricas, setMetricasHistoricas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [indicadores, setIndicadores] = useState(null);

    useEffect(() => {
        cargarDatos();
        
        // Auto-refresh cada 10 minutos
        const interval = setInterval(() => {
            cargarDatos();
        }, 10 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const tendenciasRes = await dashboardService.getTendencias();
            // Filtrar solo periodos con alumnos
            const datos = (tendenciasRes.data || []).filter(p => p.total_alumnos > 0);
            setMetricasHistoricas(datos);
            
            // Calcular indicadores de crecimiento
            if (datos.length >= 2) {
                calcularIndicadores(datos);
            }
        } catch (error) {
            console.error('Error al cargar datos:', error);
            toast.error('Error al cargar tendencias: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const calcularIndicadores = (datos) => {
        // Comparar último periodo con el anterior
        const ultimo = datos[0];
        const anterior = datos[1];

        const crecimientoAlumnos = anterior.total_alumnos > 0 
            ? ((ultimo.total_alumnos - anterior.total_alumnos) / anterior.total_alumnos * 100).toFixed(2)
            : 0;

        const crecimientoIngresos = anterior.ingresos > 0
            ? ((ultimo.ingresos - anterior.ingresos) / anterior.ingresos * 100).toFixed(2)
            : 0;

        const crecimientoInternos = anterior.alumnos_internos > 0
            ? ((ultimo.alumnos_internos - anterior.alumnos_internos) / anterior.alumnos_internos * 100).toFixed(2)
            : 0;

        const crecimientoExternos = anterior.alumnos_externos > 0
            ? ((ultimo.alumnos_externos - anterior.alumnos_externos) / anterior.alumnos_externos * 100).toFixed(2)
            : 0;

        // Calcular promedios
        const promedioAlumnos = (datos.reduce((sum, d) => sum + d.total_alumnos, 0) / datos.length).toFixed(0);
        const promedioIngresos = (datos.reduce((sum, d) => sum + d.ingresos, 0) / datos.length).toFixed(0);

        setIndicadores({
            crecimientoAlumnos: parseFloat(crecimientoAlumnos),
            crecimientoIngresos: parseFloat(crecimientoIngresos),
            crecimientoInternos: parseFloat(crecimientoInternos),
            crecimientoExternos: parseFloat(crecimientoExternos),
            promedioAlumnos: parseInt(promedioAlumnos),
            promedioIngresos: parseFloat(promedioIngresos),
            ultimoPeriodo: ultimo,
            periodoAnterior: anterior
        });
    };

    const formatCurrency = (value) => {
        return `$${parseFloat(value).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const formatNumber = (value) => {
        return parseInt(value).toLocaleString('es-MX');
    };

    const formatPercent = (value) => {
        const num = parseFloat(value);
        return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
    };

    const getTrendIcon = (value) => {
        if (value > 0) return <FaArrowUp className="text-green-500" />;
        if (value < 0) return <FaArrowDown className="text-red-500" />;
        return <FaEquals className="text-gray-500" />;
    };

    const getTrendColor = (value) => {
        if (value > 0) return 'text-green-600';
        if (value < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getTrendBgColor = (value) => {
        if (value > 0) return 'bg-green-50 border-green-200';
        if (value < 0) return 'bg-red-50 border-red-200';
        return 'bg-gray-50 border-gray-200';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tescha-blue"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <FaChartLine className="text-tescha-blue" />
                        Análisis de Tendencias Históricas
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Visualización de crecimiento y proyecciones basadas en datos históricos
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={cargarDatos}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <FaSync />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Vista de Tendencias Históricas */}
            <div className="space-y-6">
                {/* Mensaje si no hay datos */}
                {metricasHistoricas.length === 0 && (
                    <div className="card bg-yellow-50 border-l-4 border-yellow-500">
                        <div className="flex items-start gap-3">
                            <FaInfoCircle className="text-2xl text-yellow-500 mt-1" />
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2">No hay datos suficientes</h3>
                                <p className="text-sm text-gray-700">
                                    Para visualizar tendencias, necesitas tener al menos un periodo con inscripciones y pagos registrados.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Indicadores de Crecimiento */}
                {indicadores && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Crecimiento Total de Alumnos */}
                        <div className={`card border-2 ${
                            indicadores.crecimientoAlumnos > 0 ? 'bg-green-50 border-green-200' :
                            indicadores.crecimientoAlumnos < 0 ? 'bg-red-50 border-red-200' :
                            'bg-gray-50 border-gray-200'
                        }`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Crecimiento de Alumnos</p>
                                    <p className={`text-3xl font-bold mt-2 ${
                                        indicadores.crecimientoAlumnos > 0 ? 'text-green-600' :
                                        indicadores.crecimientoAlumnos < 0 ? 'text-red-600' :
                                        'text-gray-600'
                                    }`}>
                                        {formatPercent(indicadores.crecimientoAlumnos)}
                                    </p>
                                    <p className={`text-xs font-semibold mt-1 ${
                                        indicadores.crecimientoAlumnos > 0 ? 'text-green-700' :
                                        indicadores.crecimientoAlumnos < 0 ? 'text-red-700' :
                                        'text-gray-700'
                                    }`}>
                                        {indicadores.crecimientoAlumnos > 0 ? '📈 Crecimiento' :
                                         indicadores.crecimientoAlumnos < 0 ? '📉 Decrecimiento' :
                                         '➡️ Sin cambio'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {indicadores.ultimoPeriodo.total_alumnos} vs {indicadores.periodoAnterior.total_alumnos}
                                    </p>
                                </div>
                                <div className="text-3xl">
                                    {getTrendIcon(indicadores.crecimientoAlumnos)}
                                </div>
                            </div>
                        </div>

                        {/* Crecimiento de Ingresos */}
                        <div className={`card border-2 ${
                            indicadores.crecimientoIngresos > 0 ? 'bg-green-50 border-green-200' :
                            indicadores.crecimientoIngresos < 0 ? 'bg-red-50 border-red-200' :
                            'bg-gray-50 border-gray-200'
                        }`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Crecimiento de Ingresos</p>
                                    <p className={`text-3xl font-bold mt-2 ${
                                        indicadores.crecimientoIngresos > 0 ? 'text-green-600' :
                                        indicadores.crecimientoIngresos < 0 ? 'text-red-600' :
                                        'text-gray-600'
                                    }`}>
                                        {formatPercent(indicadores.crecimientoIngresos)}
                                    </p>
                                    <p className={`text-xs font-semibold mt-1 ${
                                        indicadores.crecimientoIngresos > 0 ? 'text-green-700' :
                                        indicadores.crecimientoIngresos < 0 ? 'text-red-700' :
                                        'text-gray-700'
                                    }`}>
                                        {indicadores.crecimientoIngresos > 0 ? '📈 Crecimiento' :
                                         indicadores.crecimientoIngresos < 0 ? '📉 Decrecimiento' :
                                         '➡️ Sin cambio'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formatCurrency(indicadores.ultimoPeriodo.ingresos)} vs {formatCurrency(indicadores.periodoAnterior.ingresos)}
                                    </p>
                                </div>
                                <div className="text-3xl">
                                    {getTrendIcon(indicadores.crecimientoIngresos)}
                                </div>
                            </div>
                        </div>

                        {/* Crecimiento Alumnos Internos */}
                        <div className={`card border-2 ${
                            indicadores.crecimientoInternos > 0 ? 'bg-green-50 border-green-200' :
                            indicadores.crecimientoInternos < 0 ? 'bg-red-50 border-red-200' :
                            'bg-gray-50 border-gray-200'
                        }`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Alumnos Internos</p>
                                    <p className={`text-3xl font-bold mt-2 ${
                                        indicadores.crecimientoInternos > 0 ? 'text-green-600' :
                                        indicadores.crecimientoInternos < 0 ? 'text-red-600' :
                                        'text-gray-600'
                                    }`}>
                                        {formatPercent(indicadores.crecimientoInternos)}
                                    </p>
                                    <p className={`text-xs font-semibold mt-1 ${
                                        indicadores.crecimientoInternos > 0 ? 'text-green-700' :
                                        indicadores.crecimientoInternos < 0 ? 'text-red-700' :
                                        'text-gray-700'
                                    }`}>
                                        {indicadores.crecimientoInternos > 0 ? '📈 Crecimiento' :
                                         indicadores.crecimientoInternos < 0 ? '📉 Decrecimiento' :
                                         '➡️ Sin cambio'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {indicadores.ultimoPeriodo.alumnos_internos} vs {indicadores.periodoAnterior.alumnos_internos}
                                    </p>
                                </div>
                                <div className="text-3xl text-blue-500">
                                    <FaUsers />
                                </div>
                            </div>
                        </div>

                        {/* Crecimiento Alumnos Externos */}
                        <div className={`card border-2 ${
                            indicadores.crecimientoExternos > 0 ? 'bg-green-50 border-green-200' :
                            indicadores.crecimientoExternos < 0 ? 'bg-red-50 border-red-200' :
                            'bg-gray-50 border-gray-200'
                        }`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Alumnos Externos</p>
                                    <p className={`text-3xl font-bold mt-2 ${
                                        indicadores.crecimientoExternos > 0 ? 'text-green-600' :
                                        indicadores.crecimientoExternos < 0 ? 'text-red-600' :
                                        'text-gray-600'
                                    }`}>
                                        {formatPercent(indicadores.crecimientoExternos)}
                                    </p>
                                    <p className={`text-xs font-semibold mt-1 ${
                                        indicadores.crecimientoExternos > 0 ? 'text-green-700' :
                                        indicadores.crecimientoExternos < 0 ? 'text-red-700' :
                                        'text-gray-700'
                                    }`}>
                                        {indicadores.crecimientoExternos > 0 ? '📈 Crecimiento' :
                                         indicadores.crecimientoExternos < 0 ? '📉 Decrecimiento' :
                                         '➡️ Sin cambio'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {indicadores.ultimoPeriodo.alumnos_externos} vs {indicadores.periodoAnterior.alumnos_externos}
                                    </p>
                                </div>
                                <div className="text-3xl text-orange-500">
                                    <FaUsers />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Gráfica de Ingresos Totales con Línea de Tendencia */}
                {metricasHistoricas.length > 0 && (
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <FaDollarSign className="text-green-600" />
                            Evolución de Ingresos Totales
                        </h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart data={[...metricasHistoricas].reverse()}>
                                <defs>
                                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="periodo"
                                    tick={{ fontSize: 10 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={100}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={formatCurrency}
                                />
                                <Tooltip
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="ingresos"
                                    fill="url(#colorIngresos)"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    name="Ingresos Totales"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="ingresos"
                                    stroke="#059669"
                                    strokeWidth={2}
                                    dot={{ fill: '#10b981', r: 6 }}
                                    activeDot={{ r: 8 }}
                                    name="Tendencia"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Gráfica de Crecimiento de Alumnos */}
                {metricasHistoricas.length > 0 && (
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <FaUsers className="text-blue-600" />
                            Crecimiento de Matrícula por Periodo
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Evolución de alumnos internos (TESCHA) y externos por periodo académico
                        </p>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={[...metricasHistoricas].reverse()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="periodo"
                                    tick={{ fontSize: 10 }}
                                    angle={-70}
                                    textAnchor="end"
                                    height={130}
                                    interval={0}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={formatNumber}
                                />
                                <Tooltip
                                    formatter={(value, name) => [formatNumber(value), name]}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Bar
                                    dataKey="alumnos_internos"
                                    stackId="a"
                                    fill="#0369a1"
                                    name="Alumnos Internos (TESCHA)"
                                    radius={[0, 0, 0, 0]}
                                />
                                <Bar
                                    dataKey="alumnos_externos"
                                    stackId="a"
                                    fill="#f59e0b"
                                    name="Alumnos Externos"
                                    radius={[8, 8, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Gráfica de Ingresos por Tipo de Alumno */}
                {metricasHistoricas.length > 0 && (
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <FaChartBar className="text-purple-600" />
                            Evolución de Ingresos por Tipo de Alumno
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Comparación de ingresos generados por alumnos internos vs externos
                        </p>
                        <ResponsiveContainer width="100%" height={400}>
                            <AreaChart data={[...metricasHistoricas].reverse()}>
                                <defs>
                                    <linearGradient id="colorInternos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0369a1" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#0369a1" stopOpacity={0.1}/>
                                    </linearGradient>
                                    <linearGradient id="colorExternos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="periodo"
                                    tick={{ fontSize: 10 }}
                                    angle={-70}
                                    textAnchor="end"
                                    height={130}
                                    interval={0}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={formatCurrency}
                                />
                                <Tooltip
                                    formatter={(value, name) => [formatCurrency(value), name]}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="ingresos_internos"
                                    stackId="1"
                                    stroke="#0369a1"
                                    fill="url(#colorInternos)"
                                    name="Ingresos Internos"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="ingresos_externos"
                                    stackId="1"
                                    stroke="#f59e0b"
                                    fill="url(#colorExternos)"
                                    name="Ingresos Externos"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Tabla de Datos Detallados */}
                {metricasHistoricas.length > 0 && (
                    <div className="card">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FaChartLine className="text-tescha-blue" />
                                    Datos Detallados por Periodo
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    💡 <span className="italic">Comparativa completa de métricas históricas</span>
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" rowSpan="2">Periodo</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l border-gray-300" colSpan="3">Matrícula</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l border-gray-300" colSpan="3">Ingresos</th>
                                    </tr>
                                    <tr>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-blue-700 uppercase border-l border-gray-300">Internos</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-orange-700 uppercase">Externos</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase font-bold">Total</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-blue-700 uppercase border-l border-gray-300">Internos</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-orange-700 uppercase">Externos</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase font-bold">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {metricasHistoricas.map((periodo, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {periodo.periodo}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-blue-600 border-l border-gray-200">
                                                {periodo.alumnos_internos > 0 ? formatNumber(periodo.alumnos_internos) : 
                                                 (periodo.total_alumnos > 0 ? <span className="text-gray-400 italic text-xs">Sin datos</span> : '-')}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                                                {periodo.alumnos_externos > 0 ? formatNumber(periodo.alumnos_externos) : 
                                                 (periodo.total_alumnos > 0 ? <span className="text-gray-400 italic text-xs">Sin datos</span> : '-')}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                                {periodo.total_alumnos > 0 ? formatNumber(periodo.total_alumnos) : '-'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-blue-600 border-l border-gray-200">
                                                {periodo.ingresos_internos > 0 ? formatCurrency(periodo.ingresos_internos) : 
                                                 (periodo.ingresos > 0 ? <span className="text-gray-400 italic text-xs">Sin datos</span> : '-')}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                                                {periodo.ingresos_externos > 0 ? formatCurrency(periodo.ingresos_externos) : 
                                                 (periodo.ingresos > 0 ? <span className="text-gray-400 italic text-xs">Sin datos</span> : '-')}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                                {periodo.ingresos > 0 ? formatCurrency(periodo.ingresos) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TendenciasAvanzadas;
