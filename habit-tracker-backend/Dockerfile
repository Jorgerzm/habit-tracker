# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — habit-tracker-backend
# Build context: raíz del repo (Railway lo ejecuta desde ahí)
# ─────────────────────────────────────────────────────────────────────────────

# ── Etapa 1: compilación ──────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copiar pom.xml y descargar dependencias (caché de capas)
COPY habit-tracker-backend/pom.xml .
COPY habit-tracker-backend/.mvn .mvn
COPY habit-tracker-backend/mvnw .
RUN chmod +x mvnw

RUN ./mvnw dependency:go-offline -B -q || true

# Compilar (sin tests: se ejecutan en CI)
COPY habit-tracker-backend/src ./src
RUN ./mvnw package -DskipTests -B -q

# ── Etapa 2: imagen de producción ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar", \
  "--spring.profiles.active=prod"]
