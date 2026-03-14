package com.habittracker.domain.service.factory;

import com.habittracker.application.dto.request.HabitRequest;
import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.User;
import com.habittracker.domain.model.enums.FrequencyType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * ═══════════════════════════════════════════════════════════════
 *  PATRÓN FACTORY — Registro / Selector
 * ═══════════════════════════════════════════════════════════════
 *
 * Mismo mecanismo que StreakCalculatorRegistry:
 * Spring inyecta todas las implementaciones de HabitFactory,
 * las indexamos por FrequencyType, y HabitService solo necesita
 * llamar a registry.createHabit(request, user) sin saber
 * qué fábrica concreta se usa.
 *
 * DIFERENCIA ENTRE FACTORY Y STRATEGY:
 *
 *   Strategy → define un ALGORITMO intercambiable (calcular rachas).
 *              El objeto ya existe; el comportamiento varía.
 *
 *   Factory  → define la CREACIÓN de objetos.
 *              El objeto no existe aún; la fábrica lo construye
 *              con la configuración correcta y con validaciones
 *              propias de ese tipo.
 *
 * En este proyecto ambos patrones usan el mismo mecanismo de
 * registro (List inyectada + EnumMap), lo que muestra que los
 * patrones no son recetas rígidas sino soluciones a problemas
 * concretos que pueden compartir infraestructura.
 */
@Component
public class HabitFactoryRegistry {

    private final Map<FrequencyType, HabitFactory> factories;

    public HabitFactoryRegistry(List<HabitFactory> allFactories) {
        factories = new EnumMap<>(FrequencyType.class);
        allFactories.forEach(factory ->
                factories.put(factory.getFrequencyType(), factory)
        );
    }

    /**
     * Crea un hábito delegando en la fábrica correcta según el FrequencyType
     * indicado en el request.
     *
     * @throws IllegalStateException si no hay fábrica para ese FrequencyType.
     */
    public Habit createHabit(HabitRequest request, User user) {
        FrequencyType type = request.getFrequencyType();
        HabitFactory factory = factories.get(type);

        if (factory == null) {
            throw new IllegalStateException(
                "No hay HabitFactory registrada para FrequencyType: " + type
            );
        }

        return factory.createHabit(request, user);
    }
}
