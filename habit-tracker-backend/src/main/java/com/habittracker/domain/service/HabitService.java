package com.habittracker.domain.service;

import com.habittracker.application.dto.request.HabitRequest;
import com.habittracker.application.dto.response.ResponseDTOs.HabitResponse;
import com.habittracker.common.exception.CustomExceptions.*;
import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.User;
import com.habittracker.domain.repository.HabitRepository;
import com.habittracker.domain.repository.UserRepository;
import com.habittracker.domain.service.factory.HabitFactoryRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio de hábitos.
 *
 * PATRÓN FACTORY en acción:
 *   createHabit() delega la construcción del objeto Habit
 *   en HabitFactoryRegistry, que elige la fábrica correcta.
 *   Este servicio no tiene ningún if/switch sobre FrequencyType.
 *
 * RESPONSABILIDADES:
 *   - CRUD de hábitos del usuario autenticado.
 *   - Garantizar que un usuario solo accede a SUS hábitos.
 *   - Mapear entidades a DTOs de respuesta.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class HabitService {

    private final HabitRepository habitRepository;
    private final UserRepository userRepository;
    private final HabitFactoryRegistry habitFactoryRegistry;  // 👈 Factory Pattern

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<HabitResponse> getActiveHabits() {
        Long userId = getAuthenticatedUserId();
        return habitRepository
                .findByUserIdAndActiveTrueOrderByNameAsc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public HabitResponse getHabit(Long habitId) {
        return toResponse(findHabitOwnedByCurrentUser(habitId));
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    /**
     * Crea un nuevo hábito usando el patrón Factory.
     *
     * El Factory se encarga de:
     * - Validar que los campos requeridos para ese tipo estén presentes.
     * - Construir el objeto Habit correctamente configurado.
     *
     * HabitService solo necesita:
     * - Obtener el usuario autenticado.
     * - Llamar al registry.
     * - Persistir el resultado.
     */
    public HabitResponse createHabit(HabitRequest request) {
        Long userId = getAuthenticatedUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", userId));

        // ← FACTORY PATTERN: delega la creación al factory adecuado
        Habit habit = habitFactoryRegistry.createHabit(request, user);

        Habit saved = habitRepository.save(habit);
        log.info("Hábito creado: '{}' (tipo: {}) para usuario {}",
                saved.getName(), saved.getFrequencyType(), userId);

        return toResponse(saved);
    }

    /**
     * Actualiza nombre y descripción de un hábito.
     * No se permite cambiar la frecuencia (implicaría invalidar el historial).
     * Para cambiar frecuencia: archivar y crear uno nuevo.
     */
    public HabitResponse updateHabit(Long habitId, HabitRequest request) {
        Habit habit = findHabitOwnedByCurrentUser(habitId);

        habit.setName(request.getName().trim());
        habit.setDescription(request.getDescription()); // puede ser null → limpia la descripción

        // Actualizar campos de frecuencia si se envían
        // (en edición el frontend no muestra el selector de tipo,
        //  pero sí permite editar días/intervalo del tipo existente)
        if (request.getWeeklyDays() != null) {
            habit.setWeeklyDays(request.getWeeklyDays());
        }
        if (request.getCustomFrequencyDays() != null) {
            habit.setCustomFrequencyDays(request.getCustomFrequencyDays());
        }

        return toResponse(habitRepository.save(habit));
    }

    /** Archiva el hábito (active = false). Los logs históricos se conservan. */
    public void archiveHabit(Long habitId) {
        Habit habit = findHabitOwnedByCurrentUser(habitId);
        habit.setActive(false);
        habitRepository.save(habit);
        log.info("Hábito archivado: {} (usuario {})", habitId, getAuthenticatedUserId());
    }

    /** Elimina el hábito permanentemente (con todos sus logs por cascade). */
    public void deleteHabit(Long habitId) {
        Habit habit = findHabitOwnedByCurrentUser(habitId);
        habitRepository.delete(habit);
        log.info("Hábito eliminado: {} (usuario {})", habitId, getAuthenticatedUserId());
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    /**
     * Obtiene el hábito verificando que pertenece al usuario autenticado.
     * Lanza 404 si no existe y 403 si no es del usuario.
     */
    Habit findHabitOwnedByCurrentUser(Long habitId) {
        Long userId = getAuthenticatedUserId();
        return habitRepository.findByIdAndUserId(habitId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Hábito", habitId));
    }

    private Long getAuthenticatedUserId() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario: " + username))
                .getId();
    }

    private HabitResponse toResponse(Habit habit) {
        return new HabitResponse(
                habit.getId(),
                habit.getName(),
                habit.getDescription(),
                habit.getFrequencyType(),
                habit.getWeeklyDays(),
                habit.getCustomFrequencyDays(),
                habit.isActive(),
                habit.getCreatedAt()
        );
    }
}
