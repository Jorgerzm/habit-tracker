package com.habittracker.domain.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Entidad Goal: objetivo de cumplimiento para un hábito específico.
 *
 * Ejemplo: "Quiero completar 'Meditar' al menos 5 días esta semana."
 *
 * Decisiones de diseño:
 * - Los objetivos son SIEMPRE por hábito (no globales), lo que simplifica
 *   el cálculo y la visualización.
 * - timePeriod define si el objetivo es semanal o mensual.
 * - targetCount es el número mínimo de días que se deben completar
 *   en ese período.
 * - achieved NO se almacena en BD (es calculado dinámicamente en el servicio)
 *   para evitar inconsistencias. Si el número de logs completados en el
 *   período >= targetCount, el objetivo está conseguido.
 *
 * El listener GoalAchievementListener (patrón Observer) se encarga de
 * notificar cuando se alcanza un objetivo tras marcar un hábito como completado.
 */
@Entity
@Table(name = "goals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Número mínimo de días a completar en el período. */
    @NotNull
    @Min(1)
    @Column(nullable = false)
    private Integer targetCount;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TimePeriod timePeriod;

    // ── Relaciones ──────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "habit_id", nullable = false)
    private Habit habit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // ── Enum interno ────────────────────────────────────────────────────────

    public enum TimePeriod {
        WEEKLY,
        MONTHLY
    }
}
