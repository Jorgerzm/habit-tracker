package com.habittracker.application.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.habittracker.application.dto.request.HabitRequest;
import com.habittracker.application.dto.response.ResponseDTOs.*;
import com.habittracker.common.exception.CustomExceptions.InvalidOperationException;
import com.habittracker.common.exception.CustomExceptions.ResourceNotFoundException;
import com.habittracker.domain.model.User;
import com.habittracker.domain.model.enums.FrequencyType;
import com.habittracker.domain.model.enums.HabitStatus;
import com.habittracker.domain.repository.UserRepository;
import com.habittracker.domain.service.HabitLogService;
import com.habittracker.domain.service.HabitService;
import com.habittracker.infrastructure.security.JwtAuthenticationFilter;
import com.habittracker.infrastructure.security.JwtUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests de integración del HabitController con @WebMvcTest.
 *
 * Qué testeamos:
 *   1. CRUD de hábitos: respuestas correctas, códigos HTTP.
 *   2. Autorización: 401 sin token, 200 con @WithMockUser.
 *   3. Validaciones: 400 en campos requeridos.
 *   4. Errores de negocio: 404 si no existe, 400 en operaciones inválidas.
 *   5. Toggle de logs: respuesta correcta con el estado actualizado.
 *
 * Patrón usado en los tests:
 *   - AAA: Arrange (mocks) / Act (mockMvc.perform) / Assert (andExpect).
 *   - @WithMockUser: simula usuario autenticado sin necesitar JWT real.
 *   - @Nested: agrupa tests por funcionalidad, más legible.
 */
@WebMvcTest(HabitController.class)
class HabitControllerTest {

    @Autowired private MockMvc      mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private HabitService    habitService;
    @MockBean private HabitLogService habitLogService;
    @MockBean private UserRepository  userRepository;
    @MockBean private JwtUtils        jwtUtils;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private UserDetailsService      userDetailsService;

    // Datos de test reutilizables
    private static final HabitResponse HABIT_RESPONSE = new HabitResponse(
            1L, "Meditar", "10 minutos al día",
            FrequencyType.DAILY, List.of(), null,
            true, LocalDateTime.now()
    );

    // ════════════════════════════════════════════════════════════════════════
    //  GET /api/habits
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("GET /api/habits")
    class GetHabits {

        @Test
        @DisplayName("200 OK con lista de hábitos cuando autenticado")
        @WithMockUser(username = "testuser")
        void shouldReturn200WithHabitList() throws Exception {
            when(habitService.getActiveHabits())
                    .thenReturn(List.of(HABIT_RESPONSE));

            mockMvc.perform(get("/api/habits"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].id").value(1))
                    .andExpect(jsonPath("$[0].name").value("Meditar"))
                    .andExpect(jsonPath("$[0].frequencyType").value("DAILY"));
        }

        @Test
        @DisplayName("200 OK con lista vacía si no hay hábitos")
        @WithMockUser
        void shouldReturn200WithEmptyList_whenNoHabits() throws Exception {
            when(habitService.getActiveHabits()).thenReturn(List.of());

            mockMvc.perform(get("/api/habits"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$").isEmpty());
        }

        @Test
        @DisplayName("401 Unauthorized sin autenticación")
        void shouldReturn401_whenNotAuthenticated() throws Exception {
            mockMvc.perform(get("/api/habits"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  POST /api/habits
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /api/habits")
    class CreateHabit {

        @Test
        @DisplayName("201 Created al crear hábito diario válido")
        @WithMockUser
        void shouldReturn201_whenCreatingDailyHabit() throws Exception {
            HabitRequest request = new HabitRequest();
            request.setName("Meditar");
            request.setDescription("10 minutos al día");
            request.setFrequencyType(FrequencyType.DAILY);

            when(habitService.createHabit(any())).thenReturn(HABIT_RESPONSE);

            mockMvc.perform(post("/api/habits")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(csrf()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name").value("Meditar"))
                    .andExpect(jsonPath("$.frequencyType").value("DAILY"));
        }

        @Test
        @DisplayName("201 Created al crear hábito semanal con días válidos")
        @WithMockUser
        void shouldReturn201_whenCreatingWeeklyHabit() throws Exception {
            HabitRequest request = new HabitRequest();
            request.setName("Ejercicio");
            request.setFrequencyType(FrequencyType.WEEKLY);
            request.setWeeklyDays(List.of(1, 3, 5));

            var weeklyResponse = new HabitResponse(
                    2L, "Ejercicio", null, FrequencyType.WEEKLY,
                    List.of(1, 3, 5), null, true, LocalDateTime.now());
            when(habitService.createHabit(any())).thenReturn(weeklyResponse);

            mockMvc.perform(post("/api/habits")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(csrf()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.weeklyDays").isArray())
                    .andExpect(jsonPath("$.weeklyDays[0]").value(1));
        }

        @Test
        @DisplayName("400 Bad Request si nombre vacío")
        @WithMockUser
        void shouldReturn400_whenNameBlank() throws Exception {
            HabitRequest request = new HabitRequest();
            request.setName("");
            request.setFrequencyType(FrequencyType.DAILY);

            mockMvc.perform(post("/api/habits")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(csrf()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.name").exists());
        }

        @Test
        @DisplayName("400 Bad Request si frequencyType es null")
        @WithMockUser
        void shouldReturn400_whenFrequencyTypeNull() throws Exception {
            HabitRequest request = new HabitRequest();
            request.setName("Meditar");
            // frequencyType: null intencionalmente

            mockMvc.perform(post("/api/habits")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(csrf()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.frequencyType").exists());
        }

        @Test
        @DisplayName("400 Bad Request si Factory rechaza los datos (weekly sin días)")
        @WithMockUser
        void shouldReturn400_whenFactoryRejectsRequest() throws Exception {
            HabitRequest request = new HabitRequest();
            request.setName("Ejercicio");
            request.setFrequencyType(FrequencyType.WEEKLY);
            // weeklyDays: vacío → Factory lanza InvalidOperationException

            when(habitService.createHabit(any()))
                    .thenThrow(new InvalidOperationException(
                            "Un hábito semanal requiere al menos un día de la semana."));

            mockMvc.perform(post("/api/habits")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(csrf()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message")
                            .value("Un hábito semanal requiere al menos un día de la semana."));
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  DELETE /api/habits/{id}
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("DELETE /api/habits/{id}")
    class DeleteHabit {

        @Test
        @DisplayName("204 No Content al eliminar hábito existente")
        @WithMockUser
        void shouldReturn204_whenHabitDeleted() throws Exception {
            doNothing().when(habitService).deleteHabit(1L);

            mockMvc.perform(delete("/api/habits/1").with(csrf()))
                    .andExpect(status().isNoContent());

            verify(habitService).deleteHabit(1L);
        }

        @Test
        @DisplayName("404 Not Found si el hábito no existe")
        @WithMockUser
        void shouldReturn404_whenHabitNotFound() throws Exception {
            doThrow(new ResourceNotFoundException("Hábito", 99L))
                    .when(habitService).deleteHabit(99L);

            mockMvc.perform(delete("/api/habits/99").with(csrf()))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("Hábito no encontrado con id: 99"));
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  POST /api/habits/{id}/logs/toggle
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /api/habits/{id}/logs/toggle")
    class ToggleLog {

        @Test
        @DisplayName("200 OK al marcar un hábito como completado")
        @WithMockUser
        void shouldReturn200_whenToggling() throws Exception {
            var logResponse  = new HabitLogResponse(1L, LocalDate.now(),
                    HabitStatus.COMPLETED, null);
            var toggleResult = new ToggleLogResponse(logResponse,
                    "Hábito marcado como completado");

            when(habitLogService.toggleHabitLog(eq(1L), any(), any()))
                    .thenReturn(toggleResult);

            mockMvc.perform(post("/api/habits/1/logs/toggle")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"date\": \"" + LocalDate.now() + "\"}")
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.log.status").value("COMPLETED"))
                    .andExpect(jsonPath("$.message").value("Hábito marcado como completado"));
        }

        @Test
        @DisplayName("400 Bad Request al intentar marcar un día futuro")
        @WithMockUser
        void shouldReturn400_whenFutureDate() throws Exception {
            LocalDate future = LocalDate.now().plusDays(1);

            when(habitLogService.toggleHabitLog(eq(1L), eq(future), any()))
                    .thenThrow(new InvalidOperationException(
                            "No se puede registrar un hábito para una fecha futura."));

            mockMvc.perform(post("/api/habits/1/logs/toggle")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"date\": \"" + future + "\"}")
                            .with(csrf()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message")
                            .value("No se puede registrar un hábito para una fecha futura."));
        }

        @Test
        @DisplayName("400 Bad Request al intentar modificar log de día pasado")
        @WithMockUser
        void shouldReturn400_whenModifyingPastLog() throws Exception {
            LocalDate past = LocalDate.now().minusDays(3);

            when(habitLogService.toggleHabitLog(eq(1L), eq(past), any()))
                    .thenThrow(new InvalidOperationException(
                            "No se puede modificar el registro de un día pasado."));

            mockMvc.perform(post("/api/habits/1/logs/toggle")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"date\": \"" + past + "\"}")
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  GET /api/habits/dashboard
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GET /dashboard: 200 OK con estadísticas completas")
    @WithMockUser(username = "testuser")
    void getDashboard_shouldReturn200WithStats() throws Exception {
        // Preparar mock del UserRepository (necesario para resolver userId)
        User mockUser = User.builder().username("testuser")
                .email("test@example.com").password("hash").build();
        // Simular que el id está seteado
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(mockUser, 1L);
        } catch (Exception e) { /* ignorar en test */ }

        when(userRepository.findByUsername("testuser"))
                .thenReturn(Optional.of(mockUser));

        var dashboardResponse = new DashboardStatsResponse(
                3, 5, 7, 80,
                List.of(
                        new DailyCompletionData(LocalDate.now(), "Lun", 3, 5),
                        new DailyCompletionData(LocalDate.now().plusDays(1), "Mar", 0, 5)
                )
        );
        when(habitLogService.getDashboardStats(1L)).thenReturn(dashboardResponse);

        mockMvc.perform(get("/api/habits/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.habitsCompletedToday").value(3))
                .andExpect(jsonPath("$.totalActiveHabits").value(5))
                .andExpect(jsonPath("$.bestCurrentStreak").value(7))
                .andExpect(jsonPath("$.weeklyCompletionRate").value(80))
                .andExpect(jsonPath("$.weeklyData").isArray())
                .andExpect(jsonPath("$.weeklyData[0].completed").value(3));
    }
}
