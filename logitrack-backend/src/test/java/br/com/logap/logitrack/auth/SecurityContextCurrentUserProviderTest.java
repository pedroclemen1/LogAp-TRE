package br.com.logap.logitrack.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class SecurityContextCurrentUserProviderTest {

    private final SecurityContextCurrentUserProvider provider =
        new SecurityContextCurrentUserProvider();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usesDisplayNameForTheAuditTrail() {
        var principal = new AuthenticatedUserPrincipal(
            1, "usuario-com-email-longo@empresa.com", "Nome do Usuario",
            UserRole.OPERADOR, false);
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, List.of()));

        assertThat(provider.currentUserName()).isEqualTo("Nome do Usuario");
    }

    @Test
    void usesSystemOutsideAnAuthenticatedRequest() {
        assertThat(provider.currentUserName()).isEqualTo("Sistema");
    }
}
