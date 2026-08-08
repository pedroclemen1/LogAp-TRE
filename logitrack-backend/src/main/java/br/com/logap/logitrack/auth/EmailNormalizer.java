package br.com.logap.logitrack.auth;

import java.util.Locale;
import java.util.Objects;

public final class EmailNormalizer {

    private EmailNormalizer() {
    }

    public static String normalize(String email) {
        return Objects.requireNonNull(email, "email").strip().toLowerCase(Locale.ROOT);
    }
}
