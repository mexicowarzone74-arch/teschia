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
  max: 10,                        // Supabase free tier: máx 20 conexiones directas, dejamos margen
  min: 0,                         // No mantener conexiones idle (Render free duerme y las mata)
  idleTimeoutMillis: 10000,       // Cerrar conexiones idle tras 10s
  connectionTimeoutMillis: 10000, // 10s para conectar antes de fallar
  query_timeout: 15000,
  statement_timeout: 20000,
  keepAlive: true,                // Keepalive para detectar conexiones muertas
  keepAliveInitialDelayMillis: 5000,
  options: '-c timezone=UTC -c client_encoding=UTF8' // UTC siempre: Node.js Date es UTC, Supabase es UTC
});

// Test de conexión
pool.on('connect', async (client) => {
  console.log('✅ Conectado a PostgreSQL');
  // Verificar timezone de la sesión para diagnóstico
  try {
    const tz = await client.query('SHOW timezone');
    const now = await client.query('SELECT NOW() as now_db');
    console.log(`🕐 DB session timezone: ${tz.rows[0].timezone} | NOW(): ${now.rows[0].now_db}`);
  } catch (_) {}
});

pool.on('error', (err) => {
  // NO hacer process.exit — solo loguear. El pool recupera conexiones automáticamente.
  console.error('⚠️ Error en cliente PostgreSQL (el pool se recuperará):', err.message);
});

export default pool;
