module.exports = {
    apps: [
        {
            name: 'tescha-backend',
            script: './server.js',
            instances: 1, // ⚠️ IMPORTANTE: Mantener en 1 para evitar duplicación de cron
            exec_mode: 'fork', // 🔧 Cambiar a 'fork' para cron jobs (cluster puede duplicar notificaciones)
            watch: false,
            max_memory_restart: '500M',
            env_file: './.env', // 🔧 IMPORTANTE: Cargar variables de entorno
            env: {
                NODE_ENV: 'production',
                TZ: 'America/Mexico_City' // ⏰ Zona horaria Ciudad de México
            },
            env_development: {
                NODE_ENV: 'development',
                TZ: 'America/Mexico_City'
            },
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            restart_delay: 4000,
            kill_timeout: 5000,
            listen_timeout: 3000,
            shutdown_with_message: true
        },
        {
            name: 'tescha-recordatorios',
            script: './scripts/enviar_recordatorios_automaticos.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: false, // No reiniciar automáticamente
            cron_restart: '0 9 * * *', // 🔔 Ejecutar TODOS LOS DÍAS a las 9:00 AM (Hora de Ciudad de México)
            env_file: './.env',
            env: {
                NODE_ENV: 'production',
                TZ: 'America/Mexico_City' // ⏰ Zona horaria Ciudad de México
            },
            error_file: './logs/recordatorios-error.log',
            out_file: './logs/recordatorios-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        },
        {
            name: 'tescha-ai-engine',
            script: './ai_engine/main.py',
            interpreter: 'python',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            env_file: './.env',
            env: {
                AI_PORT: 5050
            },
            error_file: './logs/ai-error.log',
            out_file: './logs/ai-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        }
    ]
};
