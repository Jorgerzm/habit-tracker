package com.habittracker.domain.service;

import com.habittracker.application.dto.response.ResponseDTOs.ToggleLogResponse;
import com.habittracker.common.exception.CustomExceptions.InvalidOperationException;
import com.habittracker.domain.model.Habit;
import com.habittracker.domain.model.HabitLog;
import com.habittracker.domain.model.User;
import com.habittracker.domain.model.enums.FrequencyType;
import com.habittracker.domain.model.enums.HabitStatus;
import com.habittracker.domain.repository.HabitLogRepository;
import com.habittracker.domain.repository.HabitRepository;
import com.habittracker.domain.repository.UserRepository;
import com.habittracker.domain.service.event.HabitCompletedEvent;
import com.habittracker.domain.service.streak.DailyStreakCalculator;
import com.habittracker.domain.service.streak.StreakCalculatorRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests unitarios del HabitLogService con Mockito puro.
 *
 * @ExtendWith(MockitoExtension.class):
 *   - Activa @Mock y @InjectMocks sin @SpringBootTest.
 *   - Cada test es extremadamente rápido (milisegundos).
 *
 * Qué testeamos:
 *   1. toggleHabitLog: los 4 escenarios de negocio.
 *   2. Que HabitCompletedEvent se publica SOLO al marcar COMPLETED.
 *   3. Que NO se publica al desmarcar.
 *   4. Excepciones en casos inválidos (fecha futura, log pasado inmutable).
 *
 * NOTA SOBRE EL PATRÓN OBSERVER EN TESTS:
 *   Usamos un ArgumentCaptor<HabitCompletedEvent> para verificar que el
 *   evento que se publica contiene los datos correctos (userId, habitId, fecha).
 *   Esto es mucho más preciso que simplemente verificar que se llamó a publishEvent().
 */
@ExtendWith(MockitoExtension.class)
class HabitLogServiceTest {

    @Mock private HabitLogRepository       habitLogRepository;
    @Mock private HabitRepository          habitRepository;
    @Mock private UserRepository           userRepository;
    @Mock private HabitService             habitService;
    @Mock private StreakCalculatorRegistry streakRegistry;
    @Mock private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private HabitLogService habitLogService;

    private Habit habit;
    private User  user;

    @BeforeEach
    void setUp() {
        user = User.builder().username("testuser").email("t@t.com").password("h").build();
        setId(user, 1L);

        habit = Habit.builder()
                .name("Meditar")
                .frequencyType(FrequencyType.DAILY)
                .user(user)
                .build();
        setId(habit, 10L);

        // El servicio de hábitos devuelve nuestro hábito de prueba
        when(habitService.findHabitOwnedByCurrentUser(10L)).thenReturn(habit);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  toggleHabitLog — Caso A: sin log existente → crear COMPLETED
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Toggle: crea log COMPLETED cuando no existe log previo")
    void toggle_shouldCreateCompletedLog_whenNoExistingLog() {
        LocalDate today = LocalDate.now();
        when(habitLogRepository.findByHabitIdAndDate(10L, today))
                .thenReturn(Optional.empty());
        when(habitLogRepository.save(any(HabitLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));  // Devuelve lo que le pasen

        ToggleLogResponse response = habitLogService.toggleHabitLog(10L, today, null);

        assertThat(response.log().status()).isEqualTo(HabitStatus.COMPLETED);
        assertThat(response.message()).contains("completado");
    }

    @Test
    @DisplayName("Toggle: publica HabitCompletedEvent con datos correctos al marcar COMPLETED")
    void toggle_shouldPublishEvent_withCorrectData_whenMarkingCompleted() {
        LocalDate today = LocalDate.now();
        when(habitLogRepository.findByHabitIdAndDate(10L, today))
                .thenReturn(Optional.empty());
        when(habitLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        habitLogService.toggleHabitLog(10L, today, null);

        // Capturar el evento publicado y verificar su contenido
        ArgumentCaptor<HabitCompletedEvent> eventCaptor =
                ArgumentCaptor.forClass(HabitCompletedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());

        HabitCompletedEvent capturedEvent = eventCaptor.getValue();
        assertThat(capturedEvent.getUserId()).isEqualTo(1L);
        assertThat(capturedEvent.getHabitId()).isEqualTo(10L);
        assertThat(capturedEvent.getCompletedDate()).isEqualTo(today);
        assertThat(capturedEvent.getHabitName()).isEqualTo("Meditar");
    }

    // ════════════════════════════════════════════════════════════════════════
    //  toggleHabitLog — Caso B: COMPLETED hoy → desmarcar (PENDING)
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Toggle: desmarca a PENDING cuando el log de hoy ya estaba COMPLETED")
    void toggle_shouldUnmarkToday_whenAlreadyCompleted() {
        LocalDate today = LocalDate.now();
        HabitLog existingLog = HabitLog.builder()
                .habit(habit).date(today).status(HabitStatus.COMPLETED).build();

        when(habitLogRepository.findByHabitIdAndDate(10L, today))
                .thenReturn(Optional.of(existingLog));
        when(habitLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ToggleLogResponse response = habitLogService.toggleHabitLog(10L, today, null);

        assertThat(response.log().status()).isEqualTo(HabitStatus.PENDING);
        assertThat(response.message()).contains("desmarcado");
    }

    @Test
    @DisplayName("Toggle: NO publica evento al desmarcar")
    void toggle_shouldNotPublishEvent_whenUnmarking() {
        LocalDate today = LocalDate.now();
        HabitLog existingLog = HabitLog.builder()
                .habit(habit).date(today).status(HabitStatus.COMPLETED).build();

        when(habitLogRepository.findByHabitIdAndDate(10L, today))
                .thenReturn(Optional.of(existingLog));
        when(habitLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        habitLogService.toggleHabitLog(10L, today, null);

        // Verificar que NO se publicó ningún evento
        verify(eventPublisher, never()).publishEvent(any());
    }

    // ════════════════════════════════════════════════════════════════════════
    //  toggleHabitLog — Caso C: COMPLETED pasado → excepción
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Toggle: lanza InvalidOperationException al intentar modificar log pasado")
    void toggle_shouldThrow_whenModifyingPastCompletedLog() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        HabitLog pastLog = HabitLog.builder()
                .habit(habit).date(yesterday).status(HabitStatus.COMPLETED).build();

        when(habitLogRepository.findByHabitIdAndDate(10L, yesterday))
                .thenReturn(Optional.of(pastLog));

        assertThatThrownBy(() ->
                habitLogService.toggleHabitLog(10L, yesterday, null))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("día pasado");

        verify(eventPublisher, never()).publishEvent(any());
    }

    // ════════════════════════════════════════════════════════════════════════
    //  toggleHabitLog — Validación: fecha futura
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Toggle: lanza InvalidOperationException con fecha futura")
    void toggle_shouldThrow_whenFutureDate() {
        LocalDate future = LocalDate.now().plusDays(1);

        assertThatThrownBy(() ->
                habitLogService.toggleHabitLog(10L, future, null))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("futura");

        // Nunca se llega al repositorio
        verify(habitLogRepository, never()).findByHabitIdAndDate(any(), any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    // ── Helper para setear IDs en entidades (JPA normalmente lo hace) ────────

    private void setId(Object entity, Long id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (Exception e) {
            throw new RuntimeException("No se pudo setear id en el test", e);
        }
    }
}
