import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tescha_db',
    password: '1234',
    port: 5432,
});

async function actualizarTiposPeriodo() {
    const client = await pool.connect();
    
    try {
        console.log('\n🔄 Actualizando tipos de período...\n');
        
        await client.query('BEGIN');
        
        // 1. Eliminar constraint anterior
        console.log('1. Eliminando constraint anterior...');
        await client.query(`
            ALTER TABLE periodos DROP CONSTRAINT IF EXISTS periodos_tipo_check
        `);
        console.log('   ✓ Constraint eliminado\n');
        
        // 2. Agregar nuevo constraint
        console.log('2. Agregando nuevo constraint con 3 tipos...');
        await client.query(`
            ALTER TABLE periodos 
            ADD CONSTRAINT periodos_tipo_check 
            CHECK (tipo IN ('escolarizado', 'semestral', 'intensivo'))
        `);
        console.log('   ✓ Constraint agregado\n');
        
        // 3. Verificar
        const verificacion = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'periodos'::regclass 
            AND conname = 'periodos_tipo_check'
        `);
        
        console.log('📊 Verificación:');
        console.log(`   Constraint: ${verificacion.rows[0].conname}`);
        console.log(`   Definición: ${verificacion.rows[0].definition}\n`);
        
        await client.query('COMMIT');
        
        console.log('✅ Tipos de período actualizados correctamente\n');
        console.log('Tipos permitidos:');
        console.log('   - escolarizado');
        console.log('   - semestral');
        console.log('   - intensivo\n');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

actualizarTiposPeriodo().catch(console.error);
