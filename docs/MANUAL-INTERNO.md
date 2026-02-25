# 📘 MANUAL INTERNO - SISTEMA TESCHA

> **Sistema de Coordinación de Inglés**  
> Versión 2.0 - Uso Interno  
> Última actualización: Diciembre 2025

---

## 🚀 INICIO RÁPIDO

### Iniciar el Sistema
```powershell
# Desde la carpeta raíz de TESCHA:
.\iniciar-tescha.bat
```

### Detener el Sistema
```powershell
.\detener-tescha.bat
```

### Reiniciar el Sistema
```powershell
.\reiniciar-tescha.bat
```

---

## 💾 BACKUPS

### Configurar Backup Automático ⭐ RECOMENDADO
```powershell
# Ejecutar como administrador (clic derecho > Ejecutar como administrador)
.\configurar-backup-automatico.bat

# O directamente en PowerShell
.\configurar-backup-automatico.ps1
```

**Opciones disponibles:**
- **Diario:** Todos los días a las 2:00 AM
- **Semanal:** Domingos a las 2:00 AM (recomendado)
- **Personalizado:** Tú eliges días y hora

### Crear Backup Manual
```powershell
# Opción 1: Ejecutar el script .bat (Windows)
.\backup-tescha.bat

# Opción 2: Ejecutar el script PowerShell
.\backup-tescha.ps1
```

### Gestionar Backup Automático
```powershell
# Ver estado del backup automático
Get-ScheduledTask -TaskName "TESCHA-Backup-Automatico"

# Ejecutar backup ahora (sin esperar al horario)
Start-ScheduledTask -TaskName "TESCHA-Backup-Automatico"

# Deshabilitar temporalmente
Disable-ScheduledTask -TaskName "TESCHA-Backup-Automatico"

# Reactivar
Enable-ScheduledTask -TaskName "TESCHA-Backup-Automatico"

# Eliminar backup automático
.\desactivar-backup-automatico.ps1
```

**📁 Ubicación de backups:** `backups/`  
**📅 Retención:** Los backups se guardan por 30 días automáticamente

### Restaurar un Backup
```powershell
# 1. Detener el sistema
.\detener-tescha.bat

# 2. Restaurar la base de datos
psql -U postgres -d tescha_db < backups\tescha_backup_20251222.sql

# 3. Reiniciar el sistema
.\iniciar-tescha.bat
```

### ⚠️ IMPORTANTE: Crear Backups
- **Antes de actualizar el sistema**
- **Una vez por semana (mínimo)**
- **Antes de cambios importantes en la BD**
- **Al final de cada periodo escolar**

---

## 🔧 PROBLEMAS COMUNES

### El sistema no inicia

**Síntoma:** Al ejecutar `iniciar-tescha.bat` no pasa nada

**Soluciones:**
1. Verificar que PostgreSQL esté corriendo:
   ```powershell
   Get-Service postgresql*
   ```

2. Verificar estado de PM2:
   ```powershell
   cd backend
   pm2 status
   ```

3. Si PM2 no responde:
   ```powershell
   pm2 kill
   .\iniciar-tescha.bat
   ```

---

### Error de conexión a base de datos

**Síntoma:** El backend arranca pero no conecta con PostgreSQL

**Verificar:**
1. El archivo `backend\.env` tiene las credenciales correctas:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tescha_db
   DB_USER=postgres
   DB_PASSWORD=tu_password_aqui
   ```

2. PostgreSQL está corriendo:
   ```powershell
   psql -U postgres -d tescha_db
   ```

---

### Los emails no se envían

**Síntoma:** Las notificaciones se registran pero no llegan correos

**Verificar:**
1. Credenciales de email en `backend\.env`:
   ```
   EMAIL_USER=tu_email@gmail.com
   EMAIL_PASS=tu_contraseña_de_aplicacion
   EMAIL_COORDINADOR=coordinador@tescha.com
   ```

2. La contraseña es una **contraseña de aplicación** de Gmail (no la contraseña normal)

**Cómo obtener contraseña de aplicación:**
1. Ir a: https://myaccount.google.com/security
2. Activar verificación en 2 pasos
3. Ir a "Contraseñas de aplicaciones"
4. Generar nueva contraseña para "Correo"
5. Copiar la contraseña de 16 caracteres al .env

---

### El frontend no carga

**Síntoma:** Al abrir http://localhost:3000 no aparece nada

**Verificar:**
1. El frontend está compilado:
   ```powershell
   cd frontend
   npm run build
   ```

2. Vite está corriendo:
   ```powershell
   npm run dev
   ```

3. Limpiar caché del navegador (Ctrl + Shift + R)

---

### Olvidé mi contraseña

**Para coordinadores:**
```sql
-- Conectar a PostgreSQL
psql -U postgres -d tescha_db

-- Ver usuarios
SELECT id, username, rol FROM usuarios;

-- Resetear contraseña (nueva contraseña: temporal123)
UPDATE usuarios 
SET password = '$2a$10$YourHashedPasswordHere', 
    debe_cambiar_password = true
WHERE username = 'tu_usuario';
```

**Consulta al administrador del sistema para resetear contraseñas**

---

## 📊 MONITOREO

### Ver Logs del Sistema
```powershell
# Backend
cd backend
pm2 logs tescha-backend

# Solo últimas 50 líneas
pm2 logs tescha-backend --lines 50

# Logs de notificaciones
pm2 logs tescha-recordatorios
```

### Ver Estado de PM2
```powershell
cd backend
pm2 status
pm2 monit  # Monitoreo en tiempo real
```

### Revisar Logs Guardados
```powershell
# Logs están en:
backend\logs\

# Ver último log de errores
Get-Content backend\logs\error-2025-12-22.log -Tail 50
```

---

## 🗄️ BASE DE DATOS

### Acceder a PostgreSQL
```powershell
psql -U postgres -d tescha_db
```

### Comandos Útiles en PostgreSQL
```sql
-- Ver todas las tablas
\dt

-- Ver estructura de una tabla
\d alumnos

-- Ver tamaño de la base de datos
SELECT pg_size_pretty(pg_database_size('tescha_db'));

-- Ver cantidad de registros
SELECT 
  'alumnos' as tabla, COUNT(*) FROM alumnos UNION ALL
  SELECT 'maestros', COUNT(*) FROM maestros UNION ALL
  SELECT 'grupos', COUNT(*) FROM grupos UNION ALL
  SELECT 'pagos', COUNT(*) FROM pagos;
```

---

## 🔐 SEGURIDAD

### Cambiar Contraseña de PostgreSQL
```sql
-- Conectar como postgres
psql -U postgres

-- Cambiar contraseña
ALTER USER postgres PASSWORD 'nueva_password_segura';

-- Actualizar en backend\.env
```

### Cambiar JWT Secret
```powershell
# 1. Editar backend\.env
JWT_SECRET=nuevo_secreto_super_seguro_aqui

# 2. Reiniciar backend
.\reiniciar-tescha.bat

# NOTA: Todos los usuarios deberán volver a hacer login
```

---

## 📞 CONTACTO Y SOPORTE

### Administrador del Sistema
- **Nombre:** [Tu Nombre]
- **Email:** [tu_email@tescha.com]
- **Teléfono:** [Tu Teléfono]

### Reportar Problemas
1. Crear backup de la BD
2. Capturar pantalla del error
3. Copiar logs relevantes
4. Contactar al administrador

---

## 📝 TAREAS DE MANTENIMIENTO

### Semanales
- [ ] Crear backup manual de la base de datos
- [ ] Revisar logs de errores
- [ ] Verificar espacio en disco

### Mensuales
- [ ] Revisar notificaciones enviadas
- [ ] Limpiar logs antiguos (más de 90 días)
- [ ] Actualizar dependencias si es necesario

### Por Periodo
- [ ] Backup completo antes de cerrar periodo
- [ ] Generar reportes del periodo
- [ ] Archivar datos del periodo anterior

---

## 🎓 FLUJO DE TRABAJO TÍPICO

### Inicio de Periodo
1. Crear nuevo periodo en el sistema
2. Configurar tarifas del periodo
3. Crear grupos necesarios
4. Asignar maestros a grupos
5. Habilitar inscripciones

### Durante el Periodo
1. Inscribir alumnos a grupos
2. Registrar pagos
3. Aprobar/rechazar prórrogas
4. Capturar calificaciones
5. Registrar asistencias

### Cierre de Periodo
1. Verificar todos los pagos
2. Capturar calificaciones finales
3. Generar reportes
4. Crear backup final
5. Cerrar el periodo

---

## ⚙️ CONFIGURACIÓN AVANZADA

### Cambiar Puerto del Backend
```powershell
# Editar backend\.env
PORT=5001

# Reiniciar
.\reiniciar-tescha.bat
```

### Cambiar Horario de Notificaciones
```javascript
// Editar: backend\ecosystem.config.cjs
// Línea: cron_restart

cron_restart: '0 9 * * *',  // 9:00 AM
// Cambiar a:
cron_restart: '0 10 * * *', // 10:00 AM

// Reiniciar PM2
pm2 restart tescha-recordatorios
```

### Deshabilitar Notificaciones Automáticas
```powershell
cd backend
pm2 stop tescha-recordatorios
```

---

## 📚 RECURSOS ADICIONALES

### Archivos Importantes
- `README.md` - Información general del proyecto
- `RESUMEN_FINAL.md` - Cambios recientes
- `GUIA-NOTIFICACIONES.md` - Sistema de notificaciones
- `backend\.env` - Configuración del sistema
- `backend\ecosystem.config.cjs` - Configuración de PM2

### Comandos de Desarrollo
```powershell
# Backend (modo desarrollo)
cd backend
npm run dev

# Frontend (modo desarrollo)
cd frontend
npm run dev

# Instalar dependencias
npm install
```

---

## ✅ CHECKLIST DE INICIO DE DÍA

- [ ] Verificar que el sistema esté corriendo (`pm2 status`)
- [ ] Revisar si hay errores en logs (`pm2 logs --lines 20`)
- [ ] Verificar notificaciones enviadas hoy
- [ ] Revisar prórrogas pendientes

---

## 🆘 EN CASO DE EMERGENCIA

### El sistema se cayó y no arranca

```powershell
# 1. Detener todo
.\detener-tescha.bat
pm2 kill

# 2. Reiniciar PostgreSQL
Restart-Service postgresql*

# 3. Esperar 10 segundos
Start-Sleep -Seconds 10

# 4. Iniciar de nuevo
.\iniciar-tescha.bat

# 5. Verificar
pm2 status
pm2 logs --lines 50
```

### Pérdida de datos

```powershell
# 1. NO HACER NADA MÁS
# 2. Detener el sistema inmediatamente
.\detener-tescha.bat

# 3. Contactar al administrador
# 4. Restaurar último backup
```

---

**🎉 ¡Sistema TESCHA listo para usar!**

*Para más información, consultar al administrador del sistema.*
