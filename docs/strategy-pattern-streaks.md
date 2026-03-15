# Por qué usé Strategy en lugar de un switch para calcular rachas

Cuando diseñé el sistema de rachas de HabitTracker, el primer instinto fue escribir algo así:

```java
public int calculateStreak(Habit habit, List<HabitLog> logs) {
    switch (habit.getFrequencyType()) {
        case DAILY:  return calculateDailyStreak(logs);
        case WEEKLY: return calculateWeeklyStreak(logs);
        case CUSTOM: return calculateCustomStreak(habit, logs);
        default: throw new IllegalArgumentException("Tipo desconocido");
    }
}
```

Funciona. Pero tiene un problema que no se ve hasta que intentas añadir un tipo nuevo.

## El problema con el switch

Supón que en tres meses quiero añadir un hábito de tipo `MONTHLY`. Tendría que:

1. Añadir el valor al enum `FrequencyType`
2. Buscar **todos** los switch/if del código que ramifican por tipo
3. Añadir el caso en cada uno
4. Esperar no haberme dejado ninguno

En un sistema pequeño esto es manejable. En uno que crece, es una fuente constante de bugs. Cada switch es una deuda técnica que cobra intereses.

Esto viola el **Principio Abierto/Cerrado**: el código debería estar abierto a extensión pero cerrado a modificación.

## La solución: Strategy

El patrón Strategy separa el algoritmo de quien lo usa. En lugar de un switch, cada tipo de hábito tiene su propio calculador:

```java
public interface StreakCalculator {
    int calculateCurrentStreak(Habit habit, List<HabitLog> logs);
    int calculateMaxStreak(Habit habit, List<HabitLog> logs);
    FrequencyType getFrequencyType();
}
```

Tres implementaciones, cada una con su lógica:

```java
@Component
public class DailyStreakCalculator implements StreakCalculator {

    @Override
    public int calculateCurrentStreak(Habit habit, List<HabitLog> logs) {
        // Días consecutivos hacia atrás desde hoy.
        // Gracia: si hoy no se ha completado pero ayer sí,
        // la racha sigue activa (el día no ha terminado).
        LocalDate cursor = LocalDate.now();
        if (!completedOn(logs, cursor)) {
            cursor = cursor.minusDays(1);
        }
        int streak = 0;
        while (completedOn(logs, cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    @Override
    public FrequencyType getFrequencyType() {
        return FrequencyType.DAILY;
    }
}
```

```java
@Component
public class WeeklyStreakCalculator implements StreakCalculator {

    @Override
    public int calculateCurrentStreak(Habit habit, List<HabitLog> logs) {
        // Unidad = semana completa (todos los días configurados completados).
        // Una semana en curso cuenta si los días pasados están completados.
        ...
    }

    @Override
    public FrequencyType getFrequencyType() {
        return FrequencyType.WEEKLY;
    }
}
```

## El Registry: inyección automática sin if

La parte más interesante es cómo el servicio selecciona la estrategia correcta. No hay ningún switch. Spring inyecta automáticamente **todas** las implementaciones de `StreakCalculator` como una lista:

```java
@Service
public class StreakCalculatorRegistry {

    private final EnumMap<FrequencyType, StreakCalculator> calculators;

    public StreakCalculatorRegistry(List<StreakCalculator> allCalculators) {
        this.calculators = new EnumMap<>(FrequencyType.class);
        allCalculators.forEach(c -> calculators.put(c.getFrequencyType(), c));
    }

    public StreakCalculator getCalculator(Habit habit) {
        StreakCalculator calculator = calculators.get(habit.getFrequencyType());
        if (calculator == null) {
            throw new IllegalStateException(
                "No hay calculador para: " + habit.getFrequencyType()
            );
        }
        return calculator;
    }
}
```

Y en el servicio, el código que calcula la racha es siempre el mismo independientemente del tipo:

```java
// HabitLogService — nunca cambia aunque añadamos nuevos tipos
var calculator = streakRegistry.getCalculator(habit);
int currentStreak = calculator.calculateCurrentStreak(habit, logs);
int maxStreak     = calculator.calculateMaxStreak(habit, logs);
```

## Añadir un tipo nuevo

Si mañana quiero añadir `MONTHLY`, solo necesito:

1. Añadir `MONTHLY` al enum
2. Crear `MonthlyStreakCalculator implements StreakCalculator` con `@Component`

Nada más. El registry lo recoge automáticamente. El servicio no se toca. Los tests existentes no se rompen.

## Tests

Cada calculador se puede testear de forma completamente aislada, sin Spring, sin base de datos:

```java
class DailyStreakCalculatorTest {

    private final DailyStreakCalculator calculator = new DailyStreakCalculator();

    @Test
    void shouldReturnZero_whenNoLogs() {
        int streak = calculator.calculateCurrentStreak(habit(), List.of());
        assertThat(streak).isZero();
    }

    @Test
    void shouldReturn3_whenThreeConsecutiveDays() {
        List<HabitLog> logs = List.of(
            logOn(LocalDate.now()),
            logOn(LocalDate.now().minusDays(1)),
            logOn(LocalDate.now().minusDays(2))
        );
        assertThat(calculator.calculateCurrentStreak(habit(), logs)).isEqualTo(3);
    }
}
```

Los tests no conocen el registry ni el servicio. Cada algoritmo se verifica por separado.

## Cuándo usar Strategy

Strategy tiene sentido cuando:

- Tienes **varias variantes de un algoritmo** que pueden crecer
- Quieres que el código que usa el algoritmo **no sepa cuál está usando**
- Cada variante tiene suficiente lógica como para justificar su propia clase

No tiene sentido si solo tienes dos casos y sabes que nunca habrá más. En ese caso, el switch es más legible.

---

Código fuente: [`domain/service/streak/`](../habit-tracker-backend/src/main/java/com/habittracker/domain/service/streak/)
