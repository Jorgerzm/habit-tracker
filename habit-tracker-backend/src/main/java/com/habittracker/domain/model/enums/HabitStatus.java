package com.habittracker.domain.model.enums;

/**
 * Estado de un registro diario de hábito (HabitLog).
 *
 * PENDING   → El hábito aún no se ha marcado para ese día (es el estado inicial).
 * COMPLETED → El usuario marcó el hábito como cumplido.
 * SKIPPED   → El usuario decidió saltarse ese día conscientemente
 *             (no penaliza la racha en algunas implementaciones).
 * FAILED    → El día pasó sin que se completara el hábito
 *             (se puede calcular automáticamente en un job nocturno, o derivar
 *             del hecho de que no existe un log COMPLETED para ese día).
 *
 * Nota de diseño: En lugar del patrón State con clases separadas (complejo con JPA),
 * las transiciones de estado se validan en HabitLogService.
 * Las transiciones válidas son:
 *   PENDING → COMPLETED
 *   PENDING → SKIPPED
 *   COMPLETED → PENDING (desmarcar, solo si es el día actual)
 */
public enum HabitStatus {
    PENDING,
    COMPLETED,
    SKIPPED,
    FAILED
}
