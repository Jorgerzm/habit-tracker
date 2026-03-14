package com.habittracker.domain.service.listener;

import com.habittracker.domain.service.event.HabitCompletedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Random;

/**
 * ═══════════════════════════════════════════════════════════════
 *  PATRÓN OBSERVER — Listener 2: Notificaciones de ánimo
 * ═══════════════════════════════════════════════════════════════
 *
 * Reacciona a HabitCompletedEvent enviando un mensaje de ánimo
 * al usuario. En el MVP solo registra en consola (log).
 *
 * En producción, este listener podría:
 * - Llamar a NotificationService (interfaz) que tiene implementaciones:
 *     ConsoleNotificationService (dev)
 *     EmailNotificationService   (prod, con SendGrid/SES)
 *     PushNotificationService    (futuro, con FCM)
 *
 * CLAVE DEL PATRÓN OBSERVER:
 *   NotificationListener no sabe NADA de HabitLogService.
 *   HabitLogService no sabe NADA de NotificationListener.
 *   Se comunican únicamente a través del evento.
 *   Son completamente independientes entre sí.
 */
@Component
@Slf4j
public class NotificationListener {

    private static final List<String> ENCOURAGEMENT_MESSAGES = List.of(
            "¡Así se hace! Cada día cuenta. 💪",
            "¡Perfecto! Estás construyendo el hábito paso a paso. 🚀",
            "¡Un día más completado! La constancia es la clave. 🔑",
            "¡Excelente! Estás más cerca de tu objetivo. 🎯",
            "¡Sigue así! Los pequeños pasos crean grandes cambios. 🌟"
    );

    private final Random random = new Random();

    @EventListener
    @Async
    public void handleHabitCompleted(HabitCompletedEvent event) {
        String message = getRandomMessage();

        log.info("Notificación para usuario {}: '{}' completó '{}'. Mensaje: {}",
                event.getUserId(),
                event.getUserId(),
                event.getHabitName(),
                message
        );
    }

    private String getRandomMessage() {
        return ENCOURAGEMENT_MESSAGES.get(random.nextInt(ENCOURAGEMENT_MESSAGES.size()));
    }
}
