/**
 * Script de migración: Actualizar estatus y método de pago
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'tescha_db',
    password: process.env.DB_PASSWORD || '1234',
    port: process.env.DB_PORT || 5432,
});

async function ejecutarMigracion() {
    const client = await pool.connect();
    
    try {
        console.log('\n🔄 Iniciando migración de pagos...\n');
        
        await client.query('BEGIN');
        
        // 1. Actualizar pagos cancelados
        console.log('1. Actualizando pagos con estatus "cancelado"...');
        const result1 = await client.query(`
            UPDATE pagos 
            SET estatus = 'pendiente' 
            WHERE estatus = 'cancelado'
            RETURNING id
        `);
        console.log(`   ✓ ${result1.rowCount} pagos actualizados\n`);
        
        // 2. Eliminar constraint anterior de estatus
        console.log('2. Eliminando constraint anterior de estatus...');
        await client.query(`
            ALTER TABLE pagos 
            DROP CONSTRAINT IF EXISTS pagos_estatus_check
        `);
        console.log('   ✓ Constraint eliminado\n');
        
        // 3. Agregar nuevo constraint de estatus
        console.log('3. Agregando nuevo constraint de estatus (sin "cancelado")...');
        await client.query(`
            ALTER TABLE pagos 
            ADD CONSTRAINT pagos_estatus_check 
            CHECK (estatus IN ('pendiente', 'pagado', 'prorroga'))
        `);
        console.log('   ✓ Constraint agregado\n');
        
        // 4. Eliminar constraint de metodo_pago
        console.log('4. Eliminando constraint de metodo_pago...');
        await client.query(`
            ALTER TABLE pagos 
            DROP CONSTRAINT IF EXISTS pagos_metodo_pago_check
        `);
        console.log('   ✓ Constraint eliminado\n');
        
        // 5. Actualizar métodos de pago
        console.log('5. Actualizando métodos de pago a "FORMATO UNIVERSAL"...');
        const result5 = await client.query(`
            UPDATE pagos 
            SET metodo_pago = 'FORMATO UNIVERSAL' 
            WHERE metodo_pago IS NOT NULL OR metodo_pago IS NULL
            RETURNING id
        `);
        console.log(`   ✓ ${result5.rowCount} pagos actualizados\n`);
        
        // 6. Establecer default
        console.log('6. Estableciendo default para metodo_pago...');
        await client.query(`
            ALTER TABLE pagos 
            ALTER COLUMN metodo_pago SET DEFAULT 'FORMATO UNIVERSAL'
        `);
        console.log('   ✓ Default establecido\n');
        
        // Verificar cambios
        console.log('📊 Verificando cambios...\n');
        
        const estatusResult = await client.query(`
            SELECT estatus, COUNT(*) as cantidad
            FROM pagos
            GROUP BY estatus
            ORDER BY estatus
        `);
        
        console.log('Estatus de pagos:');
        estatusResult.rows.forEach(row => {
            console.log(`   - ${row.estatus}: ${row.cantidad}`);
        });
        
        const metodoResult = await client.query(`
            SELECT metodo_pago, COUNT(*) as cantidad
            FROM pagos
            GROUP BY metodo_pago
            ORDER BY metodo_pago
        `);
        
        console.log('\nMétodos de pago:');
        metodoResult.rows.forEach(row => {
            console.log(`   - ${row.metodo_pago || 'NULL'}: ${row.cantidad}`);
        });
        
        await client.query('COMMIT');
        
        console.log('\n✅ Migración completada exitosamente\n');
        
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
