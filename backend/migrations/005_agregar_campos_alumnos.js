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

async function agregarCamposAlumnos() {
    const client = await pool.connect();
    
    try {
        console.log('\n🔄 Agregando campos a tabla alumnos...\n');
        
        // Leer el archivo SQL
        const sql = fs.readFileSync('./backend/database/migrations/005_agregar_campos_alumnos.sql', 'utf8');
        
        // Ejecutar la migración
        await client.query(sql);
        
        console.log('✅ Migración ejecutada exitosamente\n');
        
        // Verificar los cambios
        const verificacion = await client.query(`
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'alumnos' 
            AND column_name IN ('edad', 'genero', 'turno', 'matricula')
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Columnas actualizadas:\n');
        verificacion.rows.forEach(row => {
            console.log(`   ${row.column_name}:`);
            console.log(`      Tipo: ${row.data_type}`);
            console.log(`      Nullable: ${row.is_nullable}`);
            console.log(`      Default: ${row.column_default || 'N/A'}\n`);
        });
        
        // Verificar constraints
        const constraints = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'alumnos'::regclass 
            AND conname LIKE '%edad%' OR conname LIKE '%genero%' OR conname LIKE '%turno%' OR conname LIKE '%matricula%'
        `);
        
        console.log('🔒 Constraints aplicados:\n');
        constraints.rows.forEach(row => {
            console.log(`   ${row.conname}:`);
            console.log(`      ${row.definition}\n`);
        });
        
        console.log('✅ Campos agregados correctamente:\n');
        console.log('   ✓ edad (INTEGER, 15-100 años)');
        console.log('   ✓ genero (masculino, femenino, otro, prefiero_no_decir)');
        console.log('   ✓ turno (matutino, vespertino, nocturno, mixto)');
        console.log('   ✓ matricula ahora es OPCIONAL para externos\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Detalle:', error.stack);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

agregarCamposAlumnos().catch(console.error);
