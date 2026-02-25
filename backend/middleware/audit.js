import pool from '../config/database.js';

export const logAudit = async (usuarioId, accion, tabla, registroId, datosAnteriores = null, datosNuevos = null, ipAddress = null) => {
  try {
    await pool.query(
      `INSERT INTO auditoria (usuario_id, accion, tabla, registro_id, datos_anteriores, datos_nuevos, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [usuarioId, accion, tabla, registroId, datosAnteriores, datosNuevos, ipAddress]
    );
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
};
