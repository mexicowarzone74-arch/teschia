# Guía de Despliegue: TESCHA en la Nube

## Arquitectura en producción

```
Cloudflare Pages          Render (Servicio 1)       Render (Servicio 2)
   (Frontend)    ──API──>  (Backend Node.js)  ──AI──> (Motor IA Python)
       |                         |
       |                    Supabase
       |                  (PostgreSQL)
```

---

## Paso 1 — Subir el código a GitHub

1. Crea un repositorio en [github.com](https://github.com/new) (puede ser privado).
2. Desde la carpeta raíz del proyecto (`teschaia-main`) ejecuta:

```bash
git init
git add .
git commit -m "deploy: configuración inicial para producción"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/tescha.git
git push -u origin main
```

---

## Paso 2 — Supabase (Base de datos PostgreSQL)

1. Ve a [supabase.com](https://supabase.com) → **New project**.
2. Elige nombre: `tescha-db`, contraseña segura y región (p. ej. `South America (São Paulo)`).
3. Espera que arranque (~2 min).
4. En el panel izquierdo: **SQL Editor** → pega y ejecuta el contenido de:
   - `backend/database/schema.sql`
   - `backend/database/seed.sql` (datos iniciales, opcional)
5. Ve a **Project Settings → Database** y copia:
   - **Host** → `DB_HOST`
   - **Database** → `DB_NAME`
   - **User** → `DB_USER`
   - **Password** → la que elegiste → `DB_PASSWORD`
   - O bien copia la **Connection string (URI)** → `DATABASE_URL`

> ⚠️ Activa **Row Level Security (RLS)** solo si planeas exponer la DB directamente desde el frontend. Para este proyecto no es necesario ya que todo pasa por el backend.

---

## Paso 3 — Render (Backend Node.js)

1. Ve a [render.com](https://render.com) → **New → Web Service**.
2. Conecta tu repositorio de GitHub.
3. Configura:
   | Campo | Valor |
   |---|---|
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
   | **Plan** | Free (o Starter para producción real) |

4. En **Environment Variables** agrega:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=<connection string de Supabase>
JWT_SECRET=<clave aleatoria larga, mínimo 64 chars>
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://tescha.pages.dev   ← ponla después de crear la app en Cloudflare
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu_email@gmail.com
SMTP_PASS=<contraseña de aplicación de Gmail>
SECURITY_ALERT_EMAIL=admin@tudominio.com
ENABLE_EMAIL_ALERTS=true
ENCRYPTION_KEY=<64 hex chars: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
GROQ_API_KEY=<tu clave de groq.com>
AI_ENGINE_URL=https://tescha-ai.onrender.com   ← ponla después de crear el servicio IA
```

5. Haz clic en **Deploy**. La primera vez tarda ~3-5 minutos.
6. Copia la URL asignada (p. ej. `https://tescha-backend.onrender.com`).

---

## Paso 4 — Render (Motor IA Python)

1. Vuelve a Render → **New → Web Service**.
2. Mismo repositorio de GitHub.
3. Configura:
   | Campo | Valor |
   |---|---|
   | **Root Directory** | `backend/ai_engine` |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

4. Variables de entorno:
```
GROQ_API_KEY=<tu clave de groq.com>
OPENROUTER_API_KEY=<opcional, si usas OpenRouter>
```

5. Deploy → copia la URL (p. ej. `https://tescha-ai.onrender.com`).
6. **Actualiza** la variable `AI_ENGINE_URL` en el servicio del Backend (Paso 3) con esta URL.

---

## Paso 5 — Cloudflare Pages (Frontend)

1. Ve a [pages.cloudflare.com](https://pages.cloudflare.com) → **Create a project → Connect to Git**.
2. Selecciona tu repositorio.
3. Configura el build:
   | Campo | Valor |
   |---|---|
   | **Root directory** | `frontend` |
   | **Framework preset** | `Vite` |
   | **Build command** | `npm install && npm run build` |
   | **Build output directory** | `dist` |

4. En **Environment variables** agrega:
```
VITE_API_URL=https://tescha-backend.onrender.com/api
```

5. Haz clic en **Save and Deploy**. El build tarda ~1-2 minutos.
6. Cloudflare te dará una URL como `https://tescha.pages.dev`.
7. **Vuelve al backend en Render** y actualiza `FRONTEND_URL` con esa URL para que CORS funcione.

### Dominio personalizado (opcional)
En Cloudflare Pages → **Custom domains** → agrega tu dominio (p. ej. `app.tescha.com`).

---

## Paso 6 — Verificación final

Revisa que todo funcione:

- [ ] `https://tescha-backend.onrender.com/health` → debe responder `200 OK`
- [ ] `https://tescha-ai.onrender.com/` → debe responder `{"status":"online",...}`
- [ ] `https://tescha.pages.dev` → debe cargar el login
- [ ] Iniciar sesión con un usuario de prueba
- [ ] Verificar que el chat IA responde

---

## Variables de entorno — Resumen

| Variable | Dónde se pone | Descripción |
|---|---|---|
| `DATABASE_URL` | Render (backend) | Connection string de Supabase |
| `JWT_SECRET` | Render (backend) | Clave secreta JWT |
| `FRONTEND_URL` | Render (backend) | URL de Cloudflare Pages |
| `GROQ_API_KEY` | Render (backend + IA) | API key de Groq |
| `AI_ENGINE_URL` | Render (backend) | URL del servicio Python en Render |
| `SMTP_*` | Render (backend) | Credenciales de email |
| `ENCRYPTION_KEY` | Render (backend) | Clave de 64 hex chars |
| `VITE_API_URL` | Cloudflare Pages | URL del backend de Render |

---

## Notas importantes

### Plan gratuito de Render
- Los servicios gratuitos se **duermen** tras 15 min de inactividad. La primera petición tarda ~30 seg en "despertar".
- Para uso real en producción considera el plan **Starter ($7/mes por servicio)**.

### Supabase
- El plan gratuito tiene límite de **500 MB** y la DB se pausa tras 1 semana sin actividad (proyecto inactivo).
- Para producción real considera el plan **Pro ($25/mes)**.

### CORS
- Si agregas un dominio personalizado en Cloudflare, también agrega ese dominio en la variable `FRONTEND_URL` del backend.
- Puedes poner múltiples URLs separadas por coma si el código lo soporta, o agrega el dominio personalizado también.

### Socket.io
- Socket.io funciona en Render, pero en el plan gratuito puede tener latencia. En Cloudflare Pages el frontend se conectará al WebSocket del backend en Render directamente.

---

## Comandos útiles para desarrollo local

```bash
# Generar ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
