package br.com.logap.logitrack.shared;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import br.com.logap.logitrack.auth.LoginRateLimitExceededException;
import br.com.logap.logitrack.auth.invitation.InvalidInvitationException;

/**
 * Centraliza a traducao de excecao para resposta HTTP. Sem isto, erro de
 * validacao vaza um corpo do Spring com stack trace e nomes de classe.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiError.of(404, "Not Found", ex.getCode(), ex.getMessage(), path(request)));
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiError> handleBusinessRule(BusinessRuleException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ApiError.of(422, "Unprocessable Entity", ex.getCode(), ex.getMessage(), path(request)));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> handleConflict(ConflictException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiError.of(409, "Conflict", ex.getCode(), ex.getMessage(), path(request)));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiError.of(401, "Unauthorized", "INVALID_CREDENTIALS",
                "E-mail ou senha invalidos.", path(request)));
    }

    @ExceptionHandler(LoginRateLimitExceededException.class)
    public ResponseEntity<ApiError> handleLoginRateLimit(
        LoginRateLimitExceededException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(HttpHeaders.RETRY_AFTER, Long.toString(ex.getRetryAfterSeconds()))
            .body(ApiError.of(429, "Too Many Requests", "LOGIN_RATE_LIMIT_EXCEEDED",
                "Muitas tentativas de login. Aguarde antes de tentar novamente.", path(request)));
    }

    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<ApiError> handleAuthorizationDenied(
        AuthorizationDeniedException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiError.of(403, "Forbidden", "ACCESS_DENIED",
                "Voce nao possui permissao para esta operacao.", path(request)));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, WebRequest request) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(erro -> campos.putIfAbsent(erro.getField(), erro.getDefaultMessage()));
        return ResponseEntity.badRequest().body(ApiError.validation(path(request), campos));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleMalformedRequest(
        HttpMessageNotReadableException ex, WebRequest request) {
        return ResponseEntity.badRequest()
            .body(ApiError.of(400, "Bad Request", "MALFORMED_REQUEST",
                "Corpo da requisicao invalido.", path(request)));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleInvalidParameter(
        MethodArgumentTypeMismatchException ex, WebRequest request) {
        return ResponseEntity.badRequest()
            .body(ApiError.of(400, "Bad Request", "INVALID_PARAMETER",
                "Parametro da requisicao invalido.", path(request)));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataConflict(
        DataIntegrityViolationException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiError.of(409, "Conflict", "DATA_CONFLICT",
                "A operacao conflita com os dados existentes.", path(request)));
    }

    @ExceptionHandler(InvalidInvitationException.class)
    public ResponseEntity<ApiError> handleInvalidInvitation(
        InvalidInvitationException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.GONE)
            .body(ApiError.of(410, "Gone", "INVITATION_INVALID_OR_EXPIRED",
                ex.getMessage(), path(request)));
    }

    private String path(WebRequest request) {
        return ((ServletWebRequest) request).getRequest().getRequestURI();
    }
}
