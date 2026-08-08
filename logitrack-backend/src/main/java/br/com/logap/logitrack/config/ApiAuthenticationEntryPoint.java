package br.com.logap.logitrack.config;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Mantem falhas do filtro de seguranca no contrato comum de `ApiError`. */
@Component
public class ApiAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ApiErrorResponseWriter errorResponseWriter;

    public ApiAuthenticationEntryPoint(ApiErrorResponseWriter errorResponseWriter) {
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        errorResponseWriter.write(response, HttpStatus.UNAUTHORIZED,
            "AUTHENTICATION_REQUIRED", "Token ausente ou invalido.", request.getRequestURI());
    }
}
