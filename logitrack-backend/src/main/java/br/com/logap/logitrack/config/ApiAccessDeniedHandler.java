package br.com.logap.logitrack.config;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class ApiAccessDeniedHandler implements AccessDeniedHandler {

    private final ApiErrorResponseWriter errorResponseWriter;

    public ApiAccessDeniedHandler(ApiErrorResponseWriter errorResponseWriter) {
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException exception) throws IOException {
        errorResponseWriter.write(response, HttpStatus.FORBIDDEN, "ACCESS_DENIED",
            "Voce nao possui permissao para esta operacao.", request.getRequestURI());
    }
}
