package com.habittracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Punto de entrada de la aplicación HabitTracker.
 *
 * @EnableJpaAuditing → activa @CreatedDate y @LastModifiedDate en entidades.
 * @EnableAsync       → activa @Async en los listeners de eventos
 *                      (GoalAchievementListener, NotificationListener).
 *                      Sin esto, @Async se ignora silenciosamente y los
 *                      listeners bloquean el hilo principal.
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
public class HabitTrackerApplication {

    public static void main(String[] args) {
        SpringApplication.run(HabitTrackerApplication.class, args);
    }
}
