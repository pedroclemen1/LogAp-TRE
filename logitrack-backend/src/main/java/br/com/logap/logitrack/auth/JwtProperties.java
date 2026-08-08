package br.com.logap.logitrack.auth;

import java.nio.charset.StandardCharsets;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
    @NotBlank String secret,
    @Min(5) @Max(1440) long expirationMinutes
) {
    public JwtProperties {
        if (secret != null && secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException("JWT_SECRET deve possuir ao menos 32 bytes.");
        }
    }
}
