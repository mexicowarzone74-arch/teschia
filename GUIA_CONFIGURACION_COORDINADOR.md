# 🛠️ Guía Maestra de Configuración: Computadora de Coordinación

Este documento detalla todos los pasos para instalar el sistema TESCHA/CELEX desde cero en una computadora nueva, optimizada para equipos sin tarjeta de video (GPU).

---

## 1. Requisitos de Software
Instala las siguientes herramientas en este orden preciso:

### A. Motores y Lenguajes
1.  **Node.js (LTS)**: [Descargar aquí](https://nodejs.org/).
2.  **Git**: [Descargar aquí](https://git-scm.com/).
3.  **PostgreSQL (v15+)**: [Descargar aquí](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
    *   *Nota:* Durante la instalación, pon como contraseña: `postgres` (o la que tú prefieras, pero anótala).
    *   *Puerto:* `5432`.

### B. Herramientas de Red e IA
4.  **Bonjour Print Services**: [Descargar aquí](https://support.apple.com/kb/dl999?locale=es_MX).
    *   *IMPORTANTE:* Esto es lo que permite usar el dominio `.local` sin configurar servidores DNS.
5.  **Ollama**: [Descargar aquí](https://ollama.com/).
    *   Una vez instalado, abre una terminal y ejecuta:
        ```bash
        ollama pull phi3:mini
        ```

---

## 2. Configuración de Identidad (Dominio .local)
Para que el sistema se llame igual que el tuyo (`coordinacion-tescha.local`):
1.  En Windows, busca "Cambiar nombre a este equipo".
2.  Ponle el nombre: `coordinacion-tescha`.
3.  **Reinicia la computadora.**
4.  A partir de ahora, la PC responderá a `http://coordinacion-tescha.local` dentro de la red.

---

## 3. Preparación de la Base de Datos
1.  Abre **pgAdmin 4** (se instala con PostgreSQL).
2.  Crea una nueva base de datos llamada: `tescha_db`.
3.  Para cargar las tablas, abre una terminal en la carpeta del proyecto y ejecuta:
    ```bash
    cd backend
    psql -U postgres -d tescha_db -f database/schema.sql
    psql -U postgres -d tescha_db -f database/seed.sql
    ```

---

## 4. Instalación del Sistema
1.  **Clonar/Descargar código:**
    ```bash
    git clone <tu-repositorio>
    cd TESCHA
    ```
2.  **Backend:**
    ```bash
    cd backend
    npm install
    # Crea el archivo .env (copia el .env.example)
    copy .env.example .env
    ```
    *Edita el `.env` con los datos de tu base de datos y tu API Key de Groq.*
3.  **Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```

---

## 5. Automatización y Nginx
### A. Iniciar con PM2 (Mantenimiento 24/7)
Para que el sistema siempre esté prendido:
```bash
npm install -g pm2
cd backend
pm2 start server.js --name "tescha-backend"
pm2 save
pm2 startup
```

### B. Configuración de Nginx (Windows)
1.  Descarga Nginx para Windows.
2.  En el archivo `conf/nginx.conf`, añade esta regla para que el puerto 80 mande al sistema:
    ```nginx
    server {
        listen 80;
        server_name coordinacion-tescha.local;
        location / {
            proxy_pass http://localhost:5173; # Puerto del Frontend
        }
        location /api {
            proxy_pass http://localhost:5000; # Puerto del Backend
        }
    }
    ```

---

## 6. ¿Por qué NO usamos Docker? (Importante)
Aunque Docker es una gran herramienta, **NO se recomienda** para la computadora del coordinador por estas razones:
1.  **Consumo de Recursos**: Docker Desktop en Windows consume mucha memoria RAM (~4GB solo de base), lo que alentaría una PC básica.
2.  **Rendimiento de IA**: Ollama corre mucho más rápido de forma nativa en el sistema que dentro de un contenedor en Windows.
3.  **Simplicidad**: El uso de **PM2** y scripts `.bat` es mucho más ligero y fácil de mantener para un equipo sin gráfica.

## 7. Mantenimiento Diario
He dejado preparados tres archivos en la carpeta principal para facilitar el uso:
*   `iniciar-tescha.bat`: Pulsa doble clic al encender la PC para arrancar todo.
*   `reiniciar-tescha.bat`: Úsalo si el sistema se siente lento.
*   `detener-tescha.bat`: Para apagar el sistema antes de apagar la PC.

---
**¡Listo! Con esto la PC del coordinador será un servidor de alto rendimiento operando en una máquina sencilla.**
