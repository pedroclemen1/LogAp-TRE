package br.com.logap.logitrack.auth;

import java.nio.charset.StandardCharsets;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

@Validated
@ConfigurationProperties(prefix = "app.security.bff")
public record BffSecurityProperties(@NotBlank String sharedSecret) {

    public BffSecurityProperties {
        if (sharedSecret != null
            && sharedSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException(
                "BFF_SHARED_SECRET deve possuir ao menos 32 bytes.");
        }
    }
}
