import pool from './config/database.js';
import { enviarEmailRecuperacion } from './services/emailService.js';
import crypto from 'crypto';

async function probarEmail() {
  try {
    console.log('\n🧪 PRUEBA DE EMAIL DE RECUPERACIÓN\n');
    
    // Buscar un usuario de prueba
    const result = await pool.query(
      'SELECT id, username, nombre, apellido_paterno, email FROM usuarios WHERE email IS NOT NULL LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No hay usuarios con email registrado');
      console.log('💡 Agrega un email a un usuario en la base de datos primero:');
      console.log('   UPDATE usuarios SET email = \'tu-email@gmail.com\' WHERE username = \'admin\';');
      process.exit(1);
    }
    
    const usuario = result.rows[0];
    console.log(`Usuario encontrado: ${usuario.username}`);
    console.log(`Email: ${usuario.email}`);
    console.log(`Nombre: ${usuario.nombre || 'Sin nombre'}\n`);
    
    // Generar token de prueba
    const token = crypto.randomBytes(32).toString('hex');
    const expiracion = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    
    // Guardar token en BD
    await pool.query(
      `INSERT INTO password_reset_tokens (usuario_id, token, expira_en) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (usuario_id) 
       DO UPDATE SET token = $2, expira_en = $3, usado = false`,
      [usuario.id, token, expiracion]
    );
    
    console.log('✅ Token generado y guardado\n');
    
    // Construir URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://coordinacion-tescha.local'}/restablecer-contrasena/${token}`;
    
    console.log('📧 Enviando email...\n');
    
    // Enviar email
    const result2 = await enviarEmailRecuperacion(
      usuario.email,
      usuario.nombre || usuario.username,
      resetUrl
    );
    
    if (result2.mode === 'development') {
      console.log('\n⚠️  MODO DESARROLLO (SMTP no configurado)');
      console.log('El email NO se envió realmente.');
      console.log('Configuración requerida en .env:');
      console.log('  SMTP_HOST=smtp.gmail.com');
      console.log('  SMTP_PORT=587');
      console.log('  SMTP_USER=tu-email@gmail.com');
      console.log('  SMTP_PASS=tu-app-password\n');
    } else {
      console.log('\n✅ Email enviado exitosamente!');
      console.log('Revisa la bandeja de entrada de:', usuario.email, '\n');
    }
    
    console.log('🔗 URL de prueba:', resetUrl, '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

probarEmail();
