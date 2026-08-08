package br.com.logap.logitrack.auth;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class LoginAttemptRateLimiterTest {

    private static final String EMAIL = "gestor@empresa.com";
    private static final String REMOTE_ADDRESS = "198.51.100.10";

    @Test
    void bloqueiaDepoisDoNumeroConfiguradoDeFalhas() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-07T12:00:00Z"));
        LoginAttemptRateLimiter limiter = limiter(clock, true, 2, Duration.ofMinutes(15), 100);

        limiter.recordFailure(EMAIL, REMOTE_ADDRESS);
        assertDoesNotThrow(() -> limiter.checkAllowed(EMAIL, REMOTE_ADDRESS));

        limiter.recordFailure(EMAIL, REMOTE_ADDRESS);
        LoginRateLimitExceededException exception = assertThrows(
            LoginRateLimitExceededException.class,
            () -> limiter.checkAllowed(EMAIL, REMOTE_ADDRESS));

        assertEquals(900, exception.getRetryAfterSeconds());
    }

    @Test
    void sucessoRemoveAsFalhasDaIdentidade() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-07T12:00:00Z"));
        LoginAttemptRateLimiter limiter = limiter(clock, true, 2, Duration.ofMinutes(15), 100);

        limiter.recordFailure(EMAIL, REMOTE_ADDRESS);
        limiter.recordFailure(EMAIL, REMOTE_ADDRESS);
        limiter.recordSuccess("  GESTOR@EMPRESA.COM  ", REMOTE_ADDRESS);

        assertDoesNotThrow(() -> limiter.checkAllowed(EMAIL, REMOTE_ADDRESS));
        assertEquals(0, limiter.trackedIdentityCount());
    }

    @Test
    void bloqueioDirecionadoNaoAtingeOutroEnderecoRemoto() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-07T12:00:00Z"));
        LoginAttemptRateLimiter limiter = limiter(clock, true, 2, Duration.ofMinutes(15), 100);

        limiter.recordFailure(EMAIL, "198.51.100.10");
        limiter.recordFailure(EMAIL, "198.51.100.10");

        assertThrows(LoginRateLimitExceededException.class,
            () -> limiter.checkAllowed(EMAIL, "198.51.100.10"));
        assertDoesNotThrow(() -> limiter.checkAllowed(EMAIL, "203.0.113.20"));
    }

    @Test
    void janelaExpiradaERemovidaDuranteALimpeza() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-07T12:00:00Z"));
        LoginAttemptRateLimiter limiter = limiter(clock, true, 2, Duration.ofMinutes(2), 100);

        limiter.recordFailure(EMAIL, REMOTE_ADDRESS);
        assertEquals(1, limiter.trackedIdentityCount());

        clock.advance(Duration.ofMinutes(2));
        assertDoesNotThrow(() -> limiter.checkAllowed("outro@empresa.com", REMOTE_ADDRESS));
        assertEquals(0, limiter.trackedIdentityCount());
    }

    @Test
    void limiteDeIdentidadesPreservaBloqueiosAoDespejarUmaJanela() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-07T12:00:00Z"));
        LoginAttemptRateLimiter limiter = limiter(clock, true, 2, Duration.ofMinutes(15), 100);

        limiter.recordFailure(EMAIL, REMOTE_ADDRESS);
        limiter.recordFailure(EMAIL, REMOTE_ADDRESS);
        clock.advance(Duration.ofSeconds(1));

        for (int index = 1; index < 100; index++) {
            limiter.recordFailure("usuario-%d@empresa.com".formatted(index), REMOTE_ADDRESS);
        }

        assertDoesNotThrow(() -> limiter.recordFailure(
            "usuario-excedente@empresa.com", REMOTE_ADDRESS));
        assertEquals(100, limiter.trackedIdentityCount());
        assertThrows(LoginRateLimitExceededException.class,
            () -> limiter.checkAllowed(EMAIL, REMOTE_ADDRESS));
    }

    @Test
    void chaveHmacNormalizaSemExporOEmail() {
        byte[] secret = new byte[32];
        java.util.Arrays.fill(secret, (byte) 7);
        LoginAttemptKeyHasher hasher = new LoginAttemptKeyHasher(secret);

        String first = hasher.hash(" Gestor@Empresa.com ", " 2001:DB8::1 ");
        String second = hasher.hash("gestor@empresa.com", "2001:db8::1");
        String anotherAddress = hasher.hash("gestor@empresa.com", "2001:db8::2");

        assertEquals(first, second);
        assertNotEquals("gestor@empresa.com", first);
        assertNotEquals(first, anotherAddress);
    }

    @Test
    void configuracaoDesabilitadaNaoMantemEstado() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-07T12:00:00Z"));
        LoginAttemptRateLimiter limiter = limiter(clock, false, 1, Duration.ofMinutes(15), 100);

        limiter.recordFailure(EMAIL, REMOTE_ADDRESS);

        assertDoesNotThrow(() -> limiter.checkAllowed(EMAIL, REMOTE_ADDRESS));
        assertEquals(0, limiter.trackedIdentityCount());
    }

    private LoginAttemptRateLimiter limiter(MutableClock clock, boolean enabled,
                                            int maxFailedAttempts, Duration window,
                                            int maxTrackedIdentities) {
        LoginRateLimitProperties properties = new LoginRateLimitProperties(
            enabled,
            maxFailedAttempts,
            window,
            Duration.ofMinutes(1),
            maxTrackedIdentities);
        return new LoginAttemptRateLimiter(
            properties, new LoginAttemptKeyHasher(new byte[32]), clock);
    }

    private static final class MutableClock extends Clock {

        private Instant current;

        private MutableClock(Instant current) {
            this.current = current;
        }

        private void advance(Duration duration) {
            current = current.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return current;
        }
    }
}
