import PDFDocument from 'pdfkit';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

/**
 * Servicio mejorado para generación de PDFs con gráficas
 * Incluye visualizaciones de tendencias históricas
 */
class PDFReportService {
    constructor() {
        // Configuración para generación de gráficas
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: 800,
            height: 400,
            backgroundColour: 'white'
        });
    }

    /**
     * Genera una gráfica de barras como imagen
     */
    async generarGraficaBarras(data, titulo, labelX, labelY) {
        const configuration = {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    label: labelY,
                    data: data.map(d => d.value),
                    backgroundColor: 'rgba(3, 105, 161, 0.8)',
                    borderColor: 'rgba(3, 105, 161, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: titulo,
                        font: { size: 18, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: labelY
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: labelX
                        }
                    }
                }
            }
        };

        return await this.chartJSNodeCanvas.renderToBuffer(configuration);
    }

    /**
     * Genera una gráfica de líneas para tendencias
     */
    async generarGraficaLineas(data, titulo, datasets) {
        const configuration = {
            type: 'line',
            data: {
                labels: data.map(d => d.label),
                datasets: datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: data.map(d => d[dataset.key]),
                    borderColor: this.getColor(index),
                    backgroundColor: this.getColor(index, 0.1),
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: titulo,
                        font: { size: 18, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cantidad'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Periodo'
                        }
                    }
                }
            }
        };

        return await this.chartJSNodeCanvas.renderToBuffer(configuration);
    }

    /**
     * Genera una gráfica de pastel
     */
    async generarGraficaPastel(data, titulo) {
        const configuration = {
            type: 'pie',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: [
                        'rgba(3, 105, 161, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: titulo,
                        font: { size: 18, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        position: 'right'
                    }
                }
            }
        };

        return await this.chartJSNodeCanvas.renderToBuffer(configuration);
    }

    /**
     * Obtiene colores para las gráficas
     */
    getColor(index, alpha = 0.8) {
        const colors = [
            `rgba(3, 105, 161, ${alpha})`,      // Azul
            `rgba(16, 185, 129, ${alpha})`,     // Verde
            `rgba(251, 191, 36, ${alpha})`,     // Amarillo
            `rgba(239, 68, 68, ${alpha})`,      // Rojo
            `rgba(139, 92, 246, ${alpha})`,     // Púrpura
            `rgba(236, 72, 153, ${alpha})`      // Rosa
        ];
        return colors[index % colors.length];
    }

    /**
     * Genera PDF con gráficas de tendencias de ingresos
     */
    async generarPDFTendenciasIngresos(datosHistoricos, res) {
        const doc = new PDFDocument({
            margin: 40,
            size: 'LETTER',
            bufferPages: true
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=tendencias_ingresos_${new Date().toISOString().split('T')[0]}.pdf`);

        doc.pipe(res);

        // Encabezado
        this.agregarEncabezado(doc, 'Reporte de Tendencias de Ingresos');

        // Resumen ejecutivo
        doc.fontSize(14).font('Helvetica-Bold').text('Resumen Ejecutivo', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        const totalPeriodos = datosHistoricos.length;
        const ingresoTotal = datosHistoricos.reduce((sum, d) => sum + parseFloat(d.ingresos || 0), 0);
        const promedioIngresos = ingresoTotal / totalPeriodos;
        const ultimoPeriodo = datosHistoricos[datosHistoricos.length - 1];
        const penultimoPeriodo = datosHistoricos[datosHistoricos.length - 2];
        const crecimiento = penultimoPeriodo ?
            ((ultimoPeriodo.ingresos - penultimoPeriodo.ingresos) / penultimoPeriodo.ingresos * 100).toFixed(2) : 0;

        doc.text(`• Periodos analizados: ${totalPeriodos}`);
        doc.text(`• Ingreso total acumulado: $${ingresoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
        doc.text(`• Promedio de ingresos por periodo: $${promedioIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
        doc.text(`• Crecimiento último periodo: ${crecimiento}%`);
        doc.text(`• Total de alumnos actuales: ${ultimoPeriodo.total_alumnos || 0}`);
        doc.text(`• Nuevos ingresos último periodo: ${ultimoPeriodo.nuevos_ingresos || 0}`);

        doc.moveDown(2);

        // Gráfica de tendencias de ingresos
        doc.fontSize(12).font('Helvetica-Bold').text('Tendencias de Ingresos por Periodo', { underline: true });
        doc.moveDown(0.5);

        const graficaIngresos = await this.generarGraficaLineas(
            datosHistoricos.map(d => ({
                label: d.periodo,
                ingresos: parseFloat(d.ingresos || 0),
                adeudos: parseFloat(d.adeudos || 0)
            })),
            'Evolución de Ingresos y Adeudos',
            [
                { label: 'Ingresos', key: 'ingresos' },
                { label: 'Adeudos Pendientes', key: 'adeudos' }
            ]
        );

        doc.image(graficaIngresos, 50, doc.y, { width: 500 });
        doc.moveDown(15);

        // Nueva página para gráfica de alumnos
        doc.addPage();
        this.agregarEncabezado(doc, 'Crecimiento de Matrícula');

        doc.fontSize(12).font('Helvetica-Bold').text('Evolución de Alumnos por Periodo', { underline: true });
        doc.moveDown(0.5);

        const graficaAlumnos = await this.generarGraficaLineas(
            datosHistoricos.map(d => ({
                label: d.periodo,
                total: parseInt(d.total_alumnos || 0),
                nuevos: parseInt(d.nuevos_ingresos || 0)
            })),
            'Crecimiento de Matrícula',
            [
                { label: 'Total Alumnos', key: 'total' },
                { label: 'Nuevos Ingresos', key: 'nuevos' }
            ]
        );

        doc.image(graficaAlumnos, 50, doc.y, { width: 500 });
        doc.moveDown(15);

        // Distribución por nivel (último periodo)
        doc.addPage();
        this.agregarEncabezado(doc, 'Distribución Actual');

        doc.fontSize(12).font('Helvetica-Bold').text('Distribución de Alumnos por Nivel', { underline: true });
        doc.moveDown(0.5);

        const distribucionNiveles = [
            { label: 'A1', value: ultimoPeriodo.alumnos_a1 || 0 },
            { label: 'A2', value: ultimoPeriodo.alumnos_a2 || 0 },
            { label: 'B1', value: ultimoPeriodo.alumnos_b1 || 0 },
            { label: 'B2', value: ultimoPeriodo.alumnos_b2 || 0 },
            { label: 'C1', value: ultimoPeriodo.alumnos_c1 || 0 },
            { label: 'C2', value: ultimoPeriodo.alumnos_c2 || 0 }
        ].filter(n => n.value > 0);

        const graficaNiveles = await this.generarGraficaPastel(
            distribucionNiveles,
            'Distribución por Nivel de Inglés'
        );

        doc.image(graficaNiveles, 100, doc.y, { width: 400 });
        doc.moveDown(20);

        // Tabla de datos detallados
        doc.addPage();
        this.agregarEncabezado(doc, 'Datos Detallados');

        doc.fontSize(12).font('Helvetica-Bold').text('Tabla de Datos Históricos', { underline: true });
        doc.moveDown(1);

        this.agregarTabla(doc, datosHistoricos, [
            { header: 'Periodo', key: 'periodo', width: 120 },
            { header: 'Alumnos', key: 'total_alumnos', width: 70, align: 'right' },
            { header: 'Nuevos', key: 'nuevos_ingresos', width: 60, align: 'right' },
            { header: 'Ingresos', key: 'ingresos', width: 100, align: 'right', format: 'currency' },
            { header: 'Adeudos', key: 'adeudos', width: 100, align: 'right', format: 'currency' },
            { header: 'Grupos', key: 'grupos_activos', width: 60, align: 'right' }
        ]);

        // Footer en todas las páginas
        this.agregarFooter(doc);

        doc.end();
    }

    /**
     * Agrega encabezado al PDF
     */
    agregarEncabezado(doc, titulo) {
        doc.rect(0, 0, doc.page.width, 80).fill('#0369a1');
        doc.fillColor('#ffffff')
            .fontSize(24)
            .font('Helvetica-Bold')
            .text('TESCHA', 50, 25);
        doc.fontSize(12)
            .font('Helvetica')
            .text('Tecnológico de Estudios Superiores de Chalco', 50, 50);

        doc.fillColor('#000000');
        doc.moveDown(3);

        doc.fontSize(18)
            .font('Helvetica-Bold')
            .text(titulo, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10)
            .font('Helvetica')
            .text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`, { align: 'center' });
        doc.moveDown(2);
    }

    /**
     * Agrega tabla de datos al PDF
     */
    agregarTabla(doc, datos, columnas) {
        const tableTop = doc.y;
        const itemHeight = 25;
        let yPos = tableTop;

        // Encabezados
        doc.rect(40, yPos, doc.page.width - 80, itemHeight).fill('#e5e7eb');
        doc.fillColor('#000000');

        let xPos = 50;
        doc.fontSize(9).font('Helvetica-Bold');
        columnas.forEach(col => {
            doc.text(col.header, xPos, yPos + 8, {
                width: col.width - 10,
                align: col.align || 'left'
            });
            xPos += col.width;
        });

        yPos += itemHeight;

        // Datos
        doc.font('Helvetica').fontSize(8);
        datos.forEach((row, index) => {
            if (yPos > doc.page.height - 100) {
                doc.addPage();
                yPos = 50;
            }

            // Fondo alternado
            if (index % 2 === 0) {
                doc.rect(40, yPos, doc.page.width - 80, itemHeight).fill('#f9fafb');
            }
            doc.fillColor('#000000');

            xPos = 50;
            columnas.forEach(col => {
                let value = row[col.key];

                if (value === null || value === undefined) {
                    value = '-';
                } else if (col.format === 'currency') {
                    value = `$${parseFloat(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                } else {
                    value = String(value);
                }

                doc.text(value, xPos, yPos + 8, {
                    width: col.width - 10,
                    align: col.align || 'left'
                });
                xPos += col.width;
            });

            yPos += itemHeight;
        });
    }

    /**
     * Agrega footer a todas las páginas
     */
    agregarFooter(doc) {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);

            const bottom = doc.page.height - 50;
            doc.moveTo(40, bottom - 10)
                .lineTo(doc.page.width - 40, bottom - 10)
                .stroke('#0369a1');

            doc.fontSize(8)
                .fillColor('#6b7280')
                .text(
                    'TESCHA - Sistema de Coordinación de Inglés',
                    40,
                    bottom,
                    { align: 'center', width: doc.page.width - 80 }
                );

            doc.text(
                `Página ${i + 1} de ${pages.count}`,
                40,
                bottom + 12,
                { align: 'center', width: doc.page.width - 80 }
            );
        }
    }
}

export default new PDFReportService();
