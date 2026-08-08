package br.com.logap.logitrack.auth;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;
import java.util.Objects;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Component;

@Component
class LoginAttemptKeyHasher {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final int SECRET_BYTES = 32;

    private final SecretKeySpec processSecret;

    LoginAttemptKeyHasher() {
        this(randomSecret());
    }

    LoginAttemptKeyHasher(byte[] processSecret) {
        if (processSecret == null || processSecret.length < SECRET_BYTES) {
            throw new IllegalArgumentException("O segredo da chave de login deve possuir ao menos 32 bytes.");
        }
        this.processSecret = new SecretKeySpec(processSecret.clone(), HMAC_ALGORITHM);
    }

    String hash(String email, String clientIdentity) {
        String normalizedEmail = EmailNormalizer.normalize(email);
        String normalizedIdentity = Objects.requireNonNull(clientIdentity, "clientIdentity")
            .strip()
            .toLowerCase(Locale.ROOT);

        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(processSecret);
            mac.update(normalizedEmail.getBytes(StandardCharsets.UTF_8));
            mac.update((byte) 0);
            byte[] digest = mac.doFinal(normalizedIdentity.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("HmacSHA256 indisponivel na JVM.", exception);
        }
    }

    private static byte[] randomSecret() {
        byte[] secret = new byte[SECRET_BYTES];
        new SecureRandom().nextBytes(secret);
        return secret;
    }
}
