package br.com.logap.logitrack.auth;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Component;

@Component
class LoginClientIdentityResolver {

    static final String HEADER = "X-Logap-Login-Client";

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Pattern SIGNED_IDENTITY = Pattern.compile(
        "^([A-Za-z0-9_-]{43})\\.([A-Za-z0-9_-]{43})$");

    private final SecretKeySpec sharedSecret;

    LoginClientIdentityResolver(BffSecurityProperties properties) {
        this.sharedSecret = new SecretKeySpec(
            properties.sharedSecret().getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
    }

    String resolve(String signedIdentity, String remoteAddress) {
        Matcher matcher = signedIdentity == null ? null : SIGNED_IDENTITY.matcher(signedIdentity);
        if (matcher != null && matcher.matches() && hasValidSignature(matcher.group(1), matcher.group(2))) {
            return "client:" + matcher.group(1);
        }

        String address = Objects.requireNonNull(remoteAddress, "remoteAddress")
            .strip()
            .toLowerCase(Locale.ROOT);
        return "ip:" + address;
    }

    private boolean hasValidSignature(String clientId, String encodedSignature) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(sharedSecret);
            byte[] expected = mac.doFinal(clientId.getBytes(StandardCharsets.US_ASCII));
            byte[] received = Base64.getUrlDecoder().decode(encodedSignature);
            return MessageDigest.isEqual(expected, received);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("HmacSHA256 indisponivel na JVM.", exception);
        } catch (IllegalArgumentException invalidBase64) {
            return false;
        }
    }
}
