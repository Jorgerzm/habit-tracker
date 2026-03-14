package com.habittracker.domain.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad User: representa a un usuario registrado en el sistema.
 *
 * Decisiones de diseño:
 * - Usamos @EntityListeners(AuditingEntityListener.class) + @CreatedDate
 *   para que Spring JPA rellene automáticamente createdAt al persistir.
 * - La contraseña se almacena ya encriptada (BCrypt). Nunca se expone en DTOs.
 * - Las relaciones con Habit, HabitLog y Goal son LAZY por defecto para evitar
 *   N+1 queries. Se cargan explícitamente cuando se necesitan.
 * - mappedBy en el lado inverso de la relación para que JPA sepa quién
 *   gestiona la FK (la gestiona Habit, HabitLog y Goal).
 */
@Entity
@Table(name = "users",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "username"),
                @UniqueConstraint(columnNames = "email")
        })
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 3, max = 50)
    @Column(nullable = false, length = 50)
    private String username;

    @NotBlank
    @Email
    @Column(nullable = false, length = 100)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String password;   // BCrypt hash — NUNCA exponer en respuestas

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // ── Relaciones ──────────────────────────────────────────────────────────

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Habit> habits = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Goal> goals = new ArrayList<>();

    // ── Helpers de relación (evita inconsistencias bidireccionales) ──────────

    public void addHabit(Habit habit) {
        habits.add(habit);
        habit.setUser(this);
    }

    public void removeHabit(Habit habit) {
        habits.remove(habit);
        habit.setUser(null);
    }
}
