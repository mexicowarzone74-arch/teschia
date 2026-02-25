import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import logger from '../utils/logger.js';
import generator from 'generate-password';
import { enviarEmailVerificacion } from '../services/emailService.js';

const router = express.Router();

// =============================================
// Función para generar username único y profesional
// =============================================
async function generarUsername(nombre, apellidoPaterno, apellidoMaterno = '', client) {
  const clean = (str) => (str || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  
  const nombres = (nombre || '').split(' ').filter(n => n.length > 0);
  const n1 = clean(nombres[0]);
  const n2 = nombres.length > 1 ? clean(nombres[1]) : '';
  const ap = clean(apellidoPaterno);
  const am = clean(apellidoMaterno);
  
  const i1 = n1.charAt(0);
  
  // Intento 1: i.apellido (ej: a.lozada)
  let username = `${i1}.${ap}`;
  let existe = await client.query('SELECT id FROM usuarios WHERE username = $1', [username]);
  if (existe.rows.length === 0) return username;

  // Intento 2: i1.i2.apellido (ej: j.a.lozada para Juan Alberto)
  if (n2) {
    const i2 = n2.charAt(0);
    username = `${i1}.${i2}.${ap}`;
    existe = await client.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existe.rows.length === 0) return username;
  }

  // Intento 3: i.apellido.m (ej: a.lozada.s)
  if (am) {
    const inicialM = am.charAt(0);
    username = `${i1}.${ap}.${inicialM}`;
    existe = await client.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existe.rows.length === 0) return username;
  }

  // Intento 4: nombre.apellido (ej: ana.lozada)
  username = `${n1}.${ap}`;
  existe = await client.query('SELECT id FROM usuarios WHERE username = $1', [username]);
  if (existe.rows.length === 0) return username;

  // Intento final: Agregar número incremental
  let contador = 1;
  while (true) {
    username = `${i1}.${ap}${contador}`;
    existe = await client.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existe.rows.length === 0) return username;
    contador++;
  }
}

// =============================================
// Función para generar contraseña segura pero legible (Min 10 caracteres, mix real)
// =============================================
function generarPasswordSegura() {
  const base = generator.generate({
    length: 10,
    numbers: true,
    uppercase: true,
    lowercase: true,
    strict: true
  });
  
  const symbols = ['!', '#', '$', '*', '-', '_'];
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  return base + randomSymbol;
}

// =============================================
// Función para validar contraseña segura
// =============================================
function validarPasswordSegura(password) {
  if (password.length < 8) {
    return { valida: false, error: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valida: false, error: 'La contraseña debe contener al menos una mayúscula' };
  }
  if (!/[a-z]/.test(password)) {
    return { valida: false, error: 'La contraseña debe contener al menos una minúscula' };
  }
  if (!/[0-9]/.test(password)) {
    return { valida: false, error: 'La contraseña debe contener al menos un número' };
  }
  if (!/[!@#$%&*\-_+=]/.test(password)) {
    return { valida: false, error: 'La contraseña debe contener al menos un carácter especial (!@#$%&*-_+=)' };
  }
  return { valida: true };
}

// =============================================
// GET /api/maestros - Obtener todos los maestros
// =============================================
router.get('/', auth, checkRole('coordinador', 'administrativo'), async (req, res) => {
  try {
    const { search, activo } = req.query;

    // Incluir el rol del usuario en la consulta
    let query = `
      SELECT *
      FROM maestros_completo m
      WHERE rol_usuario != 'coordinador'
    `;
    const params = [];
    let paramCount = 1;

    if (activo !== undefined) {
      query += ` AND m.activo = $${paramCount++}`;
      params.push(activo === 'true');
    }

    if (search) {
      query += ` AND (m.nombre_completo ILIKE $${paramCount} OR m.correo ILIKE $${paramCount} OR m.telefono ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY m.nombre, m.apellido_paterno';

    const result = await pool.query(query, params);

    // Obtener niveles de cada maestro
    for (const maestro of result.rows) {
      const niveles = await pool.query(
        `SELECT n.id, n.codigo, n.nombre 
         FROM maestros_niveles mn
         JOIN niveles n ON mn.nivel_id = n.id
         WHERE mn.maestro_id = $1 AND mn.activo = true
         ORDER BY n.orden`,
        [maestro.id]
      );
      // Devolver solo los nombres de los niveles como strings
      maestro.niveles = niveles.rows.map(n => n.nombre);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener maestros:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /api/maestros/:id - Obtener maestro por ID
// =============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM maestros_completo WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maestro no encontrado' });
    }

    // Obtener niveles del maestro
    const niveles = await pool.query(
      `SELECT n.id, n.codigo, n.nombre 
       FROM maestros_niveles mn
       JOIN niveles n ON mn.nivel_id = n.id
       WHERE mn.maestro_id = $1 AND mn.activo = true
       ORDER BY n.orden`,
      [req.params.id]
    );

    const maestro = result.rows[0];
    maestro.niveles = niveles.rows;

    res.json(maestro);
  } catch (error) {
    console.error('Error al obtener maestro:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// POST /api/maestros - Crear maestro
// =============================================
router.post('/', auth, checkRole('coordinador'), async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      telefono,
      activo = true,
      rol = 'maestro',
      niveles = []
    } = req.body;

    // Validaciones
    if (!nombre || !apellido_paterno || !correo) {
      await client.query('ROLLBACK');
      logger.warn('Maestro creation failed - missing required fields');
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, apellido_paterno, correo' });
    }
    
    // Validar que el rol sea válido
    if (!['maestro', 'administrativo'].includes(rol)) {
      await client.query('ROLLBACK');
      logger.warn('Invalid role provided', { rol });
      return res.status(400).json({ error: 'Rol inválido. Debe ser "maestro" o "administrativo"' });
    }

    // Verificar correo único
    const correoCheck = await client.query('SELECT id FROM maestros WHERE correo = $1', [correo]);
    if (correoCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El correo ya existe' });
    }

    // Crear usuario con el rol especificado
    const username = await generarUsername(nombre, apellido_paterno, apellido_materno, client);
    const passwordTemporal = generarPasswordSegura(); // Generar contraseña segura aleatoria
    const password = await bcrypt.hash(passwordTemporal, 10);

    logger.info('Creating user', { username, rol });
    
    let usuarioId;
    try {
      const userResult = await client.query(
        'INSERT INTO usuarios (username, password, rol, activo, nombre, apellido_paterno, apellido_materno, email, debe_cambiar_password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
        [username, password, rol, activo, nombre, apellido_paterno, apellido_materno, correo, true]
      );
      usuarioId = userResult.rows[0].id;
      logger.info('User created successfully', { usuarioId, username });
    } catch (userError) {
      await client.query('ROLLBACK');
      logger.error('Error creating user', { error: userError.message });
      return res.status(400).json({ error: `Error al crear usuario: ${userError.message}` });
    }

    // Insertar maestro
    const result = await client.query(
      `INSERT INTO maestros 
       (usuario_id, nombre, apellido_paterno, apellido_materno, correo, telefono, activo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [usuarioId, nombre, apellido_paterno, apellido_materno, correo, telefono || null, activo]
    );

    const maestroId = result.rows[0].id;

    // Asignar niveles - convertir nombres a IDs si son strings
    if (niveles && niveles.length > 0) {
      const nivelesIds = [];
      for (const nivel of niveles) {
        if (typeof nivel === 'string') {
          // Es un nombre, buscar el ID (case-insensitive y trimmed)
          const nivelResult = await client.query(
            'SELECT id FROM niveles WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))',
            [nivel]
          );
          if (nivelResult.rows.length > 0) {
            nivelesIds.push(nivelResult.rows[0].id);
          }
        } else if (typeof nivel === 'number') {
          // Ya es un ID
          nivelesIds.push(nivel);
        }
      }

      for (const nivelId of nivelesIds) {
        await client.query(
          'INSERT INTO maestros_niveles (maestro_id, nivel_id, activo) VALUES ($1, $2, $3)',
          [maestroId, nivelId, true]
        );
      }
    }

    await logAudit(req.user.id, 'CREATE', 'maestros', maestroId, null, result.rows[0], req.ip);

    await client.query('COMMIT');

    // Generar y enviar token de verificación de email
    try {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      // Guardar token en BD
      await pool.query(
        `INSERT INTO email_verification_tokens (usuario_id, token, email, expira_en)
         VALUES ($1, $2, $3, $4)`,
        [usuarioId, verificationToken, correo, expiraEn]
      );

      // Enviar email de verificación
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verificar-email/${verificationToken}`;
      await enviarEmailVerificacion(correo, nombre, verifyUrl);
      
      logger.info('Verification email sent to new user', { usuarioId, email: correo });
    } catch (emailError) {
      // No fallar si el email falla, solo registrar
      logger.error('Error sending verification email', { error: emailError.message, email: correo });
    }

    // Retornar con nombre_completo y niveles
    const maestroCompleto = await client.query(`
      SELECT *
      FROM maestros_completo
      WHERE id = $1
    `, [maestroId]);
    const nivelesAsignados = await pool.query(
      `SELECT n.id, n.codigo, n.nombre 
       FROM maestros_niveles mn
       JOIN niveles n ON mn.nivel_id = n.id
       WHERE mn.maestro_id = $1 AND mn.activo = true
       ORDER BY n.orden`,
      [maestroId]
    );

    const maestro = maestroCompleto.rows[0];
    // Devolver solo los nombres de los niveles como strings
    maestro.niveles = nivelesAsignados.rows.map(n => n.nombre);

    // Emitir evento de Socket.io para actualización en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.emit('maestro:created', {
        id: maestroId,
        nombre_completo: maestro.nombre_completo,
        rol: maestro.rol_usuario
      });
    }

    // Devolver las credenciales creadas
    res.status(201).json({
      maestro,
      usuario_creado: {
        username,
        password: passwordTemporal, // Contraseña generada aleatoriamente
        debe_cambiar_password: true
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      if (error.constraint?.includes('correo')) {
        return res.status(400).json({ error: 'El correo ya existe' });
      }
      return res.status(400).json({ error: 'Ya existe un registro con esos datos' });
    }

    console.error('Error al crear maestro:', error);
    res.status(500).json({ error: 'Error al crear maestro: ' + error.message });
  } finally {
    client.release();
  }
});

// =============================================
// PUT /api/maestros/:id - Actualizar maestro
// =============================================
router.put('/:id', auth, checkRole('coordinador'), async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Campos permitidos
    const CAMPOS_PERMITIDOS = [
      'nombre', 'apellido_paterno', 'apellido_materno', 'correo',
      'telefono', 'activo'
    ];

    const fields = {};
    Object.keys(req.body).forEach(key => {
      if (CAMPOS_PERMITIDOS.includes(key)) {
        fields[key] = req.body[key];
      }
    });

    const oldData = await client.query('SELECT * FROM maestros WHERE id = $1', [id]);

    if (oldData.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Maestro no encontrado' });
    }

    // Actualizar maestro si hay campos
    if (Object.keys(fields).length > 0) {
      const keys = Object.keys(fields);
      const values = Object.values(fields);
      const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');

      await client.query(
        `UPDATE maestros SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1}`,
        [...values, id]
      );
      
      // Si se actualizan nombre o apellidos, también actualizar en usuarios
      if (fields.nombre || fields.apellido_paterno || fields.apellido_materno) {
        const maestroData = await client.query('SELECT usuario_id FROM maestros WHERE id = $1', [id]);
        if (maestroData.rows.length > 0) {
          const updateUsuarioFields = [];
          const updateUsuarioValues = [];
          let paramIndex = 1;
          
          if (fields.nombre) {
            updateUsuarioFields.push(`nombre = $${paramIndex++}`);
            updateUsuarioValues.push(fields.nombre);
          }
          if (fields.apellido_paterno) {
            updateUsuarioFields.push(`apellido_paterno = $${paramIndex++}`);
            updateUsuarioValues.push(fields.apellido_paterno);
          }
          if (fields.apellido_materno !== undefined) {
            updateUsuarioFields.push(`apellido_materno = $${paramIndex++}`);
            updateUsuarioValues.push(fields.apellido_materno);
          }
          
          if (updateUsuarioFields.length > 0) {
            updateUsuarioValues.push(maestroData.rows[0].usuario_id);
            await client.query(
              `UPDATE usuarios SET ${updateUsuarioFields.join(', ')} WHERE id = $${paramIndex}`,
              updateUsuarioValues
            );
          }
        }
      }
    }

    // Actualizar niveles si se proporcionan
    if (req.body.niveles !== undefined && Array.isArray(req.body.niveles)) {
      // Desactivar todos los niveles actuales
      await client.query('UPDATE maestros_niveles SET activo = false WHERE maestro_id = $1', [id]);

      // Convertir nombres de niveles a IDs si son strings
      const nivelesIds = [];
      for (const nivel of req.body.niveles) {
        if (typeof nivel === 'string') {
          // Es un nombre, buscar el ID (case-insensitive y trimmed)
          const nivelResult = await client.query(
            'SELECT id FROM niveles WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))',
            [nivel]
          );
          if (nivelResult.rows.length > 0) {
            nivelesIds.push(nivelResult.rows[0].id);
          }
        } else if (typeof nivel === 'number') {
          // Ya es un ID
          nivelesIds.push(nivel);
        }
      }

      // Activar o insertar los nuevos niveles
      for (const nivelId of nivelesIds) {
        const existe = await client.query(
          'SELECT id FROM maestros_niveles WHERE maestro_id = $1 AND nivel_id = $2',
          [id, nivelId]
        );

        if (existe.rows.length > 0) {
          await client.query(
            'UPDATE maestros_niveles SET activo = true WHERE maestro_id = $1 AND nivel_id = $2',
            [id, nivelId]
          );
        } else {
          await client.query(
            'INSERT INTO maestros_niveles (maestro_id, nivel_id, activo) VALUES ($1, $2, $3)',
            [id, nivelId, true]
          );
        }
      }
    }

    const newData = await client.query('SELECT * FROM maestros WHERE id = $1', [id]);
    await logAudit(req.user.id, 'UPDATE', 'maestros', id, oldData.rows[0], newData.rows[0], req.ip);

    await client.query('COMMIT');

    // Retornar con nombre_completo, rol y niveles
    const maestroCompleto = await pool.query(`
      SELECT *
      FROM maestros_completo
      WHERE id = $1
    `, [id]);
    
    const nivelesAsignados = await pool.query(
      `SELECT n.id, n.codigo, n.nombre 
       FROM maestros_niveles mn
       JOIN niveles n ON mn.nivel_id = n.id
       WHERE mn.maestro_id = $1 AND mn.activo = true
       ORDER BY n.orden`,
      [id]
    );

    const maestro = maestroCompleto.rows[0];
    // Devolver solo los nombres de los niveles como strings
    maestro.niveles = nivelesAsignados.rows.map(n => n.nombre);

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('maestro:updated', {
        id: parseInt(id),
        nombre_completo: maestro.nombre_completo,
        rol: maestro.rol_usuario
      });
    }

    res.json(maestro);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar maestro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// =============================================
// POST /api/maestros/:id/reset-password - Restablecer contraseña
// =============================================
router.post('/:id/reset-password', auth, checkRole('coordinador'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Verificar que el maestro existe
    const maestroCheck = await client.query(
      'SELECT usuario_id, nombre, apellido_paterno, apellido_materno FROM maestros WHERE id = $1', 
      [id]
    );

    if (maestroCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Maestro no encontrado' });
    }

    const usuarioId = maestroCheck.rows[0].usuario_id;
    const nombreMaestro = `${maestroCheck.rows[0].nombre} ${maestroCheck.rows[0].apellido_paterno} ${maestroCheck.rows[0].apellido_materno || ''}`.trim();

    if (!usuarioId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El maestro no tiene un usuario asociado' });
    }

    // Generar nueva contraseña temporal
    const nuevaPassword = generarPasswordSegura();
    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    // Actualizar la contraseña y marcar que debe cambiarla
    await client.query(
      'UPDATE usuarios SET password = $1, debe_cambiar_password = true WHERE id = $2',
      [hashedPassword, usuarioId]
    );

    // Obtener el username
    const usuarioInfo = await client.query('SELECT username FROM usuarios WHERE id = $1', [usuarioId]);

    await logAudit(
      req.user.id, 
      'UPDATE', 
      'usuarios', 
      usuarioId, 
      null, 
      { password_reset: true }, 
      req.ip
    );

    await client.query('COMMIT');
    
    res.json({ 
      message: `Contraseña restablecida correctamente para ${nombreMaestro}`,
      username: usuarioInfo.rows[0].username,
      password: nuevaPassword,
      debe_cambiar_password: true
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ error: 'Error al restablecer contraseña: ' + error.message });
  } finally {
    client.release();
  }
});

// =============================================
// PATCH /api/maestros/:id/toggle-status - Activar/desactivar maestro
// =============================================
router.patch('/:id/toggle-status', auth, checkRole('coordinador'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Obtener estado actual
    const maestroActual = await client.query(
      'SELECT activo, nombre, apellido_paterno, apellido_materno FROM maestros WHERE id = $1', 
      [id]
    );

    if (maestroActual.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Maestro no encontrado' });
    }

    const nuevoEstado = !maestroActual.rows[0].activo;
    const nombreMaestro = `${maestroActual.rows[0].nombre} ${maestroActual.rows[0].apellido_paterno} ${maestroActual.rows[0].apellido_materno || ''}`.trim();

    // Actualizar estado del maestro
    await client.query('UPDATE maestros SET activo = $1 WHERE id = $2', [nuevoEstado, id]);

    // Actualizar estado del usuario asociado
    await client.query(
      'UPDATE usuarios SET activo = $1 WHERE id = (SELECT usuario_id FROM maestros WHERE id = $2)',
      [nuevoEstado, id]
    );

    await logAudit(
      req.user.id, 
      'UPDATE', 
      'maestros', 
      id, 
      { activo: maestroActual.rows[0].activo }, 
      { activo: nuevoEstado }, 
      req.ip
    );

    await client.query('COMMIT');
    
    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('maestro:status_changed', {
        id: parseInt(id),
        nombre_completo: nombreMaestro,
        activo: nuevoEstado
      });
    }
    
    const accion = nuevoEstado ? 'activado' : 'desactivado';
    res.json({ 
      message: `${nombreMaestro} ha sido ${accion} correctamente`,
      activo: nuevoEstado
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al cambiar estado del maestro:', error);
    res.status(500).json({ error: 'Error al cambiar estado del maestro: ' + error.message });
  } finally {
    client.release();
  }
});

// =============================================
// DELETE /api/maestros/:id - Eliminar maestro
// =============================================
router.delete('/:id', auth, checkRole('coordinador'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    const oldData = await client.query('SELECT * FROM maestros WHERE id = $1', [id]);

    if (oldData.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Maestro no encontrado' });
    }

    const usuarioId = oldData.rows[0].usuario_id;

    // Eliminar primero el maestro (para respetar foreign keys)
    await client.query('DELETE FROM maestros WHERE id = $1', [id]);
    
    // Luego eliminar el usuario asociado si existe
    if (usuarioId) {
      await client.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
    }

    await logAudit(req.user.id, 'DELETE', 'maestros', id, oldData.rows[0], null, req.ip);

    await client.query('COMMIT');

    // Emitir evento de Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('maestro:deleted', { id: parseInt(id) });
    }

    res.json({ message: 'Maestro y usuario eliminados exitosamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar maestro:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// =============================================
// GET /api/maestros/:id/grupos - Grupos del maestro
// =============================================
router.get('/:id/grupos', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM grupos_detalle 
       WHERE maestro_id = $1 
       ORDER BY periodo_nombre DESC, nivel_nombre`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener grupos del maestro:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET /api/maestros/stats/counts - Conteo de personal por rol
// =============================================
router.get('/stats/counts', auth, checkRole('coordinador'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM maestros m 
         JOIN usuarios u ON m.usuario_id = u.id 
         WHERE u.rol = 'maestro' AND m.activo = true) as maestros_activos,
        
        (SELECT COUNT(*) FROM maestros m 
         JOIN usuarios u ON m.usuario_id = u.id 
         WHERE u.rol = 'administrativo' AND m.activo = true) as administrativos_activos,
        
        (SELECT COUNT(*) FROM usuarios 
         WHERE rol = 'coordinador' AND activo = true) as coordinadores
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener conteos de personal:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
