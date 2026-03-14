package com.habittracker.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Colección de excepciones personalizadas del dominio.
 *
 * Se usan en los servicios y se capturan en GlobalExceptionHandler
 * para devolver respuestas HTTP apropiadas.
 */
public class CustomExceptions {

    /** Recurso no encontrado → 404 */
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public static class ResourceNotFoundException extends RuntimeException {
        public ResourceNotFoundException(String resource, Long id) {
            super(resource + " no encontrado con id: " + id);
        }
        public ResourceNotFoundException(String message) {
            super(message);
        }
    }

    /** Recurso ya existe (username/email duplicado) → 409 */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class ResourceAlreadyExistsException extends RuntimeException {
        public ResourceAlreadyExistsException(String message) {
            super(message);
        }
    }

    /** Operación no permitida (ej: modificar log de día pasado) → 400 */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public static class InvalidOperationException extends RuntimeException {
        public InvalidOperationException(String message) {
            super(message);
        }
    }

    /** El recurso no pertenece al usuario autenticado → 403 */
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public static class UnauthorizedAccessException extends RuntimeException {
        public UnauthorizedAccessException(String resource) {
            super("No tienes permiso para acceder a este " + resource);
        }
    }
}
