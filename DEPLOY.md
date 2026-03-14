# Guía de despliegue a producción

## Arquitectura en producción

```
Usuario
  │
  ▼
Vercel (CDN global)          ← React build estático
  │  VITE_API_URL
  ▼
Railway (o Render)           ← Spring Boot JAR en contenedor Docker
  │  DATABASE_URL
  ▼
Railway PostgreSQL           ← Base de datos gestionada
```

---

## Paso 1 — Backend en Railway

Railway es la opción más simple para Spring Boot. Plan gratuito: 500h/mes, PostgreSQL incluido.

### 1.1 Crear proyecto

1. Entrar en **railway.app** y hacer login con GitHub.
2. **New Project → Deploy from GitHub repo**.
3. Seleccionar el repo y la carpeta `habit-tracker-backend`.
4. Railway detecta el `Dockerfile` automáticamente.

### 1.2 Añadir PostgreSQL

En el proyecto de Railway:
1. **New → Database → PostgreSQL**.
2. Railway crea la BD y genera automáticamente la variable `DATABASE_URL`.
   - El formato es `postgres://user:pass@host:port/dbname`.
   - Spring Boot lo acepta directamente con el driver de PostgreSQL.

### 1.3 Variables de entorno en Railway

En **Settings → Variables**, añadir:

| Variable | Valor | Nota |
|---|---|---|
| `JWT_SECRET` | (secreto aleatorio largo) | Ver nota abajo |
| `ALLOWED_ORIGINS` | `https://tu-app.vercel.app` | Se rellena después del paso 2 |
| `SPRING_PROFILES_ACTIVE` | `prod` | Activa el perfil de producción |

> **Generar JWT_SECRET seguro:**
> ```bash
> # En tu terminal local:
> openssl rand -base64 64
> # Copia el resultado completo (88 caracteres)
> ```

### 1.4 Verificar el despliegue

Cuando el deploy termine, Railway mostrará la URL pública:
```
https://habit-tracker-backend-production.up.railway.app
```

Probar que funciona:
```bash
curl https://TU-BACKEND.up.railway.app/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'
# Debe devolver 201 con un token JWT
```

---

## Paso 2 — Frontend en Vercel

### 2.1 Importar proyecto

1. Entrar en **vercel.com** y hacer login con GitHub.
2. **Add New → Project → Import Git Repository**.
3. Seleccionar el repo, **Root Directory: `habit-tracker-frontend`**.

### 2.2 Variables de entorno en Vercel

En **Settings → Environment Variables**, añadir:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://TU-BACKEND.up.railway.app/api` |

> Importante: el prefijo `VITE_` es obligatorio. Vite solo expone al bundle del
> cliente las variables que empiezan por `VITE_`. Las demás son privadas del servidor.

### 2.3 Build settings

Vercel los detecta automáticamente desde `package.json`:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

El archivo `vercel.json` ya está configurado para que todas las rutas
(`/dashboard`, `/habits`, etc.) sirvan `index.html`, necesario para React Router.

### 2.4 Actualizar CORS en Railway

Una vez tengas la URL de Vercel (ej: `https://habit-tracker-xyz.vercel.app`):

1. Volver a Railway → Variables.
2. Actualizar `ALLOWED_ORIGINS` con la URL exacta de Vercel.
3. Railway redespliega automáticamente.

---

## Paso 3 — Dominio personalizado (opcional)

### En Vercel
1. **Settings → Domains → Add Domain**.
2. Añadir `habittracker.tudominio.com`.
3. Seguir las instrucciones para añadir el registro CNAME en tu DNS.

### En Railway
Si también quieres dominio personalizado para la API:
1. **Settings → Networking → Custom Domain**.
2. Añadir `api.habittracker.tudominio.com`.
3. Actualizar `VITE_API_URL` y `ALLOWED_ORIGINS` con los nuevos dominios.

---

## Flujo de despliegues posteriores (CI/CD automático)

Una vez configurado, **cada `git push` a `main` despliega automáticamente**:

```
git push origin main
  │
  ├─► Vercel detecta cambios en habit-tracker-frontend/
  │     → build → despliega en CDN global (~30 seg)
  │
  └─► Railway detecta cambios en habit-tracker-backend/
        → docker build → despliega (~2-3 min)
```

No necesitas hacer nada manualmente.

---

## Variables de entorno — resumen completo

### Railway (backend)
```
SPRING_PROFILES_ACTIVE=prod
DATABASE_URL=postgres://...    ← generada automáticamente por Railway
JWT_SECRET=<64+ chars aleatorios>
ALLOWED_ORIGINS=https://tu-app.vercel.app
```

### Vercel (frontend)
```
VITE_API_URL=https://tu-backend.up.railway.app/api
```

---

## Alternativa: Render (también gratuito)

Si prefieres Render en lugar de Railway:

**Backend:**
1. **New → Web Service → Connect repo → Root: `habit-tracker-backend`**.
2. **Runtime: Docker** (detecta el Dockerfile).
3. Las mismas variables de entorno que en Railway.

**Base de datos:**
1. **New → PostgreSQL**.
2. Copiar la "Internal Database URL" como `DATABASE_URL`.

> Render tiene cold starts en el plan gratuito (~30 segundos de espera
> si la app lleva 15 minutos sin tráfico). Railway no tiene este problema.

---

## Troubleshooting frecuente

**Error CORS en el navegador:**
- Verificar que `ALLOWED_ORIGINS` en Railway coincide exactamente con la URL de Vercel (sin `/` al final).
- Verificar que `VITE_API_URL` termina en `/api`.

**404 al recargar una ruta como `/habits`:**
- El `vercel.json` ya lo resuelve con el rewrite. Si sigue fallando, verificar que el archivo está en la raíz de `habit-tracker-frontend/`.

**Spring Boot no arranca (Railway logs):**
- El error más común es `DATABASE_URL` mal formada.
- Verificar que `SPRING_PROFILES_ACTIVE=prod` está configurado.
- Revisar que `JWT_SECRET` tiene al menos 64 caracteres.

**Token JWT inválido en prod pero válido en dev:**
- El `JWT_SECRET` de prod debe ser distinto al de dev (ya lo es por defecto).
- Verificar que el secret no tiene espacios o saltos de línea al copiarlo.
