import { procesarNotificaciones } from '../services/notificacionesService.js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * Inicializar tabla de notificaciones si no existe
 */
const inicializarTabla = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
        id SERIAL PRIMARY KEY,
        pago_id INTEGER REFERENCES pagos(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('recordatorio', 'vencida')),
        mensaje TEXT,
        metodo VARCHAR(20) DEFAULT 'email' CHECK (metodo IN ('email', 'manual')),
        fecha_envio TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear índice único para evitar duplicados
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_notificacion_diaria 
      ON notificaciones_enviadas (pago_id, tipo, DATE(fecha_envio))
    `);

    // Crear índices adicionales si no existen
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha 
      ON notificaciones_enviadas(fecha_envio)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notificaciones_pago 
      ON notificaciones_enviadas(pago_id, tipo)
    `);

    console.log('✅ Tabla de notificaciones verificada');
  } catch (error) {
    console.log('⚠️  Advertencia al verificar tabla:', error.message);
  }
};

/**
 * Script para enviar recordatorios automáticos
 * Se ejecuta mediante PM2 cron job todos los días a las 9:00 AM
 */
const main = async () => {
  console.log('========================================');
  console.log('   TESCHA - RECORDATORIOS AUTOMÁTICOS');
  console.log('========================================');
  console.log(`Fecha: ${new Date().toLocaleString('es-MX')}`);
  console.log('');

  try {
    // Verificar conexión a base de datos
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión a base de datos establecida');

    // Inicializar tabla de notificaciones
    await inicializarTabla();

    // Procesar notificaciones
    const resultado = await procesarNotificaciones();

    if (resultado.success) {
      console.log('');
      console.log('📊 RESUMEN:');
      console.log(`   - Prórrogas por vencer (próximos 3 días): ${resultado.porVencer}`);
      console.log(`   - Prórrogas vencidas: ${resultado.vencidas}`);
      console.log(`   - Correos enviados hoy: ${resultado.totalEnviados || 0}`);
      console.log(`     • Recordatorios: ${resultado.enviadosRecordatorio || 0}`);
      console.log(`     • Vencidas: ${resultado.enviadosVencidas || 0}`);
      console.log('');
      console.log('✅ Proceso completado exitosamente');
      console.log('💡 Los correos ya enviados hoy no se duplicaron');
    } else {
      console.error('❌ Error al procesar notificaciones:', resultado.error);
      process.exit(1);
    }

    // Cerrar conexión
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error crítico:', error.message);
    console.error(error.stack);
    
    try {
      await pool.end();
    } catch (e) {
      // Ignorar errores al cerrar
    }
    
    process.exit(1);
  }
};

// Ejecutar
main();
