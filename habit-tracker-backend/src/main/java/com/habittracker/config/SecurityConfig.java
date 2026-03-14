package com.habittracker.config;

import com.habittracker.infrastructure.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Configuración de Spring Security para la API REST con JWT.
 *
 * Puntos clave:
 * - STATELESS: no hay sesión HTTP. Cada request debe traer el token JWT.
 * - CSRF desactivado: innecesario en APIs REST sin cookies de sesión.
 * - Rutas públicas: /api/auth/** (login y registro).
 * - @EnableMethodSecurity: permite usar @PreAuthorize en controladores
 *   para protección a nivel de método (útil si se añaden admins).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // Desactivar CSRF (no necesario en APIs REST sin sesión)
                .csrf(AbstractHttpConfigurer::disable)

                // Configurar rutas
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()          // Login y registro: públicos
                        .requestMatchers("/actuator/health").permitAll()       // Health check
                        .requestMatchers("/h2-console/**").permitAll()         // H2 en dev (quitar en prod)
                        .anyRequest().authenticated()                          // Todo lo demás: requiere JWT
                )

                // Sin sesión HTTP: cada request es independiente
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // Nuestro proveedor de autenticación (BCrypt + UserDetailsService)
                .authenticationProvider(authenticationProvider())

                // Añadir el filtro JWT ANTES del filtro de usuario/contraseña estándar
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

                // Necesario para H2 console en dev (frames)
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))

                .build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt con strength 12 (por defecto es 10; 12 es más seguro, apenas más lento)
        return new BCryptPasswordEncoder(12);
    }
}
