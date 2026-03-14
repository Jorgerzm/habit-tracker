package com.habittracker.application.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.habittracker.application.dto.request.LoginRequest;
import com.habittracker.application.dto.request.RegisterRequest;
import com.habittracker.application.dto.response.ResponseDTOs.AuthResponse;
import com.habittracker.application.dto.response.ResponseDTOs.UserResponse;
import com.habittracker.common.exception.CustomExceptions.ResourceAlreadyExistsException;
import com.habittracker.domain.service.AuthService;
import com.habittracker.infrastructure.security.JwtAuthenticationFilter;
import com.habittracker.infrastructure.security.JwtUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests de integración del AuthController con @WebMvcTest.
 *
 * @WebMvcTest:
 *   - Carga SOLO la capa web: controllers, filters, security config.
 *   - NO carga services, repositories ni BD.
 *   - Los servicios se mockean con @MockBean.
 *   - Es ~5x más rápido que @SpringBootTest completo.
 *   - Ideal para testear: rutas, códigos HTTP, serialización JSON,
 *     validaciones de @Valid, manejo de errores.
 *
 * Qué testeamos:
 *   1. Endpoints de registro y login: 201/200 con token válido.
 *   2. Validaciones @Valid: 400 con campos vacíos.
 *   3. Errores de negocio: 409 si username duplicado, 401 si credenciales malas.
 *   4. /auth/me: 200 si autenticado, 401 si no.
 */
@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired private MockMvc       mockMvc;
    @Autowired private ObjectMapper  objectMapper;

    // Mocks necesarios para que el contexto de seguridad funcione
    @MockBean private AuthService        authService;
    @MockBean private JwtUtils           jwtUtils;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private UserDetailsService userDetailsService;

    // ════════════════════════════════════════════════════════════════════════
    //  POST /api/auth/register
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("POST /register: 201 Created con datos correctos")
    void register_shouldReturn201_whenValidRequest() throws Exception {
        var request  = new RegisterRequest("testuser", "test@example.com", "password123");
        var response = new AuthResponse("jwt.token.here", 1L, "testuser", "test@example.com");

        when(authService.register(any())).thenReturn(response);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("jwt.token.here"))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.password").doesNotExist()); // NUNCA exponer password
    }

    @Test
    @DisplayName("POST /register: 400 Bad Request si username vacío")
    void register_shouldReturn400_whenUsernameBlank() throws Exception {
        var request = new RegisterRequest("", "test@example.com", "password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.username").exists());
    }

    @Test
    @DisplayName("POST /register: 400 Bad Request si email inválido")
    void register_shouldReturn400_whenEmailInvalid() throws Exception {
        var request = new RegisterRequest("testuser", "not-an-email", "password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists());
    }

    @Test
    @DisplayName("POST /register: 400 Bad Request si contraseña muy corta")
    void register_shouldReturn400_whenPasswordTooShort() throws Exception {
        var request = new RegisterRequest("testuser", "test@example.com", "123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    @DisplayName("POST /register: 409 Conflict si username ya existe")
    void register_shouldReturn409_whenUsernameAlreadyExists() throws Exception {
        var request = new RegisterRequest("existinguser", "new@example.com", "password123");

        when(authService.register(any()))
                .thenThrow(new ResourceAlreadyExistsException("El usuario 'existinguser' ya está en uso."));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("El usuario 'existinguser' ya está en uso."));
    }

    // ════════════════════════════════════════════════════════════════════════
    //  POST /api/auth/login
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("POST /login: 200 OK con credenciales correctas")
    void login_shouldReturn200_whenValidCredentials() throws Exception {
        var request  = new LoginRequest("testuser", "password123");
        var response = new AuthResponse("jwt.token.here", 1L, "testuser", "test@example.com");

        when(authService.login(any())).thenReturn(response);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    @DisplayName("POST /login: 401 Unauthorized con credenciales incorrectas")
    void login_shouldReturn401_whenBadCredentials() throws Exception {
        var request = new LoginRequest("testuser", "wrongpassword");

        when(authService.login(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Credenciales incorrectas"));
    }

    @Test
    @DisplayName("POST /login: 400 Bad Request si username vacío")
    void login_shouldReturn400_whenUsernameBlank() throws Exception {
        var request = new LoginRequest("", "password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    // ════════════════════════════════════════════════════════════════════════
    //  GET /api/auth/me
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GET /me: 200 OK cuando el usuario está autenticado")
    @WithMockUser(username = "testuser")  // Simula usuario autenticado sin JWT real
    void getMe_shouldReturn200_whenAuthenticated() throws Exception {
        var userResponse = new UserResponse(1L, "testuser", "test@example.com",
                LocalDateTime.now());

        when(authService.getCurrentUser("testuser")).thenReturn(userResponse);

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    @DisplayName("GET /me: 401 Unauthorized cuando no hay token")
    void getMe_shouldReturn401_whenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }
}
