import express from 'express';
import pool from '../config/database.js';
import { auth, checkRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import Papa from 'papaparse';
import path from 'path';

const router = express.Router();

// Procesar archivo CSV de calificaciones
router.post('/procesar-calificaciones', auth, checkRole('maestro', 'coordinador'), upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }
    
    const { grupo_id, parcial } = req.body;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (ext === '.csv') {
      // Leer archivo CSV desde buffer (memoryStorage)
      const fileContent = req.file.buffer.toString('utf8');
      
      // Parsear CSV
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true
      });
      
      // Validar estructura
      const requiredFields = ['inscripcion_id', 'alumno_id', 'matricula', 'nombre_completo', 'calificacion'];
      const hasAllFields = requiredFields.every(field => 
        parsed.meta.fields.includes(field)
      );
      
      if (!hasAllFields) {
        return res.status(400).json({ 
          error: 'El archivo CSV no tiene la estructura correcta',
          camposRequeridos: requiredFields,
          camposEncontrados: parsed.meta.fields
        });
      }
      
      // Limpiar datos y convertir
      const calificaciones = parsed.data
        .filter(row => row.calificacion && row.calificacion.trim() !== '')
        .map(row => ({
          inscripcion_id: parseInt(row.inscripcion_id),
          alumno_id: parseInt(row.alumno_id),
          matricula: row.matricula,
          nombre_completo: row.nombre_completo,
          calificacion: parseFloat(row.calificacion),
          observaciones: row.observaciones || ''
        }));
      
      // Validar calificaciones (0-100)
      const invalidas = calificaciones.filter(c => c.calificacion < 0 || c.calificacion > 100);
      if (invalidas.length > 0) {
        return res.status(400).json({ 
          error: 'Algunas calificaciones están fuera del rango 0-100',
          calificaciones_invalidas: invalidas
        });
      }
      
      // Retornar datos parseados para vista previa
      res.json({
        tipo: 'csv',
        total: calificaciones.length,
        calificaciones,
        grupo_id: parseInt(grupo_id),
        parcial: parseInt(parcial)
      });
      
    } else if (ext === '.pdf') {
      // Para PDF, el frontend hace OCR con Tesseract
      // Con memoryStorage el archivo está en req.file.buffer
      res.json({
        tipo: 'pdf',
        mensaje: 'PDF recibido. Procesar en el frontend con Tesseract',
        nombre: req.file.originalname,
        tamaño: req.file.size
      });
    } else {
      res.status(400).json({ error: 'Tipo de archivo no soportado' });
    }
    
  } catch (error) {
    console.error('Error al procesar archivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Guardar calificaciones procesadas
router.post('/guardar-calificaciones', auth, checkRole('maestro', 'coordinador'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { grupo_id, parcial, calificaciones } = req.body;
    
    // Verificar acceso del maestro
    if (req.user.rol === 'maestro') {
      const grupoCheck = await pool.query(
        'SELECT id FROM grupos WHERE id = $1 AND maestro_id = $2',
        [grupo_id, req.user.maestro_id]
      );
      
      if (grupoCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No tienes acceso a este grupo' });
      }
    }
    
    await client.query('BEGIN');
    
    for (const cal of calificaciones) {
      await client.query(
        `INSERT INTO calificaciones (inscripcion_id, alumno_id, grupo_id, parcial, calificacion, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (inscripcion_id, parcial) 
         DO UPDATE SET calificacion = $5, observaciones = $6, updated_at = NOW()`,
        [cal.inscripcion_id, cal.alumno_id, grupo_id, parcial, cal.calificacion, cal.observaciones || '']
      );
    }
    
    await client.query('COMMIT');
    res.json({ 
      message: 'Calificaciones guardadas exitosamente',
      total: calificaciones.length
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al guardar calificaciones:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Procesar archivo CSV de asistencias
router.post('/procesar-asistencias', auth, checkRole('maestro', 'coordinador'), upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }
    
    const { grupo_id, fecha } = req.body;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (ext === '.csv') {
      const fileContent = req.file.buffer.toString('utf8');
      const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
      
      const requiredFields = ['inscripcion_id', 'alumno_id', 'matricula', 'nombre_completo', 'estatus'];
      const hasAllFields = requiredFields.every(field => parsed.meta.fields.includes(field));
      
      if (!hasAllFields) {
        return res.status(400).json({ 
          error: 'Estructura incorrecta',
          camposRequeridos: requiredFields 
        });
      }
      
      const asistencias = parsed.data
        .filter(row => row.estatus && row.estatus.trim() !== '')
        .map(row => ({
          inscripcion_id: parseInt(row.inscripcion_id),
          alumno_id: parseInt(row.alumno_id),
          matricula: row.matricula,
          nombre_completo: row.nombre_completo,
          estatus: row.estatus,
          observaciones: row.observaciones || ''
        }));
      
      res.json({
        tipo: 'csv',
        total: asistencias.length,
        asistencias,
        grupo_id: parseInt(grupo_id),
        fecha
      });
      
    } else {
      res.json({ tipo: 'pdf', nombre: req.file.originalname, tamaño: req.file.size });
    }
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Guardar asistencias procesadas
router.post('/guardar-asistencias', auth, checkRole('maestro', 'coordinador'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { grupo_id, fecha, asistencias } = req.body;
    
    if (req.user.rol === 'maestro') {
      const grupoCheck = await pool.query(
        'SELECT id FROM grupos WHERE id = $1 AND maestro_id = $2',
        [grupo_id, req.user.maestro_id]
      );
      if (grupoCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No tienes acceso a este grupo' });
      }
    }

    // Validar día de la semana
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaSeleccionado = diasSemana[new Date(fecha + 'T12:00:00').getDay()];
    
    const horarioCheck = await pool.query(
      'SELECT id FROM grupos_horarios WHERE grupo_id = $1 AND dia = $2',
      [grupo_id, diaSeleccionado]
    );

    if (horarioCheck.rows.length === 0) {
      // Obtener días válidos para informar al usuario
      const diasValidos = await pool.query('SELECT dia FROM grupos_horarios WHERE grupo_id = $1', [grupo_id]);
      const listaDias = diasValidos.rows.map(d => d.dia).join(', ');
      return res.status(400).json({ 
        error: `El día seleccionado (${diaSeleccionado}) no corresponde al horario de este grupo. Días válidos: ${listaDias}` 
      });
    }
    
    await client.query('BEGIN');
    
    for (const asist of asistencias) {
      const presente = asist.estatus === 'Asistencia' || asist.estatus === 'Retardo';
      const justificada = asist.estatus === 'Justificada';
      const retardo = asist.estatus === 'Retardo';
      
      await client.query(
        `INSERT INTO asistencias (inscripcion_id, fecha, presente, justificada, retardo, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (inscripcion_id, fecha)
         DO UPDATE SET presente = $3, justificada = $4, retardo = $5, observaciones = $6, updated_at = NOW()`,
        [asist.inscripcion_id, fecha, presente, justificada, retardo, asist.observaciones || '']
      );
    }
    
    await client.query('COMMIT');
    res.json({ 
      message: 'Asistencias guardadas exitosamente',
      total: asistencias.length
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
