package com.habittracker.infrastructure.security;

import com.habittracker.domain.model.User;
import com.habittracker.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementación de UserDetailsService para Spring Security.
 *
 * Spring Security llama a loadUserByUsername() durante la autenticación
 * para obtener los datos del usuario desde la base de datos.
 *
 * Mapeamos nuestro User a un UserDetails de Spring Security.
 * No usamos roles por ahora (MVP), pero la estructura está preparada
 * para añadirlos (ej: ROLE_USER, ROLE_ADMIN).
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuario no encontrado: " + username
                ));

        // Spring Security's User builder: usuario, contraseña (ya bcrypt), roles
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPassword())
                .authorities("ROLE_USER")   // MVP: todos son USER
                .build();
    }
}
