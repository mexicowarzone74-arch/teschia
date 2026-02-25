/**
 * Script de inicialización de la base de datos en Supabase
 * Crea el usuario coordinador inicial con contraseña hasheada
 * 
 * Uso: node scripts/init-supabase.js
 * Requiere: DATABASE_URL en .env
 */

import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  console.log('🚀 Iniciando configuración de la base de datos...\n');

  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexión a Supabase exitosa\n');
  } catch (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    console.error('Verifica que DATABASE_URL esté configurado correctamente en .env');
    process.exit(1);
  }

  // Contraseñas por defecto (CAMBIAR después del primer acceso)
  const passwordCoordinador = 'Tescha2026!';
  const passwordAdmin = 'Admin2026!';

  const hashCoordinador = await bcrypt.hash(passwordCoordinador, 10);
  const hashAdmin = await bcrypt.hash(passwordAdmin, 10);

  try {
    // Actualizar el hash del coordinador en usuarios ya creados por schema.sql
    const { rowCount: countCoord } = await pool.query(
      `UPDATE usuarios SET password = $1 WHERE username = 'coordinador'`,
      [hashCoordinador]
    );

    if (countCoord === 0) {
      // Si no existe, insertarlo
      await pool.query(
        `INSERT INTO usuarios (username, password, rol, activo)
         VALUES ('coordinador', $1, 'coordinador', true)
         ON CONFLICT (username) DO UPDATE SET password = $1`,
        [hashCoordinador]
      );
      console.log('✅ Usuario coordinador creado');
    } else {
      console.log('✅ Contraseña del coordinador actualizada');
    }

    const { rowCount: countAdmin } = await pool.query(
      `UPDATE usuarios SET password = $1 WHERE username = 'admin'`,
      [hashAdmin]
    );

    if (countAdmin === 0) {
      await pool.query(
        `INSERT INTO usuarios (username, password, rol, activo)
         VALUES ('admin', $1, 'administrativo', true)
         ON CONFLICT (username) DO UPDATE SET password = $1`,
        [hashAdmin]
      );
      console.log('✅ Usuario admin creado');
    } else {
      console.log('✅ Contraseña del admin actualizada');
    }

    // Verificar tablas principales
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`\n📋 Tablas en la base de datos (${rows.length} total):`);
    rows.forEach(r => console.log(`   - ${r.table_name}`));

    console.log('\n✨ Base de datos inicializada correctamente\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 CREDENCIALES INICIALES (cambia después del primer acceso):');
    console.log(`   Coordinador → usuario: coordinador  |  contraseña: ${passwordCoordinador}`);
    console.log(`   Admin       → usuario: admin        |  contraseña: ${passwordAdmin}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ Error inicializando datos:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
