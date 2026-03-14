package com.habittracker.domain.repository;

import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.HabitLog;
import com.habittracker.domain.model.User;
import com.habittracker.domain.model.enums.FrequencyType;
import com.habittracker.domain.model.enums.HabitStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests de integración del repositorio con @DataJpaTest.
 *
 * @DataJpaTest:
 *   - Carga SOLO el contexto JPA (entidades, repositorios, H2).
 *   - NO carga controllers, services ni security.
 *   - Cada test se ejecuta en una transacción que se hace rollback al final,
 *     garantizando aislamiento entre tests sin limpiar BD manualmente.
 *   - Es ~10x más rápido que @SpringBootTest completo.
 *
 * Qué testeamos aquí:
 *   - Que las queries JPQL personalizadas devuelven los datos correctos.
 *   - Que las restricciones UNIQUE se cumplen en BD.
 *   - Que las relaciones JPA (ManyToOne) se persisten correctamente.
 *
 * Nota: @ActiveProfiles("test") activa application-test.yml con H2.
 */
@DataJpaTest
@ActiveProfiles("test")
class HabitLogRepositoryTest {

    @Autowired private HabitLogRepository habitLogRepository;
    @Autowired private HabitRepository    habitRepository;
    @Autowired private UserRepository     userRepository;

    private User  user;
    private Habit dailyHabit;
    private Habit weeklyHabit;

    /**
     * Prepara datos base antes de cada test.
     * @DataJpaTest hace rollback tras cada test, así que no hay conflictos.
     */
    @BeforeEach
    void setUp() {
        user = userRepository.save(User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("hashed_password")
                .build());

        dailyHabit = habitRepository.save(Habit.builder()
                .name("Meditar")
                .frequencyType(FrequencyType.DAILY)
                .user(user)
                .build());

        weeklyHabit = habitRepository.save(Habit.builder()
                .name("Ejercicio")
                .frequencyType(FrequencyType.WEEKLY)
                .weeklyDays(List.of(1, 3, 5))
                .user(user)
                .build());
    }

    // ════════════════════════════════════════════════════════════════════════
    //  findByHabitIdAndDate
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("findByHabitIdAndDate: devuelve el log correcto cuando existe")
    void findByHabitIdAndDate_shouldReturnLog_whenExists() {
        LocalDate today = LocalDate.now();
        habitLogRepository.save(HabitLog.builder()
                .habit(dailyHabit).date(today)
                .status(HabitStatus.COMPLETED)
                .build());

        Optional<HabitLog> result = habitLogRepository
                .findByHabitIdAndDate(dailyHabit.getId(), today);

        assertThat(result).isPresent();
        assertThat(result.get().getStatus()).isEqualTo(HabitStatus.COMPLETED);
    }

    @Test
    @DisplayName("findByHabitIdAndDate: devuelve empty cuando no existe")
    void findByHabitIdAndDate_shouldReturnEmpty_whenNotExists() {
        Optional<HabitLog> result = habitLogRepository
                .findByHabitIdAndDate(dailyHabit.getId(), LocalDate.now());

        assertThat(result).isEmpty();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  countCompletedInRange
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("countCompletedInRange: cuenta solo COMPLETED dentro del rango")
    void countCompletedInRange_shouldCountOnlyCompletedInRange() {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(6);

        // Dentro del rango: 2 COMPLETED + 1 PENDING
        saveLog(dailyHabit, today.minusDays(5), HabitStatus.COMPLETED);
        saveLog(dailyHabit, today.minusDays(3), HabitStatus.COMPLETED);
        saveLog(dailyHabit, today.minusDays(1), HabitStatus.PENDING);
        // Fuera del rango: no debe contar
        saveLog(dailyHabit, today.minusDays(10), HabitStatus.COMPLETED);

        long count = habitLogRepository.countCompletedInRange(
                dailyHabit.getId(), weekStart, today);

        assertThat(count).isEqualTo(2);
    }

    @Test
    @DisplayName("countCompletedInRange: devuelve 0 si no hay logs en el rango")
    void countCompletedInRange_shouldReturnZero_whenNoLogsInRange() {
        long count = habitLogRepository.countCompletedInRange(
                dailyHabit.getId(),
                LocalDate.now().minusDays(7),
                LocalDate.now()
        );
        assertThat(count).isZero();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  countCompletedForUserOnDate (dashboard)
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("countCompletedForUserOnDate: cuenta hábitos completados hoy para el usuario")
    void countCompletedForUserOnDate_shouldCountBothHabitsIfBothCompleted() {
        LocalDate today = LocalDate.now();
        saveLog(dailyHabit,  today, HabitStatus.COMPLETED);
        saveLog(weeklyHabit, today, HabitStatus.COMPLETED);

        long count = habitLogRepository.countCompletedForUserOnDate(user.getId(), today);

        assertThat(count).isEqualTo(2);
    }

    @Test
    @DisplayName("countCompletedForUserOnDate: no cuenta hábitos PENDING")
    void countCompletedForUserOnDate_shouldNotCountPending() {
        LocalDate today = LocalDate.now();
        saveLog(dailyHabit,  today, HabitStatus.COMPLETED);
        saveLog(weeklyHabit, today, HabitStatus.PENDING);

        long count = habitLogRepository.countCompletedForUserOnDate(user.getId(), today);

        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("countCompletedForUserOnDate: no mezcla datos de otros usuarios")
    void countCompletedForUserOnDate_shouldNotMixUsers() {
        // Crear segundo usuario con su propio hábito
        User otherUser = userRepository.save(User.builder()
                .username("otheruser").email("other@example.com")
                .password("hash").build());
        Habit otherHabit = habitRepository.save(Habit.builder()
                .name("Otro hábito").frequencyType(FrequencyType.DAILY)
                .user(otherUser).build());

        LocalDate today = LocalDate.now();
        saveLog(dailyHabit, today, HabitStatus.COMPLETED);    // usuario 1
        saveLog(otherHabit, today, HabitStatus.COMPLETED);    // usuario 2

        long countUser1 = habitLogRepository.countCompletedForUserOnDate(user.getId(), today);
        long countUser2 = habitLogRepository.countCompletedForUserOnDate(otherUser.getId(), today);

        assertThat(countUser1).isEqualTo(1);
        assertThat(countUser2).isEqualTo(1);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  countCompletedPerDayForUser (gráfico semanal)
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("countCompletedPerDayForUser: agrupa correctamente por fecha")
    void countCompletedPerDayForUser_shouldGroupByDate() {
        LocalDate today     = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        saveLog(dailyHabit,  today,     HabitStatus.COMPLETED);  // Hoy: 2
        saveLog(weeklyHabit, today,     HabitStatus.COMPLETED);
        saveLog(dailyHabit,  yesterday, HabitStatus.COMPLETED);  // Ayer: 1

        List<Object[]> result = habitLogRepository.countCompletedPerDayForUser(
                user.getId(), today.minusDays(7), today);

        assertThat(result).hasSize(2);

        // Verificar que los totales son correctos (resultado está ordenado por fecha)
        Object[] yesterdayRow = result.get(0);
        Object[] todayRow     = result.get(1);

        assertThat(yesterdayRow[0]).isEqualTo(yesterday);
        assertThat((Long) yesterdayRow[1]).isEqualTo(1L);

        assertThat(todayRow[0]).isEqualTo(today);
        assertThat((Long) todayRow[1]).isEqualTo(2L);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Restricción UNIQUE (habit_id + date)
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("existsByHabitIdAndDate: detecta duplicados correctamente")
    void existsByHabitIdAndDate_shouldReturnTrueWhenLogExists() {
        LocalDate today = LocalDate.now();
        saveLog(dailyHabit, today, HabitStatus.COMPLETED);

        assertThat(habitLogRepository.existsByHabitIdAndDate(dailyHabit.getId(), today))
                .isTrue();
        assertThat(habitLogRepository.existsByHabitIdAndDate(dailyHabit.getId(), today.minusDays(1)))
                .isFalse();
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private HabitLog saveLog(Habit habit, LocalDate date, HabitStatus status) {
        return habitLogRepository.save(
                HabitLog.builder().habit(habit).date(date).status(status).build()
        );
    }
}
