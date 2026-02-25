import pool from '../config/database.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import generator from 'generate-password';


/**
 * Helper: Generar username único
 */
async function generarUsername(nombre, apellidoPaterno, apellidoMaterno = '', client) {
  const clean = (str) => (str || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  const nombres = (nombre || '').split(' ').filter(n => n.length > 0);
  const n1 = clean(nombres[0]);
  const n2 = nombres.length > 1 ? clean(nombres[1]) : '';
  const ap = clean(apellidoPaterno);
  const am = clean(apellidoMaterno);
  const i1 = n1.charAt(0);
  
  let username = `${i1}.${ap}`;
  let existe = await client.query('SELECT id FROM usuarios WHERE username = $1', [username]);
  if (existe.rows.length === 0) return username;

  if (n2) {
    const i2 = n2.charAt(0);
    username = `${i1}.${i2}.${ap}`;
    existe = await client.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existe.rows.length === 0) return username;
  }

  if (am) {
    const inicialM = am.charAt(0);
    username = `${i1}.${ap}.${inicialM}`;
    existe = await client.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existe.rows.length === 0) return username;
  }

  let contador = 1;
  while (true) {
    username = `${i1}.${ap}${contador}`;
    existe = await client.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existe.rows.length === 0) return username;
    contador++;
  }
}

/**
 * Helper: Generar password segura
 */
function generarPasswordSegura() {
  const base = generator.generate({ length: 10, numbers: true, uppercase: true, lowercase: true, strict: true });
  const symbols = ['!', '#', '$', '*', '-', '_'];
  return base + symbols[Math.floor(Math.random() * symbols.length)];
}

/**
 * Definición de herramientas para el Agente IA
 */
export const aiToolsDefinition = [
  {
    type: 'function',
    function: {
      name: 'buscar_alumno',
      description: 'Busca un alumno por su nombre, matrícula o correo. Retorna una lista con el ID interno, nombre y matrícula. USA ESTE ID para obtener detalles.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'El nombre, matrícula o correo del alumno' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'obtener_detalles_alumno',
      description: 'Obtiene información detallada de un alumno usando su ID interno (el id obtenido de buscar_alumno). No confundir con la matrícula.',
      parameters: {
        type: 'object',
        properties: {
          alumno_id: { type: 'number', description: 'El ID numérico interno del alumno (retornado por buscar_alumno)' }
        },
        required: ['alumno_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listar_grupos',
      description: 'Muestra los grupos de un periodo.',
      parameters: {
        type: 'object',
        properties: {
          periodo_id: { type: 'number', description: 'ID del periodo (opcional)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'crear_grupo',
      description: 'Crea un nuevo grupo. PROHIBIDO: No llamar con datos inventados.',
      parameters: {
        type: 'object',
        properties: {
          codigo: { type: 'string' },
          periodo_id: { type: 'number' },
          nivel_id: { type: 'number' },
          turno: { type: 'string', enum: ['matutino', 'sabatino'] },
          cupo_maximo: { type: 'number' }
        },
        required: ['codigo', 'periodo_id', 'nivel_id', 'cupo_maximo']
      }
    }
  },
    {
      type: 'function',
      function: {
        name: 'obtener_mi_resumen_docente',
        description: 'Obtiene un resumen completo del maestro actual: sus grupos, niveles, horarios y alumnos inscritos.',
        parameters: { type: 'object', properties: {} }
      }
    },
    {
      type: 'function',
      function: {
        name: 'obtener_alumnos_por_grupo',
        description: 'Obtiene la lista de alumnos inscritos en un grupo específico.',
        parameters: {
          type: 'object',
          properties: {
            grupo_id: { type: 'number', description: 'El ID numérico del grupo' }
          },
          required: ['grupo_id']
        }
      }
    },
  {
    type: 'function',
    function: {
      name: 'listar_niveles',
      description: 'Lista los niveles disponibles y sus IDs.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'obtener_periodo_activo',
      description: 'Obtiene el periodo escolar activo.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'crear_alumno',
      description: 'Registra un nuevo alumno. PROHIBIDO: No llamar si el usuario no ha dado datos REALES. No inventar nombres o correos.',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          apellido_paterno: { type: 'string' },
          apellido_materno: { type: 'string' },
          correo: { type: 'string' },
          tipo_alumno: { type: 'string', enum: ['interno', 'externo'] },
          matricula: { type: 'string' },
          carrera: { type: 'string' },
          nivel_id: { type: 'number' }
        },
        required: ['nombre', 'apellido_paterno', 'correo', 'tipo_alumno']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'crear_personal',
      description: 'Registra un nuevo maestro o administrativo. IMPORTANTE: Solo llamar cuando el usuario haya proporcionado datos REALES (nombre, correo, rol, etc.). No inventar datos.',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          apellido_paterno: { type: 'string' },
          apellido_materno: { type: 'string' },
          correo: { type: 'string' },
          telefono: { type: 'string' },
          rol: { type: 'string', enum: ['maestro', 'administrativo'] },
          niveles_ids: { 
            type: 'array', 
            items: { type: 'number' },
            description: 'Lista de IDs de niveles que impartirá (solo para maestros)'
          }
        },
        required: ['nombre', 'apellido_paterno', 'correo', 'rol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'inscribir_alumno',
      description: 'Inscribe a un alumno en un grupo.',
      parameters: {
        type: 'object',
        properties: {
          alumno_id: { type: 'number' },
          grupo_id: { type: 'number' },
          periodo_id: { type: 'number' }
        },
        required: ['alumno_id', 'grupo_id', 'periodo_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'obtener_inscripcion',
      description: 'Obtiene el ID de inscripción de un alumno para un periodo.',
      parameters: {
        type: 'object',
        properties: {
          alumno_id: { type: 'number' },
          periodo_id: { type: 'number' }
        },
        required: ['alumno_id', 'periodo_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'registrar_pago',
      description: 'Registra un pago para una inscripción. PROHIBIDO: Solo llamar con datos de monto y concepto reales proporcionados por el usuario.',
      parameters: {
        type: 'object',
        properties: {
          inscripcion_id: { type: 'number' },
          concepto: { type: 'string' },
          monto: { type: 'number' },
          referencia: { type: 'string' },
          metodo_pago: { type: 'string', enum: ['Formato Universal'] }
        },
        required: ['inscripcion_id', 'concepto', 'monto']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listar_personal',
      description: 'Busca o lista maestros y administrativos por nombre, correo o rol. Retorna ID, nombre y rol. USA EL usuario_id para obtener detalles.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Nombre o correo para filtrar (opcional)' },
          rol: { type: 'string', enum: ['maestro', 'administrativo'], description: 'Filtrar por rol (opcional)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'obtener_detalles_personal',
      description: 'Obtiene información completa de un maestro o administrativo (teléfono, niveles, grupos).',
      parameters: {
        type: 'object',
        properties: {
          usuario_id: { type: 'number', description: 'El ID del usuario/maestro' }
        },
        required: ['usuario_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'obtener_detalles_alumno_por_matricula',
      description: 'Obtiene perfil completo del alumno usando DIRECTAMENTE la matricula (ej. 201724408). ES LA OPCIÓN MAS RÁPIDA.',
      parameters: {
        type: 'object',
        properties: {
          matricula: { type: 'string', description: 'Matricula del alumno' }
        },
        required: ['matricula']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'asignar_maestro_a_grupo',
      description: 'Asigna a un docente a un grupo académico.',
      parameters: {
        type: 'object',
        properties: {
          maestro_id: { type: 'number', description: 'ID del maestro' },
          grupo_id: { type: 'number', description: 'ID del grupo' }
        },
        required: ['maestro_id', 'grupo_id']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'obtener_estadisticas_financieras',
      description: 'Obtiene el resumen financiero del periodo actual (ingresos, adeudos, tasa de pago). Usa esto para responder "¿Cómo van las finanzas?".',
      parameters: {
        type: 'object',
        properties: {
          periodo_id: { type: 'number', description: 'ID del periodo (opcional, usa el activo si se omite)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'obtener_estudiantes_adeudos',
      description: 'Lista los estudiantes que tienen pagos con estatus pendiente, prorroga o vencido.',
      parameters: {
        type: 'object',
        properties: {
          periodo_id: { type: 'number', description: 'ID del periodo (opcional)' }
        }
      }
    }
  }
];

/**
 * Implementación de las herramientas
 */
export const aiToolsImplementations = {
  buscar_alumno: async ({ query }) => {
    const result = await pool.query(
      `SELECT id, nombre, apellido_paterno, matricula, correo FROM alumnos WHERE nombre ILIKE $1 OR matricula ILIKE $1 OR correo ILIKE $1 LIMIT 5`,
      [`%${query}%`]
    );
    return result.rows;
  },

  obtener_detalles_alumno_por_matricula: async ({ matricula }) => {
    try {
      const res = await pool.query('SELECT id FROM alumnos WHERE matricula = $1', [matricula]);
      if (res.rows.length === 0) return { error: `No se encontro ningun alumno con la matricula ${matricula}` };
      return aiToolsImplementations.obtener_detalles_alumno({ alumno_id: res.rows[0].id });
    } catch (e) {
      return { error: e.message };
    }
  },

  obtener_detalles_alumno: async ({ alumno_id }) => {
    try {
      // GUARDRAIL: Si el ID parece inventado (placeholder común de la IA)
      if (alumno_id === 12345 || alumno_id === 1 || alumno_id === 123) {
          return { error: 'EL ID PROPORCIONADO ES INVÁLIDO O INVENTADO. Debes llamar PRIMERO a buscar_alumno para obtener el ID real de la base de datos. PROHIBIDO inventar IDs.' };
      }
      // 1. Datos personales e inscripcion actual
      const infoRes = await pool.query(`
        SELECT a.*, g.codigo as grupo_nombre, n.nombre as nivel, p.nombre as periodo
        FROM alumnos a
        LEFT JOIN inscripciones i ON a.id = i.alumno_id AND i.estatus = 'activo'
        LEFT JOIN grupos g ON i.grupo_id = g.id
        LEFT JOIN niveles n ON g.nivel_id = n.id
        LEFT JOIN periodos p ON i.periodo_id = p.id
        WHERE a.id = $1
      `, [alumno_id]);

      if (infoRes.rows.length === 0) {
        return { error: `No se encontró ningún alumno con el ID ${alumno_id} en la base de datos real.` };
      }

      const alumno = infoRes.rows[0];

      // 2. Calificaciones (parciales)
      const califsRes = await pool.query(`
        SELECT parcial, calificacion 
        FROM calificaciones 
        WHERE inscripcion_id = (SELECT id FROM inscripciones WHERE alumno_id = $1 AND estatus = 'activo' LIMIT 1)
        ORDER BY parcial ASC
      `, [alumno_id]);

      // 3. Estatus de Pago
      const pagosRes = await pool.query(`
        SELECT estatus, fecha_vencimiento
        FROM pagos
        WHERE inscripcion_id = (SELECT id FROM inscripciones WHERE alumno_id = $1 AND estatus = 'activo' LIMIT 1)
        ORDER BY fecha_vencimiento DESC LIMIT 1
      `, [alumno_id]);

      // 4. Asistencia
      const asistRes = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE presente = true) as asistencias
        FROM asistencias
        WHERE inscripcion_id = (SELECT id FROM inscripciones WHERE alumno_id = $1 AND estatus = 'activo' LIMIT 1)
      `, [alumno_id]);

      const totalAsist = parseInt(asistRes.rows[0].total) || 0;
      const presenteAsist = parseInt(asistRes.rows[0].asistencias) || 0;
      const pctAsist = totalAsist > 0 ? ((presenteAsist / totalAsist) * 100).toFixed(1) : '100';

      return {
        id: alumno.id,
        nombre_completo: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`,
        matricula: alumno.matricula,
        estatus_academico: {
          periodo: alumno.periodo,
          grupo: alumno.grupo_nombre,
          nivel: alumno.nivel,
          asistencia: `${pctAsist}%`
        },
        calificaciones: califsRes.rows,
        pagos: pagosRes.rows[0] || { estatus: 'Sin registros' }
      };
    } catch (error) {
      return { error: error.message };
    }
  },

  listar_grupos: async ({ periodo_id }) => {
    let pid = periodo_id;
    if (!pid) {
      const pRes = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
      pid = pRes.rows[0]?.id;
    }
    const result = await pool.query(
      `SELECT g.id, g.codigo, n.nombre as nivel, m.nombre as maestro FROM grupos g JOIN niveles n ON g.nivel_id = n.id LEFT JOIN maestros m ON g.maestro_id = m.id WHERE g.periodo_id = $1`,
      [pid]
    );
    return result.rows;
  },

  listar_niveles: async () => {
    const result = await pool.query('SELECT id, nombre FROM niveles ORDER BY id');
    return result.rows;
  },

  obtener_periodo_activo: async () => {
    const pRes = await pool.query('SELECT id, nombre FROM periodos WHERE activo = true LIMIT 1');
    return pRes.rows[0] || { error: 'No hay periodo activo' };
  },

  crear_grupo: async (params) => {
    const { codigo, periodo_id, nivel_id, turno, cupo_maximo } = params;
    const result = await pool.query(
      `INSERT INTO grupos (codigo, periodo_id, nivel_id, turno, cupo_maximo, activo) VALUES ($1, $2, $3, $4, $5, true) RETURNING id, codigo`,
      [codigo, periodo_id, nivel_id, turno || 'matutino', cupo_maximo]
    );
    return { success: true, grupo: result.rows[0] };
  },

  crear_alumno: async ({ nombre, apellido_paterno, apellido_materno, correo, tipo_alumno, matricula, carrera }) => {
    try {
      // --- CAPA 1: VALIDACIONES PREVIAS (IF-ELSE) ---
      if (!nombre || typeof nombre !== 'string') return { error: "FALTA_NOMBRE: El nombre es obligatorio." };
      if (!apellido_paterno) return { error: "FALTA_APELLIDO: El apellido paterno es obligatorio." };
      if (!correo || !correo.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return { error: "CORREO_INVALIDO: Proporciona un correo real." };

      // --- CAPA 2: FILTRO ANTI-BASURA (Anti-Alucinación) ---
      const junk = /maestro|admin|ejemplo|test|ficticio|dummy|tmp|abc@|xxx@|juan@|ana@example/i;
      if (junk.test(nombre) || (apellido_paterno && junk.test(apellido_paterno)) || junk.test(correo)) {
          return { error: "ALTO: No puedes usar datos de ejemplo o inventados (dummies). Debes solicitar al usuario información real y específica para realizar el registro. No intentes 'probar' con datos falsos." };
      }

      const specialChars = /[@#$%^&*()_="<>]/;
      if (specialChars.test(nombre) || specialChars.test(apellido_paterno)) {
          return { error: "CARACTERES_PROHIBIDOS: Nombre/Apellidos con símbolos no permitidos." };
      }

      // --- CAPA 4: VERIFICACIÓN CON BASE DE DATOS ---
      const existe = await pool.query('SELECT id FROM alumnos WHERE correo = $1', [correo]);
      if (existe.rows.length > 0) return { error: "DUPLICADO: Correo ya registrado." };

      // --- CAPA 5: EJECUCIÓN ---
      const res = await pool.query(
        `INSERT INTO alumnos (nombre, apellido_paterno, apellido_materno, correo, tipo_alumno, matricula, carrera)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [nombre, apellido_paterno, apellido_materno || '', correo, tipo_alumno, matricula || null, carrera || null]
      );

      return { success: true, alumno_id: res.rows[0].id, mensaje: `Alumno ${nombre} registrado.` };
    } catch (error) {
      logger.error('Error[crear_alumno]:', error);
      return { error: "ERROR_SISTEMA: " + error.message };
    }
  },

  crear_personal: async ({ nombre, apellido_paterno, apellido_materno, correo, telefono, rol }) => {
    const client = await pool.connect();
    try {
      if (!nombre || nombre.length < 2) return { error: "NOMBRE_CORTO" };
      if (!apellido_paterno) return { error: "APELLIDO_REQUERIDO" };
      if (!correo || !correo.includes('@')) return { error: "CORREO_INVALIDO" };

      const junk = /ejemplo|test|ficticio|user|tmp|dummy|prueba|ana@example|juan@|pedro@|maestro@|admin@|xxx@|abc@/i;
      if (junk.test(nombre) || junk.test(correo) || junk.test(apellido_paterno)) {
          return { error: "ALTO: No puedes usar datos de ejemplo o inventados (dummies). Debes solicitar al usuario información real y específica para realizar el registro. No intentes 'probar' con datos falsos." };
      }

      await client.query('BEGIN');
      const existe = await client.query('SELECT id FROM maestros WHERE correo = $1', [correo]);
      if (existe.rows.length > 0) throw new Error('CORREO_DUPLICADO');

      const username = await generarUsername(nombre, apellido_paterno, apellido_materno, client);
      const password = generarPasswordSegura();
      const hashed = await bcrypt.hash(password, 10);

      // 1. Insertar en usuarios (sin correo, solo info básica)
      const userRes = await client.query(
        'INSERT INTO usuarios (username, password, rol, nombre, apellido_paterno, apellido_materno) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [username, hashed, rol, nombre, apellido_paterno, apellido_materno || '']
      );
      
      const usuario_id = userRes.rows[0].id;

      // 2. Insertar en maestros (aquí sí va el correo)
      await client.query(
        'INSERT INTO maestros (usuario_id, nombre, apellido_paterno, apellido_materno, correo, telefono) VALUES ($1, $2, $3, $4, $5, $6)',
        [usuario_id, nombre, apellido_paterno, apellido_materno || '', correo, telefono || '']
      );

      await client.query('COMMIT');
      return { success: true, username, password, mensaje: "Personal creado correctamente." };
    } catch (error) {
      await client.query('ROLLBACK');
      return { error: error.message };
    } finally {
      client.release();
    }
  },

  inscribir_alumno: async (params) => {
    try {
      const { alumno_id, grupo_id, periodo_id } = params;
      const result = await pool.query(
        `INSERT INTO inscripciones (alumno_id, grupo_id, periodo_id, estatus) VALUES ($1, $2, $3, 'activo') RETURNING id`,
        [alumno_id, grupo_id, periodo_id]
      );
      return { success: true, inscripcion_id: result.rows[0].id };
    } catch (error) {
      return { error: error.message };
    }
  },

  obtener_inscripcion: async ({ alumno_id, periodo_id }) => {
    const result = await pool.query(
      `SELECT id FROM inscripciones WHERE alumno_id = $1 AND periodo_id = $2 AND estatus = 'activo' LIMIT 1`,
      [alumno_id, periodo_id]
    );
    return result.rows[0] || { error: 'No activa' };
  },

  registrar_pago: async ({ inscripcion_id, concepto, monto, referencia, metodo_pago }) => {
    try {
      if (!inscripcion_id || monto <= 0) return { error: "PAGO_RECHAZADO" };
      const res = await pool.query(
        `INSERT INTO pagos (inscripcion_id, concepto, monto, referencia, metodo_pago, fecha_pago)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
        [inscripcion_id, concepto, monto, referencia || null, metodo_pago || 'Formato Universal']
      );
      return { success: true, pago_id: res.rows[0].id, mensaje: "Pago registrado." };
    } catch (error) {
      return { error: error.message };
    }
  },

  listar_personal: async ({ rol, query }) => {
    try {
      let sql = 'SELECT m.id, m.nombre, m.apellido_paterno, m.correo, u.rol, u.id as usuario_id FROM maestros m JOIN usuarios u ON m.usuario_id = u.id WHERE 1=1';
      const params = [];
      let pIdx = 1;
      if (rol) { sql += ` AND u.rol = $${pIdx++}`; params.push(rol); }
      if (query) { sql += ` AND (m.nombre ILIKE $${pIdx} OR m.apellido_paterno ILIKE $${pIdx} OR m.correo ILIKE $${pIdx})`; params.push(`%${query}%`); }
      const res = await pool.query(sql, params);
      return res.rows;
    } catch (e) { return { error: e.message }; }
  },

  obtener_detalles_personal: async ({ usuario_id }) => {
    try {
      const result = await pool.query(`
        SELECT m.nombre, m.apellido_paterno, m.apellido_materno, m.correo, m.telefono, u.rol,
               ARRAY(SELECT n.nombre FROM niveles n JOIN niveles_maestros nm ON n.id = nm.nivel_id WHERE nm.maestro_id = m.id) as niveles
        FROM maestros m JOIN usuarios u ON m.usuario_id = u.id WHERE u.id = $1
      `, [usuario_id]);
      return result.rows[0] || { error: 'No encontrado' };
    } catch (e) { return { error: e.message }; }
  },

  obtener_mi_resumen_docente: async (args, context) => {
    const userId = context.userId;
    const result = await pool.query(
      `SELECT g.codigo, n.nombre as nivel, g.turno,
              (SELECT COUNT(*) FROM inscripciones i WHERE i.grupo_id = g.id AND i.estatus = 'activo') as total_alumnos
       FROM grupos g JOIN niveles n ON g.nivel_id = n.id JOIN periodos p ON g.periodo_id = p.id JOIN maestros m ON g.maestro_id = m.id
       WHERE m.usuario_id = $1 AND p.activo = true`, [userId]
    );
    return { mis_grupos: result.rows };
  },

  obtener_alumnos_por_grupo: async ({ grupo_id }) => {
    const result = await pool.query(
      `SELECT a.id, a.nombre, a.apellido_paterno, a.matricula FROM alumnos a JOIN inscripciones i ON a.id = i.alumno_id WHERE i.grupo_id = $1 AND i.estatus = 'activo'`,
      [grupo_id]
    );
    return result.rows;
  },



  asignar_maestro_a_grupo: async ({ maestro_id, grupo_id }) => {
    try {
      await pool.query('UPDATE grupos SET maestro_id = $1 WHERE id = $2', [maestro_id, grupo_id]);
      return { success: true, mensaje: 'Asignado.' };
    } catch (e) { return { error: e.message }; }
  },

  asignar_niveles_maestro: async ({ maestro_id, niveles }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Limpiar niveles actuales
      await client.query('DELETE FROM niveles_maestros WHERE maestro_id = $1', [maestro_id]);
      
      for (const nombreNivel of niveles) {
        const nivelRes = await client.query('SELECT id FROM niveles WHERE nombre ILIKE $1', [nombreNivel]);
        if (nivelRes.rows.length > 0) {
          await client.query(
            'INSERT INTO niveles_maestros (maestro_id, nivel_id) VALUES ($1, $2)',
            [maestro_id, nivelRes.rows[0].id]
          );
        }
      }
      await client.query('COMMIT');
      return { success: true, mensaje: 'Niveles asignados correctamente.' };
    } catch (e) {
      await client.query('ROLLBACK');
      return { error: e.message };
    } finally {
      client.release();
    }
  },

  obtener_estadisticas_financieras: async ({ periodo_id }) => {
    try {
      let pid = periodo_id;
      if (!pid) {
        const pRes = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
        pid = pRes.rows[0]?.id;
      }
      if (!pid) return { error: 'No hay un periodo activo para consultar finanzas.' };

      const stats = await pool.query(`
        SELECT 
          COALESCE(SUM(monto_final), 0) as total_recaudado,
          COUNT(*) as total_pagos,
          (SELECT COUNT(*) FROM inscripciones WHERE periodo_id = $1) as total_inscritos,
          (SELECT COUNT(*) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id WHERE i.periodo_id = $1 AND p.estatus IN ('pendiente', 'vencido', 'prorroga')) as pagos_pendientes
        FROM pagos p
        JOIN inscripciones i ON p.inscripcion_id = i.id
        WHERE i.periodo_id = $1 AND p.estatus IN ('pagado', 'completado')
      `, [pid]);

      return stats.rows[0];
    } catch (e) {
      return { error: e.message };
    }
  },
  
  obtener_estudiantes_adeudos: async ({ periodo_id }) => {
    try {
      let pid = periodo_id;
      if (!pid) {
        const pRes = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
        pid = pRes.rows[0]?.id;
      }
      if (!pid) return { error: 'No hay un periodo activo para consultar adeudos.' };

      const res = await pool.query(`
        SELECT 
          a.nombre, a.apellido_paterno, a.matricula,
          p.concepto, p.monto_final as monto, p.estatus,
          COALESCE(p.fecha_limite_prorroga, p.fecha_vencimiento) as fecha_vence
        FROM pagos p
        JOIN inscripciones i ON p.inscripcion_id = i.id
        JOIN alumnos a ON i.alumno_id = a.id
        WHERE i.periodo_id = $1 
        AND p.estatus IN ('pendiente', 'prorroga', 'vencido')
        ORDER BY fecha_vence ASC
        LIMIT 50
      `, [pid]);

      return res.rows;
    } catch (e) {
      return { error: e.message };
    }
  },

  // ========================================
  // HERRAMIENTAS INTELIGENTES AVANZADAS
  // ========================================

  obtener_grupos_sin_maestro: async ({ periodo_id }) => {
    try {
      let pid = periodo_id;
      if (!pid) {
        const pRes = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
        pid = pRes.rows[0]?.id;
      }
      if (!pid) return { error: 'No hay un periodo activo.' };

      const res = await pool.query(`
        SELECT 
          g.id, g.codigo, n.nombre as nivel, g.turno,
          COUNT(i.id) as alumnos_inscritos, g.cupo_maximo
        FROM grupos g
        LEFT JOIN niveles n ON g.nivel_id = n.id
        LEFT JOIN inscripciones i ON g.id = i.grupo_id AND i.estatus = 'activo'
        WHERE g.periodo_id = $1 AND g.maestro_id IS NULL
        GROUP BY g.id, g.codigo, n.nombre, g.turno, g.cupo_maximo
        ORDER BY alumnos_inscritos DESC
      `, [pid]);

      return {
        total: res.rows.length,
        grupos: res.rows,
        alerta: res.rows.length > 0 ? 'CRITICO: Hay grupos sin maestro asignado' : 'OK: Todos los grupos tienen maestro'
      };
    } catch (e) {
      return { error: e.message };
    }
  },

  obtener_alumnos_sin_calificaciones: async ({ periodo_id }) => {
    try {
      let pid = periodo_id;
      if (!pid) {
        const pRes = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
        pid = pRes.rows[0]?.id;
      }
      if (!pid) return { error: 'No hay un periodo activo.' };

      const res = await pool.query(`
        SELECT 
          a.nombre, a.apellido_paterno, a.matricula,
          g.codigo as grupo, n.nombre as nivel,
          COALESCE(COUNT(c.id), 0) as parciales_con_calif
        FROM inscripciones i
        JOIN alumnos a ON i.alumno_id = a.id
        JOIN grupos g ON i.grupo_id = g.id
        LEFT JOIN niveles n ON g.nivel_id = n.id
        LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
        WHERE i.periodo_id = $1 AND i.estatus = 'activo'
        GROUP BY a.id, a.nombre, a.apellido_paterno, a.matricula, g.codigo, n.nombre
        HAVING COUNT(c.id) < 3
        ORDER BY parciales_con_calif ASC, a.apellido_paterno
        LIMIT 50
      `, [pid]);

      return {
        total: res.rows.length,
        alumnos: res.rows,
        alerta: res.rows.length > 0 ? `${res.rows.length} alumnos sin calificaciones completas` : 'OK: Todos tienen calificaciones'
      };
    } catch (e) {
      return { error: e.message };
    }
  },

  analizar_riesgo_desercion: async ({ periodo_id }) => {
    try {
      let pid = periodo_id;
      if (!pid) {
        const pRes = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
        pid = pRes.rows[0]?.id;
      }
      if (!pid) return { error: 'No hay un periodo activo.' };

      const res = await pool.query(`
        SELECT 
          a.nombre, a.apellido_paterno, a.matricula,
          g.codigo as grupo,
          ROUND(AVG(c.calificacion), 1) as promedio,
          i.porcentaje_asistencia,
          COUNT(CASE WHEN p.estatus = 'vencido' THEN 1 END) as pagos_vencidos,
          CASE 
            WHEN AVG(c.calificacion) < 70 AND COUNT(CASE WHEN p.estatus = 'vencido' THEN 1 END) > 0 THEN 'ALTO'
            WHEN AVG(c.calificacion) < 70 OR i.porcentaje_asistencia < 80 OR COUNT(CASE WHEN p.estatus = 'vencido' THEN 1 END) > 1 THEN 'MEDIO'
            ELSE 'BAJO'
          END as riesgo
        FROM inscripciones i
        JOIN alumnos a ON i.alumno_id = a.id
        JOIN grupos g ON i.grupo_id = g.id
        LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
        LEFT JOIN pagos p ON i.id = p.inscripcion_id
        WHERE i.periodo_id = $1 AND i.estatus = 'activo'
        GROUP BY a.id, a.nombre, a.apellido_paterno, a.matricula, g.codigo, i.porcentaje_asistencia
        HAVING AVG(c.calificacion) < 70 OR i.porcentaje_asistencia < 80 OR COUNT(CASE WHEN p.estatus = 'vencido' THEN 1 END) > 0
        ORDER BY 
          CASE 
            WHEN AVG(c.calificacion) < 70 AND COUNT(CASE WHEN p.estatus = 'vencido' THEN 1 END) > 0 THEN 1
            WHEN AVG(c.calificacion) < 70 OR i.porcentaje_asistencia < 80 OR COUNT(CASE WHEN p.estatus = 'vencido' THEN 1 END) > 1 THEN 2
            ELSE 3
          END
        LIMIT 30
      `, [pid]);

      const alto = res.rows.filter(r => r.riesgo === 'ALTO').length;
      const medio = res.rows.filter(r => r.riesgo === 'MEDIO').length;

      return {
        total_en_riesgo: res.rows.length,
        riesgo_alto: alto,
        riesgo_medio: medio,
        alumnos: res.rows,
        recomendacion: alto > 0 ? 'ACCION INMEDIATA: Contactar alumnos de riesgo ALTO' : 'Monitorear alumnos de riesgo MEDIO'
      };
    } catch (e) {
      return { error: e.message };
    }
  },

  obtener_estadisticas_asistencias: async ({ periodo_id }) => {
    try {
      let pid = periodo_id;
      if (!pid) {
        const pRes = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
        pid = pRes.rows[0]?.id;
      }
      if (!pid) return { error: 'No hay un periodo activo.' };

      const stats = await pool.query(`
        SELECT 
          AVG(i.porcentaje_asistencia) as promedio_general,
          COUNT(CASE WHEN i.porcentaje_asistencia < 80 THEN 1 END) as alumnos_bajo_80,
          COUNT(CASE WHEN i.porcentaje_asistencia < 70 THEN 1 END) as alumnos_criticos
        FROM inscripciones i
        WHERE i.periodo_id = $1 AND i.estatus = 'activo'
      `, [pid]);

      const porGrupo = await pool.query(`
        SELECT 
          g.codigo, 
          AVG(i.porcentaje_asistencia) as promedio_grupo,
          COUNT(i.id) as total_alumnos
        FROM inscripciones i
        JOIN grupos g ON i.grupo_id = g.id
        WHERE i.periodo_id = $1 AND i.estatus = 'activo'
        GROUP BY g.codigo
        ORDER BY promedio_grupo ASC
        LIMIT 10
      `, [pid]);

      return {
        promedio_general: Math.round(stats.rows[0].promedio_general || 0),
        alumnos_bajo_80: parseInt(stats.rows[0].alumnos_bajo_80 || 0),
        alumnos_criticos: parseInt(stats.rows[0].alumnos_criticos || 0),
        grupos_con_menor_asistencia: porGrupo.rows,
        alerta: parseInt(stats.rows[0].alumnos_criticos) > 0 ? `${stats.rows[0].alumnos_criticos} alumnos en riesgo por asistencia` : 'OK'
      };
    } catch (e) {
      return { error: e.message };
    }
  },

  obtener_tendencias_pagos: async ({ periodo_id }) => {
    try {
      let pid = periodo_id;
      if (!pid) {
        const pRes = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
        pid = pRes.rows[0]?.id;
      }
      if (!pid) return { error: 'No hay un periodo activo.' };

      const analisis = await pool.query(`
        SELECT 
          COUNT(CASE WHEN estatus = 'pagado' AND fecha_pago <= fecha_vencimiento THEN 1 END) as pagos_a_tiempo,
          COUNT(CASE WHEN estatus = 'pagado' AND fecha_pago > fecha_vencimiento THEN 1 END) as pagos_atrasados,
          COUNT(CASE WHEN estatus = 'vencido' THEN 1 END) as pagos_vencidos,
          AVG(CASE WHEN estatus = 'pagado' AND fecha_pago > fecha_vencimiento 
              THEN EXTRACT(DAY FROM (fecha_pago - fecha_vencimiento)) 
              END) as dias_promedio_atraso
        FROM pagos p
        JOIN inscripciones i ON p.inscripcion_id = i.id
        WHERE i.periodo_id = $1
      `, [pid]);

      const proyeccion = await pool.query(`
        SELECT 
          SUM(monto_final) as ingresos_proyectados,
          COUNT(*) as pagos_pendientes_total
        FROM pagos p
        JOIN inscripciones i ON p.inscripcion_id = i.id
        WHERE i.periodo_id = $1 AND p.estatus IN ('pendiente', 'prorroga')
      `, [pid]);

      const row = analisis.rows[0];
      const proy = proyeccion.rows[0];

      return {
        pagos_a_tiempo: parseInt(row.pagos_a_tiempo || 0),
        pagos_atrasados: parseInt(row.pagos_atrasados || 0),
        pagos_vencidos: parseInt(row.pagos_vencidos || 0),
        dias_promedio_atraso: Math.round(row.dias_promedio_atraso || 0),
        ingresos_proyectados: parseFloat(proy.ingresos_proyectados || 0),
        pagos_pendientes: parseInt(proy.pagos_pendientes_total || 0),
        patron: parseInt(row.pagos_a_tiempo || 0) > parseInt(row.pagos_atrasados || 0) ? 'POSITIVO: Mayoria paga a tiempo' : 'NEGATIVO: Alta mora'
      };
    } catch (e) {
      return { error: e.message };
    }
  },

  generar_resumen_ejecutivo: async ({ periodo_id }) => {
    try {
      let pid = periodo_id;
      let periodoNombre = '';
      if (!pid) {
        const pRes = await pool.query('SELECT id, nombre FROM periodos WHERE activo = true LIMIT 1');
        pid = pRes.rows[0]?.id;
        periodoNombre = pRes.rows[0]?.nombre || '';
      } else {
        const pRes = await pool.query('SELECT nombre FROM periodos WHERE id = $1', [pid]);
        periodoNombre = pRes.rows[0]?.nombre || '';
      }
      if (!pid) return { error: 'No hay un periodo activo.' };

      // Metricas generales
      const metricas = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM inscripciones WHERE periodo_id = $1 AND estatus = 'activo') as alumnos_activos,
          (SELECT COUNT(*) FROM grupos WHERE periodo_id = $1) as total_grupos,
          (SELECT COUNT(*) FROM grupos WHERE periodo_id = $1 AND maestro_id IS NULL) as grupos_sin_maestro,
          (SELECT COUNT(DISTINCT maestro_id) FROM grupos WHERE periodo_id = $1 AND maestro_id IS NOT NULL) as maestros_activos,
          (SELECT COALESCE(SUM(monto_final), 0) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id WHERE i.periodo_id = $1 AND p.estatus IN ('pagado', 'completado')) as ingresos_totales,
          (SELECT COALESCE(SUM(monto_final), 0) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id WHERE i.periodo_id = $1 AND p.estatus IN ('pendiente', 'prorroga')) as por_cobrar,
          (SELECT COUNT(*) FROM pagos p JOIN inscripciones i ON p.inscripcion_id = i.id WHERE i.periodo_id = $1 AND p.estatus = 'vencido') as pagos_vencidos
      `, [pid]);

      const m = metricas.rows[0];
      
      // Alertas criticas
      const alertas = [];
      if (parseInt(m.grupos_sin_maestro) > 0) alertas.push(`${m.grupos_sin_maestro} grupos sin maestro asignado`);
      if (parseInt(m.pagos_vencidos) > 0) alertas.push(`${m.pagos_vencidos} pagos vencidos`);
      if (parseInt(m.alumnos_activos) === 0) alertas.push('No hay alumnos inscritos');

      // Recomendaciones
      const recomendaciones = [];
      if (parseInt(m.grupos_sin_maestro) > 0) recomendaciones.push('Asignar maestros a grupos pendientes');
      if (parseInt(m.pagos_vencidos) > 5) recomendaciones.push('Gestionar cobranza de pagos vencidos');
      if (parseFloat(m.por_cobrar) > parseFloat(m.ingresos_totales) * 0.5) recomendaciones.push('Alta cartera pendiente - Reforzar seguimiento');

      return {
        periodo: periodoNombre,
        metricas: {
          alumnos_activos: parseInt(m.alumnos_activos || 0),
          total_grupos: parseInt(m.total_grupos || 0),
          maestros_activos: parseInt(m.maestros_activos || 0),
          ingresos_totales: parseFloat(m.ingresos_totales || 0),
          por_cobrar: parseFloat(m.por_cobrar || 0),
          pagos_vencidos: parseInt(m.pagos_vencidos || 0)
        },
        alertas_criticas: alertas,
        recomendaciones: recomendaciones,
        estado_general: alertas.length === 0 ? 'OPTIMO' : alertas.length <= 2 ? 'ATENCION' : 'CRITICO'
      };
    } catch (e) {
      return { error: e.message };
    }
  }
};
