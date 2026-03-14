package com.habittracker.domain.service.factory;

import com.habittracker.application.dto.request.HabitRequest;
import com.habittracker.common.exception.CustomExceptions.InvalidOperationException;
import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.User;
import com.habittracker.domain.model.enums.FrequencyType;
import org.springframework.stereotype.Component;

import java.util.List;

// ════════════════════════════════════════════════════════════════════════════
//  PATRÓN FACTORY — Las tres implementaciones concretas
//
//  Se agrupan en un solo archivo para facilitar la comparación entre ellas
//  y ver claramente cómo cada una valida y construye su tipo específico.
//  En un proyecto real podrían ir en archivos separados.
// ════════════════════════════════════════════════════════════════════════════


/**
 * Fábrica para hábitos DIARIOS.
 *
 * Un hábito diario es el más simple: se espera completar todos los días.
 * weeklyDays y customFrequencyDays no aplican y deben ignorarse.
 */
@Component
class DailyHabitFactory implements HabitFactory {

    @Override
    public FrequencyType getFrequencyType() {
        return FrequencyType.DAILY;
    }

    @Override
    public Habit createHabit(HabitRequest request, User user) {
        return Habit.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .frequencyType(FrequencyType.DAILY)
                .user(user)
                // weeklyDays: vacío (por defecto en @Builder.Default)
                // customFrequencyDays: null (no aplica para DAILY)
                .build();
    }
}


// ────────────────────────────────────────────────────────────────────────────


/**
 * Fábrica para hábitos SEMANALES.
 *
 * Requiere que weeklyDays tenga al menos un día válido (1-7).
 * Valida que los valores estén en rango y que no haya duplicados.
 */
@Component
class WeeklyHabitFactory implements HabitFactory {

    @Override
    public FrequencyType getFrequencyType() {
        return FrequencyType.WEEKLY;
    }

    @Override
    public Habit createHabit(HabitRequest request, User user) {
        // ── Validación específica de WEEKLY ──────────────────────────────────
        List<Integer> weeklyDays = request.getWeeklyDays();

        if (weeklyDays == null || weeklyDays.isEmpty()) {
            throw new InvalidOperationException(
                "Un hábito semanal requiere al menos un día de la semana. " +
                "Usa valores del 1 (lunes) al 7 (domingo)."
            );
        }

        // Validar rango de días
        boolean hasInvalidDay = weeklyDays.stream().anyMatch(d -> d < 1 || d > 7);
        if (hasInvalidDay) {
            throw new InvalidOperationException(
                "Los días de la semana deben ser valores entre 1 (lunes) y 7 (domingo)."
            );
        }

        // Eliminar duplicados (si el cliente envía [1, 1, 3] → [1, 3])
        List<Integer> uniqueDays = weeklyDays.stream().distinct().sorted().toList();

        return Habit.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .frequencyType(FrequencyType.WEEKLY)
                .weeklyDays(uniqueDays)
                .user(user)
                // customFrequencyDays: null (no aplica para WEEKLY)
                .build();
    }
}


// ────────────────────────────────────────────────────────────────────────────


/**
 * Fábrica para hábitos PERSONALIZADOS (cada X días).
 *
 * Requiere customFrequencyDays >= 2 (1 sería equivalente a DAILY).
 * weeklyDays no aplica y se ignora.
 */
@Component
class CustomHabitFactory implements HabitFactory {

    private static final int MIN_INTERVAL = 2;
    private static final int MAX_INTERVAL = 365;  // Razonable: máximo cada año

    @Override
    public FrequencyType getFrequencyType() {
        return FrequencyType.CUSTOM;
    }

    @Override
    public Habit createHabit(HabitRequest request, User user) {
        // ── Validación específica de CUSTOM ──────────────────────────────────
        Integer interval = request.getCustomFrequencyDays();

        if (interval == null) {
            throw new InvalidOperationException(
                "Un hábito personalizado requiere especificar el intervalo en días " +
                "(customFrequencyDays)."
            );
        }

        if (interval < MIN_INTERVAL) {
            throw new InvalidOperationException(
                "El intervalo mínimo es " + MIN_INTERVAL + " días. " +
                "Para hábitos diarios usa frequencyType: DAILY."
            );
        }

        if (interval > MAX_INTERVAL) {
            throw new InvalidOperationException(
                "El intervalo máximo es " + MAX_INTERVAL + " días."
            );
        }

        return Habit.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .frequencyType(FrequencyType.CUSTOM)
                .customFrequencyDays(interval)
                .user(user)
                // weeklyDays: vacío (no aplica para CUSTOM)
                .build();
    }
}
