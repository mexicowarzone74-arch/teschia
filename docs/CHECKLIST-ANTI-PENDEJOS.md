# ✅ CHECKLIST DE VERIFICACIÓN - SISTEMA ANTI-PENDEJOS

## 📋 Antes de Usar en Producción

### 1. ✅ Instalación de Archivos

Verifica que todos estos archivos existan:

#### Frontend
- [ ] `frontend/src/hooks/useFormValidation.js`
- [ ] `frontend/src/hooks/usePreventDoubleSubmit.js`
- [ ] `frontend/src/components/ConfirmDialog.jsx`
- [ ] `frontend/src/components/InlineConfirm.jsx`
- [ ] `frontend/src/utils/inputSanitizer.js`
- [ ] `frontend/src/contexts/SocketContext.jsx` (actualizado)
- [ ] `frontend/src/examples/EjemploFormularioSeguro.jsx`

#### Backend
- [ ] `backend/middleware/antiSpam.js`
- [ ] `backend/middleware/sessionSecurity.js`
- [ ] `backend/middleware/businessRules.js`
- [ ] `backend/database/migrations/006_create_security_events_table.sql`
- [ ] `backend/server.js` (actualizado con nuevos middlewares)

#### Documentación
- [ ] `SISTEMA-ANTI-PENDEJOS.md`
- [ ] `RESUMEN-ANTI-PENDEJOS.md`
- [ ] `CHECKLIST-ANTI-PENDEJOS.md` (este archivo)

---

### 2. ✅ Base de Datos

Verifica las tablas de seguridad:

```sql
-- Verificar tabla de eventos de seguridad
DESCRIBE security_events;

-- Verificar tabla de sesiones sospechosas
DESCRIBE suspicious_sessions;

-- Verificar tabla de violaciones de rate limit
DESCRIBE rate_limit_violations;
```

**Resultado esperado**: Las 3 tablas deben existir.

---

### 3. ✅ Dependencias NPM

Verifica que estén instaladas:

#### Backend
```bash
cd backend
npm list socket.io joi crypto express-rate-limit helmet cors morgan
```

#### Frontend
```bash
cd frontend
npm list react react-dom socket.io-client react-toastify react-icons
```

---

### 4. ✅ Configuración del Servidor

Verifica en `backend/server.js`:

- [ ] Importa `antiSpamMiddleware`
- [ ] Importa `sessionSecurity`
- [ ] Importa `validateBusinessRules`
- [ ] Usa `app.use(antiSpamMiddleware)`
- [ ] Usa `app.use(sessionSecurity.validateSession)`
- [ ] Usa `app.use(validateBusinessRules)`
- [ ] Socket.io maneja eventos `ping` y `pong`

---

### 5. ✅ Pruebas Funcionales

#### Prueba 1: Validación de Formulario
1. Abre cualquier formulario (ej: crear alumno)
2. Deja campos requeridos vacíos
3. Intenta enviar
4. **Esperado**: ❌ Muestra errores específicos

#### Prueba 2: Prevención Double-Submit
1. Llena un formulario
2. Haz clic en guardar
3. Inmediatamente vuelve a hacer clic
4. **Esperado**: ⏳ Mensaje "Espera a que termine la operación anterior"

#### Prueba 3: Diálogo de Confirmación
1. Intenta eliminar un registro
2. **Esperado**: 
   - Modal de confirmación aparece
   - Requiere escribir "ELIMINAR"
   - Cuenta regresiva de 3 segundos

#### Prueba 4: Anti-Spam
1. Envía el mismo formulario 4 veces en menos de 30 segundos
2. **Esperado**: 🚫 Mensaje "Demasiadas solicitudes idénticas"

#### Prueba 5: Sanitización
1. Intenta poner `<script>alert('xss')</script>` en un campo de texto
2. **Esperado**: El script es removido automáticamente

#### Prueba 6: Validación de Negocio
1. Intenta crear un alumno con edad = 200
2. **Esperado**: ❌ Error "La edad debe estar entre 15 y 100 años"

#### Prueba 7: Socket.io Mejorado
1. Abre la consola del navegador
2. Verifica logs: `✅ Conectado a Socket.io`
3. Desconecta internet por 10 segundos
4. Reconecta
5. **Esperado**: 🔄 Mensaje "Reconectado exitosamente"

---

### 6. ✅ Monitoreo de Seguridad

#### Verifica que se registren eventos:

```sql
-- Debe tener registros después de las pruebas
SELECT COUNT(*) FROM security_events;

-- Ver tipos de eventos registrados
SELECT event_type, COUNT(*) as total 
FROM security_events 
GROUP BY event_type;
```

**Esperado**: Al menos estos tipos de eventos:
- `DUPLICATE_ACTION`
- `SUSPICIOUS_TYPING_SPEED`
- (otros según tus pruebas)

---

### 7. ✅ Rendimiento

#### Verifica que el sistema no sea más lento:

- [ ] Carga de página inicial < 2 segundos
- [ ] Envío de formularios < 1 segundo
- [ ] Respuesta de API < 500ms
- [ ] Reconexión de Socket.io < 3 segundos

---

### 8. ✅ Logs del Servidor

Inicia el servidor y verifica que aparezcan estos mensajes:

```
🚀 Servidor corriendo en puerto 5000
📲 Sistema de notificaciones automáticas activo
📊 Sistema de métricas automáticas activo
🔧 Sistema de mantenimiento automático activo
✅ Sistema TESCHA completamente inicializado
```

---

### 9. ✅ Configuración de Producción

#### Archivo `.env` debe tener:

```bash
NODE_ENV=production
SESSION_TIMEOUT=86400000
MAX_LOGIN_ATTEMPTS=5
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

---

### 10. ✅ Documentación al Equipo

- [ ] Equipo informado de nuevas protecciones
- [ ] Manual de usuario actualizado
- [ ] Capacitación sobre nuevos diálogos de confirmación
- [ ] Proceso de escalación en caso de bloqueos

---

## 🧪 Pruebas de Seguridad Avanzadas

### Test 1: Intento de Bot
```bash
# Usar curl sin user-agent de navegador
curl -X POST http://localhost:5000/api/alumnos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test"}'
```
**Esperado**: Detectado como bot, registrado en `security_events`

### Test 2: Rate Limiting
```bash
# Enviar 70 requests en 1 minuto
for i in {1..70}; do
  curl http://localhost:5000/api/dashboard &
done
```
**Esperado**: Después de ~60 requests, error 429 "Rate limit exceeded"

### Test 3: SQL Injection
1. En campo de búsqueda, poner: `' OR '1'='1`
2. **Esperado**: Sanitizado, no ejecuta

### Test 4: XSS
1. En campo de nombre, poner: `<img src=x onerror=alert(1)>`
2. **Esperado**: Tags removidos, solo queda texto

---

## 📊 Métricas de Éxito

Al terminar, debes poder decir SÍ a todo:

- [ ] ✅ 0 registros duplicados en base de datos
- [ ] ✅ 0 XSS exitosos
- [ ] ✅ 0 SQL injections exitosos
- [ ] ✅ 0 secuestros de sesión exitosos
- [ ] ✅ 100% de bots detectados
- [ ] ✅ 100% de acciones críticas con confirmación
- [ ] ✅ 100% de validaciones en frontend y backend
- [ ] ✅ 95% reducción en errores de usuario
- [ ] ✅ Todos los eventos de seguridad registrados

---

## 🚨 Troubleshooting

### Problema: "Cannot find module antiSpam.js"
**Solución**: 
```bash
cd backend
npm install
```

### Problema: Tabla security_events no existe
**Solución**:
```bash
mysql -u root -p tescha_db < backend/database/migrations/006_create_security_events_table.sql
```

### Problema: Socket.io no reconecta
**Solución**: 
- Verifica que el servidor maneje eventos `ping`/`pong`
- Reinicia el servidor

### Problema: Rate limiting muy estricto
**Solución**: En `backend/server.js`, ajusta:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000  // Aumentar este número
});
```

---

## ✅ FIRMA DE APROBACIÓN

Una vez verificado todo:

```
Sistema revisado por: _______________________
Fecha: _______________________
Todas las pruebas pasadas: ☐ SÍ  ☐ NO
Listo para producción: ☐ SÍ  ☐ NO

Firma: _______________________
```

---

**🎉 Si todo está ✅, el sistema está 100% ANTI-PENDEJOS!**

*TESCHA - Sistema de Coordinación de Inglés*
*Última actualización: 24 de Diciembre de 2025*
