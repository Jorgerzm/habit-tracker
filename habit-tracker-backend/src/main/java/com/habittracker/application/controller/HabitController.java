package com.habittracker.application.controller;

import com.habittracker.application.dto.request.HabitRequest;
import com.habittracker.application.dto.response.ResponseDTOs.*;
import com.habittracker.domain.repository.UserRepository;
import com.habittracker.domain.service.HabitLogService;
import com.habittracker.domain.service.HabitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/habits")
@RequiredArgsConstructor
public class HabitController {

    private final HabitService      habitService;
    private final HabitLogService   habitLogService;
    private final UserRepository    userRepository;

    // ── CRUD hábitos ──────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<HabitResponse>> getHabits() {
        return ResponseEntity.ok(habitService.getActiveHabits());
    }

    @GetMapping("/{habitId}")
    public ResponseEntity<HabitResponse> getHabit(@PathVariable Long habitId) {
        return ResponseEntity.ok(habitService.getHabit(habitId));
    }

    @PostMapping
    public ResponseEntity<HabitResponse> createHabit(@Valid @RequestBody HabitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(habitService.createHabit(request));
    }

    @PutMapping("/{habitId}")
    public ResponseEntity<HabitResponse> updateHabit(
            @PathVariable Long habitId,
            @Valid @RequestBody HabitRequest request) {
        return ResponseEntity.ok(habitService.updateHabit(habitId, request));
    }

    @PatchMapping("/{habitId}/archive")
    public ResponseEntity<Void> archiveHabit(@PathVariable Long habitId) {
        habitService.archiveHabit(habitId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{habitId}")
    public ResponseEntity<Void> deleteHabit(@PathVariable Long habitId) {
        habitService.deleteHabit(habitId);
        return ResponseEntity.noContent().build();
    }

    // ── Logs ──────────────────────────────────────────────────────────────────

    /**
     * Marca o desmarca un hábito para una fecha.
     * Body: { "date": "2024-01-15", "notes": "Opcional" }
     */
    @PostMapping("/{habitId}/logs/toggle")
    public ResponseEntity<ToggleLogResponse> toggleLog(
            @PathVariable Long habitId,
            @RequestBody Map<String, String> body) {

        LocalDate date = body.containsKey("date")
                ? LocalDate.parse(body.get("date"))
                : LocalDate.now();
        return ResponseEntity.ok(
                habitLogService.toggleHabitLog(habitId, date, body.get("notes"))
        );
    }

    @GetMapping("/{habitId}/logs")
    public ResponseEntity<List<HabitLogResponse>> getLogs(
            @PathVariable Long habitId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(habitLogService.getLogsInRange(habitId, from, to));
    }

    @GetMapping("/{habitId}/stats")
    public ResponseEntity<HabitStatsResponse> getStats(@PathVariable Long habitId) {
        return ResponseEntity.ok(habitLogService.getHabitStats(habitId));
    }

    /**
     * Dashboard: estadísticas globales del usuario autenticado.
     *
     * @AuthenticationPrincipal inyecta el UserDetails del token JWT
     * directamente como parámetro, sin necesidad de ir al SecurityContext.
     * El userId se resuelve desde el username del token.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardStatsResponse> getDashboard(
            @AuthenticationPrincipal UserDetails userDetails) {

        Long userId = userRepository
                .findByUsername(userDetails.getUsername())
                .orElseThrow()
                .getId();

        return ResponseEntity.ok(habitLogService.getDashboardStats(userId));
    }
}
