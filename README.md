# HabitTracker

Aplicación full-stack para el seguimiento de hábitos diarios. Proyecto de portfolio que demuestra el uso de patrones de diseño clásicos (Strategy, Factory, Observer) en un contexto real con Java + Spring Boot y React.

![Java](https://img.shields.io/badge/Java-21-orange?style=flat-square&logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.4-brightgreen?style=flat-square&logo=springboot)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![Tests](https://img.shields.io/badge/tests-backend_%2B_frontend-success?style=flat-square)

---

## Índice

- [Características](#características)
- [Patrones de diseño](#patrones-de-diseño)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Arranque rápido con Docker](#arranque-rápido-con-docker)
- [Desarrollo local](#desarrollo-local)
- [API Reference](#api-reference)
- [Tests](#tests)
- [Despliegue a producción](#despliegue-a-producción)
- [Estructura del proyecto](#estructura-del-proyecto)

---

## Características

- **Autenticación JWT** — registro, login y rutas protegidas
- **3 tipos de frecuencia** — diario, semanal (días específicos) o cada X días
- **Calendario interactivo** — marcar/desmarcar días con toggle; los logs pasados son inmutables
- **Rachas calculadas por estrategia** — cada tipo de hábito tiene su propio algoritmo
- **Dashboard** — completados hoy, mejor racha activa, % semanal y gráfico de barras
- **Objetivos por hábito** — verificados automáticamente por un listener asíncrono al completar

---

## Patrones de diseño

El proyecto demuestra tres patrones clásicos en un contexto real.

### Strategy — cálculo de rachas

**Problema:** calcular la racha de un hábito diario es diferente a uno semanal o uno cada N días. Sin el patrón, `HabitLogService` tendría un `switch` creciente.

```
StreakCalculator (interfaz)
    ├── DailyStreakCalculator   → días consecutivos, gracia si hoy no se completó
    ├── WeeklyStreakCalculator  → semanas con todos sus días marcados
    └── CustomStreakCalculator  → ventanas de N días desde la fecha de creación
```

Spring inyecta la lista de implementaciones en `StreakCalculatorRegistry`, que las indexa en un `EnumMap<FrequencyType, StreakCalculator>`. El servicio nunca necesita saber qué algoritmo ejecuta:

```java
// Siempre el mismo código, independientemente del tipo de hábito
var calculator = streakRegistry.getCalculator(habit);
int streak = calculator.calculateCurrentStreak(habit, logs);
```

### Factory — creación de hábitos

**Problema:** cada tipo tiene reglas de validación distintas (semanal exige al menos un día; custom exige intervalo 2-365). Sin el patrón, `HabitService.createHabit()` mezclaría lógica de creación con validación.

```
HabitFactory (interfaz)
    ├── DailyHabitFactory   → configura frecuencia diaria
    ├── WeeklyHabitFactory  → valida weeklyDays (1-7, sin duplicados)
    └── CustomHabitFactory  → valida customFrequencyDays (2-365)
```

`HabitFactoryRegistry` delega al factory correcto. Añadir un tipo nuevo = crear un `@Component` que implemente `HabitFactory`. No se toca código existente (Principio Abierto/Cerrado).

### Observer — eventos de dominio

**Problema:** al marcar un hábito deben ocurrir varias cosas encadenadas: verificar objetivos, enviar notificación, (futuro) actualizar feed social. Sin el patrón, `HabitLogService` dependería directamente de todos esos servicios.

```
toggleHabitLog() → publishEvent(HabitCompletedEvent)
                       ├── GoalAchievementListener  (@Async)
                       └── NotificationListener     (@Async)
```

`HabitLogService` no sabe quién escucha. Los listeners son `@Async` para no bloquear la transacción principal. Añadir una reacción nueva = crear un `@EventListener`, sin modificar nada más.

---

## Arquitectura

```
habit-tracker/
├── habit-tracker-backend/      Spring Boot (Java 21)
│   └── src/main/java/com/habittracker/
│       ├── application/        Controllers + DTOs
│       ├── domain/
│       │   ├── model/          Entidades JPA
│       │   ├── repository/     Spring Data JPA + queries JPQL
│       │   └── service/
│       │       ├── streak/     Strategy pattern
│       │       ├── factory/    Factory pattern
│       │       ├── event/      HabitCompletedEvent
│       │       └── listener/   Observer listeners
│       ├── config/             Spring Security, CORS
│       └── infrastructure/     JWT filter + utils
│
└── habit-tracker-frontend/     React 18 + Vite
    └── src/
        ├── api/                Axios + interceptor JWT
        ├── hooks/              React Query (useHabits...)
        ├── components/         HabitCard, HabitCalendar, HabitForm, HabitStats, WeeklyChart
        └── pages/              Dashboard, HabitsPage, LoginPage, RegisterPage
```

### Flujo de una petición típica

```
HabitCalendar → useToggleLog().mutate({ date })
  → habitsApi.toggleHabitLog()           [Axios + JWT]
  → POST /api/habits/{id}/logs/toggle
  → HabitController → HabitLogService.toggleHabitLog()
  → HabitLogRepository.save()            [JPA + transacción]
  → publishEvent(HabitCompletedEvent)    [Observer]
  → GoalAchievementListener              [hilo aparte, @Async]
  ← ToggleLogResponse
  → queryClient.invalidateQueries()      [React Query invalida caché]
  → Re-render automático con datos frescos
```

---

## Stack tecnológico

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Java | 25 | Lenguaje |
| Spring Boot | 3.3.4 | Framework |
| Spring Security 6 | — | Autenticación |
| jjwt | 0.12.6 | JWT |
| Spring Data JPA | — | ORM |
| PostgreSQL | 16 | Base de datos |
| Lombok | 1.18.34 | Boilerplate |
| Spring Actuator | — | Health check Docker |

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18.3 | UI |
| Vite | 5.4 | Bundler |
| TanStack React Query | 5 | Estado del servidor + caché |
| React Hook Form | 7 | Formularios |
| Recharts | 2.12 | Gráficos |
| date-fns | 3 | Fechas |
| Tailwind CSS | 3.4 | Estilos |
| Axios | 1.7 | HTTP |

### Testing

| Tecnología | Uso |
|---|---|
| JUnit 5 + Mockito | Unitarios backend |
| `@DataJpaTest` + H2 | Repositorios |
| `@WebMvcTest` | Controladores |
| Vitest + RTL | Componentes frontend |
| MSW 2 | Mock de peticiones HTTP en tests |

---

## Arranque rápido con Docker

La forma más rápida. Solo necesitas Docker Desktop instalado.

```bash
git clone https://github.com/tu-usuario/habit-tracker.git
cd habit-tracker

docker compose up --build
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:4173 |
| API | http://localhost:8080 |
| Health check | http://localhost:8080/actuator/health |

> El primer build tarda ~3-4 minutos. Los siguientes son instantáneos.

```bash
docker compose down      # Parar
docker compose down -v   # Parar + borrar datos de PostgreSQL
```

---

## Desarrollo local

### Prerequisitos

- Java 21+ · Node.js 20+ · PostgreSQL 14+ en `localhost:5432`

### Backend

```bash
psql -U postgres -c "CREATE DATABASE habittracker_dev;"

cd habit-tracker-backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# → http://localhost:8080
```

### Frontend

```bash
cd habit-tracker-frontend
npm install
npm run dev
# → http://localhost:5173
# El proxy de Vite redirige /api → localhost:8080/api (sin CORS en dev)
```

---

## API Reference

Todos los endpoints excepto `/api/auth/**` requieren:
```
Authorization: Bearer <token>
```

### Auth

| Método | Endpoint | Body |
|---|---|---|
| `POST` | `/api/auth/register` | `{ username, email, password }` |
| `POST` | `/api/auth/login` | `{ username, password }` |
| `GET` | `/api/auth/me` | — |

### Hábitos

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/habits` | Lista activos |
| `POST` | `/api/habits` | Crear hábito |
| `PUT` | `/api/habits/:id` | Editar |
| `PATCH` | `/api/habits/:id/archive` | Archivar |
| `DELETE` | `/api/habits/:id` | Eliminar |
| `POST` | `/api/habits/:id/logs/toggle` | Marcar/desmarcar día |
| `GET` | `/api/habits/:id/logs?from=&to=` | Logs en rango |
| `GET` | `/api/habits/:id/stats` | Rachas y porcentajes |
| `GET` | `/api/habits/dashboard` | Stats globales del usuario |

### Ejemplos rápidos

```bash
# Registrarse
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"ana","email":"ana@example.com","password":"secret123"}'

# Crear hábito semanal
curl -X POST http://localhost:8080/api/habits \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ejercicio","frequencyType":"WEEKLY","weeklyDays":[1,3,5]}'

# Marcar hoy como completado
curl -X POST http://localhost:8080/api/habits/1/logs/toggle \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2024-03-14"}'
```

---

## Tests

### Backend

```bash
cd habit-tracker-backend
./mvnw test
```

| Clase | Tipo | Casos |
|---|---|---|
| `StreakCalculatorTest` | Unitario puro | 3 algoritmos + edge cases |
| `HabitLogServiceTest` | Mockito | Toggle (4 escenarios), eventos Observer |
| `HabitLogRepositoryTest` | `@DataJpaTest` + H2 | Queries JPQL, aislamiento por usuario |
| `AuthControllerTest` | `@WebMvcTest` | Register, login, validaciones, errores |
| `HabitControllerTest` | `@WebMvcTest` | CRUD, toggle, dashboard |

### Frontend

```bash
cd habit-tracker-frontend
npm run test:run        # una pasada
npm test                # modo watch
npm run test:coverage   # con reporte HTML en coverage/
```

| Archivo | Casos |
|---|---|
| `HabitForm.test.jsx` | Validaciones, campos condicionales, submit |
| `HabitCard.test.jsx` | Expansión, tabs, confirmación de borrado |
| `HabitCalendar.test.jsx` | Carga de logs, navegación, toggle |
| `HabitStats.test.jsx` | Rachas, porcentajes, skeleton |
| `WeeklyChart.test.jsx` | Render SVG, etiquetas, sin datos |
| `useHabits.test.jsx` | Queries, mutaciones, query keys, caché |
| `pages.test.jsx` | Flujo completo login + HabitsPage con MSW |

---

## Despliegue a producción

Ver [`DEPLOY.md`](DEPLOY.md) para la guía completa Railway + Vercel.

```
Frontend → Vercel  (gratis, CDN global, CI/CD automático en push)
Backend  → Railway (gratis 500h/mes, Docker, PostgreSQL incluido)
```

---

## Estructura del proyecto

```
habit-tracker/
├── docker-compose.yml
├── README.md
├── DEPLOY.md
│
├── habit-tracker-backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/habittracker/    38 clases Java
│       └── test/                          5 clases de test
│
└── habit-tracker-frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── vercel.json
    ├── package.json
    └── src/                               19 archivos + 7 de test
```

---

## Licencia

MIT
