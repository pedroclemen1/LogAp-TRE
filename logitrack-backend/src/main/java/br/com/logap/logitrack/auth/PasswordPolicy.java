package br.com.logap.logitrack.auth;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import org.springframework.stereotype.Component;

@Component
public class PasswordPolicy {

    public static final int MINIMUM_CHARACTERS = 12;
    public static final int BCRYPT_MAXIMUM_BYTES = 72;

    public Optional<String> violation(String password) {
        if (password == null || password.isBlank() || password.length() < MINIMUM_CHARACTERS) {
            return Optional.of("A senha deve possuir ao menos 12 caracteres.");
        }
        if (!isWithinBcryptLimit(password)) {
            return Optional.of("A senha excede o limite de 72 bytes do BCrypt.");
        }
        return Optional.empty();
    }

    public boolean isWithinBcryptLimit(String password) {
        return password != null
            && password.getBytes(StandardCharsets.UTF_8).length <= BCRYPT_MAXIMUM_BYTES;
    }
}
