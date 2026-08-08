package br.com.logap.logitrack.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;

class LoginClientIdentityResolverTest {

    private static final String SECRET = "segredo-bff-de-teste-com-mais-de-32-bytes";
    private static final String CLIENT_ID = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    private final LoginClientIdentityResolver resolver =
        new LoginClientIdentityResolver(new BffSecurityProperties(SECRET));

    @Test
    void acceptsIdentitySignedByTheBff() throws Exception {
        assertThat(resolver.resolve(signedIdentity(), "198.51.100.10"))
            .isEqualTo("client:" + CLIENT_ID);
    }

    @Test
    void invalidSignatureFallsBackToRemoteAddress() {
        String invalid = CLIENT_ID + ".AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

        assertThat(resolver.resolve(invalid, " 2001:DB8::1 "))
            .isEqualTo("ip:2001:db8::1");
    }

    private String signedIdentity() throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(mac.doFinal(CLIENT_ID.getBytes(StandardCharsets.US_ASCII)));
        return CLIENT_ID + "." + signature;
    }
}
