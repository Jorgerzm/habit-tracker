package com.habittracker.domain.model;

import com.habittracker.domain.model.enums.HabitStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * Entidad HabitLog: registro de cumplimiento de un hábito en una fecha concreta.
 *
 * Reglas de negocio clave (se validan en HabitLogService):
 * 1. No puede haber dos logs del mismo hábito en la misma fecha (restricción UNIQUE).
 * 2. No se puede crear un log con fecha futura.
 * 3. Un log COMPLETED solo se puede desmarcar (→ PENDING) si la fecha es hoy.
 * 4. Los logs de días pasados son inmutables (solo lectura para estadísticas).
 *
 * Nota: No incluimos referencia directa a User aquí porque ya
 * se puede navegar por habit.user. Esto evita redundancia y
 * mantiene el grafo de objetos más limpio.
 */
@Entity
@Table(
        name = "habit_logs",
        uniqueConstraints = {
                // Un hábito solo puede tener un log por fecha
                @UniqueConstraint(
                        name = "uk_habit_log_date",
                        columnNames = {"habit_id", "date"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HabitLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private LocalDate date;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private HabitStatus status = HabitStatus.PENDING;

    /** Notas opcionales del usuario para ese día (ej: "Solo pude 10 minutos"). */
    @Column(length = 300)
    private String notes;

    // ── Relaciones ──────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "habit_id", nullable = false)
    private Habit habit;

    // ── Métodos de dominio (lógica simple, no depende de repositorios) ───────

    public boolean isCompleted() {
        return HabitStatus.COMPLETED.equals(this.status);
    }

    public boolean isForToday() {
        return LocalDate.now().equals(this.date);
    }

    public boolean isPast() {
        return this.date.isBefore(LocalDate.now());
    }
}
