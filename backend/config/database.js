import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Supabase / producción requiere SSL. En desarrollo se puede desactivar.
const isProduction = process.env.NODE_ENV === 'production';

// Si se proporciona DATABASE_URL (formato Supabase), se usa directamente
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: isProduction ? { rejectUnauthorized: false } : false
    };

const pool = new Pool({
  ...poolConfig,
  max: 30, // Aumentado para manejar más conexiones concurrentes
  min: 5, // Mantener mínimo de conexiones listas
  idleTimeoutMillis: 20000, // Reducido para liberar conexiones más rápido
  connectionTimeoutMillis: 5000, // Aumentado para evitar timeouts prematuros
  query_timeout: 10000, // Timeout de 10s para queries largas
  statement_timeout: 15000, // Timeout máximo de statement
  // Configurar zona horaria y encoding para caracteres especiales
  options: '-c timezone=America/Mexico_City -c client_encoding=UTF8'
});

// Test de conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en PostgreSQL:', err);
  process.exit(-1);
});

export default pool;
