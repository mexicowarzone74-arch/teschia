# 📧 Sistema de Verificación de Email - TESCHA

## 📋 Descripción General

Sistema completo de verificación de email que se activa automáticamente cuando un coordinador crea un nuevo usuario en el sistema. El nuevo usuario recibe un correo electrónico con un enlace de verificación que debe hacer clic para confirmar que el email le pertenece.

## 🎯 Características

- ✅ **Envío Automático**: Al crear un maestro/administrativo, se envía automáticamente el email de verificación
- ✅ **Token Seguro**: Token único de 32 bytes generado con `crypto.randomBytes`
- ✅ **Expiración**: Los enlaces son válidos por 24 horas
- ✅ **Un solo uso**: Los tokens no pueden reutilizarse
- ✅ **Email HTML**: Plantilla profesional con botón de verificación
- ✅ **Página de Verificación**: Interfaz visual con estados (verificando, exitoso, error)
- ✅ **Seguimiento en BD**: Tabla dedicada para tokens de verificación

## 🗄️ Estructura de Base de Datos

### Tabla `usuarios`
```sql
email VARCHAR(255)              -- Email del usuario
email_verificado BOOLEAN        -- Si el email ha sido verificado
email_verificado_en TIMESTAMP   -- Fecha de verificación
```

### Tabla `email_verification_tokens`
```sql
id SERIAL PRIMARY KEY
usuario_id INTEGER              -- FK a usuarios
token VARCHAR(255) UNIQUE       -- Token único de verificación
email VARCHAR(255)              -- Email al que se envió
expira_en TIMESTAMP            -- Fecha de expiración (24h)
usado BOOLEAN                  -- Si ya fue usado
creado_en TIMESTAMP            -- Fecha de creación
```

## 🔄 Flujo Completo

### 1. Creación de Usuario (Coordinador)
```
Coordinador → Crear Maestro/Administrativo
              ↓
         [POST /api/maestros]
              ↓
    Se crea usuario en BD
              ↓
    Se genera token aleatorio
              ↓
    Se guarda en email_verification_tokens
              ↓
    Se envía email con enlace
              ↓
    Usuario recibe email
```

### 2. Verificación (Usuario)
```
Usuario → Abre email
           ↓
    Hace clic en "Verificar Email"
           ↓
    [GET /verificar-email/:token]
           ↓
    Página extrae token de URL
           ↓
    [POST /api/auth/verificar-email]
           ↓
    Backend valida token
           ↓
    Actualiza usuarios.email_verificado = true
           ↓
    Marca token como usado
           ↓
    Muestra mensaje de éxito
           ↓
    Redirige a login (3 segundos)
```

## 📁 Archivos Implementados

### Backend

#### 1. `services/emailService.js`
```javascript
// Función para enviar email de verificación
export const enviarEmailVerificacion = async (email, nombre, verifyUrl)
```
- Envía email HTML con botón de verificación
- Template profesional con gradiente verde
- Maneja errores sin fallar el proceso de creación

#### 2. `routes/auth.js`
```javascript
// Solicitar verificación manualmente
POST /api/auth/solicitar-verificacion-email
Body: { usuarioId }

// Verificar email con token
POST /api/auth/verificar-email
Body: { token }
```

#### 3. `routes/maestros.js`
```javascript
POST /api/maestros
```
- Modificado para guardar email en tabla usuarios
- Genera token automáticamente después de crear usuario
- Envía email de verificación
- No falla si el email no se puede enviar

#### 4. `database/migrations/012_email_verification.sql`
```sql
-- Agrega campos a usuarios
ALTER TABLE usuarios ADD COLUMN email_verificado BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN email_verificado_en TIMESTAMP;

-- Crea tabla de tokens
CREATE TABLE email_verification_tokens (...)
```

### Frontend

#### 1. `pages/VerificarEmail.jsx`
- Página dedicada para verificación
- Estados: verificando, exitoso, error
- Extrae token de URL automáticamente
- Llama a endpoint de verificación
- Muestra mensajes apropiados
- Redirige a login al completar

#### 2. `App.jsx`
```javascript
// Ruta agregada
<Route path="/verificar-email/:token" element={<VerificarEmail />} />
```

## 🔧 Configuración

### Variables de Entorno (.env)
```bash
# SMTP Configuration (ya existente)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mexicowarzone74@gmail.com
SMTP_PASS=vqkekuhoaniandpb

# Frontend URL (para enlaces)
FRONTEND_URL=http://localhost:3000
```

## 📧 Template de Email

El email incluye:
- 🎨 **Header verde profesional** con logo TESCHA
- 📝 **Mensaje de bienvenida** personalizado con nombre
- 🔘 **Botón verde "Verificar Email"** prominente
- ⏰ **Información de expiración** (24 horas)
- 🔗 **Enlace alternativo** por si el botón no funciona
- ℹ️ **Instrucciones claras** de qué hacer
- 🏫 **Footer institucional** con nombre del TES Chalco

## 🧪 Pruebas

### Script de Prueba
```bash
cd backend
node test-email-verification.js
```

Este script:
1. ✅ Busca un usuario con email
2. ✅ Genera token de verificación
3. ✅ Guarda en base de datos
4. ✅ Envía email
5. ✅ Muestra URL de verificación
6. ✅ Verifica que el token está en BD

### Resultado de Prueba Real
```
✅ Usuario encontrado: Anastacio (eduardolozada1998@gmail.com)
✅ Token generado: bc5b26b496fc23dd6542...
✅ Token guardado en la base de datos
✅ Email de verificación enviado a: eduardolozada1998@gmail.com
```

## 📝 Uso en Producción

### Crear Nuevo Maestro
```javascript
POST /api/maestros
{
  "nombre": "Juan",
  "apellido_paterno": "Pérez",
  "apellido_materno": "García",
  "correo": "juan.perez@example.com",  // ← Email requerido
  "telefono": "5512345678",
  "rol": "maestro",
  "niveles": ["A1", "A2"]
}
```

**Respuesta:**
```json
{
  "maestro": {
    "id": 15,
    "nombre_completo": "Juan Pérez García",
    "correo": "juan.perez@example.com"
  },
  "usuario_creado": {
    "username": "jperez",
    "password": "Temp123$abc",
    "debe_cambiar_password": true
  }
}
```

**Automáticamente:**
- ✅ Se envía email a `juan.perez@example.com`
- ✅ Email contiene enlace de verificación válido por 24h
- ✅ Usuario puede hacer clic para verificar

## 🔍 Verificar Estado de Email

### Consulta SQL
```sql
-- Ver usuarios con email no verificado
SELECT 
  id,
  nombre,
  email,
  email_verificado,
  email_verificado_en
FROM usuarios
WHERE email IS NOT NULL
  AND email_verificado = false;

-- Ver tokens pendientes
SELECT 
  t.token,
  t.email,
  t.expira_en,
  t.usado,
  u.nombre
FROM email_verification_tokens t
JOIN usuarios u ON t.usuario_id = u.id
WHERE t.usado = false
  AND t.expira_en > NOW();
```

## ⚙️ Mantenimiento

### Limpiar Tokens Expirados
```sql
-- Eliminar tokens antiguos (ejecutar periódicamente)
DELETE FROM email_verification_tokens
WHERE expira_en < NOW() - INTERVAL '7 days';
```

### Reenviar Verificación Manualmente
```bash
POST /api/auth/solicitar-verificacion-email
{
  "usuarioId": 26
}
```

## 🚨 Manejo de Errores

### Si el Email No Se Envía
- ❌ **No falla** la creación del usuario
- ✅ Usuario se crea exitosamente
- ⚠️ Se registra en logs
- 🔄 Puede reenviarse manualmente

### Token Expirado
- 🕐 Válido por 24 horas
- ❌ Después expira automáticamente
- 🔄 Puede generarse uno nuevo

### Token Ya Usado
- ✅ Un solo uso permitido
- ❌ No puede reutilizarse
- 🔄 Debe solicitar nuevo token

## 📊 Estados de Verificación

### Frontend (VerificarEmail.jsx)

**1. Verificando** (inicial)
```
🔄 Spinner girando
"Verificando tu email..."
```

**2. Exitoso**
```
✅ Checkmark verde
"¡Email Verificado!"
"Serás redirigido al login en 3 segundos..."
[Botón: Ir al Login]
```

**3. Error**
```
❌ X roja
"Verificación Fallida"
Mensaje de error específico
Posibles razones listadas
[Botón: Volver al Login]
```

## 🔐 Seguridad

- 🔒 **Tokens únicos**: 32 bytes aleatorios (crypto.randomBytes)
- ⏰ **Expiración**: 24 horas máximo
- 🔑 **Un solo uso**: No pueden reutilizarse
- 🗃️ **Índices en BD**: Búsquedas rápidas por token
- 📧 **Validación**: Solo emails con formato válido

## 📱 Integración con Sistema Existente

Este sistema se integra perfectamente con:
- ✅ **Sistema de recuperación de contraseña** (misma estructura de tokens)
- ✅ **Notificaciones por email** (usa el mismo servicio SMTP)
- ✅ **Auditoría** (logs de verificación)
- ✅ **Roles y permisos** (solo coordinadores crean usuarios)

## 🎉 Resultado Final

Cuando un coordinador crea un nuevo maestro o administrativo:

1. ✅ Usuario creado en BD
2. ✅ Email enviado automáticamente
3. ✅ Usuario recibe email profesional
4. ✅ Usuario hace clic en botón
5. ✅ Email verificado
6. ✅ Usuario puede acceder al sistema

Todo el proceso es **automático**, **seguro** y **profesional**.

---

**Última actualización**: 22 de enero de 2026  
**Versión**: 1.0  
**Estado**: ✅ Completamente funcional y probado
