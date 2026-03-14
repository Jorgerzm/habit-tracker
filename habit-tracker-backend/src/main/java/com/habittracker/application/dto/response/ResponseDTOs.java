package com.habittracker.application.dto.response;

import com.habittracker.domain.model.enums.FrequencyType;
import com.habittracker.domain.model.enums.HabitStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTOs de respuesta agrupados por contexto.
 * Se usan records de Java para concisión (inmutables, equals/hashCode/toString incluidos).
 */
public class ResponseDTOs {

    // ── Auth ─────────────────────────────────────────────────────────────────

    /** Respuesta del login y registro. Incluye el token JWT. */
    public record AuthResponse(
            String token,
            Long id,
            String username,
            String email
    ) {}

    /** Datos del usuario actual (/auth/me). Sin token. */
    public record UserResponse(
            Long id,
            String username,
            String email,
            LocalDateTime createdAt
    ) {}

    // ── Habits ───────────────────────────────────────────────────────────────

    /** Hábito completo con su configuración. */
    public record HabitResponse(
            Long id,
            String name,
            String description,
            FrequencyType frequencyType,
            List<Integer> weeklyDays,
            Integer customFrequencyDays,
            boolean active,
            LocalDateTime createdAt
    ) {}

    // ── Logs ─────────────────────────────────────────────────────────────────

    /** Registro de un día. */
    public record HabitLogResponse(
            Long id,
            LocalDate date,
            HabitStatus status,
            String notes
    ) {}

    /** Respuesta del toggle (marcar/desmarcar). Incluye el log actualizado. */
    public record ToggleLogResponse(
            HabitLogResponse log,
            String message       // "Hábito marcado como completado" / "Hábito desmarcado"
    ) {}

    // ── Stats ─────────────────────────────────────────────────────────────────

    /** Estadísticas de un hábito individual. */
    public record HabitStatsResponse(
            Long habitId,
            String habitName,
            int currentStreak,
            int maxStreak,
            double completionRateWeek,       // 0.0 - 1.0
            double completionRateMonth,      // 0.0 - 1.0
            long totalCompleted
    ) {}

    /** Datos para el dashboard: vista global del usuario. */
    public record DashboardStatsResponse(
            int habitsCompletedToday,
            int totalActiveHabits,
            int bestCurrentStreak,
            int weeklyCompletionRate,         // 0 - 100 (porcentaje)
            List<DailyCompletionData> weeklyData  // 7 días para el gráfico de barras
    ) {}

    /** Un punto de datos en el gráfico de cumplimiento semanal. */
    public record DailyCompletionData(
            LocalDate date,
            String dayLabel,                  // "Lun", "Mar", etc.
            int completed,
            int total
    ) {}

    // ── Goals ─────────────────────────────────────────────────────────────────

    public record GoalResponse(
            Long id,
            Long habitId,
            String habitName,
            int targetCount,
            String timePeriod,
            long currentCount,    // Completados en el período actual
            boolean achieved      // currentCount >= targetCount
    ) {}
}
