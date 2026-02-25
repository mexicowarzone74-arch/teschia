import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tescha_db',
    password: '1234',
    port: 5432,
});

async function ejecutarMigracion() {
    const client = await pool.connect();
    
    try {
        console.log('\n🔄 Ejecutando migración: Agregar columnas de prórroga...\n');
        
        await client.query('BEGIN');
        
        // 1. Agregar columna tiene_prorroga
        console.log('1. Agregando columna tiene_prorroga...');
        await client.query(`
            ALTER TABLE pagos 
            ADD COLUMN IF NOT EXISTS tiene_prorroga BOOLEAN DEFAULT false
        `);
        console.log('   ✓ Columna tiene_prorroga agregada\n');
        
        // 2. Agregar columna fecha_limite_prorroga
        console.log('2. Agregando columna fecha_limite_prorroga...');
        await client.query(`
            ALTER TABLE pagos 
            ADD COLUMN IF NOT EXISTS fecha_limite_prorroga DATE
        `);
        console.log('   ✓ Columna fecha_limite_prorroga agregada\n');
        
        // 3. Crear índice
        console.log('3. Creando índice...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_pagos_prorroga 
            ON pagos(tiene_prorroga, fecha_limite_prorroga) 
            WHERE tiene_prorroga = true
        `);
        console.log('   ✓ Índice creado\n');
        
        // 4. Actualizar pagos existentes con prórrogas
        console.log('4. Actualizando pagos existentes con prórrogas...');
        const result = await client.query(`
            UPDATE pagos p
            SET 
                tiene_prorroga = true,
                fecha_limite_prorroga = pr.fecha_limite_nueva
            FROM prorrogas pr
            WHERE p.id = pr.pago_id
                AND pr.estatus = 'aprobada'
            RETURNING p.id
        `);
        console.log(`   ✓ ${result.rowCount} pagos actualizados con prórroga\n`);
        
        // Verificar
        const verificacion = await client.query(`
            SELECT 
                COUNT(*) FILTER (WHERE tiene_prorroga = true) as con_prorroga,
                COUNT(*) FILTER (WHERE tiene_prorroga = false) as sin_prorroga,
                COUNT(*) as total
            FROM pagos
        `);
        
        console.log('📊 Verificación:');
        console.log(`   Total pagos: ${verificacion.rows[0].total}`);
        console.log(`   Con prórroga: ${verificacion.rows[0].con_prorroga}`);
        console.log(`   Sin prórroga: ${verificacion.rows[0].sin_prorroga}\n`);
        
        await client.query('COMMIT');
        
        console.log('✅ Migración completada exitosamente\n');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error en la migración:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

ejecutarMigracion().catch(console.error);
