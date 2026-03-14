package com.habittracker.domain.model;

import com.habittracker.domain.model.enums.FrequencyType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad Habit: representa un hábito que un usuario quiere rastrear.
 *
 * Decisiones de diseño sobre frecuencias:
 *
 * DAILY:
 *   - Se ignoran weeklyDays y customFrequencyDays.
 *
 * WEEKLY:
 *   - weeklyDays almacena los días seleccionados como @ElementCollection (List<Integer>).
 *     Valores: 1=Lunes, 2=Martes, ..., 7=Domingo (ISO 8601).
 *   - Ventaja vs String "1,3,5": más fácil de consultar/validar en Java,
 *     no hay parsing manual.
 *   - Se crea una tabla habit_weekly_days con (habit_id, day).
 *
 * CUSTOM:
 *   - customFrequencyDays define el intervalo (ej: 3 = cada 3 días).
 *   - La fecha de referencia es createdAt del hábito.
 *
 * isActive permite "archivar" un hábito sin borrarlo (los datos históricos
 * se conservan para estadísticas).
 */
@Entity
@Table(name = "habits")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Habit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @Size(max = 500)
    @Column(length = 500)
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FrequencyType frequencyType;

    // ── Campos de frecuencia (solo uno aplica según frequencyType) ──────────

    /**
     * WEEKLY: Días de la semana en que debe cumplirse el hábito.
     * 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 7=Domingo.
     */
    @ElementCollection
    @CollectionTable(
            name = "habit_weekly_days",
            joinColumns = @JoinColumn(name = "habit_id")
    )
    @Column(name = "day_of_week")
    @Builder.Default
    private List<Integer> weeklyDays = new ArrayList<>();

    /**
     * CUSTOM: Intervalo en días (ej: 3 = cada 3 días).
     * null si no aplica.
     */
    @Column
    private Integer customFrequencyDays;

    // ── Estado y auditoría ──────────────────────────────────────────────────

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // ── Relaciones ──────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "habit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<HabitLog> logs = new ArrayList<>();

    @OneToMany(mappedBy = "habit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Goal> goals = new ArrayList<>();

    // ── Helpers ─────────────────────────────────────────────────────────────

    public void addLog(HabitLog log) {
        logs.add(log);
        log.setHabit(this);
    }

    public void addGoal(Goal goal) {
        goals.add(goal);
        goal.setHabit(this);
    }
}
