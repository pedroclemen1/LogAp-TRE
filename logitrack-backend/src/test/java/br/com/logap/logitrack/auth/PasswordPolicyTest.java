package br.com.logap.logitrack.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordPolicyTest {

    private final PasswordPolicy policy = new PasswordPolicy();

    @Test
    void acceptsPasswordWithinCharacterAndBcryptLimits() {
        assertThat(policy.violation("senha-forte-123")).isEmpty();
        assertThat(policy.violation("a".repeat(72))).isEmpty();
    }

    @Test
    void rejectsBlankAndShortPasswords() {
        assertThat(policy.violation("            ")).isPresent();
        assertThat(policy.violation("curta")).isPresent();
    }

    @Test
    void appliesBcryptLimitInUtf8Bytes() {
        String multibytePassword = "á".repeat(37);

        assertThat(multibytePassword).hasSize(37);
        assertThat(policy.violation(multibytePassword))
            .contains("A senha excede o limite de 72 bytes do BCrypt.");
    }
}
