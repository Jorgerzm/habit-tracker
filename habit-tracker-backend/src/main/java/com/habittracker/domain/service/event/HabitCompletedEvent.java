package com.habittracker.domain.service.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.LocalDate;

/**
 * ═══════════════════════════════════════════════════════════════
 *  PATRÓN OBSERVER — Evento de dominio
 * ═══════════════════════════════════════════════════════════════
 *
 * PROBLEMA QUE RESUELVE:
 *   Cuando un usuario marca un hábito como completado, queremos que
 *   sucedan varias cosas "en cascada":
 *   1. Verificar si se ha cumplido un objetivo (GoalAchievementListener).
 *   2. Enviar una notificación de ánimo (NotificationListener).
 *   3. (Futuro) Registrar en un log de actividad para el feed social.
 *
 *   Sin Observer, HabitLogService tendría que conocer y llamar
 *   directamente a GoalService, NotificationService, ActivityService...
 *   generando un alto acoplamiento:
 *
 *   ❌ SIN OBSERVER (acoplamiento alto):
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ // En HabitLogService:                                   │
 *   │ habitLogRepository.save(log);                            │
 *   │ goalService.checkGoalsFor(userId, habitId);  // depende  │
 *   │ notificationService.sendEncouragement(userId); // depende│
 *   │ activityService.logAction(userId, habitId);   // depende │
 *   └──────────────────────────────────────────────────────────┘
 *   Si añadimos una nueva reacción, modificamos HabitLogService.
 *
 *   ✅ CON OBSERVER (bajo acoplamiento):
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ // En HabitLogService:                                   │
 *   │ habitLogRepository.save(log);                            │
 *   │ publisher.publishEvent(new HabitCompletedEvent(...));    │
 *   └──────────────────────────────────────────────────────────┘
 *   HabitLogService NO conoce a sus observadores.
 *   Añadir una nueva reacción = crear un nuevo @EventListener. Nada más.
 *
 * IMPLEMENTACIÓN CON SPRING:
 *   Spring proporciona ApplicationEventPublisher (el "Subject" del patrón)
 *   y @EventListener (los "Observers") de forma nativa.
 *   No necesitamos implementar la infraestructura Observer manualmente.
 *
 * ESTRUCTURA:
 *   HabitCompletedEvent (este archivo)
 *       ↓  publishEvent()
 *   ApplicationEventPublisher (Spring)
 *       ↓  notifica a todos los @EventListener del tipo HabitCompletedEvent
 *   ├── GoalAchievementListener   → verifica objetivos
 *   └── NotificationListener      → envía notificación
 */
@Getter
public class HabitCompletedEvent extends ApplicationEvent {

    /** ID del usuario que completó el hábito. */
    private final Long userId;

    /** ID del hábito completado. */
    private final Long habitId;

    /** Fecha en que se completó (puede ser hoy o un día anterior). */
    private final LocalDate completedDate;

    /** Nombre del hábito (para mensajes de notificación sin hacer consultas extra). */
    private final String habitName;

    public HabitCompletedEvent(Object source, Long userId, Long habitId,
                                LocalDate completedDate, String habitName) {
        super(source);
        this.userId = userId;
        this.habitId = habitId;
        this.completedDate = completedDate;
        this.habitName = habitName;
    }
}
