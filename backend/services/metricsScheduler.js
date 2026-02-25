import cron from 'node-cron';
import pool from '../config/database.js';

/**
 * Scheduler para cálculo automático de métricas
 * Este archivo debe ser importado en server.js
 */

class MetricsScheduler {
    constructor() {
        this.jobs = [];
    }

    /**
     * Inicia todos los trabajos programados
     */
    start() {
        console.log('📅 Iniciando scheduler de métricas...');

        // Job 1: Calcular métricas mensuales (cada 1er día del mes a las 00:00)
        const monthlyJob = cron.schedule('0 0 1 * *', async () => {
            console.log('🔄 Ejecutando cálculo de métricas mensuales...');
            try {
                await pool.query('SELECT calcular_metricas_mensuales()');
                console.log('✅ Métricas mensuales calculadas exitosamente');
            } catch (error) {
                console.error('❌ Error al calcular métricas mensuales:', error);
            }
        });

        this.jobs.push({ name: 'monthly-metrics', job: monthlyJob });

        // Job 2: Calcular métricas del periodo activo (cada domingo a las 23:00)
        const weeklyJob = cron.schedule('0 23 * * 0', async () => {
            console.log('🔄 Ejecutando cálculo de métricas del periodo activo...');
            try {
                // Obtener periodo activo
                const periodoResult = await pool.query(
                    'SELECT id FROM periodos WHERE activo = true ORDER BY created_at DESC LIMIT 1'
                );

                if (periodoResult.rows.length > 0) {
                    const periodoId = periodoResult.rows[0].id;
                    await pool.query('SELECT calcular_metricas_periodo($1)', [periodoId]);
                    console.log(`✅ Métricas del periodo ${periodoId} calculadas exitosamente`);
                } else {
                    console.log('⚠️  No hay periodo activo');
                }
            } catch (error) {
                console.error('❌ Error al calcular métricas del periodo:', error);
            }
        });

        this.jobs.push({ name: 'weekly-period-metrics', job: weeklyJob });

        // Job 3: Limpieza de métricas antiguas (cada 6 meses)
        const cleanupJob = cron.schedule('0 0 1 */6 *', async () => {
            console.log('🧹 Ejecutando limpieza de métricas antiguas...');
            try {
                // Mantener solo los últimos 24 meses de métricas mensuales
                await pool.query(`
          DELETE FROM metricas_mensuales 
          WHERE (anio * 12 + mes) < (EXTRACT(YEAR FROM CURRENT_DATE) * 12 + EXTRACT(MONTH FROM CURRENT_DATE) - 24)
        `);
                console.log('✅ Limpieza de métricas completada');
            } catch (error) {
                console.error('❌ Error en limpieza de métricas:', error);
            }
        });

        this.jobs.push({ name: 'cleanup-old-metrics', job: cleanupJob });

        // Job 4: Backup de métricas (cada día a las 02:00)
        const backupJob = cron.schedule('0 2 * * *', async () => {
            console.log('💾 Ejecutando backup de métricas...');
            try {
                // Crear tabla de respaldo si no existe
                await pool.query(`
          CREATE TABLE IF NOT EXISTS metricas_backup (
            id SERIAL PRIMARY KEY,
            tabla VARCHAR(50),
            datos JSONB,
            fecha_backup TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

                // Respaldar métricas del periodo
                await pool.query(`
          INSERT INTO metricas_backup (tabla, datos)
          SELECT 'metricas_periodo', row_to_json(mp)
          FROM metricas_periodo mp
          WHERE mp.updated_at >= CURRENT_DATE - INTERVAL '1 day'
        `);

                console.log('✅ Backup de métricas completado');
            } catch (error) {
                console.error('❌ Error en backup de métricas:', error);
            }
        });

        this.jobs.push({ name: 'daily-backup', job: backupJob });

        console.log(`✅ ${this.jobs.length} trabajos programados iniciados`);
        this.logSchedule();
    }

    /**
     * Detiene todos los trabajos programados
     */
    stop() {
        console.log('🛑 Deteniendo scheduler de métricas...');
        this.jobs.forEach(({ name, job }) => {
            job.stop();
            console.log(`  ⏹️  ${name} detenido`);
        });
        this.jobs = [];
    }

    /**
     * Muestra el horario de ejecución de los trabajos
     */
    logSchedule() {
        console.log('\n📋 Horario de trabajos programados:');
        console.log('  • Métricas mensuales: 1er día del mes a las 00:00');
        console.log('  • Métricas del periodo: Domingos a las 23:00');
        console.log('  • Limpieza de métricas: Cada 6 meses');
        console.log('  • Backup diario: Todos los días a las 02:00');
        console.log('');
    }

    /**
     * Ejecuta manualmente un trabajo específico
     */
    async runJob(jobName) {
        const job = this.jobs.find(j => j.name === jobName);
        if (job) {
            console.log(`🔄 Ejecutando manualmente: ${jobName}`);
            // Los cron jobs no exponen la función directamente, 
            // así que necesitamos ejecutar la lógica manualmente
            switch (jobName) {
                case 'monthly-metrics':
                    await pool.query('SELECT calcular_metricas_mensuales()');
                    break;
                case 'weekly-period-metrics':
                    const periodoResult = await pool.query(
                        'SELECT id FROM periodos WHERE activo = true ORDER BY created_at DESC LIMIT 1'
                    );
                    if (periodoResult.rows.length > 0) {
                        await pool.query('SELECT calcular_metricas_periodo($1)', [periodoResult.rows[0].id]);
                    }
                    break;
                default:
                    console.log('⚠️  Trabajo no encontrado');
            }
        } else {
            console.log('⚠️  Trabajo no encontrado');
        }
    }
}

// Exportar instancia única
const scheduler = new MetricsScheduler();
export default scheduler;

/**
 * INSTRUCCIONES DE USO:
 * 
 * 1. Instalar dependencia:
 *    npm install node-cron
 * 
 * 2. Importar en server.js:
 *    import metricsScheduler from './services/metricsScheduler.js';
 * 
 * 3. Iniciar después de conectar a la base de datos:
 *    metricsScheduler.start();
 * 
 * 4. Detener al cerrar el servidor:
 *    process.on('SIGTERM', () => {
 *      metricsScheduler.stop();
 *      process.exit(0);
 *    });
 * 
 * 5. Ejecutar manualmente (opcional):
 *    metricsScheduler.runJob('monthly-metrics');
 */
