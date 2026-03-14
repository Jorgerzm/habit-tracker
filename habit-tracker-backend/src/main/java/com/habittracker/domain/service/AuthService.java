package com.habittracker.domain.service;

import com.habittracker.application.dto.request.LoginRequest;
import com.habittracker.application.dto.request.RegisterRequest;
import com.habittracker.application.dto.response.ResponseDTOs.AuthResponse;
import com.habittracker.application.dto.response.ResponseDTOs.UserResponse;
import com.habittracker.common.exception.CustomExceptions.*;
import com.habittracker.domain.model.User;
import com.habittracker.domain.repository.UserRepository;
import com.habittracker.infrastructure.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtils jwtUtils;

    /** Registra un nuevo usuario y devuelve su token JWT. */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new ResourceAlreadyExistsException(
                    "El usuario '" + request.username() + "' ya está en uso.");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new ResourceAlreadyExistsException(
                    "El email '" + request.email() + "' ya está registrado.");
        }

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .build();

        User saved = userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(saved.getUsername());
        String token = jwtUtils.generateToken(userDetails);

        return new AuthResponse(token, saved.getId(), saved.getUsername(), saved.getEmail());
    }

    /** Autentica un usuario y devuelve su token JWT. */
    public AuthResponse login(LoginRequest request) {
        // Spring Security valida las credenciales. Lanza BadCredentialsException si son incorrectas.
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario: " + request.username()));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtUtils.generateToken(userDetails);

        return new AuthResponse(token, user.getId(), user.getUsername(), user.getEmail());
    }

    /** Devuelve los datos del usuario autenticado (para /auth/me). */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario: " + username));
        return new UserResponse(user.getId(), user.getUsername(),
                user.getEmail(), user.getCreatedAt());
    }
}
