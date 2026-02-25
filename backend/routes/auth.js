import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database.js';
import { authenticator } from 'otplib';
import logger from '../utils/logger.js';
import { auth } from '../middleware/auth.js';
import { validate, loginSchema, changePasswordSchema } from '../middleware/validation.js';
import { trackLoginAttempts, recordFailedLogin, clearLoginAttempts } from '../middleware/security.js';
import { enviarEmailRecuperacion, enviarEmailVerificacion } from '../services/emailService.js';

const router = express.Router();

// 🔒 SEGURIDAD: Delay constante para prevenir timing attacks (300ms mínimo)
const constantTimeDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const MIN_RESPONSE_TIME = 300; // 300ms para todos los casos

// Login con validación y protección contra fuerza bruta
router.post('/login', validate(loginSchema), trackLoginAttempts, async (req, res) => {
  const startTime = Date.now();

  try {
    logger.info('Login attempt', { username: req.body.username, ip: req.ip });
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE username = $1 AND activo = true',
      [username]
    );

    if (result.rows.length === 0) {
      // Registrar intento fallido
      await recordFailedLogin(username, req.ip);
      // Delay constante antes de responder
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_RESPONSE_TIME) await constantTimeDelay(MIN_RESPONSE_TIME - elapsed);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = result.rows[0];
    
    const isValidPassword = await bcrypt.compare(password, usuario.password);

    if (!isValidPassword) {
      // Registrar intento fallido
      await recordFailedLogin(username, req.ip);
      // Delay constante antes de responder
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_RESPONSE_TIME) await constantTimeDelay(MIN_RESPONSE_TIME - elapsed);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Login exitoso - limpiar intentos fallidos
    await clearLoginAttempts(username, req.ip);
    logger.info('Login successful', { username, rol: usuario.rol });

    // Bloquear login si email no verificado (solo maestros y administrativos)
    if (usuario.rol !== 'coordinador' && !usuario.email_verificado) {
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_RESPONSE_TIME) await constantTimeDelay(MIN_RESPONSE_TIME - elapsed);
      return res.status(403).json({
        error: 'Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.',
        email_no_verificado: true
      });
    }

    // VERIFICAR 2FA
    const tfaResult = await pool.query(
      'SELECT enabled FROM two_factor_auth WHERE usuario_id = $1',
      [usuario.id]
    );

    if (tfaResult.rows.length > 0 && tfaResult.rows[0].enabled) {
      // 2FA está activo, no devolver token aún
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_RESPONSE_TIME) await constantTimeDelay(MIN_RESPONSE_TIME - elapsed);
      
      return res.json({
        require2FA: true,
        userId: usuario.id,
        username: usuario.username
      });
    }

    // Obtener información adicional según el rol
    let maestroId = null;
    let nombreCompleto = usuario.username; // Por defecto usar username
    
    // Si es maestro o administrativo, obtener maestro_id
    if (usuario.rol === 'maestro' || usuario.rol === 'administrativo') {
      const maestroResult = await pool.query(
        'SELECT id, nombre, apellido_paterno, apellido_materno FROM maestros WHERE usuario_id = $1',
        [usuario.id]
      );
      if (maestroResult.rows.length > 0) {
        const maestro = maestroResult.rows[0];
        maestroId = maestro.id;
        nombreCompleto = `${maestro.nombre} ${maestro.apellido_paterno}`.trim();
      }
    }
    
    // Si no se obtuvo nombre de maestros, usar de usuarios
    if (!maestroId && usuario.nombre && usuario.apellido_paterno) {
      nombreCompleto = `${usuario.nombre} ${usuario.apellido_paterno}`.trim();
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_c901b258b934f85c38a8671b61cffb6ff15d009';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    
    const token = jwt.sign(
      {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        maestro_id: maestroId,
        nombre_completo: nombreCompleto
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Delay constante antes de responder (timing attack prevention)
    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_RESPONSE_TIME) await constantTimeDelay(MIN_RESPONSE_TIME - elapsed);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        maestro_id: maestroId,
        nombre_completo: nombreCompleto
      },
      debe_cambiar_password: usuario.debe_cambiar_password || false
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Segundo paso del login: Verificar código 2FA
router.post('/login/2fa', async (req, res) => {
  const startTime = Date.now();
  try {
    const { userId, token: tfaToken } = req.body;

    if (!userId || !tfaToken) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const tfaResult = await pool.query(
      'SELECT secret FROM two_factor_auth WHERE usuario_id = $1 AND enabled = true',
      [userId]
    );

    if (tfaResult.rows.length === 0) {
      return res.status(400).json({ error: '2FA no está configurado para este usuario' });
    }

    const { secret } = tfaResult.rows[0];
    const isValid = authenticator.verify({ token: tfaToken, secret });

    if (!isValid) {
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_RESPONSE_TIME) await constantTimeDelay(MIN_RESPONSE_TIME - elapsed);
      return res.status(401).json({ error: 'Código 2FA incorrecto' });
    }

    // Obtener datos del usuario para el token
    const userResult = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1',
      [userId]
    );
    const usuario = userResult.rows[0];

    // Obtener información adicional (copiado del login normal)
    let maestroId = null;
    let nombreCompleto = usuario.username;
    
    if (usuario.rol === 'maestro' || usuario.rol === 'administrativo') {
      const maestroResult = await pool.query(
        'SELECT id, nombre, apellido_paterno, apellido_materno FROM maestros WHERE usuario_id = $1',
        [usuario.id]
      );
      if (maestroResult.rows.length > 0) {
        const maestro = maestroResult.rows[0];
        maestroId = maestro.id;
        nombreCompleto = `${maestro.nombre} ${maestro.apellido_paterno}`.trim();
      }
    }
    
    if (!maestroId && usuario.nombre && usuario.apellido_paterno) {
      nombreCompleto = `${usuario.nombre} ${usuario.apellido_paterno}`.trim();
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_c901b258b934f85c38a8671b61cffb6ff15d009';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    
    const token = jwt.sign(
      {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        maestro_id: maestroId,
        nombre_completo: nombreCompleto,
        is2FAVerified: true
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_RESPONSE_TIME) await constantTimeDelay(MIN_RESPONSE_TIME - elapsed);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        maestro_id: maestroId,
        nombre_completo: nombreCompleto
      }
    });
  } catch (error) {
    logger.error('2FA completion error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Registro de usuario
router.post('/register', auth, async (req, res) => {
  try {
    const { username, password, rol } = req.body;

    // Solo coordinadores pueden crear usuarios
    if (req.user.rol !== 'coordinador') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // 🔒 VALIDACIÓN DE SEGURIDAD: Username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username es requerido' });
    }

    // Solo alfanuméricos, guiones, guiones bajos y puntos (3-30 caracteres)
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
      return res.status(400).json({
        error: 'Username inválido. Solo letras, números, puntos, guiones y guiones bajos (3-30 caracteres)'
      });
    }

    // Prevenir usernames reservados o peligrosos
    const reservedUsernames = ['admin', 'root', 'system', 'administrator', 'superuser', 'sa', 'postgres'];
    if (reservedUsernames.includes(username.toLowerCase())) {
      return res.status(400).json({ error: 'Username no permitido' });
    }

    // 🔒 VALIDACIÓN DE SEGURIDAD: Password
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password debe tener al menos 6 caracteres' });
    }

    // 🔒 VALIDACIÓN DE SEGURIDAD: Rol
    const rolesPermitidos = ['coordinador', 'maestro', 'administrativo', 'alumno'];
    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO usuarios (username, password, rol) VALUES ($1, $2, $3) RETURNING id, username, rol',
      [username, hashedPassword, rol]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Obtener perfil del usuario autenticado
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, rol, activo FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cambiar contraseña
router.put('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validar contraseña segura
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'La contraseña debe contener al menos una mayúscula' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: 'La contraseña debe contener al menos una minúscula' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'La contraseña debe contener al menos un número' });
    }
    if (!/[!@#$%&*\-_+=]/.test(newPassword)) {
      return res.status(400).json({ error: 'La contraseña debe contener al menos un carácter especial (!@#$%&*-_+=)' });
    }

    const result = await pool.query(
      'SELECT password FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    const isValid = await bcrypt.compare(oldPassword, result.rows[0].password);
    if (!isValid) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE usuarios SET password = $1, debe_cambiar_password = false WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /api/auth/perfil - Obtener datos del perfil
// =============================================
router.get('/perfil', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nombre, apellido_paterno, apellido_materno FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// PUT /api/auth/perfil - Actualizar datos del perfil
// =============================================
router.put('/perfil', auth, async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno } = req.body;

    if (!nombre || !apellido_paterno) {
      return res.status(400).json({ error: 'Nombre y apellido paterno son obligatorios' });
    }

    // Actualizar en tabla usuarios
    await pool.query(
      'UPDATE usuarios SET nombre = $1, apellido_paterno = $2, apellido_materno = $3 WHERE id = $4',
      [nombre, apellido_paterno, apellido_materno || null, req.user.id]
    );

    res.json({ message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// POST /api/auth/solicitar-recuperacion - Solicitar recuperación de contraseña
// =============================================
router.post('/solicitar-recuperacion', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'El email es obligatorio' });
    }

    // Buscar usuario por email
    const result = await pool.query(
      'SELECT id, username, nombre, apellido_paterno, email FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    );

    // Por seguridad, siempre responder éxito (no revelar si el email existe)
    if (result.rows.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' 
      });
    }

    const usuario = result.rows[0];

    // Generar token único de recuperación (válido por 1 hora)
    const token = crypto.randomBytes(32).toString('hex');
    const expiracion = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token en la base de datos
    await pool.query(
      `INSERT INTO password_reset_tokens (usuario_id, token, expira_en) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (usuario_id) 
       DO UPDATE SET token = $2, expira_en = $3, usado = false`,
      [usuario.id, token, expiracion]
    );

    // Construir URL de recuperación
    const resetUrl = `${process.env.FRONTEND_URL || 'https://teschia.pages.dev'}/restablecer-contrasena/${token}`;

    // Responder inmediatamente — email se manda en background
    res.json({ 
      success: true, 
      message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña' 
    });

    // Enviar email sin bloquear
    setImmediate(async () => {
      try {
        await enviarEmailRecuperacion(email, usuario.nombre || usuario.username, resetUrl);
        logger.info('Password recovery email sent', { email, userId: usuario.id });
      } catch (emailError) {
        logger.error('Error enviando email de recuperación', { message: emailError.message, code: emailError.code, response: emailError.response });
      }
    });
  } catch (error) {
    logger.error('Error in password recovery', { error: error.message });
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// =============================================
// POST /api/auth/restablecer-contrasena - Restablecer contraseña con token
// =============================================
router.post('/restablecer-contrasena', async (req, res) => {
  try {
    const { token, nuevaPassword } = req.body;

    if (!token || !nuevaPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios' });
    }

    if (nuevaPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // Verificar token
    const result = await pool.query(
      `SELECT usuario_id FROM password_reset_tokens 
       WHERE token = $1 AND expira_en > NOW() AND usado = false`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const usuarioId = result.rows[0].usuario_id;

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    // Actualizar contraseña
    await pool.query(
      'UPDATE usuarios SET password = $1, debe_cambiar_password = false WHERE id = $2',
      [hashedPassword, usuarioId]
    );

    // Marcar token como usado
    await pool.query(
      'UPDATE password_reset_tokens SET usado = true WHERE token = $1',
      [token]
    );

    logger.info('Password reset successful', { userId: usuarioId });

    res.json({ 
      success: true, 
      message: 'Contraseña restablecida exitosamente' 
    });
  } catch (error) {
    logger.error('Error in password reset', { error: error.message });
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

// =============================================
// POST /api/auth/solicitar-verificacion-email - Enviar email de verificación
// =============================================
router.post('/solicitar-verificacion-email', async (req, res) => {
  try {
    const { usuarioId } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ error: 'Usuario ID es requerido' });
    }

    // Obtener datos del usuario
    const userResult = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE id = $1',
      [usuarioId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = userResult.rows[0];

    if (!usuario.email) {
      return res.status(400).json({ error: 'El usuario no tiene email registrado' });
    }

    // Generar token de verificación
    const token = crypto.randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Guardar token en BD
    await pool.query(
      `INSERT INTO email_verification_tokens (usuario_id, token, email, expira_en)
       VALUES ($1, $2, $3, $4)`,
      [usuario.id, token, usuario.email, expiraEn]
    );

    // Enviar email
    const verifyUrl = `${process.env.FRONTEND_URL || 'https://teschia.pages.dev'}/verificar-email/${token}`;

    // Responder inmediatamente — email se manda en background
    res.json({
      success: true,
      message: 'Correo de verificación enviado'
    });

    setImmediate(async () => {
      try {
        await enviarEmailVerificacion(usuario.email, usuario.nombre, verifyUrl);
        logger.info('Email verification sent', { userId: usuario.id, email: usuario.email });
      } catch (emailError) {
        logger.error('Error enviando email de verificación', { message: emailError.message, code: emailError.code, response: emailError.response });
      }
    });
  } catch (error) {
    logger.error('Error sending verification email', { error: error.message });
    res.status(500).json({ error: 'Error al enviar el correo de verificación' });
  }
});

// =============================================
// POST /api/auth/verificar-email - Verificar email con token
// =============================================
router.post('/verificar-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token es requerido' });
    }

    // Verificar token
    const tokenResult = await pool.query(
      `SELECT usuario_id, email FROM email_verification_tokens 
       WHERE token = $1 AND expira_en > NOW() AND usado = false`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const { usuario_id, email } = tokenResult.rows[0];

    // Actualizar usuario como verificado
    await pool.query(
      `UPDATE usuarios 
       SET email_verificado = true, email_verificado_en = NOW() 
       WHERE id = $1`,
      [usuario_id]
    );

    // Marcar token como usado
    await pool.query(
      'UPDATE email_verification_tokens SET usado = true WHERE token = $1',
      [token]
    );

    logger.info('Email verified successfully', { userId: usuario_id, email });

    res.json({
      success: true,
      message: 'Email verificado exitosamente'
    });
  } catch (error) {
    logger.error('Error verifying email', { error: error.message });
    res.status(500).json({ error: 'Error al verificar el email' });
  }
});

export default router;
