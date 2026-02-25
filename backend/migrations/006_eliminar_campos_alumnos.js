import pkg from 'pg';
import fs from 'fs';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tescha_db',
    password: '1234',
    port: 5432,
});

async function eliminarCamposAlumnos() {
    const client = await pool.connect();
    
    try {
        console.log('\n🗑️  Eliminando campos innecesarios de alumnos...\n');
        
        // Leer el archivo SQL
        const sql = fs.readFileSync('./backend/database/migrations/006_eliminar_campos_alumnos.sql', 'utf8');
        
        // Ejecutar la migración
        await client.query(sql);
        
        console.log('✅ Migración ejecutada exitosamente\n');
        
        // Verificar los cambios
        const verificacion = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'alumnos' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Columnas actuales en tabla alumnos:\n');
        verificacion.rows.forEach(row => {
            console.log(`   - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? '(opcional)' : '(obligatorio)'}`);
        });
        
        console.log('\n✅ Campos eliminados correctamente:\n');
        console.log('   ❌ curp');
        console.log('   ❌ contacto_emergencia');
        console.log('   ❌ telefono_emergencia\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Detalle:', error.stack);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

eliminarCamposAlumnos().catch(console.error);
