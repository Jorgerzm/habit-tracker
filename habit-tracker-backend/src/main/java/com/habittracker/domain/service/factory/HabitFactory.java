package com.habittracker.domain.service.factory;

import com.habittracker.application.dto.request.HabitRequest;
import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.User;
import com.habittracker.domain.model.enums.FrequencyType;

/**
 * ═══════════════════════════════════════════════════════════════
 *  PATRÓN FACTORY — Interfaz
 * ═══════════════════════════════════════════════════════════════
 *
 * PROBLEMA QUE RESUELVE:
 *   La creación de un Habit no es trivial. Dependiendo de FrequencyType,
 *   se necesitan validar y configurar campos distintos:
 *
 *   - DAILY:  solo necesita nombre, descripción. Los campos de frecuencia
 *             se ignoran (y deben dejarse null para no confundir).
 *
 *   - WEEKLY: requiere que weeklyDays no esté vacío y que los valores
 *             sean válidos (1-7). customFrequencyDays debe ser null.
 *
 *   - CUSTOM: requiere customFrequencyDays > 0. weeklyDays debe estar vacío.
 *
 *   Sin Factory, toda esa lógica viviría en HabitService.createHabit()
 *   con un gran bloque if/switch, mezclando validación, construcción
 *   y lógica de negocio en el mismo método.
 *
 *   ❌ SIN FACTORY:
 *   ┌─────────────────────────────────────────────────────┐
 *   │ public Habit createHabit(HabitRequest req, User u) {│
 *   │   Habit habit = new Habit();                        │
 *   │   habit.setName(req.getName());                     │
 *   │   if (req.getType() == DAILY) {                     │
 *   │       // ...validaciones daily                      │
 *   │   } else if (req.getType() == WEEKLY) {             │
 *   │       // ...validaciones weekly                     │
 *   │       habit.setWeeklyDays(req.getWeeklyDays());     │
 *   │   } else if (req.getType() == CUSTOM) {             │
 *   │       // ...validaciones custom                     │
 *   │   }                                                 │
 *   │   return habit;                                     │
 *   │ }                                                   │
 *   └─────────────────────────────────────────────────────┘
 *
 *   ✅ CON FACTORY:
 *   HabitService delega en la fábrica correcta.
 *   Cada fábrica valida y construye solo su tipo.
 *   Añadir MONTHLY = crear MonthlyHabitFactory. Nada más.
 *
 * ESTRUCTURA:
 *   HabitFactory (interfaz)
 *       ├── DailyHabitFactory   → FrequencyType.DAILY
 *       ├── WeeklyHabitFactory  → FrequencyType.WEEKLY
 *       └── CustomHabitFactory  → FrequencyType.CUSTOM
 *
 *   HabitFactoryRegistry selecciona la fábrica correcta (igual que con Strategy).
 */
public interface HabitFactory {

    /**
     * Crea un Habit configurado y listo para persistir.
     *
     * Las implementaciones deben:
     * 1. Validar que el request contiene los campos necesarios para su tipo.
     * 2. Construir el Habit con todos los campos correctamente configurados.
     * 3. Asegurarse de que los campos de otros tipos queden null/vacíos.
     *
     * @param request DTO con los datos del nuevo hábito.
     * @param user    Propietario del hábito (ya cargado de BD).
     * @return Habit listo para ser pasado a habitRepository.save().
     * @throws com.habittracker.common.exception.CustomExceptions.InvalidOperationException
     *         si el request no contiene los datos necesarios para este tipo.
     */
    Habit createHabit(HabitRequest request, User user);

    /**
     * Declara qué FrequencyType construye esta fábrica.
     */
    FrequencyType getFrequencyType();
}
