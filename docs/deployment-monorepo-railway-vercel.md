# Desplegar un monorepo Java + React en Railway y Vercel

Documentar los errores reales que aparecieron al desplegar HabitTracker a producción. No el camino feliz — los problemas concretos, por qué ocurrieron y cómo se resolvieron.

La arquitectura final:

```
Frontend (React + Vite)  →  Vercel
Backend (Spring Boot 3)  →  Railway
Base de datos            →  Railway PostgreSQL
```

---

## 1. Railway no encontraba el Dockerfile

**El error:**
```
Railpack could not determine how to build the app.
```

**Por qué ocurrió:**  
El repo tiene estructura de monorepo: `habit-tracker-backend/` y `habit-tracker-frontend/` en la raíz. Railway intentaba buildear desde la raíz y no encontraba ni un `pom.xml` ni un `package.json` directamente.

**La solución:**  
Dos cambios. Primero, un `railway.json` en la raíz que apunta al Dockerfile correcto:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "habit-tracker-backend/Dockerfile"
  }
}
```

Segundo, el Dockerfile tiene que usar rutas relativas a la raíz del repo, no a la carpeta del backend, porque Railway ejecuta el build con la raíz como contexto:

```dockerfile
# ✅ Correcto — rutas desde la raíz del repo
COPY habit-tracker-backend/pom.xml .
COPY habit-tracker-backend/src ./src

# ❌ Incorrecto — no encuentra los archivos
COPY pom.xml .
COPY src ./src
```

---

## 2. Java 25 no está disponible en las imágenes de Docker Hub

**El error:**
```
[ERROR] Fatal error compiling: error: release version 25 not supported
```

**Por qué ocurrió:**  
El `pom.xml` tenía `<java.version>25</java.version>`. Java 25 existe como versión de acceso anticipado (Early Access), pero las imágenes oficiales de Maven en Docker Hub solo empaquetan versiones LTS estables (8, 11, 17, 21). La imagen `maven:3.9-eclipse-temurin-21-alpine` que usa el Dockerfile incluye Java 21, que no puede compilar código configurado para Java 25.

**La solución:**  
Bajar el target de compilación a Java 21, la última versión LTS con soporte oficial en las imágenes de Maven:

```xml
<properties>
    <java.version>21</java.version>
</properties>
```

---

## 3. DATABASE_URL con formato incorrecto

**El error:**
```
Driver org.postgresql.Driver claims to not accept jdbcUrl,
postgresql://user:pass@host:5432/db
```

**Por qué ocurrió:**  
Railway inyecta `DATABASE_URL` con el formato `postgresql://...`. Spring Boot necesita `jdbc:postgresql://...`. El prefijo `jdbc:` es obligatorio para el driver de PostgreSQL — sin él, el driver no reconoce la URL como suya.

Además, Railway no expone las variables individuales (`PGHOST`, `PGPORT`, etc.) automáticamente al servicio del backend — hay que referenciarlas explícitamente con la sintaxis `${{Postgres.PGHOST}}`.

**La solución:**  
Añadir estas variables en Railway → Variables del servicio backend:

```
SPRING_DATASOURCE_URL      = jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
SPRING_DATASOURCE_USERNAME = ${{Postgres.PGUSER}}
SPRING_DATASOURCE_PASSWORD = ${{Postgres.PGPASSWORD}}
```

Spring Boot lee las variables de entorno con el prefijo `SPRING_DATASOURCE_` y las usa para sobreescribir `application.yml` automáticamente.

---

## 4. Vercel build fallaba por el @import de CSS

**El error:**
```
[vite:css] @import must precede all other statements (besides @charset or empty @layer)
```

**Por qué ocurrió:**  
El archivo `index.css` tenía esta estructura:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/...');  /* ❌ demasiado tarde */
```

CSS exige que todos los `@import` vayan **antes** de cualquier otra regla. Las directivas `@tailwind` generan reglas CSS, así que el `@import` llegaba tarde.

**La solución:**

```css
@import url('https://fonts.googleapis.com/...');  /* ✅ primero */

@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 5. CORS bloqueaba las peticiones desde Vercel

**El error en el navegador:**
```
Access to XMLHttpRequest has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present
```

Este error apareció en tres variantes distintas, cada una con una causa diferente.

### 5a. El dominio de Vercel no estaba en ALLOWED_ORIGINS

La variable de entorno `ALLOWED_ORIGINS` en Railway tenía el valor `https://habit-tracker.vercel.app` pero Vercel genera URLs de preview distintas para cada deploy (`https://habit-tracker-abc123.vercel.app`). Las peticiones desde preview fallaban porque ese dominio no estaba permitido.

**Solución:** usar siempre la URL de producción de Vercel (la fija, sin hash), no las de preview.

### 5b. Spring Security interceptaba el preflight antes que WebConfig

Aunque `WebConfig` tenía la configuración CORS correcta, Spring Security interceptaba las peticiones OPTIONS (preflight) antes de que llegaran al `WebMvcConfigurer` y las rechazaba.

**Solución:** añadir `.cors(withDefaults())` en `SecurityConfig`:

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
        .csrf(AbstractHttpConfigurer::disable)
        .cors(withDefaults())  // ← delega en WebConfig, sin esto Security bloquea el preflight
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated()
        )
        // ...
        .build();
}
```

Sin `.cors(withDefaults())`, Spring Security gestiona CORS con su configuración por defecto, que bloquea todo. El `WebConfig` nunca llega a ejecutarse para las peticiones preflight.

### 5c. El nombre de la variable de entorno no coincidía

La propiedad en `application.yml` era `app.cors.allowed-origins`. Spring Boot convierte las propiedades a variables de entorno sustituyendo `.` por `_` y convirtiendo a mayúsculas, pero el prefijo también cuenta. La variable correcta era:

```
APP_CORS_ALLOWED_ORIGINS=https://habit-tracker-jorgerzm.vercel.app
```

No `ALLOWED_ORIGINS` a secas, que Spring Boot no asocia con ninguna propiedad.

---

## 6. VITE_API_URL mal configurada

**El error en el navegador:**
```
POST https://habit-tracker.vercel.app/habit-tracker-production.up.railway.app/api/auth/register
405 (Method Not Allowed)
```

La URL del backend se concatenó como path relativo en lugar de URL absoluta.

**Por qué ocurrió:**  
El valor de `VITE_API_URL` en Vercel se copió sin el prefijo `https://`, quedando como `habit-tracker-production.up.railway.app/api` en lugar de `https://habit-tracker-production.up.railway.app/api`.

Axios tomó ese valor como una ruta relativa y lo concatenó al dominio actual de Vercel.

**Solución:** el valor de `VITE_API_URL` debe ser una URL absoluta completa:

```
VITE_API_URL=https://habit-tracker-production-e70b.up.railway.app/api
```

---

## Lecciones

**Sobre Docker en monorepos:** el contexto de build importa. Si Railway usa la raíz como contexto, los COPY del Dockerfile deben incluir la subcarpeta. Si usas el Root Directory de Railway para que el contexto sea la subcarpeta, los COPY deben ser relativos a esa subcarpeta. Las dos opciones funcionan, pero no se pueden mezclar.

**Sobre CORS en Spring Boot:** hay tres capas que pueden interferir — Spring Security, `WebMvcConfigurer` y los headers de respuesta del servidor. Si tienes problemas de CORS, verificar en ese orden. La causa más frecuente es que Security intercepta antes de que llegue tu configuración.

**Sobre variables de entorno en Spring Boot:** `SPRING_DATASOURCE_URL` sobreescribe `spring.datasource.url` de `application.yml`. Esta convención funciona con cualquier propiedad — útil para no hardcodear nada en producción sin tocar el código.

**Sobre Vite y variables de entorno:** solo las variables con prefijo `VITE_` se incluyen en el bundle del cliente. Las demás son privadas del servidor de build y no llegan al navegador. Si una variable no aparece en el cliente, probablemente le falta el prefijo.

---

Código fuente: [`Dockerfile`](../habit-tracker-backend/Dockerfile) · [`SecurityConfig.java`](../habit-tracker-backend/src/main/java/com/habittracker/config/SecurityConfig.java) · [`WebConfig.java`](../habit-tracker-backend/src/main/java/com/habittracker/config/WebConfig.java)
