package com.habittracker.domain.service;

import com.habittracker.application.dto.response.ResponseDTOs.*;
import com.habittracker.common.exception.CustomExceptions.*;
import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.HabitLog;
import com.habittracker.domain.model.enums.HabitStatus;
import com.habittracker.domain.repository.HabitLogRepository;
import com.habittracker.domain.repository.HabitRepository;
import com.habittracker.domain.repository.UserRepository;
import com.habittracker.domain.service.event.HabitCompletedEvent;
import com.habittracker.domain.service.streak.StreakCalculatorRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio de registros diarios de hábitos.
 *
 * PATRONES EN USO:
 *
 *   1. STRATEGY (StreakCalculatorRegistry):
 *      getHabitStats() y getDashboardStats() calculan rachas sin saber
 *      el tipo del hábito. El registry selecciona la estrategia correcta.
 *
 *   2. OBSERVER (ApplicationEventPublisher):
 *      toggleHabitLog() publica HabitCompletedEvent al marcar COMPLETED.
 *      Los listeners (GoalAchievementListener, NotificationListener) reaccionan
 *      de forma completamente desacoplada.
 *
 * REGLAS DE NEGOCIO:
 *   - No se puede crear un log con fecha futura.
 *   - Un log COMPLETED puede desmarcarse SOLO si es de hoy.
 *   - Los logs de días pasados son inmutables.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class HabitLogService {

    private final HabitLogRepository       habitLogRepository;
    private final HabitRepository          habitRepository;
    private final HabitService             habitService;
    private final UserRepository           userRepository;
    private final StreakCalculatorRegistry streakRegistry;   // Strategy Pattern
    private final ApplicationEventPublisher eventPublisher;  // Observer Pattern

    // ── Toggle (marcar / desmarcar) ───────────────────────────────────────────

    /**
     * Marca o desmarca un hábito para una fecha dada.
     *
     * Transiciones permitidas:
     *   Sin log           → COMPLETED  (+ HabitCompletedEvent)
     *   PENDING           → COMPLETED  (+ HabitCompletedEvent)
     *   COMPLETED (hoy)   → PENDING    (desmarcar)
     *   COMPLETED (pasado)→ ERROR      (inmutable)
     */
    public ToggleLogResponse toggleHabitLog(Long habitId, LocalDate date, String notes) {
        Habit habit = habitService.findHabitOwnedByCurrentUser(habitId);

        if (date.isAfter(LocalDate.now())) {
            throw new InvalidOperationException(
                    "No se puede registrar un hábito para una fecha futura.");
        }

        HabitLog existing = habitLogRepository
                .findByHabitIdAndDate(habitId, date)
                .orElse(null);

        final HabitLog result;
        final String message;

        if (existing == null) {
            result = habitLogRepository.save(
                    HabitLog.builder()
                            .habit(habit).date(date)
                            .status(HabitStatus.COMPLETED).notes(notes)
                            .build()
            );
            message = "Hábito marcado como completado";
            publishCompletedEvent(habit, date);

        } else if (existing.isCompleted()) {
            if (existing.isPast()) {
                throw new InvalidOperationException(
                        "No se puede modificar el registro de un día pasado.");
            }
            existing.setStatus(HabitStatus.PENDING);
            result  = habitLogRepository.save(existing);
            message = "Hábito desmarcado";

        } else {
            existing.setStatus(HabitStatus.COMPLETED);
            existing.setNotes(notes);
            result  = habitLogRepository.save(existing);
            message = "Hábito marcado como completado";
            publishCompletedEvent(habit, date);
        }

        return new ToggleLogResponse(toLogResponse(result), message);
    }

    // ── Consultas ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<HabitLogResponse> getLogsInRange(Long habitId, LocalDate from, LocalDate to) {
        habitService.findHabitOwnedByCurrentUser(habitId);
        return habitLogRepository
                .findByHabitIdAndDateBetweenOrderByDateAsc(habitId, from, to)
                .stream()
                .map(this::toLogResponse)
                .toList();
    }

    /**
     * Estadísticas de un hábito individual: rachas y porcentajes.
     *
     * STRATEGY en acción: una sola llamada a streakRegistry.getCalculator(habit)
     * devuelve el algoritmo correcto para el tipo de hábito.
     * El resto del método no cambia independientemente del FrequencyType.
     */
    @Transactional(readOnly = true)
    public HabitStatsResponse getHabitStats(Long habitId) {
        Habit habit = habitService.findHabitOwnedByCurrentUser(habitId);

        List<HabitLog> completed = habitLogRepository
                .findByHabitIdAndStatusOrderByDateDesc(habitId, HabitStatus.COMPLETED);

        var calculator    = streakRegistry.getCalculator(habit);
        int currentStreak = calculator.calculateCurrentStreak(habit, completed);
        int maxStreak     = calculator.calculateMaxStreak(habit, completed);

        LocalDate now = LocalDate.now();
        long thisWeek  = habitLogRepository.countCompletedInRange(habitId,
                now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                now.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY)));
        long thisMonth = habitLogRepository.countCompletedInRange(habitId,
                now.withDayOfMonth(1),
                now.with(TemporalAdjusters.lastDayOfMonth()));

        int expWeek  = calculateExpectedPerWeek(habit);
        int expMonth = expWeek * 4;

        return new HabitStatsResponse(
                habitId, habit.getName(), currentStreak, maxStreak,
                expWeek  > 0 ? (double) thisWeek  / expWeek  : 0,
                expMonth > 0 ? (double) thisMonth / expMonth : 0,
                completed.size()
        );
    }

    /**
     * Estadísticas globales para el dashboard del usuario.
     *
     * Decisiones de rendimiento:
     * - findAllCompletedForUser() carga TODOS los logs del usuario en una
     *   sola query con JOIN FETCH. Sin esto, habría N+1 queries
     *   (una por cada hábito para calcular su racha).
     * - Los logs se agrupan en memoria por habitId con un Map.
     * - countCompletedPerDayForUser() agrupa en BD directamente (GROUP BY).
     */
    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats(Long userId) {
        LocalDate today     = LocalDate.now();
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd   = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        // 1. Completados hoy (query filtrada por userId + fecha)
        long completedToday = habitLogRepository.countCompletedForUserOnDate(userId, today);

        // 2. Total hábitos activos
        List<Habit> activeHabits = habitRepository.findByUserIdAndActiveTrueOrderByNameAsc(userId);
        int totalActive = activeHabits.size();

        // 3. Mejor racha activa — Strategy sobre todos los hábitos
        //    Una sola query para los logs, agrupados en memoria → evita N+1
        Map<Long, List<HabitLog>> logsByHabit = habitLogRepository
                .findAllCompletedForUser(userId).stream()
                .collect(Collectors.groupingBy(l -> l.getHabit().getId()));

        int bestStreak = activeHabits.stream()
                .mapToInt(h -> streakRegistry.getCalculator(h)
                        .calculateCurrentStreak(h, logsByHabit.getOrDefault(h.getId(), List.of())))
                .max().orElse(0);

        // 4. Datos por día para el gráfico de barras (GROUP BY en BD)
        Map<LocalDate, Long> completedByDate = habitLogRepository
                .countCompletedPerDayForUser(userId, weekStart, weekEnd)
                .stream().collect(Collectors.toMap(
                        r -> (LocalDate) r[0],
                        r -> (Long)      r[1]
                ));

        List<DailyCompletionData> weeklyData =
                buildWeeklyData(weekStart, totalActive, completedByDate);

        // % semanal: media de días pasados con hábitos
        OptionalDouble avg = weeklyData.stream()
                .filter(d -> !d.date().isAfter(today) && d.total() > 0)
                .mapToInt(d -> d.completed() * 100 / d.total())
                .average();

        return new DashboardStatsResponse(
                (int) completedToday, totalActive, bestStreak,
                avg.isPresent() ? (int) avg.getAsDouble() : 0,
                weeklyData
        );
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private void publishCompletedEvent(Habit habit, LocalDate date) {
        eventPublisher.publishEvent(new HabitCompletedEvent(
                this, habit.getUser().getId(), habit.getId(), date, habit.getName()
        ));
    }

    private int calculateExpectedPerWeek(Habit habit) {
        return switch (habit.getFrequencyType()) {
            case DAILY  -> 7;
            case WEEKLY -> habit.getWeeklyDays() != null ? habit.getWeeklyDays().size() : 0;
            case CUSTOM -> habit.getCustomFrequencyDays() != null
                    ? Math.max(1, 7 / habit.getCustomFrequencyDays())
                    : 1;
        };
    }

    private List<DailyCompletionData> buildWeeklyData(
            LocalDate weekStart, int totalHabits, Map<LocalDate, Long> completedByDate) {
        List<DailyCompletionData> result = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate day = weekStart.plusDays(i);
            String label  = day.getDayOfWeek()
                    .getDisplayName(TextStyle.SHORT, new Locale("es"));
            int done = completedByDate.getOrDefault(day, 0L).intValue();
            result.add(new DailyCompletionData(day, label, done, totalHabits));
        }
        return result;
    }

    private HabitLogResponse toLogResponse(HabitLog log) {
        return new HabitLogResponse(log.getId(), log.getDate(), log.getStatus(), log.getNotes());
    }
}
