package com.habittracker.domain.service.streak;

import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.HabitLog;
import com.habittracker.domain.model.enums.FrequencyType;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * ═══════════════════════════════════════════════════════════════
 *  PATRÓN STRATEGY — Implementación concreta: hábito SEMANAL
 * ═══════════════════════════════════════════════════════════════
 *
 * Un hábito semanal se configura con días específicos, por ejemplo:
 * "Hacer ejercicio los lunes, miércoles y viernes".
 *
 * ALGORITMO (racha actual):
 *
 *   La unidad de racha aquí es "semana completa cumplida".
 *   Una semana se considera CUMPLIDA si todos los días configurados
 *   de esa semana tienen un log COMPLETED.
 *
 *   Ejemplo: hábito configurado para lunes (1) y jueves (4).
 *   Semana actual (lun 6 - dom 12): lunes ✓, jueves ✓  → semana cumplida
 *   Semana pasada (lun 30 - dom 5): lunes ✓, jueves ✓  → semana cumplida
 *   Hace 2 semanas:                 lunes ✓, jueves ✗  → semana rota
 *
 *   Racha actual = 2 semanas (actual + pasada).
 *
 * CASO ESPECIAL — Semana en curso:
 *   Si la semana actual no está completa pero quedan días por delante,
 *   la racha NO se rompe (aún puede completarse).
 *   Si la semana actual no está completa y ya pasaron todos sus días
 *   esperados → sí se rompe.
 *
 * NOTA DE DISEÑO:
 *   Habit.weeklyDays almacena enteros 1-7 (ISO: 1=lunes, 7=domingo).
 *   Coincide con DayOfWeek.getValue() de Java.
 */
@Component
public class WeeklyStreakCalculator implements StreakCalculator {

    @Override
    public FrequencyType getFrequencyType() {
        return FrequencyType.WEEKLY;
    }

    @Override
    public int calculateCurrentStreak(Habit habit, List<HabitLog> logs) {
        if (logs == null || logs.isEmpty()) return 0;
        if (habit.getWeeklyDays() == null || habit.getWeeklyDays().isEmpty()) return 0;

        Set<LocalDate> completedDates = toDateSet(logs);
        Set<Integer> requiredDays = Set.copyOf(habit.getWeeklyDays());
        LocalDate today = LocalDate.now();

        // Empezamos evaluando la semana que contiene "hoy"
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        int streak = 0;

        while (true) {
            WeekStatus status = evaluateWeek(weekStart, requiredDays, completedDates, today);

            if (status == WeekStatus.COMPLETE) {
                streak++;
                weekStart = weekStart.minusWeeks(1);  // Ir a la semana anterior
            } else if (status == WeekStatus.IN_PROGRESS) {
                // Semana actual incompleta pero no terminada: no penaliza
                weekStart = weekStart.minusWeeks(1);
            } else {
                // FAILED: semana rota → parar
                break;
            }

            // Guardia: no retroceder más de 2 años
            if (weekStart.isBefore(today.minusYears(2))) break;
        }

        return streak;
    }

    @Override
    public int calculateMaxStreak(Habit habit, List<HabitLog> logs) {
        if (logs == null || logs.isEmpty()) return 0;
        if (habit.getWeeklyDays() == null || habit.getWeeklyDays().isEmpty()) return 0;

        Set<LocalDate> completedDates = toDateSet(logs);
        Set<Integer> requiredDays = Set.copyOf(habit.getWeeklyDays());

        // Calcular rango: desde la semana del primer log hasta hoy
        LocalDate firstLog = logs.stream().map(HabitLog::getDate).min(LocalDate::compareTo).orElseThrow();
        LocalDate weekStart = firstLog.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate today = LocalDate.now();

        int maxStreak = 0;
        int currentStreak = 0;

        while (!weekStart.isAfter(today)) {
            WeekStatus status = evaluateWeek(weekStart, requiredDays, completedDates, today);

            if (status == WeekStatus.COMPLETE) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else if (status == WeekStatus.FAILED) {
                currentStreak = 0;
            }
            // IN_PROGRESS: no modificar contadores

            weekStart = weekStart.plusWeeks(1);
        }

        return maxStreak;
    }

    // ── Helpers privados ─────────────────────────────────────────────────────

    /**
     * Evalúa si una semana está completa, fallida o en progreso.
     *
     * @param weekStart     Lunes de la semana a evaluar.
     * @param requiredDays  Días obligatorios (1-7).
     * @param completed     Fechas con log COMPLETED.
     * @param today         Fecha actual (para saber si la semana está en el pasado).
     */
    private WeekStatus evaluateWeek(
            LocalDate weekStart,
            Set<Integer> requiredDays,
            Set<LocalDate> completed,
            LocalDate today
    ) {
        boolean anyFutureDayRemaining = false;

        for (int dayOfWeek : requiredDays) {
            // DayOfWeek.of(1) = MONDAY, ... DayOfWeek.of(7) = SUNDAY
            LocalDate expectedDate = weekStart.with(DayOfWeek.of(dayOfWeek));

            if (expectedDate.isAfter(today)) {
                // Este día aún no llegó: la semana puede salvarse
                anyFutureDayRemaining = true;
                continue;
            }

            if (!completed.contains(expectedDate)) {
                // Día pasado no completado
                if (anyFutureDayRemaining) {
                    return WeekStatus.IN_PROGRESS;  // Aún hay días por venir en esta semana
                }
                return WeekStatus.FAILED;           // Todos los días pasaron, alguno sin completar
            }
        }

        return anyFutureDayRemaining ? WeekStatus.IN_PROGRESS : WeekStatus.COMPLETE;
    }

    private Set<LocalDate> toDateSet(List<HabitLog> logs) {
        return logs.stream()
                .map(HabitLog::getDate)
                .collect(Collectors.toSet());
    }

    /** Estado de una semana evaluada. Solo uso interno. */
    private enum WeekStatus {
        COMPLETE,     // Todos los días requeridos completados
        IN_PROGRESS,  // Aún quedan días por llegar en esta semana
        FAILED        // Algún día pasado no fue completado
    }
}
