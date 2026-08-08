package br.com.logap.logitrack.auth.invitation;

import java.net.URI;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Validated
@ConfigurationProperties(prefix = "app.invitation")
public record InvitationProperties(
    @NotNull URI baseUrl,
    @Min(1) @Max(168) long expirationHours,
    boolean requireHttps
) {
    public InvitationProperties {
        if (baseUrl != null && !"http".equalsIgnoreCase(baseUrl.getScheme())
            && !"https".equalsIgnoreCase(baseUrl.getScheme())) {
            throw new IllegalArgumentException("INVITATION_BASE_URL deve usar HTTP ou HTTPS.");
        }
        if (baseUrl != null && requireHttps
            && !"https".equalsIgnoreCase(baseUrl.getScheme())) {
            throw new IllegalArgumentException(
                "INVITATION_BASE_URL deve usar HTTPS neste ambiente.");
        }
    }
}
