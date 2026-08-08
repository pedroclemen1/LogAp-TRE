package br.com.logap.logitrack.auth;

import java.time.Duration;

public class LoginRateLimitExceededException extends RuntimeException {

    private final long retryAfterSeconds;

    public LoginRateLimitExceededException(Duration retryAfter) {
        super("Limite de tentativas de login excedido.");
        long millis = Math.max(1, retryAfter.toMillis());
        this.retryAfterSeconds = Math.max(1, Math.ceilDiv(millis, 1_000));
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
