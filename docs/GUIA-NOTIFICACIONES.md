# 📧 Sistema de Notificaciones - Sin Duplicados

## 🎯 Resumen

El sistema ahora **evita automáticamente** enviar el mismo correo 2 veces o más en el mismo día.

## ✅ Protecciones Implementadas

### 1. **Restricción en Base de Datos**
- Constraint único: `UNIQUE (pago_id, tipo, DATE(fecha_envio))`
- **Imposible** guardar duplicados del mismo pago en el mismo día

### 2. **Verificación Antes de Enviar**
- Función `yaSeEnvioHoy()` verifica si ya se envió
- Solo envía si NO existe registro en la fecha actual

### 3. **Registro Automático**
- Cada correo enviado se registra en `notificaciones_enviadas`
- Incluye: fecha, hora, método (email/manual), tipo

## 🚀 Configuración Rápida

### Paso 1: Aplicar Migración
```bash
# Opción 1: Ejecutar el .bat
.\aplicar-migracion-notificaciones.bat

# Opción 2: Ejecutar directamente
cd backend
psql -U postgres -d tescha -f database/migrations/008_crear_tabla_notificaciones.sql
```

### Paso 2: Verificar Sistema
```bash
# Probar envío (sin duplicados)
.\verificar-notificaciones.bat
```

### Paso 3: Reiniciar PM2
```bash
# Reiniciar para aplicar cambios
.\reiniciar-tescha.bat
```

## 📅 Funcionamiento Automático

### Horario de Envío
- **9:00 AM** todos los días (configurado en PM2)
- Verifica prórrogas por vencer (próximos 3 días)
- Verifica prórrogas vencidas

### Comportamiento
```
Primera ejecución (9:00 AM):
✅ 5 prórrogas encontradas
✅ 5 correos enviados

Si ejecutas manualmente (9:30 AM):
✅ 5 prórrogas encontradas
⏭️  0 correos enviados (ya se enviaron hoy)

Siguiente día (9:00 AM):
✅ 5 prórrogas encontradas
✅ 5 correos enviados (nuevo día)
```

## 🔍 Verificar Estado

### Ver registros de notificaciones
```sql
-- Últimas 10 notificaciones
SELECT 
    n.id,
    n.pago_id,
    n.tipo,
    n.metodo,
    n.fecha_envio,
    p.concepto,
    p.monto
FROM notificaciones_enviadas n
JOIN pagos p ON n.pago_id = p.id
ORDER BY n.fecha_envio DESC
LIMIT 10;

-- Notificaciones de hoy
SELECT COUNT(*) as total_hoy
FROM notificaciones_enviadas
WHERE DATE(fecha_envio) = CURRENT_DATE;
```

### Ver logs de PM2
```bash
# Ver logs del proceso de recordatorios
pm2 logs tescha-recordatorios

# Ver últimas ejecuciones
pm2 logs tescha-recordatorios --lines 50
```

## 📊 Tabla de Control

La tabla `notificaciones_enviadas` tiene:

| Campo | Descripción |
|-------|-------------|
| `id` | ID único |
| `pago_id` | Referencia al pago |
| `tipo` | 'recordatorio' o 'vencida' |
| `mensaje` | Contenido del correo |
| `metodo` | 'email' o 'manual' |
| `fecha_envio` | Fecha y hora exacta |

## 🛡️ Garantías

### ✅ Lo que SÍ puede pasar:
- Enviar 1 recordatorio por pago al día
- Enviar 1 alerta de vencida por pago al día
- Un mismo pago puede tener ambas notificaciones

### ❌ Lo que NO puede pasar:
- Enviar el mismo correo 2 veces en el mismo día
- Duplicar notificaciones si ejecutas manualmente
- Perder el registro de envíos

## 🔧 Configuración de Email

En el archivo `.env`:
```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password
EMAIL_COORDINADOR=coordinador@tescha.com
```

### Obtener contraseña de aplicación (Gmail):
1. Ir a [myaccount.google.com](https://myaccount.google.com)
2. Seguridad → Verificación en 2 pasos (activar)
3. Contraseñas de aplicaciones → Crear nueva
4. Usar esa contraseña en `EMAIL_PASS`

## 📝 Logs Importantes

### Backend: `backend/logs/pm2-out.log`
```
✅ Sistema de Email configurado
✅ Cron jobs de notificaciones iniciados
```

### Recordatorios: `backend/logs/recordatorios-out.log`
```
📊 Prórrogas por vencer: 5
📤 Enviados: 5 recordatorios
⏭️  Ya enviado hoy (recordatorio) - EMAIL - 09:00:15
```

## 🆘 Solución de Problemas

### Problema: "No se envían correos"
```bash
# 1. Verificar credenciales
cat backend/.env | grep EMAIL

# 2. Probar manualmente
.\verificar-notificaciones.bat

# 3. Ver errores
pm2 logs tescha-recordatorios --err
```

### Problema: "Parece que se envían duplicados"
```bash
# Verificar registros en base de datos
psql -U postgres -d tescha
SELECT * FROM notificaciones_enviadas 
WHERE DATE(fecha_envio) = CURRENT_DATE;
```

### Problema: "La tabla no existe"
```bash
# Aplicar migración
.\aplicar-migracion-notificaciones.bat
```

## 📞 Soporte

Si tienes algún problema:
1. Revisa los logs: `pm2 logs`
2. Verifica la tabla: `\d notificaciones_enviadas` en psql
3. Ejecuta: `.\verificar-notificaciones.bat`

---

✅ **Sistema configurado correctamente**  
🔒 **Duplicados prevenidos automáticamente**  
📧 **Correos diarios a las 9:00 AM**
