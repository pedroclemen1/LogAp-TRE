package br.com.logap.logitrack.auth;

import java.io.IOException;
import java.util.Set;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import br.com.logap.logitrack.config.ApiErrorResponseWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_PATHS = Set.of(
        "/api/auth/password",
        "/api/auth/login",
        "/api/auth/invitations/validate",
        "/api/auth/invitations/accept",
        "/actuator/health"
    );

    private final ApiErrorResponseWriter errorResponseWriter;

    public PasswordChangeRequiredFilter(ApiErrorResponseWriter errorResponseWriter) {
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (requiresPasswordChange(authentication)
            && !ALLOWED_PATHS.contains(request.getRequestURI())
            && !HttpMethod.OPTIONS.matches(request.getMethod())) {
            errorResponseWriter.write(response, HttpStatus.FORBIDDEN,
                "PASSWORD_CHANGE_REQUIRED", "Defina uma nova senha antes de continuar.",
                request.getRequestURI());
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean requiresPasswordChange(Authentication authentication) {
        return authentication != null
            && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal principal
            && principal.passwordChangeRequired();
    }
}
