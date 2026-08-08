package br.com.logap.logitrack.auth.bootstrap;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.bootstrap.admin")
public record InitialAdminProperties(
    boolean enabled,
    boolean required,
    String name,
    String email,
    String password
) {
}
