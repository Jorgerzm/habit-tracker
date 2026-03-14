package com.habittracker.domain.service.streak;

import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.HabitLog;
import com.habittracker.domain.model.enums.FrequencyType;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * ═══════════════════════════════════════════════════════════════
 *  PATRÓN STRATEGY — Implementación concreta: hábito PERSONALIZADO
 * ═══════════════════════════════════════════════════════════════
 *
 * Un hábito personalizado se repite cada X días.
 * Ejemplo: "Limpiar el coche cada 3 días", "Llamar a mamá cada 5 días".
 *
 * ALGORITMO:
 *
 *   El intervalo establece "ventanas" de cumplimiento desde createdAt.
 *   Si el hábito se creó el 1 de enero con intervalo=3:
 *   - Ventana 0:  1 ene (día 0)
 *   - Ventana 1:  4 ene (día 3)
 *   - Ventana 2:  7 ene (día 6)
 *   - Ventana 3: 10 ene (día 9)
 *   ...
 *
 *   Una ventana se considera cumplida si existe algún log COMPLETED
 *   entre el inicio de la ventana y el día anterior a la siguiente.
 *   (Es decir, en los X días que componen esa ventana.)
 *
 *   Esto da flexibilidad al usuario: si la ventana es "días 3-5",
 *   puede completarlo el día 3, 4 o 5 y cuenta igual.
 *
 * EJEMPLO (intervalo = 3, createdAt = 1 ene):
 *
 *   Ventana [1 ene - 3 ene]: completado el 2 ene ✓
 *   Ventana [4 ene - 6 ene]: completado el 4 ene ✓
 *   Ventana [7 ene - 9 ene]: NO completado       ✗  ← racha rota
 *   Ventana [10 ene - 12 ene]: completado        ✓
 *
 *   Racha actual = 1 (solo la última ventana, la del 10-12)
 *   Racha máxima = 2 (ventanas 1 y 4 ene)
 */
@Component
public class CustomStreakCalculator implements StreakCalculator {

    @Override
    public FrequencyType getFrequencyType() {
        return FrequencyType.CUSTOM;
    }

    @Override
    public int calculateCurrentStreak(Habit habit, List<HabitLog> logs) {
        if (logs == null || logs.isEmpty()) return 0;

        int interval = getInterval(habit);
        LocalDate origin = habit.getCreatedAt().toLocalDate();
        Set<LocalDate> completedDates = toDateSet(logs);
        LocalDate today = LocalDate.now();

        // Encontrar la ventana actual (la que contiene "hoy")
        long currentWindowIndex = ChronoUnit.DAYS.between(origin, today) / interval;

        int streak = 0;
        long windowIndex = currentWindowIndex;

        while (windowIndex >= 0) {
            LocalDate windowStart = origin.plusDays(windowIndex * interval);
            LocalDate windowEnd   = windowStart.plusDays(interval - 1);

            // Si la ventana es futura (o actual no terminada), la omitimos sin penalizar
            if (windowStart.isAfter(today)) {
                windowIndex--;
                continue;
            }

            if (isWindowCompleted(windowStart, windowEnd, completedDates)) {
                streak++;
            } else if (windowEnd.isBefore(today)) {
                // Ventana ya pasó completamente sin completarse → racha rota
                break;
            }
            // Si windowEnd >= today: ventana en curso, no penalizar

            windowIndex--;
        }

        return streak;
    }

    @Override
    public int calculateMaxStreak(Habit habit, List<HabitLog> logs) {
        if (logs == null || logs.isEmpty()) return 0;

        int interval = getInterval(habit);
        LocalDate origin = habit.getCreatedAt().toLocalDate();
        Set<LocalDate> completedDates = toDateSet(logs);
        LocalDate today = LocalDate.now();

        long totalWindows = ChronoUnit.DAYS.between(origin, today) / interval + 1;

        int maxStreak = 0;
        int currentStreak = 0;

        for (long i = 0; i < totalWindows; i++) {
            LocalDate windowStart = origin.plusDays(i * interval);
            LocalDate windowEnd   = windowStart.plusDays(interval - 1);

            if (windowEnd.isAfter(today)) break;  // Ventana no terminada: parar

            if (isWindowCompleted(windowStart, windowEnd, completedDates)) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }

        return maxStreak;
    }

    // ── Helpers privados ─────────────────────────────────────────────────────

    /**
     * Comprueba si hay al menos un log COMPLETED dentro de la ventana [start, end].
     */
    private boolean isWindowCompleted(LocalDate start, LocalDate end, Set<LocalDate> completed) {
        // Iterar los días de la ventana (normalmente muy pocos: 3-7 días)
        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            if (completed.contains(cursor)) return true;
            cursor = cursor.plusDays(1);
        }
        return false;
    }

    /**
     * Obtiene el intervalo del hábito con un valor por defecto de 1
     * si no está configurado (no debería ocurrir, pero protege contra NPE).
     */
    private int getInterval(Habit habit) {
        Integer interval = habit.getCustomFrequencyDays();
        return (interval != null && interval > 0) ? interval : 1;
    }

    private Set<LocalDate> toDateSet(List<HabitLog> logs) {
        return logs.stream()
                .map(HabitLog::getDate)
                .collect(Collectors.toSet());
    }
}
