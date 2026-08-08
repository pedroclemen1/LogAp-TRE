package br.com.logap.logitrack.auth;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Validated
@ConfigurationProperties(prefix = "app.security.login-rate-limit")
public record LoginRateLimitProperties(
    boolean enabled,
    @Min(1) @Max(100) int maxFailedAttempts,
    @NotNull Duration window,
    @NotNull Duration cleanupInterval,
    @Min(100) @Max(1_000_000) int maxTrackedIdentities
) {
    public LoginRateLimitProperties {
        if (window != null && (window.isZero() || window.isNegative())) {
            throw new IllegalArgumentException("A janela do limitador de login deve ser positiva.");
        }
        if (cleanupInterval != null && (cleanupInterval.isZero() || cleanupInterval.isNegative())) {
            throw new IllegalArgumentException("O intervalo de limpeza do limitador de login deve ser positivo.");
        }
    }
}
