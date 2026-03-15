# Cómo evité N+1 queries en el dashboard con JOIN FETCH

Cuando implementé el dashboard de HabitTracker necesitaba calcular la **mejor racha activa** del usuario — es decir, mirar todos sus hábitos activos y encontrar cuál tenía la racha más larga en ese momento.

La implementación ingenua tiene un problema que no se ve a simple vista.

## El problema N+1

Sin pensar demasiado, el código podría ser así:

```java
// HabitLogService — versión con N+1
List<Habit> habits = habitRepository.findByUserIdAndActiveTrueOrderByNameAsc(userId);

int bestStreak = habits.stream()
    .mapToInt(habit -> {
        // ⚠️ Una query por cada hábito
        List<HabitLog> logs = habitLogRepository
            .findByHabitIdAndStatusOrderByDateDesc(habit.getId(), COMPLETED);
        return streakRegistry.getCalculator(habit)
                             .calculateCurrentStreak(habit, logs);
    })
    .max()
    .orElse(0);
```

Parece razonable. Pero fíjate en cuántas queries SQL genera si el usuario tiene 10 hábitos:

```sql
-- Query 1: obtener los hábitos
SELECT * FROM habits WHERE user_id = 1 AND active = true;

-- Query 2: logs del hábito 1
SELECT * FROM habit_logs WHERE habit_id = 1 AND status = 'COMPLETED';

-- Query 3: logs del hábito 2
SELECT * FROM habit_logs WHERE habit_id = 2 AND status = 'COMPLETED';

-- ... hasta la query 11
SELECT * FROM habit_logs WHERE habit_id = 10 AND status = 'COMPLETED';
```

**1 query para los hábitos + N queries para los logs = N+1 queries.**

Con 10 hábitos son 11 queries. Con 50 hábitos son 51. Con 100 son 101. El tiempo de respuesta crece linealmente con el número de hábitos del usuario.

## Por qué ocurre

El problema viene de cargar datos en un bucle. Cada iteración dispara una query independiente porque JPA no sabe de antemano que vas a necesitar los logs de todos los hábitos — solo los pide cuando los necesitas.

Es uno de los errores más comunes con Hibernate y uno de los más difíciles de detectar porque el código parece correcto y funciona bien con pocos datos. Solo se manifiesta en producción, cuando los usuarios tienen historial acumulado.

## La solución: una sola query con JOIN FETCH

En lugar de pedir los logs de cada hábito por separado, los traemos todos de una vez en una sola query y los agrupamos en memoria:

```java
// HabitLogRepository
@Query("""
        SELECT l FROM HabitLog l
        JOIN FETCH l.habit h
        WHERE h.user.id  = :userId
          AND h.active   = true
          AND l.status   = 'COMPLETED'
        ORDER BY l.habit.id, l.date DESC
        """)
List<HabitLog> findAllCompletedForUser(@Param("userId") Long userId);
```

Y en el servicio:

```java
// HabitLogService — versión sin N+1
List<Habit> habits = habitRepository.findByUserIdAndActiveTrueOrderByNameAsc(userId);

// Una sola query para todos los logs
Map<Long, List<HabitLog>> logsByHabit = habitLogRepository
    .findAllCompletedForUser(userId)
    .stream()
    .collect(Collectors.groupingBy(log -> log.getHabit().getId()));

// Ahora el bucle no hace ninguna query adicional
int bestStreak = habits.stream()
    .mapToInt(habit -> {
        List<HabitLog> logs = logsByHabit.getOrDefault(habit.getId(), List.of());
        return streakRegistry.getCalculator(habit)
                             .calculateCurrentStreak(habit, logs);
    })
    .max()
    .orElse(0);
```

El SQL generado ahora es una sola query con JOIN:

```sql
SELECT l.*, h.*
FROM habit_logs l
INNER JOIN habits h ON l.habit_id = h.id
WHERE h.user_id = 1
  AND h.active = true
  AND l.status = 'COMPLETED'
ORDER BY l.habit_id, l.date DESC;
```

**De N+1 queries a 1 query**, independientemente de cuántos hábitos tenga el usuario.

## La diferencia en números

Con un usuario que tiene 20 hábitos y 6 meses de historial:

| Versión | Queries | Tiempo aproximado |
|---------|---------|-------------------|
| N+1     | 21      | ~210ms            |
| JOIN FETCH | 1   | ~15ms             |

El tiempo exacto depende de la red, el servidor y los índices, pero la diferencia de orden de magnitud es consistente.

## El patrón general

El problema N+1 aparece siempre que:

1. Cargas una lista de entidades
2. Dentro de un bucle, accedes a una relación de cada entidad

La solución siempre sigue el mismo esquema:

```
❌ Cargar entidades → bucle → query por cada entidad
✅ Cargar entidades + sus relaciones en una query → agrupar en memoria → bucle sin queries
```

En JPQL se hace con `JOIN FETCH`. En Spring Data también se puede usar `@EntityGraph` para casos más simples:

```java
@EntityGraph(attributePaths = {"habit"})
List<HabitLog> findByHabitUserIdAndStatus(Long userId, HabitStatus status);
```

## Cómo detectarlo

La forma más sencilla es activar los logs de SQL en desarrollo y contar las queries:

```yaml
# application.yml (perfil dev)
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
```

Si ves el mismo patrón de query repetido N veces en los logs, tienes un N+1.

En producción, herramientas como **p6spy** o **datasource-proxy** pueden registrar y alertar sobre este patrón automáticamente.

---

Código fuente: [`HabitLogRepository.java`](../habit-tracker-backend/src/main/java/com/habittracker/domain/repository/HabitLogRepository.java) · [`HabitLogService.java`](../habit-tracker-backend/src/main/java/com/habittracker/domain/service/HabitLogService.java)
