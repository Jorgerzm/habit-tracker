package com.habittracker.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro JWT: intercepta cada petición HTTP y valida el token Bearer.
 *
 * Flujo:
 * 1. Extraer el header Authorization.
 * 2. Si no existe o no empieza por "Bearer ", continuar sin autenticar.
 * 3. Extraer el token y el username.
 * 4. Si el username es válido y no hay autenticación previa en el contexto:
 *    a. Cargar UserDetails desde la BD.
 *    b. Validar el token.
 *    c. Si es válido, crear el objeto de autenticación y guardarlo en el
 *       SecurityContext para que el resto de la cadena de filtros lo use.
 * 5. Continuar con la cadena de filtros.
 *
 * Extiende OncePerRequestFilter para garantizar que se ejecuta
 * exactamente una vez por request (incluso con forwards internos).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // Si no hay header o no es Bearer, saltamos este filtro
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7); // Quitar "Bearer "

        try {
            final String username = jwtUtils.extractUsername(jwt);

            // Solo procesar si hay username y aún no está autenticado
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (jwtUtils.isTokenValid(jwt, userDetails)) {
                    var authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,                         // credentials (null: ya autenticado por token)
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("Usuario autenticado vía JWT: {}", username);
                }
            }
        } catch (Exception e) {
            // Token inválido/expirado: simplemente no autenticamos
            // Spring Security devolverá 401 en endpoints protegidos
            log.warn("No se pudo autenticar el token JWT: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
