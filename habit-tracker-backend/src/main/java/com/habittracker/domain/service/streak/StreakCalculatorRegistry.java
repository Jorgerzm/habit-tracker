package com.habittracker.domain.service.streak;

import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.enums.FrequencyType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * ═══════════════════════════════════════════════════════════════
 *  PATRÓN STRATEGY — Registro / Selector
 * ═══════════════════════════════════════════════════════════════
 *
 * Este componente actúa como el "Context" del patrón Strategy.
 * Su responsabilidad es seleccionar la estrategia correcta
 * según el FrequencyType del hábito.
 *
 * CÓMO FUNCIONA LA INYECCIÓN:
 *
 *   Spring detecta que el constructor pide List<StreakCalculator>.
 *   Como DailyStreakCalculator, WeeklyStreakCalculator y
 *   CustomStreakCalculator están todos anotados con @Component
 *   e implementan StreakCalculator, Spring inyecta los tres
 *   automáticamente en la lista.
 *
 *   Nosotros los indexamos en un EnumMap<FrequencyType, StreakCalculator>
 *   usando el método getFrequencyType() de cada uno.
 *
 * RESULTADO:
 *   ┌──────────────────────────────────────────────────────┐
 *   │ calculators.get(FrequencyType.DAILY)                 │
 *   │   → DailyStreakCalculator                            │
 *   │ calculators.get(FrequencyType.WEEKLY)                │
 *   │   → WeeklyStreakCalculator                           │
 *   │ calculators.get(FrequencyType.CUSTOM)                │
 *   │   → CustomStreakCalculator                           │
 *   └──────────────────────────────────────────────────────┘
 *
 * EXTENSIBILIDAD (Open/Closed Principle):
 *   Añadir FrequencyType.MONTHLY solo requiere:
 *   1. Añadir MONTHLY al enum FrequencyType.
 *   2. Crear MonthlyStreakCalculator implements StreakCalculator.
 *   3. Anotarla con @Component.
 *   → Este registro la detecta automáticamente. Sin cambios aquí.
 */
@Component
public class StreakCalculatorRegistry {

    private final Map<FrequencyType, StreakCalculator> calculators;

    /**
     * Spring inyecta todas las implementaciones de StreakCalculator
     * encontradas en el contexto de la aplicación.
     */
    public StreakCalculatorRegistry(List<StreakCalculator> allCalculators) {
        calculators = new EnumMap<>(FrequencyType.class);
        allCalculators.forEach(calc ->
                calculators.put(calc.getFrequencyType(), calc)
        );
    }

    /**
     * Devuelve la estrategia adecuada para el hábito dado.
     *
     * @throws IllegalStateException si no hay calculador para ese FrequencyType
     *         (indica un error de programación: falta implementar la estrategia).
     */
    public StreakCalculator getCalculator(Habit habit) {
        StreakCalculator calculator = calculators.get(habit.getFrequencyType());
        if (calculator == null) {
            throw new IllegalStateException(
                "No hay StreakCalculator registrado para FrequencyType: "
                + habit.getFrequencyType()
                + ". Implementa la interfaz StreakCalculator y anótala con @Component."
            );
        }
        return calculator;
    }
}
