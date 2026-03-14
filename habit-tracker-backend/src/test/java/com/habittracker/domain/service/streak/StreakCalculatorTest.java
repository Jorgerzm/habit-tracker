package com.habittracker.domain.service.streak;

import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.HabitLog;
import com.habittracker.domain.model.enums.FrequencyType;
import com.habittracker.domain.model.enums.HabitStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests unitarios del patrón Strategy — calculadores de rachas.
 *
 * Estos tests son completamente independientes de Spring.
 * No usan @SpringBootTest (demasiado pesado para lógica pura).
 * Solo instancian las clases y prueban su comportamiento.
 *
 * Principios aplicados:
 * - Un test por caso de negocio.
 * - Nombres descriptivos con @DisplayName.
 * - Estructura AAA: Arrange / Act / Assert.
 * - Sin mocks (las clases son pure functions sobre listas).
 */
class StreakCalculatorTest {

    // Fecha fija de referencia para que los tests no dependan de "hoy"
    // Nota: los calculadores usan LocalDate.now() internamente, así que los tests
    // de racha actual están diseñados para ser válidos "desde ayer hacia atrás"
    private static final LocalDate TODAY = LocalDate.now();
    private static final LocalDate YESTERDAY = TODAY.minusDays(1);

    // ════════════════════════════════════════════════════════════════════════
    //  DAILY STREAK CALCULATOR
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("DailyStreakCalculator")
    class DailyStreakCalculatorTest {

        private DailyStreakCalculator calculator;
        private Habit dailyHabit;

        @BeforeEach
        void setUp() {
            calculator = new DailyStreakCalculator();
            dailyHabit = buildHabit(FrequencyType.DAILY, null, null);
        }

        @Test
        @DisplayName("Devuelve 0 cuando no hay logs")
        void shouldReturnZeroWhenNoLogs() {
            assertThat(calculator.calculateCurrentStreak(dailyHabit, List.of())).isZero();
            assertThat(calculator.calculateMaxStreak(dailyHabit, List.of())).isZero();
        }

        @Test
        @DisplayName("Racha actual: días consecutivos hasta ayer cuentan")
        void shouldCountConsecutiveDaysEndingYesterday() {
            List<HabitLog> logs = List.of(
                    buildLog(TODAY.minusDays(4)),
                    buildLog(TODAY.minusDays(3)),
                    buildLog(TODAY.minusDays(2)),
                    buildLog(YESTERDAY)
            );

            int streak = calculator.calculateCurrentStreak(dailyHabit, logs);

            assertThat(streak).isEqualTo(4);
        }

        @Test
        @DisplayName("Racha actual: incluye hoy si está completado")
        void shouldIncludeTodayIfCompleted() {
            List<HabitLog> logs = List.of(
                    buildLog(YESTERDAY),
                    buildLog(TODAY)
            );

            assertThat(calculator.calculateCurrentStreak(dailyHabit, logs)).isEqualTo(2);
        }

        @Test
        @DisplayName("Racha actual: se rompe en el primer hueco")
        void shouldBreakOnFirstGap() {
            // Hay un hueco hace 3 días: solo cuenta desde hace 2 días
            List<HabitLog> logs = List.of(
                    buildLog(TODAY.minusDays(5)),  // ← antes del hueco
                    buildLog(TODAY.minusDays(4)),  // ← antes del hueco
                    // hueco en minusDays(3)
                    buildLog(TODAY.minusDays(2)),
                    buildLog(YESTERDAY)
            );

            assertThat(calculator.calculateCurrentStreak(dailyHabit, logs)).isEqualTo(2);
        }

        @Test
        @DisplayName("Racha actual: es 0 si el último log es de hace 2+ días")
        void shouldBeZeroIfLastLogIsOld() {
            List<HabitLog> logs = List.of(
                    buildLog(TODAY.minusDays(5)),
                    buildLog(TODAY.minusDays(4)),
                    buildLog(TODAY.minusDays(3))
                    // Sin logs en minusDays(2) ni ayer ni hoy
            );

            assertThat(calculator.calculateCurrentStreak(dailyHabit, logs)).isZero();
        }

        @Test
        @DisplayName("Racha máxima: encuentra la secuencia más larga en el historial")
        void shouldFindMaxStreakInHistory() {
            List<HabitLog> logs = List.of(
                    // Racha de 2
                    buildLog(TODAY.minusDays(20)),
                    buildLog(TODAY.minusDays(19)),
                    // hueco
                    // Racha de 4 (la más larga)
                    buildLog(TODAY.minusDays(15)),
                    buildLog(TODAY.minusDays(14)),
                    buildLog(TODAY.minusDays(13)),
                    buildLog(TODAY.minusDays(12)),
                    // hueco
                    // Racha de 1
                    buildLog(TODAY.minusDays(5))
            );

            assertThat(calculator.calculateMaxStreak(dailyHabit, logs)).isEqualTo(4);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  WEEKLY STREAK CALCULATOR
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("WeeklyStreakCalculator")
    class WeeklyStreakCalculatorTest {

        private WeeklyStreakCalculator calculator;

        @BeforeEach
        void setUp() {
            calculator = new WeeklyStreakCalculator();
        }

        @Test
        @DisplayName("Devuelve 0 si weeklyDays está vacío")
        void shouldReturnZeroIfNoDaysConfigured() {
            Habit habit = buildHabit(FrequencyType.WEEKLY, List.of(), null);
            assertThat(calculator.calculateCurrentStreak(habit, List.of())).isZero();
        }

        @Test
        @DisplayName("Racha máxima: dos semanas completas seguidas = 2")
        void shouldCountTwoCompleteConsecutiveWeeks() {
            // Hábito: lunes (1) y miércoles (3)
            Habit habit = buildHabit(FrequencyType.WEEKLY, List.of(1, 3), null);

            // Encontrar el lunes de hace 2 semanas
            LocalDate twoWeeksAgoMonday = TODAY
                    .with(java.time.temporal.TemporalAdjusters.previousOrSame(
                            java.time.DayOfWeek.MONDAY))
                    .minusWeeks(2);

            List<HabitLog> logs = List.of(
                    // Semana hace 2 semanas: lunes y miércoles
                    buildLog(twoWeeksAgoMonday),
                    buildLog(twoWeeksAgoMonday.plusDays(2)),
                    // Semana hace 1 semana: lunes y miércoles
                    buildLog(twoWeeksAgoMonday.plusWeeks(1)),
                    buildLog(twoWeeksAgoMonday.plusWeeks(1).plusDays(2))
            );

            assertThat(calculator.calculateMaxStreak(habit, logs)).isEqualTo(2);
        }

        @Test
        @DisplayName("Racha máxima: semana incompleta no cuenta")
        void shouldNotCountIncompleteWeek() {
            Habit habit = buildHabit(FrequencyType.WEEKLY, List.of(1, 3), null);

            LocalDate twoWeeksAgoMonday = TODAY
                    .with(java.time.temporal.TemporalAdjusters.previousOrSame(
                            java.time.DayOfWeek.MONDAY))
                    .minusWeeks(2);

            List<HabitLog> logs = List.of(
                    // Semana hace 2 semanas: solo lunes (falta miércoles) → incompleta
                    buildLog(twoWeeksAgoMonday),
                    // Semana hace 1 semana: completa
                    buildLog(twoWeeksAgoMonday.plusWeeks(1)),
                    buildLog(twoWeeksAgoMonday.plusWeeks(1).plusDays(2))
            );

            // Max streak = 1 (solo la semana hace 1 semana es completa)
            assertThat(calculator.calculateMaxStreak(habit, logs)).isEqualTo(1);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  CUSTOM STREAK CALCULATOR
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("CustomStreakCalculator")
    class CustomStreakCalculatorTest {

        private CustomStreakCalculator calculator;

        @BeforeEach
        void setUp() {
            calculator = new CustomStreakCalculator();
        }

        @Test
        @DisplayName("Intervalo de 3 días: ventanas de 3 días cada una")
        void shouldCalculateStreakWithThreeDayInterval() {
            // Hábito creado hace 9 días con intervalo de 3
            LocalDate createdAt = TODAY.minusDays(9);
            Habit habit = buildHabitWithCreatedAt(FrequencyType.CUSTOM, 3, createdAt);

            // Ventana 0: createdAt    → createdAt + 2 → completado el día 1
            // Ventana 1: createdAt+3  → createdAt + 5 → completado el día 4
            // Ventana 2: createdAt+6  → createdAt + 8 → completado el día 7
            List<HabitLog> logs = List.of(
                    buildLog(createdAt.plusDays(1)),
                    buildLog(createdAt.plusDays(4)),
                    buildLog(createdAt.plusDays(7))
            );

            assertThat(calculator.calculateMaxStreak(habit, logs)).isEqualTo(3);
        }

        @Test
        @DisplayName("Ventana sin completar rompe la racha")
        void shouldBreakStreakOnMissedWindow() {
            LocalDate createdAt = TODAY.minusDays(12);
            Habit habit = buildHabitWithCreatedAt(FrequencyType.CUSTOM, 3, createdAt);

            List<HabitLog> logs = List.of(
                    buildLog(createdAt.plusDays(1)),  // Ventana 0: completada
                    // Ventana 1: NO completada (días 3-5) ← hueco
                    buildLog(createdAt.plusDays(7)),  // Ventana 2: completada
                    buildLog(createdAt.plusDays(10))  // Ventana 3: completada
            );

            // Max streak = 2 (ventanas 2 y 3)
            assertThat(calculator.calculateMaxStreak(habit, logs)).isEqualTo(2);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  TEST DEL REGISTRY (integración ligera)
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("StreakCalculatorRegistry: selecciona la implementación correcta")
    void registryShouldSelectCorrectCalculator() {
        var daily   = new DailyStreakCalculator();
        var weekly  = new WeeklyStreakCalculator();
        var custom  = new CustomStreakCalculator();

        var registry = new StreakCalculatorRegistry(List.of(daily, weekly, custom));

        Habit dailyHabit  = buildHabit(FrequencyType.DAILY, null, null);
        Habit weeklyHabit = buildHabit(FrequencyType.WEEKLY, List.of(1, 3), null);
        Habit customHabit = buildHabit(FrequencyType.CUSTOM, null, 3);

        assertThat(registry.getCalculator(dailyHabit)).isInstanceOf(DailyStreakCalculator.class);
        assertThat(registry.getCalculator(weeklyHabit)).isInstanceOf(WeeklyStreakCalculator.class);
        assertThat(registry.getCalculator(customHabit)).isInstanceOf(CustomStreakCalculator.class);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  BUILDERS de objetos de test
    // ════════════════════════════════════════════════════════════════════════

    private Habit buildHabit(FrequencyType type, List<Integer> weeklyDays, Integer interval) {
        return buildHabitWithCreatedAt(type, interval, TODAY.minusMonths(6));
    }

    private Habit buildHabitWithCreatedAt(FrequencyType type, Integer interval, LocalDate createdAt) {
        Habit habit = new Habit();
        habit.setFrequencyType(type);
        habit.setCustomFrequencyDays(interval);
        // Simulamos createdAt (LocalDateTime) a partir de LocalDate
        // En tests usamos reflection o setter si lo necesitamos.
        // Aquí el habit tiene createdAt como LocalDateTime, lo seteamos con un truco:
        // usamos el método builder con el campo createdAt
        try {
            var field = Habit.class.getDeclaredField("createdAt");
            field.setAccessible(true);
            field.set(habit, createdAt.atStartOfDay());
        } catch (Exception e) {
            throw new RuntimeException("No se pudo setear createdAt en el test", e);
        }
        return habit;
    }

    private HabitLog buildLog(LocalDate date) {
        HabitLog log = new HabitLog();
        log.setDate(date);
        log.setStatus(HabitStatus.COMPLETED);
        return log;
    }
}
