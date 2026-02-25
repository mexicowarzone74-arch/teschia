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
    // Actualizar contraseñas de usuarios creados por schema.sql (tienen hash placeholder)
    // ON CONFLICT maneja tanto el caso de que existan como que no
    await pool.query(
      `INSERT INTO usuarios (username, password, rol, activo, debe_cambiar_password)
       VALUES ('coordinador', $1, 'coordinador', true, false)
       ON CONFLICT (username) DO UPDATE SET password = $1, debe_cambiar_password = false`,
      [hashCoordinador]
    );
    console.log('✅ Usuario coordinador listo');

    await pool.query(
      `INSERT INTO usuarios (username, password, rol, activo, debe_cambiar_password)
       VALUES ('admin', $1, 'administrativo', true, false)
       ON CONFLICT (username) DO UPDATE SET password = $1, debe_cambiar_password = false`,
      [hashAdmin]
    );
    console.log('✅ Usuario admin listo');
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
