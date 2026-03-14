package com.habittracker.domain.repository;

import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.enums.FrequencyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HabitRepository extends JpaRepository<Habit, Long> {

    /** Hábitos activos de un usuario, ordenados por nombre. */
    List<Habit> findByUserIdAndActiveTrueOrderByNameAsc(Long userId);

    /** Todos los hábitos de un usuario (incluye archivados). */
    List<Habit> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Verificar que el hábito pertenece al usuario (evita accesos cruzados). */
    Optional<Habit> findByIdAndUserId(Long habitId, Long userId);

    /** Hábitos activos de un tipo de frecuencia específico (útil para jobs). */
    List<Habit> findByFrequencyTypeAndActiveTrue(FrequencyType frequencyType);

    /**
     * Obtiene los hábitos activos de un usuario con sus logs precargados
     * en un rango de fechas. Usa JOIN FETCH para evitar N+1 queries
     * cuando necesitamos calcular rachas de todos los hábitos.
     */
    @Query("""
            SELECT DISTINCT h FROM Habit h
            LEFT JOIN FETCH h.logs l
            WHERE h.user.id = :userId
              AND h.active = true
              AND (l.date IS NULL OR (l.date >= :fromDate AND l.date <= :toDate))
            """)
    List<Habit> findActiveHabitsWithLogsInRange(
            @Param("userId") Long userId,
            @Param("fromDate") java.time.LocalDate fromDate,
            @Param("toDate") java.time.LocalDate toDate
    );
}
