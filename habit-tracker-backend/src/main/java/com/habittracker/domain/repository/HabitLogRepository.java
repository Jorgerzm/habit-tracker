package com.habittracker.domain.repository;

import com.habittracker.domain.model.HabitLog;
import com.habittracker.domain.model.enums.HabitStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HabitLogRepository extends JpaRepository<HabitLog, Long> {

    /** Log de un hábito en una fecha concreta (para el check/uncheck del día). */
    Optional<HabitLog> findByHabitIdAndDate(Long habitId, LocalDate date);

    /** Todos los logs de un hábito en un rango de fechas, ordenados por fecha. */
    List<HabitLog> findByHabitIdAndDateBetweenOrderByDateAsc(
            Long habitId, LocalDate from, LocalDate to);

    /** Solo los logs COMPLETED de un hábito (para calcular rachas y estadísticas). */
    List<HabitLog> findByHabitIdAndStatusOrderByDateDesc(
            Long habitId, HabitStatus status);

    /** Conteo de días completados en un rango (para objetivos). */
    @Query("""
            SELECT COUNT(l) FROM HabitLog l
            WHERE l.habit.id = :habitId
              AND l.status = 'COMPLETED'
              AND l.date >= :from
              AND l.date <= :to
            """)
    long countCompletedInRange(
            @Param("habitId") Long habitId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    /** Verificar si ya existe un log para ese hábito y fecha (evitar duplicados). */
    boolean existsByHabitIdAndDate(Long habitId, LocalDate date);

    // ── Queries para el Dashboard ────────────────────────────────────────────

    /**
     * Número de hábitos COMPLETADOS hoy para un usuario.
     * Cruza habit_logs con habits para filtrar por userId.
     * Solo cuenta hábitos activos.
     */
    @Query("""
            SELECT COUNT(l) FROM HabitLog l
            WHERE l.habit.user.id = :userId
              AND l.habit.active  = true
              AND l.status        = 'COMPLETED'
              AND l.date          = :date
            """)
    long countCompletedForUserOnDate(
            @Param("userId") Long userId,
            @Param("date") LocalDate date
    );

    /**
     * Número de hábitos COMPLETADOS por un usuario en un rango de fechas,
     * agrupados por fecha. Útil para construir el gráfico de barras semanal.
     *
     * Devuelve una lista de Object[] con [date, count].
     */
    @Query("""
            SELECT l.date, COUNT(l) FROM HabitLog l
            WHERE l.habit.user.id = :userId
              AND l.habit.active  = true
              AND l.status        = 'COMPLETED'
              AND l.date          >= :from
              AND l.date          <= :to
            GROUP BY l.date
            ORDER BY l.date ASC
            """)
    List<Object[]> countCompletedPerDayForUser(
            @Param("userId") Long userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    /**
     * Todos los logs COMPLETED del usuario (de todos sus hábitos activos).
     * Necesario para calcular la mejor racha activa del dashboard.
     */
    @Query("""
            SELECT l FROM HabitLog l
            JOIN FETCH l.habit h
            WHERE h.user.id  = :userId
              AND h.active   = true
              AND l.status   = 'COMPLETED'
            ORDER BY l.habit.id, l.date DESC
            """)
    List<HabitLog> findAllCompletedForUser(@Param("userId") Long userId);
}
