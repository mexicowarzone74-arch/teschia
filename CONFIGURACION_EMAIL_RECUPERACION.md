# Configuración de Recuperación de Contraseña por Email

## 📧 Funcionalidad Implementada

Se ha agregado la funcionalidad completa de recuperación de contraseña por correo electrónico:

### ✅ Características

1. **Enlace "¿Olvidaste tu contraseña?"** en la página de login
2. **Modal para ingresar email** de recuperación
3. **Email automático** con enlace de restablecimiento
4. **Token de seguridad** válido por 1 hora
5. **Página dedicada** para crear nueva contraseña
6. **Validación de requisitos** en tiempo real

## 🔧 Configuración del Email (SMTP)

### Opción 1: Gmail (Recomendado)

1. **Habilitar "Verificación en 2 pasos"** en tu cuenta de Gmail:
   - Ve a https://myaccount.google.com/security
   - Activa "Verificación en 2 pasos"

2. **Crear "Contraseña de aplicación"**:
   - Ve a https://myaccount.google.com/ap
   
   
   
   
   
   
   ppasswords
   - Selecciona "Correo" y "Windows"
   - Copia la contraseña generada (16 caracteres)

3. **Configurar en `.env`**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=tu-email@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop  # App Password de 16 dígitos
   FRONTEND_URL=http://coordinacion-tescha.local
   ```

### Opción 2: Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@outlook.com
SMTP_PASS=tu-contraseña
```

### Opción 3: Otro Proveedor

Consulta la documentación de tu proveedor de email para obtener:
- SMTP Host
- SMTP Port
- Usuario y Contraseña

### Modo Desarrollo (Sin Email)

Si NO configuraste SMTP, el sistema funcionará en **modo desarrollo**:
- No se enviará email real
- El enlace se mostrará en la **consola del backend**
- Útil para pruebas locales

## 🚀 Cómo Usar

### Para Usuarios

1. En la página de login, haz clic en **"¿Olvidaste tu contraseña?"**
2. Ingresa tu **correo electrónico registrado**
3. Revisa tu **bandeja de entrada** (puede tardar 1-2 minutos)
4. Haz clic en el **botón del email** o copia el enlace
5. Ingresa tu **nueva contraseña** (mínimo 8 caracteres)
6. Confirma y **listo** ✅

### Para Coordinadores

Como coordinador, también puedes:
- Restablecer contraseñas manualmente desde el módulo de Usuarios
- Crear contraseñas temporales para nuevos usuarios
- Forzar cambio de contraseña en el primer login

## 🔒 Seguridad

- ✅ Token único por usuario
- ✅ Expiración de 1 hora
- ✅ Token de un solo uso
- ✅ No se revela si el email existe (prevención de enumeración)
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Registro en auditoría

## 📊 Base de Datos

Se creó la tabla `password_reset_tokens`:

```sql
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    token VARCHAR(255) UNIQUE,
    expira_en TIMESTAMP,
    usado BOOLEAN DEFAULT false,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Pruebas

### Flujo Completo

1. **Solicitar recuperación**:
   ```bash
   POST /api/auth/solicitar-recuperacion
   {
     "email": "usuario@email.com"
   }
   ```

2. **Verificar en consola** (si no hay SMTP):
   ```
   🔐 RECUPERACIÓN DE CONTRASEÑA
   Para: usuario@email.com
   Enlace: http://coordinacion-tescha.local/restablecer-contrasena/abc123...
   ```

3. **Restablecer contraseña**:
   ```bash
   POST /api/auth/restablecer-contrasena
   {
     "token": "abc123...",
     "nuevaPassword": "NuevaPassword123"
   }
   ```

## 📝 Notas Importantes

1. **Email es requerido**: Asegúrate de que todos los usuarios tengan un email registrado
2. **Firewall**: Algunos proveedores de email pueden bloquear SMTP, verifica tu firewall
3. **Rate Limiting**: Se recomienda agregar límite de intentos (ej: 3 por hora)
4. **Producción**: En producción, usa un servicio de email dedicado (SendGrid, Mailgun, etc.)

## 🐛 Troubleshooting

### "Error al enviar email"
- Verifica credenciales SMTP en `.env`
- Revisa que Gmail tenga App Password habilitado
- Verifica firewall/antivirus

### "Token inválido o expirado"
- Los tokens expiran en 1 hora
- Solicita un nuevo enlace de recuperación
- Verifica que la URL sea correcta

### "No recibo el email"
- Revisa carpeta de SPAM
- Verifica que el email esté registrado en el sistema
- Modo desarrollo: Revisa la consola del backend

## 📧 Formato del Email

El email enviado incluye:
- **Asunto**: "Recuperación de Contraseña - TESCHA"
- **Botón destacado** con el enlace
- **URL visible** por si el botón no funciona
- **Tiempo de validez** (1 hora)
- **Instrucciones claras** de seguridad
- **Diseño responsive** (se ve bien en móviles)

## 🔄 Actualizaciones Futuras

Posibles mejoras:
- [ ] Límite de intentos de recuperación
- [ ] Email de confirmación al cambiar contraseña
- [ ] SMS como alternativa al email
- [ ] Historial de cambios de contraseña
- [ ] Recordatorios de cambio periódico

---

**Desarrollado para TESCHA - Sistema de Coordinación de Inglés**  
*Tecnológico de Estudios Superiores de Chalco*
