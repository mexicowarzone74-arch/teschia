import jwt from 'jsonwebtoken';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('🔐 Auth middleware - Token recibido:', token ? 'Sí' : 'No');
    
    if (!token) {
      console.log('❌ Auth middleware - No hay token');
      throw new Error();
    }
    
    const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_c901b258b934f85c38a8671b61cffb6ff15d009';
    console.log('🔐 Auth middleware - JWT_SECRET:', JWT_SECRET ? 'Definido' : 'NO DEFINIDO');
    
    // 🔒 SEGURIDAD: Validación estricta de JWT
    // Solo permitir algoritmo HS256, prevenir 'none'
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // Solo HS256, rechazar 'none' y otros
      complete: false
    });
    
    console.log('✅ Auth middleware - Token válido, usuario:', decoded.username, 'Rol:', decoded.rol);
    
    // Validar claims críticos
    if (!decoded.id || !decoded.username || !decoded.rol) {
      console.log('❌ Auth middleware - Claims faltantes');
      throw new Error('Token inválido: claims faltantes');
    }
    
    // Validar que el rol sea válido
    const rolesValidos = ['coordinador', 'maestro', 'administrativo', 'alumno'];
    if (!rolesValidos.includes(decoded.rol)) {
      console.log('❌ Auth middleware - Rol no válido:', decoded.rol);
      throw new Error('Token inválido: rol no válido');
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Auth middleware - Error:', error.message);
    res.status(401).json({ error: 'Por favor autentícate' });
  }
};

export const checkRole = (...roles) => {
  return (req, res, next) => {
    // Aplanar el array en caso de que se pase como checkRole(['rol1', 'rol2'])
    const rolesPermitidos = roles.flat();
    console.log('🔒 checkRole - Usuario:', req.user?.username, 'Rol actual:', req.user?.rol, 'Roles permitidos:', rolesPermitidos);
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      console.log('❌ checkRole - ACCESO DENEGADO');
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
    }
    console.log('✅ checkRole - ACCESO PERMITIDO');
    next();
  };
};
