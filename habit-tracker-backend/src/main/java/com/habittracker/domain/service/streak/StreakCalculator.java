package com.habittracker.domain.service.streak;

import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.HabitLog;
import com.habittracker.domain.model.enums.FrequencyType;

import java.util.List;

/**
 * ═══════════════════════════════════════════════════════════════
 *  PATRÓN STRATEGY — Interfaz
 * ═══════════════════════════════════════════════════════════════
 *
 * PROBLEMA QUE RESUELVE:
 *   Calcular la racha de un hábito depende completamente de su
 *   frecuencia. Un hábito diario necesita días consecutivos sin
 *   hueco. Uno semanal (lunes, miércoles, viernes) solo cuenta
 *   esos días. Uno personalizado (cada 3 días) tiene su propio
 *   ritmo. Sin Strategy, tendríamos un método lleno de if/switch:
 *
 *      SIN STRATEGY (difícil de mantener y extender):
 *   ┌─────────────────────────────────────────────────────┐
 *   │ if (habit.getFrequencyType() == DAILY) {            │
 *   │     // 30 líneas de lógica diaria                   │
 *   │ } else if (habit.getFrequencyType() == WEEKLY) {    │
 *   │     // 40 líneas de lógica semanal                  │
 *   │ } else if (habit.getFrequencyType() == CUSTOM) {    │
 *   │     // 35 líneas de lógica personalizada            │
 *   │ }                                                   │
 *   └─────────────────────────────────────────────────────┘
 *   Si añadimos FrequencyType.MONTHLY, hay que tocar este método.
 *
 *      CON STRATEGY (Open/Closed Principle):
 *   - Cada algoritmo en su propia clase.
 *   - Añadir MONTHLY = crear MonthlyStreakCalculator. Nada más.
 *   - Cada clase es testeable de forma totalmente independiente.
 *
 * ESTRUCTURA:
 *   StreakCalculator (interfaz)
 *       ├── DailyStreakCalculator   → @Component, FrequencyType.DAILY
 *       ├── WeeklyStreakCalculator  → @Component, FrequencyType.WEEKLY
 *       └── CustomStreakCalculator  → @Component, FrequencyType.CUSTOM
 *
 *   En HabitLogService se inyecta un Map<FrequencyType, StreakCalculator>
 *   que Spring construye automáticamente a partir de los @Component.
 *
 * MÉTODO getFrequencyType():
 *   Cada implementación declara qué FrequencyType maneja.
 *   Esto permite que HabitLogService construya el mapa dinámicamente
 *   sin ningún if/switch: calculators.get(habit.getFrequencyType())
 */
public interface StreakCalculator {

    /**
     * Calcula la racha actual del hábito.
     *
     * La racha actual es el número de períodos consecutivos
     * (días, semanas, intervalos) completados hasta hoy, contando
     * hacia atrás desde el último período esperado.
     *
     * Si hoy es un día esperado y no se ha completado aún,
     * NO se rompe la racha (el día aún no ha terminado).
     *
     * @param habit El hábito con su configuración de frecuencia.
     * @param logs  Lista de logs COMPLETED del hábito (ya filtrada).
     *              Se asume ordenada por fecha ascendente.
     * @return Número de períodos consecutivos completados. 0 si no hay racha.
     */
    int calculateCurrentStreak(Habit habit, List<HabitLog> logs);

    /**
     * Calcula la racha máxima histórica del hábito.
     *
     * Recorre todos los logs y encuentra la secuencia consecutiva
     * más larga que existió en algún momento.
     *
     * @param habit El hábito con su configuración de frecuencia.
     * @param logs  Lista de todos los logs COMPLETED del hábito.
     * @return La racha más larga que se logró. 0 si nunca se completó.
     */
    int calculateMaxStreak(Habit habit, List<HabitLog> logs);

    /**
     * Declara qué FrequencyType gestiona esta implementación.
     * Se usa para construir el Map<FrequencyType, StreakCalculator>
     * en HabitLogService.
     */
    FrequencyType getFrequencyType();
}
