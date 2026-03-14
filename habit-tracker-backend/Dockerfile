# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — habit-tracker-backend
#
# Build multi-etapa:
#   Etapa 1 (builder): compila el JAR con Maven en una imagen con JDK completo.
#   Etapa 2 (runtime): copia solo el JAR a una imagen mínima con JRE.
#
# Resultado: imagen final ~250MB en lugar de ~600MB con JDK completo.
# ─────────────────────────────────────────────────────────────────────────────

# ── Etapa 1: compilación ──────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copiar solo pom.xml primero para aprovechar el caché de capas de Docker.
# Si el código cambia pero las dependencias no, Maven no las vuelve a descargar.
COPY pom.xml .
RUN mvn dependency:go-offline -B 2>/dev/null || true

# Copiar el código fuente y compilar (saltando tests: se ejecutan en CI)
COPY src ./src
RUN mvn package -DskipTests -B

# ── Etapa 2: imagen de producción ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

# Usuario no-root por seguridad (buena práctica en producción)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copiar el JAR compilado desde la etapa builder
COPY --from=builder /app/target/*.jar app.jar

# Puerto que expone la app (Railway/Render lo mapean dinámicamente vía $PORT)
EXPOSE 8080

# Opciones JVM optimizadas para contenedores con poca RAM (plan gratuito ~512MB):
#   -XX:+UseContainerSupport    → detectar límites de memoria del contenedor
#   -XX:MaxRAMPercentage=75.0   → usar máximo el 75% de la RAM disponible
#   -Djava.security.egd=...     → acelera el arranque en entornos sin /dev/random real
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar", \
  "--spring.profiles.active=prod"]
