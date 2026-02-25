import pool from '../config/database.js';

const optimizeDatabase = async () => {
    console.log('🚀 Iniciando optimización de base de datos...');
    const client = await pool.connect();
    
    // Lista de índices optimizados para la estructura real
    const queries = [
        { name: 'alumnos_matricula', sql: 'CREATE INDEX IF NOT EXISTS idx_alumnos_matricula ON alumnos(matricula)' },
        { name: 'alumnos_apellido', sql: 'CREATE INDEX IF NOT EXISTS idx_alumnos_apellido ON alumnos(apellido_paterno, apellido_materno)' },
        { name: 'inscripciones_grupo_alumno', sql: 'CREATE INDEX IF NOT EXISTS idx_inscripciones_grupo_alumno ON inscripciones(grupo_id, alumno_id)' },
        { name: 'inscripciones_periodo', sql: 'CREATE INDEX IF NOT EXISTS idx_inscripciones_periodo ON inscripciones(periodo_id)' },
        { name: 'calificaciones_inscripcion', sql: 'CREATE INDEX IF NOT EXISTS idx_calificaciones_inscripcion ON calificaciones(inscripcion_id)' },
        { name: 'calificaciones_grupo_parcial', sql: 'CREATE INDEX IF NOT EXISTS idx_calificaciones_grupo_parcial ON calificaciones(grupo_id, parcial)' },
        { name: 'asistencias_inscripcion_fecha', sql: 'CREATE INDEX IF NOT EXISTS idx_asistencias_inscripcion_fecha ON asistencias(inscripcion_id, fecha)' },
        { name: 'pagos_inscripcion', sql: 'CREATE INDEX IF NOT EXISTS idx_pagos_inscripcion ON pagos(inscripcion_id)' },
        { name: 'pagos_fecha', sql: 'CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago)' },
        { name: 'grupos_maestro', sql: 'CREATE INDEX IF NOT EXISTS idx_grupos_maestro ON grupos(maestro_id)' },
        { name: 'grupos_periodo', sql: 'CREATE INDEX IF NOT EXISTS idx_grupos_periodo ON grupos(periodo_id)' }
    ];

    for (const q of queries) {
        try {
            process.stdout.write(`⏳ Creando índice: ${q.name}... `);
            await client.query(q.sql);
            console.log(`✅ OK.`);
        } catch (err) {
            console.log(`❌ ERROR: ${err.message}`);
        }
    }
    
    client.release();
    console.log('🏁 Proceso de optimización finalizado.');
};

optimizeDatabase().then(() => process.exit());
