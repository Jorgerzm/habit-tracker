# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — habit-tracker-frontend
#
# Etapa 1 (builder): instala deps y compila el bundle con Vite.
# Etapa 2 (runtime): sirve los estáticos con Nginx Alpine (~25MB).
# ─────────────────────────────────────────────────────────────────────────────

# ── Etapa 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias primero (aprovecha caché de capas)
COPY package*.json ./
RUN npm ci --silent

# Pasar la URL de la API como build arg (se convierte en variable de entorno de Vite)
ARG VITE_API_URL=http://localhost:8080/api
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ── Etapa 2: Nginx ────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Copiar el build estático de Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración de Nginx para SPA:
# Todas las rutas que no sean archivos estáticos se sirven con index.html,
# permitiendo que React Router maneje el enrutamiento client-side.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4173

CMD ["nginx", "-g", "daemon off;"]
