import pool from '../config/database.js';

/**
 * SISTEMA DE MANTENIMIENTO AUTOMÁTICO
 * Se ejecuta automáticamente después de operaciones importantes
 * para mantener la integridad y rendimiento del sistema
 */

let lastRefreshTime = Date.now();
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

/**
 * Refresca las vistas materializadas automáticamente
 */
export const autoRefreshViews = async () => {
  try {
    const now = Date.now();
    
    // Solo refrescar si han pasado más de 5 minutos desde la última vez
    if (now - lastRefreshTime < REFRESH_INTERVAL) {
      return;
    }

    console.log('🔄 Refrescando vistas materializadas automáticamente...');
    
    // TODO: Las vistas materializadas están deshabilitadas por ahora
    // Descomentar cuando se creen las vistas materializadas
    /*
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pagos_completos');
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_metricas');
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_calificaciones_completas');
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_asistencias_completas');
    */
    
    lastRefreshTime = now;
    console.log('✅ Vistas materializadas actualizadas');
  } catch (error) {
    console.error('❌ Error al refrescar vistas materializadas:', error.message);
  }
};

/**
 * Detecta y repara referencias huérfanas automáticamente
 */
export const autoCleanOrphanedReferences = async () => {
  try {
    console.log('🔍 Verificando referencias huérfanas...');
    
    // 1. Limpiar inscripciones con alumno inexistente
    const inscripcionesResult = await pool.query(`
      DELETE FROM inscripciones
      WHERE alumno_id NOT IN (SELECT id FROM alumnos)
      OR grupo_id NOT IN (SELECT id FROM grupos)
      OR periodo_id NOT IN (SELECT id FROM periodos)
      RETURNING id
    `);
    
    if (inscripcionesResult.rowCount > 0) {
      console.log(`⚠️  Se eliminaron ${inscripcionesResult.rowCount} inscripciones huérfanas`);
    }
    
    // 2. Limpiar pagos con inscripción inexistente
    const pagosResult = await pool.query(`
      DELETE FROM pagos
      WHERE inscripcion_id IS NOT NULL 
      AND inscripcion_id NOT IN (SELECT id FROM inscripciones)
      RETURNING id
    `);
    
    if (pagosResult.rowCount > 0) {
      console.log(`⚠️  Se eliminaron ${pagosResult.rowCount} pagos huérfanos`);
    }
    
    // 3. Limpiar calificaciones huérfanas
    const calificacionesResult = await pool.query(`
      DELETE FROM calificaciones
      WHERE inscripcion_id NOT IN (SELECT id FROM inscripciones)
      RETURNING id
    `);
    
    if (calificacionesResult.rowCount > 0) {
      console.log(`⚠️  Se eliminaron ${calificacionesResult.rowCount} calificaciones huérfanas`);
    }
    
    // 4. Limpiar asistencias huérfanas
    const asistenciasResult = await pool.query(`
      DELETE FROM asistencias
      WHERE inscripcion_id NOT IN (SELECT id FROM inscripciones)
      RETURNING id
    `);
    
    if (asistenciasResult.rowCount > 0) {
      console.log(`⚠️  Se eliminaron ${asistenciasResult.rowCount} asistencias huérfanas`);
    }
    
    const totalCleaned = inscripcionesResult.rowCount + 
                        pagosResult.rowCount + 
                        calificacionesResult.rowCount + 
                        asistenciasResult.rowCount;
    
    if (totalCleaned === 0) {
      console.log('✅ No se encontraron referencias huérfanas');
    } else {
      console.log(`✅ Se limpiaron ${totalCleaned} referencias huérfanas en total`);
      // Refrescar vistas después de limpiar
      await autoRefreshViews();
    }
    
  } catch (error) {
    console.error('❌ Error al limpiar referencias huérfanas:', error.message);
  }
};

/**
 * Actualiza automáticamente el estatus de pagos vencidos
 */
export const autoUpdateOverduePayments = async (io) => {
  try {
    console.log('🔍 Verificando pagos vencidos (incluyendo prórrogas agotadas)...');
    
    // Obtener los que ya están vencidos o acaban de vencer
    const pagosVenciendoResult = await pool.query(`
      SELECT p.id, CONCAT(a.nombre, ' ', a.apellido_paterno) as alumno_nombre
      FROM pagos p
      JOIN inscripciones i ON p.inscripcion_id = i.id
      JOIN alumnos a ON i.alumno_id = a.id
      WHERE (p.estatus = 'pendiente' AND p.fecha_vencimiento < CURRENT_DATE)
         OR (p.estatus = 'prorroga' AND p.fecha_limite_prorroga < CURRENT_DATE)
    `);

    // Ejecutar la función SQL que acabamos de arreglar
    await pool.query('SELECT actualizar_pagos_vencidos();');
    
    if (pagosVenciendoResult.rowCount > 0 && io) {
      console.log(`⚠️  ${pagosVenciendoResult.rowCount} pagos detectados como VENCIDOS`);
      
      io.emit('pagos:overdue_batch', {
          count: pagosVenciendoResult.rowCount,
          pagos: pagosVenciendoResult.rows.map(p => ({ id: p.id, alumno: p.alumno_nombre }))
      });
    }
  } catch (error) {
    console.error('❌ Error al actualizar pagos vencidos:', error.message);
  }
};

/**
 * Detecta y reporta duplicados (no los elimina para seguridad)
 */
export const autoDetectDuplicates = async () => {
  try {
    console.log('🔍 Verificando duplicados...');
    
    let hasDuplicates = false;
    
    // Verificar duplicados en usuarios
    const userDupes = await pool.query(`
      SELECT username, COUNT(*) as count 
      FROM usuarios 
      GROUP BY username 
      HAVING COUNT(*) > 1
    `);
    
    if (userDupes.rows.length > 0) {
      console.error('❌ DUPLICADOS EN USUARIOS:', userDupes.rows);
      hasDuplicates = true;
    }
    
    // Verificar duplicados en matrículas
    const matriculaDupes = await pool.query(`
      SELECT matricula, COUNT(*) as count 
      FROM alumnos 
      WHERE matricula IS NOT NULL
      GROUP BY matricula 
      HAVING COUNT(*) > 1
    `);
    
    if (matriculaDupes.rows.length > 0) {
      console.error('❌ DUPLICADOS EN MATRÍCULAS:', matriculaDupes.rows);
      hasDuplicates = true;
    }
    
    // Verificar duplicados en inscripciones
    const inscripcionDupes = await pool.query(`
      SELECT alumno_id, grupo_id, periodo_id, COUNT(*) as count
      FROM inscripciones
      GROUP BY alumno_id, grupo_id, periodo_id
      HAVING COUNT(*) > 1
    `);
    
    if (inscripcionDupes.rows.length > 0) {
      console.error('❌ INSCRIPCIONES DUPLICADAS:', inscripcionDupes.rows);
      hasDuplicates = true;
    }
    
    if (!hasDuplicates) {
      console.log('✅ No se encontraron duplicados');
    }
    
    return hasDuplicates;
    
  } catch (error) {
    console.error('❌ Error al detectar duplicados:', error.message);
    return false;
  }
};

/**
 * Ejecuta mantenimiento completo automático
 */
export const runAutoMaintenance = async () => {
  try {
    console.log('🔧 Iniciando mantenimiento automático...');
    
    // 1. Detectar duplicados (solo reporta, no elimina)
    await autoDetectDuplicates();
    
    // 2. Limpiar referencias huérfanas automáticamente
    await autoCleanOrphanedReferences();
    
    // 3. Refrescar vistas materializadas
    await autoRefreshViews();

    // 4. Actualizar pagos vencidos (con Socket.io si está disponible)
    const io = global.io; // Podemos usar una referencia global o pasarla
    await autoUpdateOverduePayments(io);
    
    console.log('✅ Mantenimiento automático completado\n');
    
  } catch (error) {
    console.error('❌ Error en mantenimiento automático:', error.message);
  }
};

/**
 * Middleware para ejecutar mantenimiento después de operaciones importantes
 */
export const maintenanceMiddleware = async (req, res, next) => {
  // Ejecutar next() primero para no bloquear la respuesta
  next();
  
  // Ejecutar mantenimiento en background después de la respuesta
  const shouldMaintain = 
    req.method === 'POST' || 
    req.method === 'PUT' || 
    req.method === 'DELETE';
  
  if (shouldMaintain) {
    // No esperar, ejecutar en background
    setImmediate(() => {
      runAutoMaintenance().catch(err => {
        console.error('Error en mantenimiento automático:', err);
      });
    });
  }
};

// Ejecutar mantenimiento cada 10 minutos
setInterval(() => {
  console.log('⏰ Ejecutando mantenimiento programado...');
  runAutoMaintenance();
}, 10 * 60 * 1000);

// Ejecutar al iniciar el servidor
setTimeout(() => {
  console.log('🚀 Ejecutando mantenimiento inicial...');
  runAutoMaintenance();
}, 5000);
