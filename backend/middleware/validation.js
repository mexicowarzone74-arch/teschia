import Joi from 'joi';

/**
 * Esquemas de validación para todas las entidades del sistema
 * Usa Joi para validación robusta de datos de entrada
 */

// =============================================
// ESQUEMAS DE AUTENTICACIÓN
// =============================================

export const loginSchema = Joi.object({
    username: Joi.string()
        .pattern(/^[a-zA-Z0-9._-]+$/)
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.pattern.base': 'El usuario solo puede contener letras, números, puntos, guiones y guiones bajos',
            'string.min': 'El usuario debe tener al menos 3 caracteres',
            'string.max': 'El usuario no puede exceder 50 caracteres',
            'any.required': 'El usuario es requerido'
        }),
    password: Joi.string()
        .min(8)
        .required()
        .messages({
            'string.min': 'La contraseña debe tener al menos 8 caracteres',
            'any.required': 'La contraseña es requerida'
        })
});

export const changePasswordSchema = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
            'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
            'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
            'any.required': 'La nueva contraseña es requerida'
        })
});

// =============================================
// ESQUEMAS DE ALUMNOS
// =============================================

export const alumnoSchema = Joi.object({
    tipo_alumno: Joi.string()
        .valid('interno', 'externo')
        .required()
        .messages({
            'any.only': 'El tipo de alumno debe ser "interno" o "externo"',
            'any.required': 'El tipo de alumno es requerido'
        }),
    matricula: Joi.string()
        .max(50)
        .allow(null, '')
        .messages({
            'string.max': 'La matrícula no puede exceder 50 caracteres'
        }),
    nombre_completo: Joi.string()
        .max(200)
        .required()
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .messages({
            'string.max': 'El nombre no puede exceder 200 caracteres',
            'string.pattern.base': 'El nombre solo puede contener letras y espacios',
            'any.required': 'El nombre completo es requerido'
        }),
    correo: Joi.string()
        .email()
        .max(150)
        .required()
        .messages({
            'string.email': 'Debe ser un correo electrónico válido',
            'string.max': 'El correo no puede exceder 150 caracteres',
            'any.required': 'El correo es requerido'
        }),
    telefono: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .allow(null, '')
        .messages({
            'string.pattern.base': 'El teléfono debe tener 10 dígitos'
        }),
    carrera: Joi.string()
        .max(100)
        .allow(null, ''),
    semestre: Joi.number()
        .integer()
        .min(1)
        .max(12)
        .allow(null)
        .messages({
            'number.min': 'El semestre debe ser al menos 1',
            'number.max': 'El semestre no puede exceder 12'
        }),
    procedencia: Joi.string()
        .max(200)
        .allow(null, ''),
    nivel_actual: Joi.string()
        .valid('Básico', 'Intermedio', 'Avanzado', 'Perfeccionamiento 1', 'Perfeccionamiento 2', 'C1')
        .allow(null)
        .messages({
            'any.only': 'El nivel debe ser Básico, Intermedio, Avanzado, Perfeccionamiento 1, Perfeccionamiento 2 o C1'
        }),
    es_nuevo_ingreso: Joi.boolean()
        .default(false),
    fecha_ingreso: Joi.date()
        .allow(null),
    nombre: Joi.string().max(100).allow(null, ''),
    apellido_paterno: Joi.string().max(100).allow(null, ''),
    apellido_materno: Joi.string().max(100).allow(null, '')
});

// =============================================
// ESQUEMAS DE MAESTROS
// =============================================

export const maestroSchema = Joi.object({
    nombre: Joi.string()
        .max(100)
        .required()
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .messages({
            'string.pattern.base': 'El nombre solo puede contener letras y espacios',
            'any.required': 'El nombre es requerido'
        }),
    apellido_paterno: Joi.string()
        .max(100)
        .required()
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .messages({
            'string.pattern.base': 'El apellido solo puede contener letras y espacios',
            'any.required': 'El apellido paterno es requerido'
        }),
    apellido_materno: Joi.string()
        .max(100)
        .allow(null, '')
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
        .messages({
            'string.pattern.base': 'El apellido solo puede contener letras y espacios'
        }),
    rfc: Joi.string()
        .length(13)
        .pattern(/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/)
        .allow(null, '')
        .messages({
            'string.length': 'El RFC debe tener 13 caracteres',
            'string.pattern.base': 'Formato de RFC inválido'
        }),
    correo: Joi.string()
        .email()
        .max(150)
        .required()
        .messages({
            'string.email': 'Debe ser un correo electrónico válido',
            'any.required': 'El correo es requerido'
        }),
    telefono: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .allow(null, '')
        .messages({
            'string.pattern.base': 'El teléfono debe tener 10 dígitos'
        })
});

// =============================================
// ESQUEMAS DE PAGOS
// =============================================

export const pagoSchema = Joi.object({
    alumno_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'any.required': 'El ID del alumno es requerido'
        }),
    periodo_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'any.required': 'El ID del periodo es requerido'
        }),
    monto: Joi.number()
        .positive()
        .precision(2)
        .max(999999.99)
        .required()
        .messages({
            'number.positive': 'El monto debe ser positivo',
            'number.max': 'El monto no puede exceder 999,999.99',
            'any.required': 'El monto es requerido'
        }),
    concepto: Joi.string()
        .max(100)
        .required()
        .messages({
            'any.required': 'El concepto es requerido'
        }),
    fecha_pago: Joi.date()
        .allow(null),
    metodo_pago: Joi.string()
        .valid('efectivo', 'tarjeta', 'transferencia', 'cheque')
        .allow(null)
        .messages({
            'any.only': 'Método de pago inválido'
        }),
    referencia: Joi.string()
        .max(100)
        .allow(null, ''),
    tiene_prorroga: Joi.boolean()
        .default(false),
    fecha_limite_prorroga: Joi.date()
        .when('tiene_prorroga', {
            is: true,
            then: Joi.required(),
            otherwise: Joi.allow(null)
        })
        .messages({
            'any.required': 'La fecha límite de prórroga es requerida cuando hay prórroga'
        })
});

// =============================================
// ESQUEMAS DE CALIFICACIONES
// =============================================

export const calificacionSchema = Joi.object({
    inscripcion_id: Joi.number()
        .integer()
        .positive()
        .required(),
    alumno_id: Joi.number()
        .integer()
        .positive()
        .required(),
    grupo_id: Joi.number()
        .integer()
        .positive()
        .required(),
    parcial: Joi.number()
        .integer()
        .valid(1, 2, 3, 4)
        .required()
        .messages({
            'any.only': 'El parcial debe ser 1, 2, 3 o 4'
        }),
    calificacion: Joi.number()
        .min(0)
        .max(100)
        .precision(2)
        .required()
        .messages({
            'number.min': 'La calificación no puede ser negativa',
            'number.max': 'La calificación no puede exceder 100',
            'any.required': 'La calificación es requerida'
        })
});

// =============================================
// ESQUEMAS DE GRUPOS
// =============================================

export const grupoSchema = Joi.object({
    codigo: Joi.string()
        .max(50)
        .required()
        .pattern(/^[A-Z0-9-]+$/)
        .messages({
            'string.pattern.base': 'El código solo puede contener letras mayúsculas, números y guiones',
            'any.required': 'El código es requerido'
        }),
    periodo_id: Joi.number()
        .integer()
        .positive()
        .required(),
    nivel: Joi.string()
        .valid('Básico', 'Intermedio', 'Avanzado', 'Perfeccionamiento 1', 'Perfeccionamiento 2', 'C1')
        .required()
        .messages({
            'any.only': 'El nivel debe ser Básico, Intermedio, Avanzado, Perfeccionamiento 1, Perfeccionamiento 2 o C1',
            'any.required': 'El nivel es requerido'
        }),
    maestro_id: Joi.number()
        .integer()
        .positive()
        .allow(null),
    modalidad: Joi.string()
        .valid('semestral', 'intensivo')
        .allow(null)
        .messages({
            'any.only': 'La modalidad debe ser "semestral" o "intensivo"'
        }),
    cupo_maximo: Joi.number()
        .integer()
        .positive()
        .min(1)
        .max(50)
        .required()
        .messages({
            'number.min': 'El cupo debe ser al menos 1',
            'number.max': 'El cupo no puede exceder 50',
            'any.required': 'El cupo máximo es requerido'
        })
});

// =============================================
// MIDDLEWARE DE VALIDACIÓN
// =============================================

export const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Retornar todos los errores, no solo el primero
            stripUnknown: true // Remover campos no definidos en el esquema
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Contraseña incorrecta o usuario no encontrado',
                details: errors
            });
        }

        // Reemplazar req.body con los valores validados y sanitizados
        req.body = value;
        next();
    };
};

// =============================================
// EXPORTAR TODOS LOS ESQUEMAS
// =============================================

export default {
    loginSchema,
    changePasswordSchema,
    alumnoSchema,
    maestroSchema,
    pagoSchema,
    calificacionSchema,
    grupoSchema,
    validate
};
