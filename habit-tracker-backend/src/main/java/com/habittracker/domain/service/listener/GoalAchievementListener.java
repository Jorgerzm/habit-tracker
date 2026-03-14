package com.habittracker.domain.service.listener;

import com.habittracker.domain.model.Goal;
import com.habittracker.domain.model.enums.FrequencyType;
import com.habittracker.domain.repository.GoalRepository;
import com.habittracker.domain.repository.HabitLogRepository;
import com.habittracker.domain.service.event.HabitCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/**
 * ═══════════════════════════════════════════════════════════════
 *  PATRÓN OBSERVER — Listener 1: Verificación de objetivos
 * ═══════════════════════════════════════════════════════════════
 *
 * Reacciona a HabitCompletedEvent para verificar si el usuario
 * ha alcanzado algún objetivo asociado al hábito completado.
 *
 * @Async: el procesamiento ocurre en un hilo aparte, así la
 * petición HTTP original no espera a que se verifiquen los objetivos.
 * Importante: si usas @Async, la transacción del HabitLogService
 * ya habrá committed, por lo que el log está garantizado en BD.
 *
 * @Transactional(readOnly = true): solo hacemos lecturas aquí.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GoalAchievementListener {

    private final GoalRepository goalRepository;
    private final HabitLogRepository habitLogRepository;

    @EventListener
    @Async
    @Transactional(readOnly = true)
    public void handleHabitCompleted(HabitCompletedEvent event) {
        log.debug("Verificando objetivos para hábito {} del usuario {}",
                event.getHabitId(), event.getUserId());

        List<Goal> goals = goalRepository.findByHabitId(event.getHabitId());

        for (Goal goal : goals) {
            checkGoalAchievement(goal, event.getCompletedDate());
        }
    }

    private void checkGoalAchievement(Goal goal, LocalDate completedDate) {
        // Calcular el rango del período actual según el tipo de objetivo
        LocalDate[] range = calculatePeriodRange(goal.getTimePeriod(), completedDate);
        LocalDate periodStart = range[0];
        LocalDate periodEnd   = range[1];

        long completedCount = habitLogRepository.countCompletedInRange(
                goal.getHabit().getId(), periodStart, periodEnd
        );

        if (completedCount >= goal.getTargetCount()) {
            log.info("¡Objetivo alcanzado! Usuario: {}, Hábito: '{}', " +
                     "Objetivo: {}/{} en {}, Completados: {}",
                    goal.getUser().getId(),
                    goal.getHabit().getName(),
                    goal.getTargetCount(),
                    goal.getTimePeriod(),
                    periodStart,
                    completedCount
            );
        }
    }

    /**
     * Calcula el inicio y fin del período actual (semana o mes).
     * Devuelve [periodStart, periodEnd].
     */
    private LocalDate[] calculatePeriodRange(Goal.TimePeriod period, LocalDate referenceDate) {
        return switch (period) {
            case WEEKLY -> new LocalDate[]{
                    referenceDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                    referenceDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
            };
            case MONTHLY -> new LocalDate[]{
                    referenceDate.withDayOfMonth(1),
                    referenceDate.with(TemporalAdjusters.lastDayOfMonth())
            };
        };
    }
}
