import pool from './config/database.js';
import crypto from 'crypto';
import { enviarEmailVerificacion } from './services/emailService.js';

console.log('\n🧪 Testing Email Verification System...\n');

async function testEmailVerification() {
  try {
    // 1. Buscar un usuario con email
    console.log('1️⃣  Buscando usuario con email...');
    const userResult = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.email_verificado 
       FROM usuarios u 
       WHERE u.email IS NOT NULL 
       LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      console.log('❌ No se encontró ningún usuario con email');
      process.exit(1);
    }

    const usuario = userResult.rows[0];
    console.log(`✅ Usuario encontrado: ${usuario.nombre} (${usuario.email})`);
    console.log(`   Email verificado: ${usuario.email_verificado ? 'Sí' : 'No'}`);

    // 2. Generar token de verificación
    console.log('\n2️⃣  Generando token de verificación...');
    const token = crypto.randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    console.log(`✅ Token generado: ${token.substring(0, 20)}...`);
    console.log(`   Expira: ${expiraEn.toLocaleString('es-MX')}`);

    // 3. Guardar token en base de datos
    console.log('\n3️⃣  Guardando token en base de datos...');
    await pool.query(
      `INSERT INTO email_verification_tokens (usuario_id, token, email, expira_en)
       VALUES ($1, $2, $3, $4)`,
      [usuario.id, token, usuario.email, expiraEn]
    );
    console.log('✅ Token guardado en la base de datos');

    // 4. Generar URL de verificación
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verificar-email/${token}`;
    console.log('\n4️⃣  URL de verificación generada:');
    console.log(`   ${verifyUrl}`);

    // 5. Enviar email
    console.log('\n5️⃣  Enviando email de verificación...');
    await enviarEmailVerificacion(usuario.email, usuario.nombre, verifyUrl);
    console.log(`✅ Email de verificación enviado a: ${usuario.email}`);

    // 6. Mostrar instrucciones
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL DE VERIFICACIÓN ENVIADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`\nPara: ${usuario.email}`);
    console.log(`Nombre: ${usuario.nombre}`);
    console.log(`\nPasos para probar:`);
    console.log(`1. Revisa el correo en: ${usuario.email}`);
    console.log(`2. Haz clic en el botón "Verificar Email"`);
    console.log(`3. O copia y pega este enlace en tu navegador:`);
    console.log(`   ${verifyUrl}`);
    console.log('\n' + '='.repeat(60));

    // 7. Verificar token en BD
    console.log('\n6️⃣  Verificando token en base de datos...');
    const tokenCheck = await pool.query(
      `SELECT * FROM email_verification_tokens 
       WHERE token = $1`,
      [token]
    );
    console.log(`✅ Token encontrado en BD`);
    console.log(`   Usuario ID: ${tokenCheck.rows[0].usuario_id}`);
    console.log(`   Email: ${tokenCheck.rows[0].email}`);
    console.log(`   Usado: ${tokenCheck.rows[0].usado}`);
    console.log(`   Expira: ${new Date(tokenCheck.rows[0].expira_en).toLocaleString('es-MX')}`);

    console.log('\n✅ Sistema de verificación de email funcionando correctamente\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testEmailVerification();
