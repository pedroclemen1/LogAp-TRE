package br.com.logap.logitrack.auth.invitation;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;

import org.junit.jupiter.api.Test;

class InvitationPropertiesTest {

    @Test
    void requiresHttpsWhenTheEnvironmentEnforcesIt() {
        assertThatThrownBy(() -> new InvitationProperties(
            URI.create("http://frontend.example/convite"), 48, true))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("HTTPS");
    }
}
