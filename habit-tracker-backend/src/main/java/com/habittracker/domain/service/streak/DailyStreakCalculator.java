package com.habittracker.domain.service.streak;

import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.HabitLog;
import com.habittracker.domain.model.enums.FrequencyType;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * ═══════════════════════════════════════════════════════════════
 *  PATRÓN STRATEGY — Implementación concreta: hábito DIARIO
 * ═══════════════════════════════════════════════════════════════
 *
 * ALGORITMO (racha actual):
 *
 *   Ejemplo con logs: [1 ene ✓, 2 ene ✓, 3 ene ✗, 4 ene ✓, 5 ene ✓, 6 ene (hoy) ✓]
 *
 *   1. Convertir logs a Set<LocalDate> para búsqueda O(1).
 *   2. Empezar desde "ayer" (o hoy si ya se completó hoy).
 *   3. Retroceder día a día mientras el día esté en el Set.
 *   4. Al primer hueco, parar.
 *
 *   Resultado: racha = 3 (4, 5, 6 ene).
 *              El 3 ene roto no importa, solo cuenta la cadena actual.
 *
 * CASO ESPECIAL — "Gracia de hoy":
 *   Si hoy NO está completado pero ayer sí, la racha NO se rompe todavía
 *   (el día aún puede completarse). Se cuenta desde ayer.
 *   Si hoy SÍ está completado, se cuenta desde hoy.
 *
 * COMPLEJIDAD: O(n) donde n = número de logs.
 */
@Component
public class DailyStreakCalculator implements StreakCalculator {

    @Override
    public FrequencyType getFrequencyType() {
        return FrequencyType.DAILY;
    }

    @Override
    public int calculateCurrentStreak(Habit habit, List<HabitLog> logs) {
        if (logs == null || logs.isEmpty()) return 0;

        Set<LocalDate> completedDates = toDateSet(logs);
        LocalDate today = LocalDate.now();

        // Punto de inicio: hoy si está completo, si no ayer (gracia)
        LocalDate cursor = completedDates.contains(today) ? today : today.minusDays(1);

        int streak = 0;
        while (completedDates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    @Override
    public int calculateMaxStreak(Habit habit, List<HabitLog> logs) {
        if (logs == null || logs.isEmpty()) return 0;

        Set<LocalDate> completedDates = toDateSet(logs);

        // Para max streak necesitamos iterar en orden
        List<LocalDate> sortedDates = completedDates.stream()
                .sorted()
                .toList();

        int maxStreak = 0;
        int currentStreak = 0;
        LocalDate previousDate = null;

        for (LocalDate date : sortedDates) {
            if (previousDate != null && date.equals(previousDate.plusDays(1))) {
                // Día consecutivo: extender la racha actual
                currentStreak++;
            } else {
                // Hueco encontrado: reiniciar
                currentStreak = 1;
            }
            maxStreak = Math.max(maxStreak, currentStreak);
            previousDate = date;
        }

        return maxStreak;
    }

    // ── Helper privado ───────────────────────────────────────────────────────

    private Set<LocalDate> toDateSet(List<HabitLog> logs) {
        return logs.stream()
                .map(HabitLog::getDate)
                .collect(Collectors.toSet());
    }
}
