package com.habittracker.domain.model.enums;

/**
 * Define la frecuencia de un hábito.
 *
 * DAILY     → Se espera cumplir el hábito todos los días.
 * WEEKLY    → Se espera cumplir ciertos días de la semana (ej: lunes, miércoles, viernes).
 * CUSTOM    → Se espera cumplir cada X días (ej: cada 3 días).
 *
 * Este enum se usa en el patrón Strategy para seleccionar
 * el calculador de rachas apropiado (StreakCalculator).
 */
public enum FrequencyType {
    DAILY,
    WEEKLY,
    CUSTOM
}
