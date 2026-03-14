package com.habittracker.application.dto.request;

import com.habittracker.domain.model.enums.FrequencyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * DTO para crear o actualizar un hábito.
 *
 * Nota: usamos @Data (Lombok) en lugar de record porque
 * puede necesitar setters para la deserialización con ciertas
 * configuraciones de Jackson. Los records también funcionan
 * pero requieren @JsonDeserialize en algunos casos con Spring.
 *
 * Los campos opcionales (weeklyDays, customFrequencyDays) solo
 * aplican según frequencyType. La validación de consistencia
 * la hace HabitFactory, no las anotaciones de Bean Validation.
 */
@Data
public class HabitRequest {

    @NotBlank(message = "El nombre del hábito es obligatorio")
    @Size(max = 100, message = "El nombre no puede superar 100 caracteres")
    private String name;

    @Size(max = 500, message = "La descripción no puede superar 500 caracteres")
    private String description;

    @NotNull(message = "El tipo de frecuencia es obligatorio")
    private FrequencyType frequencyType;

    /**
     * Solo para WEEKLY: días de la semana (1=lunes, ..., 7=domingo).
     * Ignorado para otros tipos.
     */
    private List<Integer> weeklyDays;

    /**
     * Solo para CUSTOM: intervalo en días (mínimo 2).
     * Ignorado para otros tipos.
     */
    private Integer customFrequencyDays;
}
