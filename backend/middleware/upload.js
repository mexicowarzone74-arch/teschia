import multer from 'multer';
import path from 'path';

// Usar memoryStorage para compatibilidad con Render (filesystem efímero)
const storage = multer.memoryStorage();

// Filtro de archivos (solo CSV y PDF)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.csv', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos CSV y PDF'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});
