import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { checkPermission, requireRole } from '../middleware/permissions.js';

const router = express.Router();

// =============================================
// GET /api/pagos - Obtener pagos con filtros
// (Administrativo puede ver)
// =============================================
router.get('/', auth, checkPermission('pagos', 'ver'), async (req, res) => {
    try {
        const { estatus, periodo_id, alumno_id, search, tiene_prorroga, orden = 'default', limit = 500, offset = 0 } = req.query;

        // Usar vista pagos_pendientes para consultas optimizadas
        let query = `
            SELECT 
                p.*,
                i.alumno_id,
                CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as alumno_nombre,
                a.matricula,
                a.tipo_alumno,
                a.correo as alumno_correo,
                g.codigo as grupo_codigo,
                n.nombre as nivel_nombre,
                per.nombre as periodo_nombre,
                per.activo as periodo_activo,
                p.tiene_prorroga,
                p.fecha_limite_prorroga,
                (SELECT pr2.estatus FROM prorrogas pr2 WHERE pr2.pago_id = p.id ORDER BY pr2.created_at DESC LIMIT 1) as estatus_prorroga,
                CASE 
                    WHEN p.estatus = 'vencido' THEN CURRENT_DATE - p.fecha_vencimiento
                    WHEN p.estatus = 'pendiente' AND p.fecha_vencimiento < CURRENT_DATE THEN CURRENT_DATE - p.fecha_vencimiento
                    ELSE 0
                END as dias_vencido,
                CASE 
                    WHEN p.estatus = 'pendiente' AND p.fecha_vencimiento >= CURRENT_DATE THEN p.fecha_vencimiento - CURRENT_DATE
                    ELSE 0
                END as dias_restantes
            FROM pagos p
            JOIN inscripciones i ON p.inscripcion_id = i.id
            JOIN alumnos a ON i.alumno_id = a.id
            JOIN grupos g ON i.grupo_id = g.id
            JOIN niveles n ON g.nivel_id = n.id
            JOIN periodos per ON i.periodo_id = per.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        // Filtro de periodo (por defecto solo activo)
        if (periodo_id) {
            query += ` AND per.id = $${paramCount++}`;
            params.push(periodo_id);
        } else if (!req.query.todos) {
            query += ` AND per.activo = true`;
        }

        // Filtro de estatus
        if (estatus) {
            const estatusArray = estatus.split(',').map(s => s.trim());
            if (estatusArray.length === 1) {
                query += ` AND p.estatus = $${paramCount++}`;
                params.push(estatus);
            } else {
                const placeholders = estatusArray.map((_, index) => `$${paramCount + index}`).join(', ');
                query += ` AND p.estatus IN (${placeholders})`;
                estatusArray.forEach(s => params.push(s));
                paramCount += estatusArray.length;
            }
        }

        // Filtro de alumno
        if (alumno_id) {
            query += ` AND i.alumno_id = $${paramCount++}`;
            params.push(alumno_id);
        }

        // Búsqueda por nombre o matrícula
        if (search) {
            query += ` AND (CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) ILIKE $${paramCount} OR a.matricula ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        // Filtro de prórrogas
        if (tiene_prorroga === 'true') {
            query += ` AND p.tiene_prorroga = true`;
        }


        // Ordenamiento según el parámetro 'orden'
        if (orden === 'recientes') {
            // Ordenar por última actualización (últimos movimientos)
            query += ` ORDER BY p.updated_at DESC, p.created_at DESC, p.id DESC`;
        } else {
            // Ordenamiento por defecto: Priorizar lo más reciente (especialmente lo de hoy)
            // pero manteniendo cierta relevancia por estatus si las fechas son iguales
            query += ` ORDER BY 
                p.updated_at DESC,
                CASE 
                    WHEN p.estatus = 'vencido' THEN 1
                    WHEN p.estatus = 'pendiente' OR p.estatus = 'prorroga' THEN 2
                    WHEN p.estatus = 'pagado' OR p.estatus = 'completado' THEN 3
                    ELSE 4
                END,
                p.created_at DESC,
                p.id DESC`;
        }
        
        query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Contar total - usar una query más simple sin los subqueries de prórroga
        let countQuery = `
            SELECT COUNT(*) as count
            FROM pagos p
            JOIN inscripciones i ON p.inscripcion_id = i.id
            JOIN alumnos a ON i.alumno_id = a.id
            JOIN grupos g ON i.grupo_id = g.id
            JOIN niveles n ON g.nivel_id = n.id
            JOIN periodos per ON i.periodo_id = per.id
            WHERE 1=1
        `;
        
        // Reconstruir las condiciones WHERE para el conteo
        let countParams = [];
        let countParamIndex = 1;
        
        if (periodo_id) {
            countQuery += ` AND per.id = $${countParamIndex++}`;
            countParams.push(periodo_id);
        } else if (!req.query.todos) {
            countQuery += ` AND per.activo = true`;
        }
        
        if (estatus) {
            const estatusArray = estatus.split(',').map(s => s.trim());
            if (estatusArray.length === 1) {
                countQuery += ` AND p.estatus = $${countParamIndex++}`;
                countParams.push(estatus);
            } else {
                const placeholders = estatusArray.map((_, index) => `$${countParamIndex + index}`).join(', ');
                countQuery += ` AND p.estatus IN (${placeholders})`;
                estatusArray.forEach(s => countParams.push(s));
                countParamIndex += estatusArray.length;
            }
        }
        
        if (alumno_id) {
            countQuery += ` AND i.alumno_id = $${countParamIndex++}`;
            countParams.push(alumno_id);
        }
        
        if (search) {
            countQuery += ` AND (CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) ILIKE $${countParamIndex} OR a.matricula ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
        }
        
        
        if (tiene_prorroga === 'true') {
            countQuery += ` AND p.tiene_prorroga = true`;
        }
        
        
        const countResult = await pool.query(countQuery, countParams);

        res.json({
            pagos: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error al obtener pagos:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// GET /api/pagos/pendientes - Pagos pendientes
// =============================================
router.get('/pendientes', auth, checkPermission('pagos', 'ver'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM pagos_pendientes
            WHERE estatus IN ('pendiente', 'prorroga')
            ORDER BY dias_prorroga DESC, fecha_vencimiento ASC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener pagos pendientes:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// GET /api/pagos/prorroga - Pagos con prórroga
// =============================================
router.get('/prorroga', auth, checkPermission('pagos', 'ver'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM pagos_pendientes
            WHERE estatus = 'prorroga'
            ORDER BY dias_prorroga DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener pagos con prórroga:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// GET /api/pagos/:id - Obtener pago por ID
// =============================================
router.get('/:id', auth, checkPermission('pagos', 'ver'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                i.alumno_id,
                CONCAT(a.nombre, ' ', a.apellido_paterno, ' ', COALESCE(a.apellido_materno, '')) as alumno_nombre,
                a.matricula,
                a.tipo_alumno,
                a.correo as alumno_correo,
                g.codigo as grupo_codigo,
                n.nombre as nivel_nombre,
                per.nombre as periodo_nombre
            FROM pagos p
            JOIN inscripciones i ON p.inscripcion_id = i.id
            JOIN alumnos a ON i.alumno_id = a.id
            JOIN grupos g ON i.grupo_id = g.id
            JOIN niveles n ON g.nivel_id = n.id
            JOIN periodos per ON i.periodo_id = per.id
            WHERE p.id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        // Obtener prórroga si existe
        const prorroga = await pool.query(
            'SELECT * FROM prorrogas WHERE pago_id = $1 ORDER BY created_at DESC LIMIT 1',
            [req.params.id]
        );

        const pago = result.rows[0];
        pago.prorroga = prorroga.rows[0] || null;

        res.json(pago);
    } catch (error) {
        console.error('Error al obtener pago:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// POST /api/pagos - Crear pago
// =============================================
router.post('/', auth, requireRole('coordinador'), checkPermission('pagos', 'crear'), async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const {
            inscripcion_id,
            numero_pago,
            concepto,
            monto,
            fecha_vencimiento,
            metodo_pago,
            referencia,
            descuento = 0,
            estatus = 'pagado',
            fecha_limite_prorroga
        } = req.body;

        // Validaciones
        if (!inscripcion_id || !numero_pago || !concepto || !monto || !fecha_vencimiento) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios: inscripcion_id, numero_pago, concepto, monto, fecha_vencimiento' 
            });
        }
        
        // Validar tipos numéricos
        const montoNum = parseFloat(monto);
        const descuentoNum = parseFloat(descuento);
        const numeroPagoNum = parseInt(numero_pago);
        
        if (isNaN(montoNum) || montoNum <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El monto debe ser un número válido mayor a 0' });
        }
        
        if (isNaN(descuentoNum) || descuentoNum < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El descuento debe ser un número válido mayor o igual a 0' });
        }
        
        if (isNaN(numeroPagoNum) || numeroPagoNum <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El número de pago debe ser un número entero válido' });
        }

        // Verificar que la inscripción existe y obtener el alumno_id
        const inscripcion = await client.query('SELECT * FROM inscripciones WHERE id = $1', [inscripcion_id]);
        if (inscripcion.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Inscripción no encontrada' });
        }
        
        const alumno_id = inscripcion.rows[0].alumno_id;

        // Verificar que el recibo no esté duplicado (si se proporciona)
        if (referencia && referencia.trim() !== '') {
            const referenciaExistente = await client.query(
                'SELECT id FROM pagos WHERE referencia = $1',
                [referencia]
            );
            if (referenciaExistente.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `El número de recibo "${referencia}" ya está registrado. Cada recibo debe ser único.` 
                });
            }
        }

        // Calcular monto final con valores ya validados
        const monto_final = montoNum - descuentoNum;
        
        // Determinar si tiene prórroga
        const tiene_prorroga = estatus === 'pendiente' && fecha_limite_prorroga ? true : false;
        
        // Establecer fecha_pago si el estatus es 'pagado' o 'completado'
        const fecha_pago = (estatus === 'pagado' || estatus === 'completado') ? new Date() : null;

        // Insertar pago
        const result = await client.query(
            `INSERT INTO pagos 
             (inscripcion_id, numero_pago, concepto, monto, fecha_vencimiento, metodo_pago, 
              referencia, descuento, monto_final, estatus, tiene_prorroga, fecha_limite_prorroga, fecha_pago, registrado_por) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
             RETURNING *`,
            [inscripcion_id, numero_pago, concepto, monto, fecha_vencimiento, metodo_pago,
             referencia, descuento, monto_final, estatus, tiene_prorroga, fecha_limite_prorroga || null, fecha_pago, req.user.id]
        );

        const pagoId = result.rows[0].id;

        // Si se proporcionó fecha_limite_prorroga, también crear registro en tabla prorrogas
        if (fecha_limite_prorroga && (estatus === 'pendiente' || estatus === 'prorroga')) {
            await client.query(
                `INSERT INTO prorrogas 
                 (pago_id, motivo, fecha_limite_original, fecha_limite_nueva, solicitada_por, estatus, revisada_por, fecha_revision)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
                [pagoId, 'Prórroga al crear pago', fecha_vencimiento, fecha_limite_prorroga, alumno_id, 'aprobada', req.user.id]
            );
        }

        await logAudit(req.user.id, 'CREATE', 'pagos', pagoId, null, result.rows[0], req.ip);

        await client.query('COMMIT');
        
        // Emitir evento de Socket.io
        const io = req.app.get('io');
        if (io) {
            io.emit('pago:created', {
                id: pagoId,
                alumno_id: alumno_id,
                concepto: result.rows[0].concepto,
                monto: result.rows[0].monto_final
            });
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear pago:', error);
        res.status(500).json({ error: 'Error al crear pago: ' + error.message });
    } finally {
        client.release();
    }
});

// =============================================
// PUT /api/pagos/:id - Actualizar pago
// =============================================
router.put('/:id', auth, requireRole('coordinador'), checkPermission('pagos', 'editar'), async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // Campos permitidos
        const CAMPOS_PERMITIDOS = [
            'numero_pago', 'concepto', 'monto', 'fecha_vencimiento', 'fecha_pago',
            'estatus', 'metodo_pago', 'referencia', 'comprobante_url', 'recibo_numero',
            'descuento', 'notas', 'tiene_prorroga', 'fecha_limite_prorroga'
        ];

        const fields = {};
        const fecha_limite_prorroga = req.body.fecha_limite_prorroga; // Guardar para procesarlo después
        
        Object.keys(req.body).forEach(key => {
            if (CAMPOS_PERMITIDOS.includes(key)) {
                // Convertir strings vacíos a NULL para campos de fecha
                if (['fecha_vencimiento', 'fecha_pago', 'fecha_limite_prorroga'].includes(key) && req.body[key] === '') {
                    fields[key] = null;
                } else {
                    fields[key] = req.body[key];
                }
            }
        });

        // Recalcular monto_final si cambia monto o descuento
        if (fields.monto !== undefined || fields.descuento !== undefined) {
            const pagoActual = await client.query('SELECT monto, descuento FROM pagos WHERE id = $1', [id]);
            if (pagoActual.rows.length > 0) {
                const montoNuevo = fields.monto !== undefined ? fields.monto : pagoActual.rows[0].monto;
                const descuentoNuevo = fields.descuento !== undefined ? fields.descuento : pagoActual.rows[0].descuento;
                fields.monto_final = parseFloat(montoNuevo) - parseFloat(descuentoNuevo);
            }
        }

        if (Object.keys(fields).length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar' });
        }

        const oldData = await client.query('SELECT * FROM pagos WHERE id = $1', [id]);

        if (oldData.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        // Verificar que el recibo no esté duplicado (si se está actualizando)
        if (fields.referencia && fields.referencia.trim() !== '') {
            const referenciaExistente = await client.query(
                'SELECT id FROM pagos WHERE referencia = $1 AND id != $2',
                [fields.referencia, id]
            );
            if (referenciaExistente.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `El número de recibo "${fields.referencia}" ya está registrado. Cada recibo debe ser único.` 
                });
            }
        }

        const keys = Object.keys(fields);
        const values = Object.values(fields);
        const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');

        const result = await client.query(
            `UPDATE pagos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} RETURNING *`,
            [...values, id]
        );

        // Actualizar fecha de prórroga si se proporcionó
        if (fecha_limite_prorroga) {
            await client.query(
                `UPDATE prorrogas 
                 SET fecha_limite_nueva = $1, motivo = $2, revisada_por = $3, fecha_revision = CURRENT_TIMESTAMP
                 WHERE pago_id = $4 AND estatus = 'aprobada'`,
                [fecha_limite_prorroga, 'Prórroga actualizada manualmente', req.user.id, id]
            );
        }

        await logAudit(req.user.id, 'UPDATE', 'pagos', id, oldData.rows[0], result.rows[0], req.ip);

        await client.query('COMMIT');

        // Emitir evento de Socket.io
        const io = req.app.get('io');
        if (io) {
            io.emit('pago:updated', {
                id: parseInt(id),
                estatus: result.rows[0].estatus,
                monto: result.rows[0].monto_final
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar pago:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// =============================================
// POST /api/pagos/:id/registrar - Registrar pago
// =============================================
router.post('/:id/registrar', auth, requireRole('coordinador'), checkPermission('pagos', 'editar'), async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { metodo_pago, referencia, comprobante_url, recibo_numero, notas } = req.body;

        const oldData = await client.query('SELECT * FROM pagos WHERE id = $1', [id]);

        if (oldData.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        // Verificar que el recibo no esté duplicado (si se proporciona)
        if (referencia && referencia.trim() !== '') {
            const referenciaExistente = await client.query(
                'SELECT id FROM pagos WHERE referencia = $1 AND id != $2',
                [referencia, id]
            );
            if (referenciaExistente.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `El número de recibo "${referencia}" ya está registrado. Cada recibo debe ser único.` 
                });
            }
        }

        const result = await client.query(
            `UPDATE pagos 
             SET estatus = 'pagado', 
                 fecha_pago = CURRENT_TIMESTAMP,
                 metodo_pago = $1,
                 referencia = $2,
                 comprobante_url = $3,
                 recibo_numero = $4,
                 notas = $5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [metodo_pago, referencia, comprobante_url, recibo_numero, notas, id]
        );

        await logAudit(req.user.id, 'UPDATE', 'pagos', id, oldData.rows[0], result.rows[0], req.ip);

        await client.query('COMMIT');
        
        // Emitir evento de Socket.io
        const io = req.app.get('io');
        if (io) {
            io.emit('pago:registered', {
                id: parseInt(id),
                metodo: metodo_pago,
                monto: result.rows[0].monto_final
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al registrar pago:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// =============================================
// DELETE /api/pagos/:id - Eliminar pago
// =============================================
router.delete('/:id', auth, requireRole('coordinador'), checkPermission('pagos', 'eliminar'), async (req, res) => {
    try {
        const { id } = req.params;

        const oldData = await pool.query('SELECT * FROM pagos WHERE id = $1', [id]);

        if (oldData.rows.length === 0) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        await pool.query('DELETE FROM pagos WHERE id = $1', [id]);

        await logAudit(req.user.id, 'DELETE', 'pagos', id, oldData.rows[0], null, req.ip);

        // Emitir evento de Socket.io
        const io = req.app.get('io');
        if (io) {
            io.emit('pago:deleted', { id: parseInt(id) });
        }

        res.json({ message: 'Pago eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar pago:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// PRÓRROGA - Solicitar prórroga
// =============================================
router.post('/:id/prorroga', auth, requireRole('coordinador'), checkPermission('pagos', 'crear'), async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { motivo, documentos_adjuntos, fecha_limite_nueva } = req.body;

        // Validaciones
        if (!motivo || !fecha_limite_nueva) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Faltan campos obligatorios: motivo, fecha_limite_nueva' });
        }

        // Obtener pago
        const pago = await client.query('SELECT * FROM pagos WHERE id = $1', [id]);
        if (pago.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        // Obtener alumno de la inscripción
        const inscripcion = await client.query(
            'SELECT alumno_id FROM inscripciones WHERE id = $1',
            [pago.rows[0].inscripcion_id]
        );

        // Crear prórroga
        const result = await client.query(
            `INSERT INTO prorrogas 
             (pago_id, motivo, documentos_adjuntos, fecha_limite_original, fecha_limite_nueva, 
              solicitada_por, estatus) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [id, motivo, documentos_adjuntos, pago.rows[0].fecha_vencimiento, fecha_limite_nueva,
             inscripcion.rows[0].alumno_id, 'pendiente']
        );

        await client.query('COMMIT');
        
        // Emitir evento de Socket.io
        const io = req.app.get('io');
        if (io) {
            io.emit('pago:prorroga_requested', {
                pago_id: parseInt(id),
                nueva_fecha: fecha_limite_nueva
            });
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al solicitar prórroga:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// =============================================
// PRÓRROGA - Aprobar/Rechazar prórroga
// =============================================
router.put('/prorroga/:id/:accion', auth, requireRole('coordinador'), checkPermission('pagos', 'editar'), async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { id, accion } = req.params;
        const { observaciones_coordinador } = req.body;

        if (!['aprobar', 'rechazar'].includes(accion)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Acción inválida. Usa "aprobar" o "rechazar"' });
        }

        const estatus = accion === 'aprobar' ? 'aprobada' : 'rechazada';

        const result = await client.query(
            `UPDATE prorrogas 
             SET estatus = $1,
                 revisada_por = $2,
                 fecha_revision = CURRENT_TIMESTAMP,
                 observaciones_coordinador = $3
             WHERE id = $4
             RETURNING *`,
            [estatus, req.user.id, observaciones_coordinador, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Prórroga no encontrada' });
        }

        // Si se aprueba, actualizar fecha de vencimiento del pago
        if (accion === 'aprobar') {
            await client.query(
                'UPDATE pagos SET fecha_vencimiento = $1 WHERE id = $2',
                [result.rows[0].fecha_limite_nueva, result.rows[0].pago_id]
            );
        }

        await client.query('COMMIT');
        
        // Emitir evento de Socket.io
        const io = req.app.get('io');
        if (io) {
            io.emit('pago:prorroga_resolved', {
                id: result.rows[0].id,
                pago_id: result.rows[0].pago_id,
                estatus: estatus
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al procesar prórroga:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// =============================================
// ESTADÍSTICAS - Resumen de pagos
// =============================================
router.get('/estadisticas/resumen', auth, checkPermission('pagos', 'ver'), async (req, res) => {
    try {
        const { periodo_id } = req.query;

        let whereClause = '';
        const params = [];

        if (periodo_id) {
            whereClause = 'WHERE per.id = $1';
            params.push(periodo_id);
        } else {
            whereClause = 'WHERE per.activo = true';
        }

        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_pagos,
                COUNT(CASE WHEN p.estatus = 'pagado' THEN 1 END) as pagos_completados,
                COUNT(CASE WHEN p.estatus = 'pendiente' THEN 1 END) as pagos_pendientes,
                COUNT(CASE WHEN p.estatus = 'prorroga' THEN 1 END) as pagos_prorroga,
                COUNT(CASE WHEN p.estatus = 'vencido' THEN 1 END) as pagos_vencidos,
                COALESCE(SUM(CASE WHEN p.estatus = 'pagado' THEN p.monto_final ELSE 0 END), 0) as ingresos_totales,
                COALESCE(SUM(CASE WHEN p.estatus IN ('pendiente', 'vencido', 'prorroga') THEN p.monto_final ELSE 0 END), 0) as cuentas_por_cobrar
            FROM pagos p
            JOIN inscripciones i ON p.inscripcion_id = i.id
            JOIN periodos per ON i.periodo_id = per.id
            ${whereClause}
        `, params);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// GET /api/pagos/estadisticas/financieras - Estadísticas financieras detalladas
// =============================================
router.get('/estadisticas/financieras', auth, checkPermission('pagos', 'ver'), async (req, res) => {
    try {
        const { periodo_id } = req.query;
        
        // Obtener período activo si no se especifica
        let periodoFinal = periodo_id;
        if (!periodoFinal) {
            const periodoActivo = await pool.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
            if (periodoActivo.rows.length > 0) {
                periodoFinal = periodoActivo.rows[0].id;
            }
        }

        // Consulta principal para estadísticas del período
        const estadisticas = await pool.query(`
            SELECT 
                -- Conteos generales
                COUNT(*) as total_pagos,
                COUNT(CASE WHEN p.estatus = 'pagado' THEN 1 END) as pagos_completados,
                COUNT(CASE WHEN p.estatus = 'pendiente' THEN 1 END) as pagos_pendientes,
                COUNT(CASE WHEN p.estatus = 'prorroga' THEN 1 END) as pagos_prorroga,
                COUNT(CASE WHEN p.estatus = 'vencido' THEN 1 END) as pagos_vencidos,
                
                -- Ingresos totales
                COALESCE(SUM(CASE WHEN p.estatus = 'pagado' THEN p.monto_final ELSE 0 END), 0) as ingresos_totales,
                COALESCE(SUM(CASE WHEN p.estatus IN ('pendiente', 'prorroga', 'vencido') THEN p.monto_final ELSE 0 END), 0) as cuentas_por_cobrar,
                
                -- Pagos de hoy
                COUNT(CASE 
                    WHEN p.estatus = 'pagado' 
                    AND p.fecha_pago IS NOT NULL 
                    AND DATE(p.fecha_pago) = CURRENT_DATE 
                    THEN 1 
                END) as pagos_hoy,
                
                -- Ingresos de hoy (usando fecha_pago en lugar de created_at para mayor precisión)
                COALESCE(SUM(
                    CASE WHEN p.estatus = 'pagado' 
                         AND p.fecha_pago IS NOT NULL 
                         AND DATE(p.fecha_pago) = CURRENT_DATE 
                    THEN p.monto_final ELSE 0 END
                ), 0) as ingresos_hoy,
                
                -- Ingresos de los últimos 7 días
                COALESCE(SUM(
                    CASE WHEN p.estatus = 'pagado' 
                         AND p.fecha_pago IS NOT NULL 
                         AND DATE(p.fecha_pago) >= CURRENT_DATE - INTERVAL '7 days' 
                    THEN p.monto_final ELSE 0 END
                ), 0) as ingresos_semana,
                
                -- Ingresos del mes actual
                COALESCE(SUM(
                    CASE WHEN p.estatus = 'pagado' 
                         AND p.fecha_pago IS NOT NULL 
                         AND DATE_TRUNC('month', p.fecha_pago) = DATE_TRUNC('month', CURRENT_DATE) 
                    THEN p.monto_final ELSE 0 END
                ), 0) as ingresos_mes,
                
                -- Ingresos del mes anterior
                COALESCE(SUM(
                    CASE WHEN p.estatus = 'pagado' 
                         AND p.fecha_pago IS NOT NULL 
                         AND DATE_TRUNC('month', p.fecha_pago) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
                    THEN p.monto_final ELSE 0 END
                ), 0) as ingresos_mes_anterior,
                
                -- Conteo de pagos con prórroga activa
                COUNT(CASE 
                    WHEN p.estatus IN ('pendiente', 'prorroga', 'vencido')
                    AND EXISTS(
                        SELECT 1 FROM prorrogas pr 
                        WHERE pr.pago_id = p.id 
                        AND pr.estatus = 'aprobada' 
                        AND pr.fecha_limite_nueva >= CURRENT_DATE
                    ) THEN 1 
                END) as prorrogas_activas,
                
                -- Conteo de prórrogas vencidas
                COUNT(CASE 
                    WHEN p.estatus IN ('pendiente', 'prorroga', 'vencido')
                    AND EXISTS(
                        SELECT 1 FROM prorrogas pr 
                        WHERE pr.pago_id = p.id 
                        AND pr.estatus = 'aprobada' 
                        AND pr.fecha_limite_nueva < CURRENT_DATE
                    ) THEN 1 
                END) as prorrogas_vencidas,
                
                -- Conteo de prórrogas por vencer (próximos 7 días)
                COUNT(CASE 
                    WHEN EXISTS(
                        SELECT 1 FROM prorrogas pr 
                        WHERE pr.pago_id = p.id 
                        AND pr.estatus = 'aprobada' 
                        AND pr.fecha_limite_nueva >= CURRENT_DATE
                        AND pr.fecha_limite_nueva <= CURRENT_DATE + INTERVAL '7 days'
                        AND p.estatus NOT IN ('pagado', 'completado')
                    ) THEN 1 
                END) as prorrogas_por_vencer,
                
                -- Total de prórrogas (solo pagos no pagados que tienen prórroga aprobada)
                COUNT(CASE 
                    WHEN p.estatus IN ('pendiente', 'prorroga', 'vencido') 
                    AND EXISTS(
                        SELECT 1 FROM prorrogas pr 
                        WHERE pr.pago_id = p.id 
                        AND pr.estatus = 'aprobada'
                    ) 
                    THEN 1 
                END) as total_prorrogas
                
            FROM pagos p
            JOIN inscripciones i ON p.inscripcion_id = i.id
            WHERE i.periodo_id = $1
        `, [periodoFinal]);

        // Obtener información del período
        const periodoInfo = await pool.query(
            'SELECT nombre, activo FROM periodos WHERE id = $1',
            [periodoFinal]
        );

        const stats = estadisticas.rows[0];
        
        // Convertir valores de string a number para consistencia
        const resultado = {
            periodo: periodoInfo.rows[0] || null,
            total: parseInt(stats.total_pagos),
            completados: parseInt(stats.pagos_completados),
            pendientes: parseInt(stats.pagos_pendientes),
            prorroga: parseInt(stats.pagos_prorroga),
            prorrogas: parseInt(stats.total_prorrogas),
            prorrogasActivas: parseInt(stats.prorrogas_activas),
            prorrogasVencidas: parseInt(stats.prorrogas_vencidas),
            prorrogasPorVencer: parseInt(stats.prorrogas_por_vencer),
            ingresosHoy: parseFloat(stats.ingresos_hoy),
            ingresosSemana: parseFloat(stats.ingresos_semana),
            ingresosMes: parseFloat(stats.ingresos_mes),
            ingresosMesAnterior: parseFloat(stats.ingresos_mes_anterior),
            ingresosPeriodo: parseFloat(stats.ingresos_totales),
            porCobrar: parseFloat(stats.cuentas_por_cobrar),
            // Metadatos para auditoría
            fechaCalculo: new Date().toISOString(),
            periodoId: periodoFinal
        };

        res.json(resultado);
    } catch (error) {
        console.error('Error al obtener estadísticas financieras:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
