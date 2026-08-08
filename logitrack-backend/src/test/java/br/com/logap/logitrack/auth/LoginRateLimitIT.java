package br.com.logap.logitrack.auth;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import br.com.logap.logitrack.support.IntegrationTest;

@AutoConfigureMockMvc
class LoginRateLimitIT extends IntegrationTest {

    private static final String EMAIL = "limite-login@inexistente.test";
    private static final String BFF_SECRET = "segredo-bff-de-teste-com-mais-de-32-bytes";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void devolve429ComContratoEstavelDepoisDeCincoFalhas() throws Exception {
        databaseCleaner.clean();

        for (int attempt = 0; attempt < 5; attempt++) {
            login(EMAIL, "senha-incorreta")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        }

        login(EMAIL, "senha-correta-ou-nao")
            .andExpect(status().isTooManyRequests())
            .andExpect(header().string("Retry-After", matchesPattern("[1-9][0-9]*")))
            .andExpect(jsonPath("$.status").value(429))
            .andExpect(jsonPath("$.error").value("Too Many Requests"))
            .andExpect(jsonPath("$.code").value("LOGIN_RATE_LIMIT_EXCEEDED"))
            .andExpect(jsonPath("$.message")
                .value("Muitas tentativas de login. Aguarde antes de tentar novamente."))
            .andExpect(jsonPath("$.path").value("/api/auth/login"));
    }

    @Test
    void bloqueioDaMesmaContaNaoAtingeOutroEnderecoRemoto() throws Exception {
        String targetedEmail = "lockout-direcionado@inexistente.test";

        for (int attempt = 0; attempt < 5; attempt++) {
            login(targetedEmail, "senha-incorreta", "198.51.100.10")
                .andExpect(status().isUnauthorized());
        }

        login(targetedEmail, "senha-incorreta", "198.51.100.10")
            .andExpect(status().isTooManyRequests());
        login(targetedEmail, "senha-incorreta", "203.0.113.20")
            .andExpect(status().isUnauthorized());
    }

    @Test
    void identidadesAssinadasDoBffNaoCompartilhamBloqueio() throws Exception {
        String email = "limite-bff@inexistente.test";
        String firstClient = signedClientIdentity((byte) 1);
        String secondClient = signedClientIdentity((byte) 2);

        for (int attempt = 0; attempt < 5; attempt++) {
            login(email, "senha-incorreta", "10.0.0.10", firstClient)
                .andExpect(status().isUnauthorized());
        }

        login(email, "senha-incorreta", "10.0.0.10", firstClient)
            .andExpect(status().isTooManyRequests());
        login(email, "senha-incorreta", "10.0.0.10", secondClient)
            .andExpect(status().isUnauthorized());
    }

    private org.springframework.test.web.servlet.ResultActions login(String email, String password)
        throws Exception {
        return login(email, password, "127.0.0.1");
    }

    private org.springframework.test.web.servlet.ResultActions login(
        String email, String password, String remoteAddress) throws Exception {
        return login(email, password, remoteAddress, null);
    }

    private org.springframework.test.web.servlet.ResultActions login(
        String email, String password, String remoteAddress, String signedClientIdentity)
        throws Exception {
        var request = post("/api/auth/login")
            .with(httpRequest -> {
                httpRequest.setRemoteAddr(remoteAddress);
                return httpRequest;
            })
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "%s", "senha": "%s"}
                """.formatted(email, password));
        if (signedClientIdentity != null) {
            request.header(LoginClientIdentityResolver.HEADER, signedClientIdentity);
        }
        return mockMvc.perform(request);
    }

    private String signedClientIdentity(byte fill) throws Exception {
        byte[] idBytes = new byte[32];
        java.util.Arrays.fill(idBytes, fill);
        String clientId = Base64.getUrlEncoder().withoutPadding().encodeToString(idBytes);

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(BFF_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(mac.doFinal(clientId.getBytes(StandardCharsets.US_ASCII)));
        return clientId + "." + signature;
    }
}
